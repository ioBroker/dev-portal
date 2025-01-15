import axios from "axios";
import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useState,
} from "react";
import { User } from "../../../backend/src/global/user";
import {
	AdapterInfos,
	getMyAdapterInfos,
	getWatchedAdapterInfos,
} from "../lib/ioBroker";
import { equalIgnoreCase, getApiUrl } from "../lib/utils";
import { useUserContext } from "./UserContext";

export interface IAdapterListContext {
	readonly own: ReadonlyArray<AdapterInfos>;
	readonly watched: ReadonlyArray<AdapterInfos>;
	readonly addWatched: (repo: string) => Promise<void>;
	readonly removeWatched: (adapter: AdapterInfos) => Promise<void>;
}

export const AdapterListContext = createContext<
	IAdapterListContext | undefined
>(undefined);

export function useAdapterList() {
	const context = useContext(AdapterListContext);
	if (!context) {
		throw new Error("AdapterListContext not provided");
	}
	return context;
}

export function AdapterListProvider({
	children,
}: {
	children: React.ReactNode;
}) {
	const { user } = useUserContext();
	const [own, setOwn] = useState<AdapterInfos[]>([]);
	const [watched, setWatched] = useState<AdapterInfos[]>([]);

	useEffect(() => {
		setOwn([]);
		setWatched([]);

		if (!user) {
			return;
		}

		const loadAdapters = async () => {
			const [own, watched] = await Promise.all([
				getMyAdapterInfos(user.token),
				getWatchedAdapterInfos(user.token),
			]);
			setOwn(own);
			setWatched(watched);
		};

		loadAdapters().catch(console.error);
	}, [user]);

	const addWatched = useCallback(
		async (repo: string) => {
			if (!user) {
				return;
			}

			const url = getApiUrl("user");
			const { data: dbUser } = await axios.get<User>(url);
			dbUser.watches.push(repo);
			await axios.put(url, dbUser);

			const watched = await getWatchedAdapterInfos(user.token);
			setWatched(watched);
		},
		[user],
	);

	const removeWatched = useCallback(
		async (adapter: AdapterInfos) => {
			if (!user) {
				return;
			}

			const url = getApiUrl("user");
			const { data: dbUser } = await axios.get<User>(url);
			dbUser.watches = dbUser.watches.filter(
				(w) => !equalIgnoreCase(w, adapter.repo.full_name),
			);
			await axios.put(url, dbUser);

			const watched = await getWatchedAdapterInfos(user.token);
			setWatched(watched);
		},
		[user],
	);

	return (
		<AdapterListContext.Provider
			value={{ own, watched, addWatched, removeWatched }}
		>
			{children}
		</AdapterListContext.Provider>
	);
}
