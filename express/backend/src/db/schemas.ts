import { components } from "@octokit/openapi-types/types";
import { DateString, LatestAdapter, StableAdapter } from "../global/iobroker";
export { Statistics } from "../global/iobroker";
export { User } from "../global/user";

export interface DbLatestAdapter extends LatestAdapter {
	source: "latest";
	captured: DateString;
}

export interface DbStableAdapter extends StableAdapter {
	source: "stable";
	captured: DateString;
}

export type RepoAdapter = DbLatestAdapter | DbStableAdapter;

export interface ValidAdapterRepo {
	owner: string;
	repo: string;
	valid: true;
	adapterName: string;
	repoInfo: components["schemas"]["repo-search-result-item"];
	repoInfoCaptured: DateString;
	ioPackage: any;
	ioPackageCaptured: DateString;
	npmMetadata?: any;
	npmMetadataCaptured?: DateString;
	createAdapter?: any;
	createAdapterCaptured?: DateString;
}

export interface InvalidAdapterRepo {
	owner: string;
	repo: string;
	valid: false;
}

export type AdapterRepo = ValidAdapterRepo | InvalidAdapterRepo;
