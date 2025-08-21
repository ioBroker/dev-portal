import { Router } from "express";
import { dbConnect, unescapeObjectKeys } from "../db/utils";
import { AdapterStats, AdapterVersions } from "../global/adapter-stats";
import { Statistics } from "../global/iobroker";

const router = Router();

router.get("/api/adapter/:name/stats/now", async function (req, res) {
	try {
		const { name } = req.params;
		if (!isValidAdapterName(name)) {
			res.status(404).send("Adapter not found");
			return;
		}

		const db = await dbConnect();
		const rawStatistics = db.rawStatistics();

		const stats = await rawStatistics
			.find()
			.project<Statistics>({
				adapters: { [name]: 1 },
				versions: { [name]: 1 },
				date: 1,
				_id: 0,
			})
			.sort({ date: -1 })
			.limit(1)
			.toArray();
		if (stats.length === 0) {
			res.status(404).send("Adapter not found");
			return;
		}

		const stat = unescapeObjectKeys(stats[0]);
		const versions: AdapterVersions = {
			total: stat.adapters[name] ?? 0,
			versions: stat.versions[name] ?? {},
		};
		res.send(versions);
	} catch (error: any) {
		console.error(error);
		res.status(500).send("An unexpected error occurred");
	}
});

router.get("/api/adapter/:name/stats/history", async function (req, res) {
	try {
		const { name } = req.params;
		if (!isValidAdapterName(name)) {
			res.status(404).send("Adapter not found");
			return;
		}
		const db = await dbConnect();
		const rawStatistics = db.rawStatistics();
		const repoAdapters = db.repoAdapters();

		const result: AdapterStats = {
			counts: {},
			latest: {},
			stable: {},
		};
		const counts: (AdapterVersions & { date: Date })[] = [];
		await rawStatistics
			.find()
			.project<Statistics>({
				adapters: { [name]: 1 },
				versions: { [name]: 1 },
				date: 1,
				_id: 0,
			})
			.sort({ date: 1 })
			.forEach((s) => {
				const stat = unescapeObjectKeys(s);
				if (stat.adapters[name]) {
					counts.push({
						date: new Date(stat.date),
						total: stat.adapters[name],
						versions: stat.versions[name],
					});
				}
			});

		// find all history entries in the given range
		const start = new Date((req.query.start as string) ?? 0);
		const end = new Date((req.query.end as string) ?? "2999-01-01");
		const filtered = counts.filter(
			({ date }) => date >= start && date <= end,
		);
		const minCounts = 100; // return at least 100 items
		const modulo = Math.max(1, Math.floor(filtered.length / minCounts));
		filtered
			.filter((_, i) => i % modulo === 0 || i === filtered.length - 1)
			.forEach(({ date, total, versions }) => {
				result.counts[date.toISOString()] = { total, versions };
			});

		// the first version timestamp is wrong (except for new adapters)
		let hadFirstLatest = false;
		let hadFirstStable = false;

		await repoAdapters
			.find({ name })
			.sort({ captured: 1 })
			.forEach((a) => {
				const adapter = unescapeObjectKeys(a);
				if (adapter.source === "latest") {
					if (!hadFirstLatest) {
						hadFirstLatest = true;
					} else {
						result.latest[adapter.captured] = adapter.version;
					}
				} else {
					if (!hadFirstStable) {
						hadFirstStable = true;
					} else {
						result.stable[adapter.captured] = adapter.version;
					}
				}
			});

		console.log(
			{
				name,
				start,
				end,
				total: counts.length,
				inRange: filtered.length,
				minCounts,
				modulo,
				returned: Object.keys(result.counts).length,
			},
			result,
		);
		if (Object.keys(result.counts).length === 0) {
			res.status(404).send("Adapter not found");
			return;
		}

		res.send(result);
	} catch (error: any) {
		console.error(error);
		res.status(500).send("An unexpected error occurred");
	}
});

function isValidAdapterName(name: string) {
	const forbiddenChars = /[^a-z0-9\-_]/g;
	if (forbiddenChars.test(name)) {
		return false;
	}

	// the name must start with a letter
	return /^[a-z]/.test(name);
}

export default router;
