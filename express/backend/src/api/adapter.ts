import { Router } from "express";
import { isLatestAdapter } from "../db/schemas";
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
				result.counts[stat.date] = {
					total: stat.adapters[name],
					versions: stat.versions[name],
				};
			});

		await repoAdapters
			.find({ name })
			.sort({ versionDate: 1 })
			.forEach((a) => {
				const adapter = unescapeObjectKeys(a);
				if (isLatestAdapter(adapter)) {
					result.latest[adapter.versionDate] = adapter.latestVersion;
				} else {
					result.stable[adapter.versionDate] = adapter.stable;
				}
			});

		console.log(result);

		res.send(result);
	} catch (error) {
		console.error(error);
		res.status(500).send(error.message || error);
	}
});

export default router;
