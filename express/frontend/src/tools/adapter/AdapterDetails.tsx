import NavigateNextIcon from "@mui/icons-material/NavigateNext";
import { Breadcrumbs, LinearProgress, Link, Typography } from "@mui/material";
import { useMemo } from "react";
import {
	Outlet,
	Link as RouterLink,
	useMatches,
	useParams,
} from "react-router-dom";
import { AdapterContextProvider } from "../../contexts/AdapterContext";

const LinkRouter = (props: any) => <Link {...props} component={RouterLink} />;

export function AdapterDetails() {
	const matches = useMatches();
	const pathNames = matches[matches.length - 1].pathname
		.replace(/\/~.+?$/g, "")
		.split("/")
		.slice(4)
		.filter(Boolean);
	const { owner, repo } = useParams<"owner" | "repo">();

	const toText = (value: string) => {
		const sentence = value.replace(/([A-Z])/g, " $1");
		return sentence.charAt(0).toUpperCase() + sentence.slice(1);
	};

	const repoName = useMemo(
		() => ({ owner: owner!, name: repo! }),
		[owner, repo],
	);

	return (
		<>
			<Breadcrumbs
				separator={<NavigateNextIcon fontSize="small" />}
				sx={{ paddingBottom: 1 }}
			>
				<LinkRouter color="inherit" to={"."}>
					{repo}
				</LinkRouter>
				{pathNames.map((value, index) => {
					const last = index === pathNames.length - 1;
					const to = `${pathNames.slice(0, index + 1).join("/")}`;

					return last ? (
						<Typography color="textPrimary" key={to}>
							{toText(value)}
						</Typography>
					) : (
						<LinkRouter color="inherit" to={to} key={to}>
							{toText(value)}
						</LinkRouter>
					);
				})}
			</Breadcrumbs>
			<AdapterContextProvider
				repoName={repoName}
				fallback={<LinearProgress />}
			>
				<Outlet />
			</AdapterContextProvider>
		</>
	);
}
