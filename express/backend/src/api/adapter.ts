import { Router } from "express";
import { dbConnect, unescapeObjectKeys } from "../db/utils";
import { AdapterStatistics } from "../global/adapter-stats";

const router = Router();

router.get("/api/adapter/:name/stats", async function (req, res) {
	try {
		const { name } = req.params;
		const db = await dbConnect();
		const rawStatistics = db.rawStatistics();
		const repoAdapters = db.repoAdapters();

		const result: AdapterStatistics = {
			counts: {},
			latest: {},
			stable: {},
		};
		await rawStatistics
			.find()
			.project({
				adapters: { [name]: 1 },
				versions: { [name]: 1 },
				date: 1,
				_id: 0,
			})
			.sort({ date: 1 })
			.forEach((s) => {
				const stat = unescapeObjectKeys(s);
				if (stat.adapters[name]) {
					result.counts[stat.date] = {
						total: stat.adapters[name],
						versions: stat.versions[name],
					};
				}
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

		console.log(result);
		if (Object.keys(result.counts).length === 0) {
			res.status(404).send(`Adapter ${name} not found`);
			return;
		}

		res.send(result);
	} catch (error) {
		console.error(error);
		res.status(500).send(error.message || error);
	}
});

export default router;
