import axios from "axios";
import { job } from "cron";
import { createClient, escapeObjectKeys } from "./db/utils";
import { Statistics } from "./iobroker";

async function collectStatistics(): Promise<void> {
	try {
		console.log("Collecting statistics");
		const client = createClient();
		const [statistics] = await Promise.all([
			axios.get<Statistics>("http://iobroker.live/statistics.json"),
			client.connect(),
		]);
		const db = client.db();
		const collection = db.collection<Statistics>("raw-statistics");
		const existing = await collection.findOne({
			date: statistics.data.date,
		});
		if (existing) {
			console.log(`Statistics already exist for ${existing.date}`);
			return;
		}
		await collection.insertOne(escapeObjectKeys(statistics.data));
		console.log("Added statistics");
	} catch (error) {
		console.error("cron-statistics", error);
	}
}

export function startCronJobs() {
	// get the statistics every day at 03:01, 09:01, 15:01 and 21:01
	job({
		//cronTime: "0/20 * * * * *",
		cronTime: "0 1 3,9,15,21 * * *",
		onTick: collectStatistics,
		start: true,
	});
}
