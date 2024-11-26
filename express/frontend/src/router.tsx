import { createBrowserRouter } from "react-router-dom";
import { App } from "./App";
import { UserProvider } from "./contexts/UserContext";
import { Dashboard } from "./components/dashboard/Dashboard";

export const router = createBrowserRouter([
	{
		path: "/",
		element: (
			<UserProvider>
				<App />
			</UserProvider>
		),

		children: [
			/*{
				path: "/create-adapter",
				children: [
					{
						index: true,
						element: <StartCreateAdapter />,
					},
					{
						path: "wizard",
						element: <Wizard />,
					},
				],
			},
			{
				path: "/adapter-check",
				element: <AdapterCheck />,
			},
			{
				path: "/adapter/:name",
				element: <AdapterDetails />,
				children: [
					{
						index: true,
						element: <AdapterDashboard />,
					},
					{
						path: "releases",
						element: <Releases />,
					},
					{
						path: "statistics",
						element: <AdapterStatistics />,
					},
					{
						path: "ratings",
						element: <AdapterRatings />,
					},
				],
			},*/
			{
				index: true,
				element: <Dashboard />,
			},
		],
	},
]);
