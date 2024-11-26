import { AdapterListProvider } from "./contexts/AdapterListContext";
import { DrawerProvider } from "./contexts/DrawerContext";
import { UserProvider } from "./contexts/UserContext";
import { Root } from "./Root";

export function App() {
	return (
		<UserProvider>
			<AdapterListProvider>
				<DrawerProvider>
					<Root />
				</DrawerProvider>
			</AdapterListProvider>
		</UserProvider>
	);
}
