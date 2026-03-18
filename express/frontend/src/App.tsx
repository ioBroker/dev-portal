import { AdapterListProvider } from "./contexts/AdapterListContext";
import { DrawerContextProvider } from "./contexts/DrawerContext";
import { IoBrokerThemeProvider } from "./contexts/IoBrokerThemeContext";
import { UserProvider } from "./contexts/UserContext";
import { Root } from "./Root";

export function App() {
	return (
		<IoBrokerThemeProvider>
			<UserProvider>
				<AdapterListProvider>
					<DrawerContextProvider>
						<Root />
					</DrawerContextProvider>
				</AdapterListProvider>
			</UserProvider>
		</IoBrokerThemeProvider>
	);
}
