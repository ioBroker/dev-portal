import axios from "axios";
import { job } from "cron";
import { Collection } from "mongodb";
import { RepoAdapter } from "./db/schemas";
import { dbConnect, escapeObjectKeys } from "./db/utils";
import {
	LatestAdapter,
	LatestAdapters,
	StableAdapter,
	StableAdapters,
	Statistics,
} from "./global/iobroker";

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

		// remove "stale" entries
		const { deletedCount } = await collection.deleteMany({
			source: { $exists: false },
		});
		console.log(`Deleted ${deletedCount || 0} stale entries`);

		await Promise.all([
			addRepoAdapters(collection, latest, "latest"),
			addRepoAdapters(collection, stable, "stable"),
		]);
		console.log("Added all repo adapters");
	} catch (error) {
		console.error("cron-statistics", error);
	}
}

async function addRepoAdapters<T extends LatestAdapter | StableAdapter>(
	collection: Collection<RepoAdapter>,
	adapters: Record<string, T>,
	source: "latest" | "stable",
): Promise<void> {
	const timestamp = new Date().toISOString();
	for (const adapterName in adapters) {
		if (Object.prototype.hasOwnProperty.call(adapters, adapterName)) {
			const adapter = adapters[adapterName];
			const existing = await collection.findOne({
				version: adapter.version,
				name: adapter.name,
				source: source as any,
			});
			if (existing) {
				// adapter name & version already exists
				continue;
			}

			console.info(
				`Adding ${adapterName} ${adapter.version} from ${source}`,
			);
			const add = { ...adapter, captured: timestamp, source };
			await collection.insertOne(escapeObjectKeys(add as any));
		}
	}
}
