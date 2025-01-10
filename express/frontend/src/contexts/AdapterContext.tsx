// context for AdapterInfos

import { createContext, useContext } from "react";
import { AdapterInfos } from "../lib/ioBroker";

export interface IAdapterContext {
	name: string;
	infos: AdapterInfos;
}

export const AdapterContext = createContext<IAdapterContext | undefined>(
	undefined,
);

export function useAdapter() {
	const context = useContext(AdapterContext);
	if (!context) {
		throw new Error("AdapterContext not provided");
	}
	return context;
}

export function AdapterProvider({
	children,
	name,
	infos,
}: {
	children: React.ReactNode;
	name: string;
	infos: AdapterInfos;
}) {
	return (
		<AdapterContext.Provider value={{ name, infos }}>
			{children}
		</AdapterContext.Provider>
	);
}
