export type AdapterName = string;

export type DateString = string;

export interface AdapterInfo {
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
	published: DateString;
	versionDate: DateString;
}

export interface StableAdapter extends AdapterInfo {
	latestVersion: string; // points to the latest version of this adapter
}

/**
 * Result of https://repo.iobroker.live/sources-dist.json
 */
export type StableAdapters = Record<AdapterName, StableAdapter>;

export interface LatestAdapter extends AdapterInfo {
	stable: string; // points to the stable version of this adapter
}

/**
 * Result of https://repo.iobroker.live/sources-dist-latest.json
 */
export type LatestAdapters = Record<AdapterName, LatestAdapter>;

export type Version = string;

/**
 * Result of http://iobroker.live/statistics.json
 */
export interface Statistics {
	total: number;
	adapters: Record<AdapterName, number>;
	multihosts: number;
	platforms: Record<string, number>;
	languages: Record<string, number>;
	versions: Record<AdapterName, Record<Version, number>>;
	countries: Record<string, number>;
	counts: Record<string, number>;
	nodes: Record<string, number>;
	date: string;
}
