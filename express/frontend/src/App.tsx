import { AdapterListProvider } from "./contexts/AdapterListContext";
import { DrawerContextProvider } from "./contexts/DrawerContext";
import { UserProvider } from "./contexts/UserContext";
import { Root } from "./Root";

export function App() {
	return (
		<UserProvider>
			<AdapterListProvider>
				<DrawerContextProvider>
					<Root />
				</DrawerContextProvider>
			</AdapterListProvider>
		</UserProvider>
	);
}
