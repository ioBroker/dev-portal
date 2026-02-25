// context for AdapterInfos

import {
	createContext,
	ReactNode,
	useContext,
	useEffect,
	useState,
} from "react";
import { AdapterInfo } from "../../../backend/src/global/iobroker";
import { GitHubComm, Repository } from "../lib/gitHub";
import { getAdapterFromRepoName, getAdapterInfo } from "../lib/ioBroker";
import { useAdapterList } from "./AdapterListContext";
import { useUserContext } from "./UserContext";

export interface AdapterRepoName {
	name: string;
	owner: string;
}

export interface IAdapterContext {
	name: string;
	repoName: AdapterRepoName;
	repo?: Repository;
	info?: AdapterInfo;
}

export const AdapterContext = createContext<IAdapterContext | undefined>(
	undefined,
);

export function useAdapterContext() {
	const context = useContext(AdapterContext);
	if (!context) {
		throw new Error("AdapterContext not provided");
	}
	return context;
}

export function AdapterContextProvider({
	repoName,
	fallback,
	children,
}: {
	repoName: AdapterRepoName;
	fallback?: ReactNode;
	children: ReactNode;
}) {
	const { user } = useUserContext();
	const { hide } = useAdapterList();
	const [value, setValue] = useState<IAdapterContext>(() => ({
		name: getAdapterFromRepoName(repoName.name),
		repoName,
	}));

	useEffect(() => {
		setValue({
			name: getAdapterFromRepoName(repoName.name),
			repoName,
		});
		if (!user) {
			return;
		}
		const gitHub = GitHubComm.forToken(user.token);
		const loadInfos = async () => {
			const own = await gitHub.getUserRepos();
			let repo: Repository | undefined = own.find(
				(r) =>
					r.name === repoName.name &&
					r.owner.login === repoName.owner,
			);
			if (!repo) {
				repo = await gitHub
					.getRepo(repoName.owner, repoName.name)
					.getRepo();
			}
			const info = await getAdapterInfo(repo);
			if (!info) {
				hide(repoName);
				return;
			}

			setValue({
				name: getAdapterFromRepoName(repoName.name),
				repoName,
				repo,
				info,
			});
		};
		loadInfos().catch(console.error);
	}, [repoName, user, hide]);

	return (
		<AdapterContext.Provider value={value}>
			{!value.info && fallback ? fallback : children}
		</AdapterContext.Provider>
	);
}
