import NavigateNextIcon from "@mui/icons-material/NavigateNext";
import {
	Alert,
	AlertTitle,
	Breadcrumbs,
	LinearProgress,
	Link,
	makeStyles,
	Typography,
} from "@mui/material";
import { useEffect, useState } from "react";
import { Outlet, Route, Link as RouterLink, useParams } from "react-router-dom";
import { GitHubComm, User } from "../../lib/gitHub";
import {
	AdapterInfos,
	getAdapterInfos,
	getLatest,
	getMyAdapterInfos,
	getWatchedAdapterInfos,
} from "../../lib/ioBroker";
import AdapterDashboard from "./AdapterDashboard";
import AdapterRatings from "./AdapterRatings";
import AdapterStatistics from "./AdapterStatistics";
import Releases from "./Releases";
import { useUserContext } from "../../contexts/UserContext";
import { AdapterProvider } from "../../contexts/AdapterContext";

const LinkRouter = (props: any) => <Link {...props} component={RouterLink} />;

const useStyles = makeStyles((theme) => ({
	breadcrumbs: {
		paddingBottom: theme.spacing(1),
	},
}));

export function AdapterDetails() {
	const user = useUserContext();
	const { path, url } = useRouteMatch();
	const { name } = useParams<{ name: string }>();

	const history = useHistory();
	const pathNames = history.location.pathname
		.replace(url, "")
		.replace(/~.+$/, "")
		.split("/")
		.filter((x) => x);

	const [infos, setInfos] = useState<AdapterInfos | string>();

	useEffect(() => {
		const loadInfos = async () => {
			const myAdapters = await getMyAdapterInfos(user.token);
			let found = myAdapters.find((a) => a.info?.name === name);
			if (found) {
				return setInfos(found);
			}
			const watchedAdapters = await getWatchedAdapterInfos(user.token);
			found = watchedAdapters.find((a) => a.info?.name === name);
			if (found) {
				return setInfos(found);
			}
			const gitHub = GitHubComm.forToken(user.token);
			const latest = await getLatest();
			if (latest[name]) {
				// meta: https://raw.githubusercontent.com/misanorot/ioBroker.alarm/master/io-package.json
				const match = latest[name].meta.match(
					new RegExp(`/([^/]+)/ioBroker\\.${name}/`),
				);
				if (match) {
					return setInfos(
						await getAdapterInfos(
							await gitHub
								.getRepo(match[1], `ioBroker.${name}`)
								.getRepo(),
							latest,
						),
					);
				}
			}

			setInfos(`Couldn't find ioBroker.${name}`);
		};
		loadInfos().catch(console.error);
	}, [name, user]);

	const toText = (value: string) => {
		const sentence = value.replace(/([A-Z])/g, " $1");
		return sentence.charAt(0).toUpperCase() + sentence.slice(1);
	};

	const classes = useStyles();
	return (
		<>
			<Breadcrumbs
				separator={<NavigateNextIcon fontSize="small" />}
				className={classes.breadcrumbs}
			>
				<LinkRouter color="inherit" to={url}>
					ioBroker.{name}
				</LinkRouter>
				{pathNames.map((value, index) => {
					const last = index === pathNames.length - 1;
					const to = `${url}/${pathNames
						.slice(0, index + 1)
						.join("/")}`;

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
			{typeof infos === "string" ? (
				<Alert severity="error">
					<AlertTitle>Error</AlertTitle>
					{infos}
				</Alert>
			) : infos?.info ? (
				<AdapterProvider infos={infos}>
					<Outlet />
				</AdapterProvider>
			) : (
				<LinearProgress />
			)}
		</>
	);
}
