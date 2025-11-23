import { operations } from "@octokit/openapi-types/types";
import { request } from "@octokit/request";
import axios from "axios";
import { job } from "cron";
import { Collection } from "mongodb";
import { delay } from "./common";
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
	// find GitHub repos every 2 minutes
	/*job({
		cronTime: "0 0/2 * * * *",
		onTick: findAdapterRepos,
		start: true,
	});*/
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

let nextRepoSearch = "a";

async function findAdapterRepos(): Promise<void> {
	if (nextRepoSearch === "~") {
		// done
		return;
	}

	try {
		console.log(
			"cron-findAdapterRepos",
			`Find adapter repos from ${nextRepoSearch}`,
		);

		const query: operations["search/repos"]["parameters"]["query"] = {
			q: `ioBroker.${nextRepoSearch} in:name`,
			sort: "updated",
			order: "desc",
			per_page: 100,
			page: 1,
		};
		let search = await request("GET /search/repositories", query);
		if (search.data.total_count >= 1000 && nextRepoSearch.length < 6) {
			console.log(
				"cron-findAdapterRepos",
				`${search.data.total_count} results for ioBroker.${nextRepoSearch}, trying deeper`,
			);
			// more than 1000 results, need to narrow down
			nextRepoSearch += "a";
			return;
		}

		console.log(
			"cron-findAdapterRepos",
			`found ${search.data.total_count} results for ioBroker.${nextRepoSearch}`,
		);

		nextRepoSearch = getNextRepoSearch(nextRepoSearch);

		const db = await dbConnect();
		const collection = db.gitHubRepos();

		while (search.data.items.length > 0) {
			const repoInfoCaptured = new Date().toISOString();
			for (const repoInfo of search.data.items) {
				if (!repoInfo.owner || !repoInfo.name.startsWith("ioBroker.")) {
					continue;
				}

				const owner = repoInfo.owner.login;
				const repo = repoInfo.name;
				if (
					await collection.findOne({
						owner,
						repo,
					})
				) {
					// already exists
					console.info(
						"cron-findAdapterRepos",
						`skipping ${repoInfo.full_name}`,
					);
					continue;
				}

				await delay(100);
				try {
					const { data } = await axios.get<any>(
						`https://raw.githubusercontent.com/${owner}/${repo}/${repoInfo.default_branch}/io-package.json`,
					);
					const ioPackage = data;
					const ioPackageCaptured = new Date().toISOString();

					const adapterName = ioPackage.common.name;

					let npmMetadata: any = undefined;
					let npmMetadataCaptured: string | undefined = undefined;
					try {
						const { data } = await axios.get<any>(
							`https://registry.npmjs.org/iobroker.${adapterName}`,
							{
								headers: {
									accept: "application/vnd.npm.install-v1+json",
								},
							},
						);
						npmMetadata = data;
						npmMetadataCaptured = new Date().toISOString();
					} catch (error) {
						// ignore
					}

					let createAdapter: any = undefined;
					let createAdapterCaptured: string | undefined = undefined;
					try {
						const { data } = await axios.get<any>(
							`https://raw.githubusercontent.com/${owner}/${repo}/${repoInfo.default_branch}/.create-adapter.json`,
						);
						createAdapter = data;
						createAdapterCaptured = new Date().toISOString();
					} catch (error) {
						// ignore
					}

					console.info(
						"cron-findAdapterRepos",
						`adding ${repoInfo.full_name}`,
					);
					await collection.insertOne({
						owner,
						repo,
						valid: true,
						adapterName,
						repoInfo,
						repoInfoCaptured,
						ioPackage,
						ioPackageCaptured,
						npmMetadata,
						npmMetadataCaptured,
						createAdapter,
						createAdapterCaptured,
					});
				} catch (error: any) {
					console.info(
						"cron-findAdapterRepos",
						`cannot load ${repoInfo.full_name}`,
						error.message || error,
					);
					await collection.insertOne({
						owner,
						repo,
						valid: false,
					});
					continue;
				}
			}

			query.page = (query.page ?? 1) + 1;
			if (query.page > 10) {
				break;
			}

			search = await request("GET /search/repositories", query);
		}
	} catch (error) {
		console.error("cron-findAdapterRepos", error);
	}
}

function getNextRepoSearch(current: string): string {
	if (current === "") {
		return "~";
	}
	const currentCharCode = current.charCodeAt(current.length - 1);
	if (currentCharCode < "z".charCodeAt(0)) {
		return current.slice(0, -1) + String.fromCharCode(currentCharCode + 1);
	}

	return getNextRepoSearch(current.slice(0, -1));
}
