import { createContext, ReactNode, useContext, useState } from "react";

interface IDrawerContext {
	readonly isOpen: boolean;
	toggle: () => void;
}

export const DrawerContext = createContext<IDrawerContext | undefined>(
	undefined,
);

export function useDrawerContext() {
	const context = useContext(DrawerContext);
	if (!context) {
		throw new Error("DrawerContext not provided");
	}
	return context;
}

export function DrawerProvider({ children }: { children: ReactNode }) {
	const [isOpen, setOpen] = useState(false);
	const toggle = () => setOpen((o) => !o);

	return (
		<DrawerContext.Provider value={{ isOpen, toggle }}>
			{children}
		</DrawerContext.Provider>
	);
}
