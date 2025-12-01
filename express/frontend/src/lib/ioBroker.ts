import axios from "axios";
import {
	AdapterStats,
	AdapterVersions,
} from "../../../backend/src/global/adapter-stats";
import {
	AdapterInfo,
	AdapterRatings,
	AllRatings,
	LatestAdapters,
	StableAdapters,
} from "../../../backend/src/global/iobroker";
import {
	ProjectInfo,
	ProjectStatistics,
} from "../../../backend/src/global/sentry";
import { User as RestUser } from "../../../backend/src/global/user";
import {
	FullRepository,
	GitHubComm,
	MinimalRepository,
	Repository,
} from "./gitHub";
import { AsyncCache, getApiUrl } from "./utils";

const uc = encodeURIComponent;

export type TranslatedText = Record<string, string>;

export const getLatest = AsyncCache.of(async () => {
	const result = await axios.get<LatestAdapters>(
		"https://download.iobroker.net/sources-dist-latest.json",
	);
	return result.data;
});

export const getStable = AsyncCache.of(async () => {
	const result = await axios.get<StableAdapters>(
		"https://download.iobroker.net/sources-dist.json",
	);
	return result.data;
});

export const getAllRatings = AsyncCache.of(async () => {
	try {
		const result = await axios.get<AllRatings>(
			"https://rating.iobroker.net/rating?uuid=iobroker.dev",
		);
		return result.data;
	} catch (error) {
		console.error(error);
		return {};
	}
});

export async function getAdapterRatings(name: string): Promise<AdapterRatings> {
	try {
		const result = await axios.get<AdapterRatings>(
			`https://rating.iobroker.net/adapter/${uc(name)}?uuid=iobroker.dev`,
		);
		return result.data;
	} catch (error) {
		console.error(error);
		return {
			rating: {},
			comments: [],
		};
	}
}

export async function getMyAdapterRepos(
	ghToken: string,
): Promise<MinimalRepository[]> {
	const gitHub = GitHubComm.forToken(ghToken);
	const [repos, latest] = await Promise.all([
		gitHub.getUserRepos(),
		getLatest(),
	]);
	return repos.filter((repo) => {
		if (!repo.name.startsWith("ioBroker.")) {
			return false;
		}

		const parts = repo.name.split(".");
		if (parts.length !== 2) {
			return false;
		}
		const adapterName = parts[1];
		const info = latest[adapterName];
		if (repo.fork) {
			if (!info?.meta?.includes(`/${repo.full_name}/`)) {
				// we are not the true source of this adapter
				return false;
			}
		}

		return true;
	});
}

export async function getWatchedAdapterRepos(
	ghToken: string,
): Promise<FullRepository[]> {
	try {
		const { data: user } = await axios.get<RestUser>(getApiUrl("user"));
		const gitHub = GitHubComm.forToken(ghToken);
		return await Promise.all(
			user.watches
				.map((r) => r.split("/", 2))
				.map(([owner, repo]) => gitHub.getRepo(owner, repo).getRepo()),
		);
	} catch (e) {
		console.error(e);
		return [];
	}
}

export function getAdapterFromRepoName(repoName: string) {
	return repoName.replace(/^ioBroker\./, "");
}

const adapterInfos = new Map<string, Promise<AdapterInfo>>();
export async function getAdapterInfo(
	repo: Repository,
): Promise<AdapterInfo | undefined> {
	if (!adapterInfos.has(repo.name)) {
		const getInfo = async () => {
			const latest = await getLatest();
			const info = latest[getAdapterFromRepoName(repo.name)];
			if (info) {
				return info;
			}
			try {
				const defaultBranch = repo.default_branch || "master";
				const ioPackage = await axios.get<any>(
					`https://raw.githubusercontent.com/` +
						`${encodeURI(repo.full_name)}/` +
						`${uc(defaultBranch)}/io-package.json`,
				);
				return ioPackage.data.common;
			} catch (error) {
				console.error(error);
			}
		};
		adapterInfos.set(repo.name, getInfo());
	}

	return adapterInfos.get(repo.name);
}

export const getWeblateAdapterComponents = AsyncCache.of(async () => {
	const components: any[] = [];
	let url = "weblate/projects/adapters/components/";
	do {
		const result = await axios.get<any>(getApiUrl(url));
		components.push(...result.data.results);
		url = result.data.next?.replace("/api/", "");
	} while (url);

	return components;
});

export async function getCurrentVersions(adapterName: string) {
	const result = await axios.get<AdapterVersions>(
		getApiUrl(`adapter/${uc(adapterName)}/stats/now`),
	);
	return result.data;
}

export async function getStatisticsHistory(
	adapterName: string,
	start?: Date,
	end?: Date,
) {
	const url = new URL(
		getApiUrl(`adapter/${uc(adapterName)}/stats/history`),
		document.location.origin,
	);
	if (start) {
		url.searchParams.set("start", start.toISOString());
	}

	if (end) {
		url.searchParams.set("end", end.toISOString());
	}

	const result = await axios.get<AdapterStats>(url.toString());
	return result.data;
}

const discoverySupports = new Map<string, Promise<boolean>>();
export function hasDiscoverySupport(adapterName: string): Promise<boolean> {
	if (!discoverySupports.has(adapterName)) {
		const checkDiscoverySupport = async () => {
			try {
				await axios.get(
					`https://cdn.jsdelivr.net/npm/iobroker.discovery/lib/adapters/` +
						`${uc(adapterName)}.js`,
				);
				return true;
			} catch {
				return false;
			}
		};
		discoverySupports.set(adapterName, checkDiscoverySupport());
	}
	return discoverySupports.get(adapterName) as Promise<boolean>;
}

export const getSentryProjectInfos = AsyncCache.of(async () => {
	try {
		const result = await axios.get<ProjectInfo[]>(
			getApiUrl("sentry/projects/"),
		);
		return result.data;
	} catch (error) {
		console.error(error);
		return [];
	}
});

export async function getSentryStats(ids: string[], statsPeriod?: string) {
	const period = uc(statsPeriod || "24h");
	const query = ids.map((id) => `id:${id}`).join(" ");
	const result = await axios.get<ProjectStatistics[]>(
		getApiUrl(`sentry/stats/?query=${uc(query)}&statsPeriod=${period}`),
	);
	return result.data;
}

export type CheckResult = string | Record<string, any>;

export interface CheckResults {
	version: string;
	result: string;
	checks: CheckResult[];
	warnings: CheckResult[];
	errors: CheckResult[];
}

export async function checkAdapter(repoName: string, branchName?: string) {
	const url = new URL(getApiUrl("repochecker/"), window.location.origin);
	url.searchParams.set("url", `https://github.com/${repoName}`);
	if (branchName) {
		url.searchParams.set("branch", branchName);
	}
	const { data } = await axios.get<CheckResults>(url.toString());
	return data;
}
