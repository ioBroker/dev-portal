import axios from "axios";
import {
	LatestAdapter,
	LatestAdapters,
} from "../../../backend/src/global/iobroker";
import { GitHubComm, UserRepo } from "./gitHub";
import { AsyncCache } from "./utils";

const uc = encodeURIComponent;

export type TranslatedText = Record<string, string>;

export const getLatest = AsyncCache.of(async () => {
	const result = await axios.get<LatestAdapters>(
		"https://repo.iobroker.live/sources-dist-latest.json",
	);
	return result.data;
});

export const getMyAdapterRepos = async (ghToken: string) => {
	const gitHub = GitHubComm.forToken(ghToken);
	const repos = await gitHub.getUserRepos();
	const latest = await getLatest();
	return repos.filter((repo) => {
		if (!repo.name.startsWith("ioBroker.")) {
			return false;
		}

		const parts = repo.name.split(".");
		if (parts.length !== 2) {
			return false;
		}
		const adapterName = parts[1];
		let info = latest[adapterName];
		if (repo.fork) {
			if (!info?.meta || !info.meta.includes(`/${repo.full_name}/`)) {
				// we are not the true source of this adapter
				return false;
			}
		}

		return true;
	});
};

export interface AdapterInfos {
	repo: UserRepo;
	info?: LatestAdapter;
}

const myAdapterInfos = new Map<string, Promise<AdapterInfos[]>>();
export const getMyAdapterInfos = async (ghToken: string) => {
	if (!myAdapterInfos.has(ghToken)) {
		const getInfos = async () => {
			const [repos, latest] = await Promise.all([
				getMyAdapterRepos(ghToken),
				getLatest(),
			]);
			const infos = await Promise.all(
				repos.map(async (repo) => {
					const adapterName = repo.name.split(".")[1];
					let info = latest[adapterName];
					const defaultBranch = repo.default_branch || "master";
					if (!info) {
						try {
							const ioPackage = await axios.get(
								`https://raw.githubusercontent.com/` +
									`${uc(repo.full_name)}/` +
									`${uc(defaultBranch)}/io-package.json`,
							);
							info = ioPackage.data.common;
						} catch (error) {
							console.error(error);
						}
					}

					return { repo, info };
				}),
			);
			return infos.filter((i) => i) as AdapterInfos[];
		};
		myAdapterInfos.set(ghToken, getInfos());
	}

	return myAdapterInfos.get(ghToken) as Promise<AdapterInfos[]>;
};

export const getWeblateAdapterComponents = AsyncCache.of(async () => {
	const result = await axios.get(
		"/api/weblate/projects/adapters/components/",
	);
	return result.data;
});

const discoverySupports = new Map<string, Promise<boolean>>();
export function hasDiscoverySupport(adapterName: string): Promise<boolean> {
	if (!discoverySupports.has(adapterName)) {
		const checkDiscoverySupport = async () => {
			try {
				await axios.get(
					`https://cdn.jsdelivr.net/npm/iobroker.discovery/lib/adapters/` +
						`${encodeURIComponent(adapterName)}.js`,
				);
				return true;
			} catch (error) {
				return false;
			}
		};
		discoverySupports.set(adapterName, checkDiscoverySupport());
	}
	return discoverySupports.get(adapterName) as Promise<boolean>;
}
