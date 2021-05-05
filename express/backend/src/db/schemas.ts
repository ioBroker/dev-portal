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
