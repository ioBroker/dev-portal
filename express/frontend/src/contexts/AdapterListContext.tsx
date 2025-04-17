import axios from "axios";
import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useState,
} from "react";
import { User as RestUser, User } from "../../../backend/src/global/user";
import { getMyAdapterRepos } from "../lib/ioBroker";
import { equalIgnoreCase, getApiUrl } from "../lib/utils";
import { AdapterRepoName } from "./AdapterContext";
import { useUserContext } from "./UserContext";

export type AddableAdapterListType = "watches" | "favorites";
export type AdapterListType = "own" | AddableAdapterListType;
export type AdapterList = Readonly<
	Partial<Record<AdapterListType, AdapterRepoName[]>>
>;

export interface IAdapterListContext {
	readonly adapters: AdapterList;
	readonly add: (type: AddableAdapterListType, repo: string) => Promise<void>;
	readonly remove: (
		type: AddableAdapterListType,
		adapter: AdapterRepoName,
	) => Promise<void>;
}

const AdapterListContext = createContext<IAdapterListContext | undefined>(
	undefined,
);

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
	const [adapters, setAdapters] = useState<AdapterList>({});

	useEffect(() => {
		setAdapters({});

		if (!user) {
			return;
		}

		const loadAdapters = async () => {
			const [own, userResponse] = await Promise.all([
				getMyAdapterRepos(user.token),
				axios.get<RestUser>(getApiUrl("user")),
			]);
			const { watches, favorites } = userResponse.data;
			setAdapters({
				own: own.map((repo) => ({
					name: repo.name,
					owner: repo.owner.login,
				})),
				watches: watches.map(createAdapterRepo),
				favorites: favorites?.map(createAdapterRepo),
			});
		};

		loadAdapters().catch(console.error);
	}, [user]);

	const add = useCallback(
		async (type: AddableAdapterListType, repo: string) => {
			if (!user) {
				return;
			}

			const url = getApiUrl("user");
			const { data: dbUser } = await axios.get<User>(url);
			const list = dbUser[type] ?? [];
			if (list.includes(repo)) {
				return;
			}
			list.push(repo);
			dbUser[type] = list;
			await axios.put(url, dbUser);

			setAdapters((prev) => ({
				...prev,
				[type]: [...(prev[type] ?? []), createAdapterRepo(repo)],
			}));
		},
		[user],
	);

	const remove = useCallback(
		async (type: AdapterListType, adapter: AdapterRepoName) => {
			if (!user) {
				return;
			}

			const fullName = `${adapter.owner}/${adapter.name}`;

			if (type !== "own") {
				const url = getApiUrl("user");
				const { data: dbUser } = await axios.get<User>(url);
				dbUser[type] = (dbUser[type] ?? []).filter(
					(a) => !equalIgnoreCase(a, fullName),
				);
				await axios.put(url, dbUser);
			}

			setAdapters((prev) => ({
				...prev,
				[type]: (prev[type] ?? []).filter(
					(w) =>
						!(w.name === adapter.name && w.owner === adapter.owner),
				),
			}));
		},
		[user],
	);

	return (
		<AdapterListContext.Provider value={{ adapters, add, remove }}>
			{children}
		</AdapterListContext.Provider>
	);
}

function createAdapterRepo(fullName: string): AdapterRepoName {
	const [owner, name] = fullName.split("/", 2);
	return { name, owner };
}
