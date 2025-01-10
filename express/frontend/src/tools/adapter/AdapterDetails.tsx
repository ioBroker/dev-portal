import NavigateNextIcon from "@mui/icons-material/NavigateNext";
import {
	Alert,
	AlertTitle,
	Breadcrumbs,
	LinearProgress,
	Link,
	Typography,
} from "@mui/material";
import { useEffect, useState } from "react";
import {
	Outlet,
	Link as RouterLink,
	useMatches,
	useParams,
} from "react-router-dom";
import { AdapterProvider } from "../../contexts/AdapterContext";
import { useUserContext } from "../../contexts/UserContext";
import { GitHubComm } from "../../lib/gitHub";
import {
	AdapterInfos,
	getAdapterInfos,
	getLatest,
	getMyAdapterInfos,
	getWatchedAdapterInfos,
} from "../../lib/ioBroker";

const LinkRouter = (props: any) => <Link {...props} component={RouterLink} />;

export function AdapterDetails() {
	const { user } = useUserContext();
	const matches = useMatches();
	const pathNames = matches[matches.length - 1].pathname
		.split("/")
		.slice(3)
		.filter(Boolean);
	const { name } = useParams<"name">();

	const [infos, setInfos] = useState<AdapterInfos | string>();

	useEffect(() => {
		const loadInfos = async () => {
			const token = user?.token;
			if (!token || !name) {
				return;
			}
			const myAdapters = await getMyAdapterInfos(token);
			let found = myAdapters.find((a) => a.info?.name === name);
			if (found) {
				return setInfos(found);
			}
			const watchedAdapters = await getWatchedAdapterInfos(token);
			found = watchedAdapters.find((a) => a.info?.name === name);
			if (found) {
				return setInfos(found);
			}
			const gitHub = GitHubComm.forToken(token);
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

	return (
		<>
			<Breadcrumbs
				separator={<NavigateNextIcon fontSize="small" />}
				sx={{ paddingBottom: (theme) => theme.spacing(1) }}
			>
				<LinkRouter color="inherit" to={"."}>
					ioBroker.{name}
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
