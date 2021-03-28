import axios from "axios";

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

const awaitLatest = (async () => {
	return await axios.get(
		"http://repo.iobroker.live/sources-dist-latest.json",
	);
})();

export class Repository {
	public static async getLatest(): Promise<LatestAdapters> {
		const result = await awaitLatest;
		return result.data;
	}
}
