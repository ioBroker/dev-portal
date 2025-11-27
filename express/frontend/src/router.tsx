import { Paper, Typography } from "@mui/material";
import { createBrowserRouter, useRouteError } from "react-router-dom";
import { App } from "./App";
import { Dashboard } from "./components/dashboard/Dashboard";
import { LoginButton } from "./components/dashboard/LoginButton";
import { UserProvider, UserTokenMissingError } from "./contexts/UserContext";
import { AdapterDashboard } from "./tools/adapter/AdapterDashboard";
import { AdapterDetails } from "./tools/adapter/AdapterDetails";
import { AdapterRatings } from "./tools/adapter/AdapterRatings";
import { CreateReleaseDialog } from "./tools/adapter/releases/CreateReleaseDialog";
import { Releases } from "./tools/adapter/releases/Releases";
import { UpdateRepositoriesDialog } from "./tools/adapter/releases/UpdateRepositoriesDialog";
import { Statistics } from "./tools/adapter/statistics/Statistics";
import { AdapterCheck } from "./tools/AdapterCheck";
import { StartCreateAdapter } from "./tools/create-adapter/StartCreateAdapter";
import { Wizard } from "./tools/create-adapter/Wizard";
import { RepoStatistics } from "./tools/repo-statistics/RepoStatistics";

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
				path: "/",
				errorElement: <ErrorBoundary />,
				children: [
					{
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
						path: "/statistics",
						element: <RepoStatistics />,
					},
					{
						path: "/adapter/:owner/:repo",
						element: <AdapterDetails />,
						children: [
							{
								index: true,
								element: <AdapterDashboard />,
							},
							{
								path: "releases",
								element: <Releases />,
								children: [
									{
										path: "~release",
										element: <CreateReleaseDialog />,
									},
									{
										path: "~to-latest",
										element: (
											<UpdateRepositoriesDialog action="to-latest" />
										),
									},
									{
										path: "~to-stable/:version",
										element: (
											<UpdateRepositoriesDialog action="to-stable" />
										),
									},
								],
							},
							{
								path: "statistics",
								element: <Statistics />,
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
		],
	},
]);

function ErrorBoundary() {
	let error = useRouteError();
	if (error instanceof UserTokenMissingError) {
		return (
			<Paper sx={{ padding: 2 }}>
				<Typography variant="h4">Not logged in</Typography>
				<p>You need to be logged in to access this page.</p>
				<p>
					<LoginButton variant="contained" />
				</p>
			</Paper>
		);
	}

	throw error;
}
