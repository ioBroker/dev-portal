import axios from "axios";
import { GitHubComm } from "./gitHub";
import { AsyncCache } from "./utils";

export type TranslatedText = Record<string, string>;

export interface LatestAdapter {
	meta: string;
	icon: string;
	type: string;
	stars: number;
	weekDownloads: number;
	stat: number;
	name: string;
	version: string;
	news: TranslatedText;
	title: string;
	titleLang: TranslatedText;
	desc: TranslatedText;
	authors: string[];
	keywords: string[];
	license: string;
	platform: string;
	main: string;
	enabled: boolean;
	extIcon: string;
	readme: string;
	loglevel: string;
	mode: string;
	compact: boolean;
	connectionType: string;
	dataSource: string;
	materialize: boolean;
	dependencies: Record<string, string>[];
	published: Date;
	versionDate: Date;
	stable: string;
}

export type LatestAdapters = Record<string, LatestAdapter>;

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
