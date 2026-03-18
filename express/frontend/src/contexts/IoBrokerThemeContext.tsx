import { Theme, ThemeName } from "@iobroker/adapter-react-v5";
import {
	StyledEngineProvider,
	ThemeProvider,
	useMediaQuery,
} from "@mui/material";
import {
	createContext,
	ReactNode,
	useCallback,
	useContext,
	useMemo,
	useState,
} from "react";

export interface IIoBrokerThemeContext {
	readonly themeName: ThemeName;
	toggle(): void;
}

const IoBrokerThemeContext = createContext<IIoBrokerThemeContext>({
	themeName: "dark",
	toggle: () => {},
});

export function useIoBrokerThemeContext() {
	return useContext(IoBrokerThemeContext);
}

export function IoBrokerThemeProvider({ children }: { children: ReactNode }) {
	const prefersDarkMode = useMediaQuery("(prefers-color-scheme: dark)");
	const preferredThemeName: ThemeName = prefersDarkMode ? "dark" : "light";
	const [themeName, setThemeName] = useState<ThemeName>();

	const toggle = useCallback(
		() =>
			setThemeName((t) =>
				(t ?? preferredThemeName) === "dark" ? "light" : "dark",
			),
		[setThemeName, preferredThemeName],
	);

	const theme = useMemo(
		() => Theme(themeName ?? preferredThemeName),
		[themeName, preferredThemeName],
	);

	return (
		<StyledEngineProvider injectFirst>
			<ThemeProvider theme={theme}>
				<IoBrokerThemeContext.Provider
					value={{
						themeName: themeName ?? preferredThemeName,
						toggle,
					}}
				>
					{children}
				</IoBrokerThemeContext.Provider>
			</ThemeProvider>
		</StyledEngineProvider>
	);
}
