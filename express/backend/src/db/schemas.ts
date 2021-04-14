import { LatestAdapter, StableAdapter } from "../global/iobroker";
export { Statistics } from "../global/iobroker";

export type RepoAdapter = LatestAdapter | StableAdapter;

export function isLatestAdapter(
	adapter: RepoAdapter,
): adapter is LatestAdapter {
	return (adapter as LatestAdapter).latestVersion !== undefined;
}
