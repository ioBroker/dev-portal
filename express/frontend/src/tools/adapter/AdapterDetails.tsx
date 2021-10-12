import Breadcrumbs from "@material-ui/core/Breadcrumbs";
import LinearProgress from "@material-ui/core/LinearProgress";
import Link from "@material-ui/core/Link";
import { makeStyles } from "@material-ui/core/styles";
import Typography from "@material-ui/core/Typography";
import NavigateNextIcon from "@material-ui/icons/NavigateNext";
import Alert from "@material-ui/lab/Alert";
import AlertTitle from "@material-ui/lab/AlertTitle";
import { useEffect, useState } from "react";
import {
	Link as RouterLink,
	Route,
	Switch,
	useHistory,
	useParams,
	useRouteMatch,
} from "react-router-dom";
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

const LinkRouter = (props: any) => <Link {...props} component={RouterLink} />;

const useStyles = makeStyles((theme) => ({
	breadcrumbs: {
		paddingBottom: theme.spacing(1),
	},
}));

export default function CreateAdapter(props: { user: User }) {
	const { user } = props;
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
				<Switch>
					<Route exact path={path}>
						<AdapterDashboard infos={infos} />
					</Route>
					<Route path={`${path}/releases`}>
						<Releases user={user} infos={infos} />
					</Route>
					<Route path={`${path}/statistics`}>
						<AdapterStatistics />
					</Route>
					<Route path={`${path}/ratings`}>
						<AdapterRatings />
					</Route>
				</Switch>
			) : (
				<LinearProgress />
			)}
		</>
	);
}
