import axios from "axios";
import { job } from "cron";
import { Collection, FilterQuery } from "mongodb";
import { RepoAdapter } from "./db/schemas";
import { dbConnect, escapeObjectKeys } from "./db/utils";
import { LatestAdapters, StableAdapters, Statistics } from "./global/iobroker";

export function startCronJobs() {
	// get the statistics every hour at :30
	job({
		//cronTime: "0/20 * * * * *", // for debugging: every 20 seconds
		cronTime: "0 30 * * * *",
		onTick: collectStatistics,
		start: true,
	});
	// get the latest/stable repos every hour at :31
	job({
		//cronTime: "0/30 * * * * *", // for debugging: every 20 seconds
		cronTime: "0 31 * * * *",
		onTick: collectRepos,
		start: true,
	});
}

async function collectStatistics(): Promise<void> {
	try {
		console.log("Collecting statistics");
		const [{ data: statistics }, db] = await Promise.all([
			axios.get<Statistics>("http://iobroker.live/statistics.json"),
			dbConnect(),
		]);
		const collection = db.rawStatistics();
		const existing = await collection.findOne({
			date: statistics.date,
		});
		if (existing) {
			console.log(`Statistics already exist for ${existing.date}`);
			return;
		}
		await collection.insertOne(escapeObjectKeys(statistics));
		console.log("Added statistics");
	} catch (error) {
		console.error("cron-statistics", error);
	}
}

async function collectRepos(): Promise<void> {
	try {
		console.log("Collecting latest adapters");
		const [{ data: latest }, { data: stable }, db] = await Promise.all([
			axios.get<LatestAdapters>(
				"https://repo.iobroker.live/sources-dist-latest.json",
			),
			axios.get<StableAdapters>(
				"https://repo.iobroker.live/sources-dist.json",
			),
			dbConnect(),
		]);
		const collection = db.repoAdapters();
		await Promise.all([
			addRepoAdapters(collection, latest, (adapter) => ({
				latestVersion: adapter.latestVersion,
			})),
			addRepoAdapters(collection, stable, (adapter) => ({
				stable: adapter.stable,
			})),
		]);
		console.log("Added all repo adapters");
	} catch (error) {
		console.error("cron-statistics", error);
	}
}

async function addRepoAdapters<T extends RepoAdapter>(
	collection: Collection<RepoAdapter>,
	adapters: Record<string, T>,
	getFilter: (adapter: T) => FilterQuery<RepoAdapter>,
): Promise<void> {
	for (const adapterName in adapters) {
		if (Object.prototype.hasOwnProperty.call(adapters, adapterName)) {
			const adapter = adapters[adapterName];
			const existing = await collection.findOne({
				...getFilter(adapter),
				name: adapter.name,
			});
			if (existing) {
				// adapter name & version already exists
				continue;
			}

			console.log(`Adding ${adapterName} ${adapter.version}`);
			await collection.insertOne(escapeObjectKeys(adapter));
		}
	}
}
