import { createBrowserRouter } from "react-router-dom";
import { App } from "./App";
import { Dashboard } from "./components/dashboard/Dashboard";
import { UserProvider } from "./contexts/UserContext";
import { AdapterDashboard } from "./tools/adapter/AdapterDashboard";
import { AdapterDetails } from "./tools/adapter/AdapterDetails";
import { AdapterRatings } from "./tools/adapter/AdapterRatings";
import { AdapterStatistics } from "./tools/adapter/AdapterStatistics";
import { StartCreateAdapter } from "./tools/create-adapter/StartCreateAdapter";

export const router = createBrowserRouter([
	{
		path: "/",
		element: (
			<UserProvider>
				<App />
			</UserProvider>
		),

		children: [
			{
				path: "/create-adapter",
				children: [
					{
						index: true,
						element: <StartCreateAdapter />,
					},
					/*{
						path: "wizard",
						element: <Wizard />,
					},*/
				],
			},
			/*{
				path: "/adapter-check",
				element: <AdapterCheck />,
			},*/
			{
				path: "/adapter/:name",
				element: <AdapterDetails />,
				children: [
					{
						index: true,
						element: <AdapterDashboard />,
					},
					/*{
						path: "releases",
						element: <Releases />,
					},*/
					{
						path: "statistics",
						element: <AdapterStatistics />,
					},
					{
						path: "ratings",
						element: <AdapterRatings />,
					},
				],
			},
			{
				index: true,
				element: <Dashboard />,
			},
		],
	},
]);
