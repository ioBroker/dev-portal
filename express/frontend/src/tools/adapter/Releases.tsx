import Button from "@material-ui/core/Button";
import Hidden from "@material-ui/core/Hidden";
import LinearProgress from "@material-ui/core/LinearProgress";
import Link from "@material-ui/core/Link";
import Paper from "@material-ui/core/Paper";
import { makeStyles } from "@material-ui/core/styles";
import Table from "@material-ui/core/Table";
import TableBody from "@material-ui/core/TableBody";
import TableCell from "@material-ui/core/TableCell";
import TableContainer from "@material-ui/core/TableContainer";
import TableHead from "@material-ui/core/TableHead";
import TableRow from "@material-ui/core/TableRow";
import Tooltip from "@material-ui/core/Tooltip";
import Alert from "@material-ui/lab/Alert";
import AlertTitle from "@material-ui/lab/AlertTitle";
import axios from "axios";
import { useEffect, useState } from "react";
import { Route, useHistory, useParams, useRouteMatch } from "react-router-dom";
import { coerce } from "semver";
import AuthConsentDialog from "../../components/AuthConsentDialog";
import {
	GitHubIcon,
	IoBrokerIcon,
	LatestIcon,
	NpmIcon,
} from "../../components/Icons";
import { GitHubComm, User } from "../../lib/gitHub";
import { AdapterInfos, getLatest } from "../../lib/ioBroker";
import { getPackage as getPackageMetaData } from "../../lib/npm";
import CreateReleaseDialog from "./CreateReleaseDialog";
import UpdateRepositoriesDialog, {
	RepositoriesAction,
} from "./UpdateRepositoriesDialog";

type ReleaseAction = "release" | RepositoriesAction;

type ReleaseIcon = "github" | "npm" | "beta" | "stable";

interface ReleaseInfo {
	icons: ReleaseIcon[];
	version: string;
	date?: string;
	shortDate?: string;
	commit?: string;
	action?: ReleaseAction;
}

function setDates(release: ReleaseInfo, time: string) {
	const date = new Date(time);
	release.date = date.toLocaleString("de-DE", {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
	});
	release.shortDate = date.toLocaleString("de-DE", {
		day: "2-digit",
		month: "2-digit",
		year: "2-digit",
	});
}

const useIconStyles = makeStyles((theme) => ({
	icon: {
		paddingRight: 2,
	},
}));

function Icons(props: { icons: ReleaseIcon[] }) {
	const { icons } = props;
	const classes = useIconStyles();
	return (
		<>
			{icons.map((icon) => {
				switch (icon) {
					case "github":
						return (
							<Tooltip title="Current state on GitHub" key={icon}>
								<GitHubIcon className={classes.icon} />
							</Tooltip>
						);
					case "npm":
						return (
							<Tooltip title="Latest version on npm" key={icon}>
								<span className={classes.icon}>
									<NpmIcon className={classes.icon} />
								</span>
							</Tooltip>
						);
					case "beta":
						return (
							<Tooltip
								title="In ioBroker beta/latest repository"
								key={icon}
							>
								<LatestIcon className={classes.icon} />
							</Tooltip>
						);
					case "stable":
						return (
							<Tooltip
								title="In ioBroker stable repository"
								key={icon}
							>
								<span className={classes.icon}>
									<IoBrokerIcon />
								</span>
							</Tooltip>
						);
					default:
						return undefined;
				}
			})}
		</>
	);
}

const useStyles = makeStyles((theme) => ({
	icons: {
		width: "1%",
		whiteSpace: "nowrap",
	},
	button: {
		whiteSpace: "nowrap",
	},
}));

export default function Releases(props: { user: User; infos: AdapterInfos }) {
	const { user, infos } = props;
	const { path, url } = useRouteMatch();
	const history = useHistory();
	const { name } = useParams<{ name: string }>();
	const [canPush, setCanPush] = useState<boolean>();
	const [rows, setRows] = useState<ReleaseInfo[]>();
	const [hasReleaseScript, setHasReleaseScript] = useState<boolean>();
	const [authReason, setAuthReason] = useState<string>();
	const [authActions, setAuthActions] = useState<string[]>([]);
	const [releaseAction, setReleaseAction] = useState<ReleaseAction>();
	const [releaseVersion, setReleaseVersion] = useState<string>();

	useEffect(() => {
		const tryGetPackageMetaData = async () => {
			try {
				return await getPackageMetaData(`iobroker.${name}`);
			} catch {
				return undefined;
			}
		};
		const loadReleases = async () => {
			const gitHub = GitHubComm.forToken(user.token);
			const repo = gitHub.getRepo(infos.repo);
			const [
				npm,
				fullRepo,
				tags,
				latest,
				defaultHead,
			] = await Promise.all([
				tryGetPackageMetaData(),
				repo.getRepo(),
				repo.getTags(),
				getLatest(),
				repo.getRef(`heads/${infos.repo.default_branch}`),
			]);
			setCanPush(fullRepo.permissions?.push);
			const releases: ReleaseInfo[] = [];
			if (npm) {
				const adapter = latest[name];
				const adapterStableSemver = coerce(adapter?.stable);
				const latestNpm = npm["dist-tags"].latest;
				for (const version of Object.keys(npm.versions).reverse()) {
					const semver = coerce(version);
					const release: ReleaseInfo = { version, icons: [] };
					const time = npm.time[version];
					if (time) {
						setDates(release, time);
					}
					const tag = tags.find((t) => t.name === `v${version}`);
					if (tag) {
						release.commit = tag.commit.sha;
					}
					if (adapter?.stable === version) {
						release.icons.push("stable");
					}
					if (adapter?.version === version) {
						release.icons.push("beta");
					}
					if (version === latestNpm) {
						release.icons.push("npm");
						if (!adapter) {
							release.action = "to-latest";
						}
					}
					if (
						adapter &&
						(!adapterStableSemver ||
							semver?.compare(adapterStableSemver) === 1)
					) {
						release.action = "to-stable";
					}
					releases.push(release);
				}
			}

			const masterRelease = releases.find(
				(r) => r.commit === defaultHead.object.sha,
			);
			if (masterRelease) {
				masterRelease.icons.push("github");
			} else {
				const commit = await repo.getCommit(defaultHead.object.sha);
				const release: ReleaseInfo = {
					version: `(${infos.repo.default_branch})`,
					icons: ["github"],
					commit: defaultHead.object.sha,
					action: "release",
				};
				setDates(release, commit.committer.date);
				releases.unshift(release);
			}

			setRows(releases);
		};
		setCanPush(undefined);
		setRows(undefined);
		loadReleases().catch((e) => {
			console.error(e);
			setRows([]);
		});
	}, [name, user, infos]);

	useEffect(() => {
		const checkPackageInfo = async () => {
			const { data: pkg } = await axios.get(
				`https://raw.githubusercontent.com/${infos.repo.full_name}/${infos.repo.default_branch}/package.json`,
			);
			setHasReleaseScript(!!pkg.scripts?.release);
		};
		setHasReleaseScript(undefined);
		checkPackageInfo().catch(console.error);
	}, [infos]);

	useEffect(() => {
		switch (releaseAction) {
			case "release":
				setAuthReason("create a new release");
				setAuthActions([
					"download your repository",
					"execute the release script which will update some files",
					"upload all changes performed by the release script",
					"tag the new release",
					"let GitHub actions create a new npm and GitHub release (if configured)",
				]);
				break;
			case "to-latest":
				setAuthReason(
					`add ioBroker.${name} to the beta/latest repository`,
				);
				setAuthActions([
					"fork ioBroker.repositories to the user or organization you choose (if not yet done)",
					"create a new branch",
					"update sources-dist.json",
					"create a pull request for those changes",
				]);
				break;
			case "to-stable":
				setAuthReason(
					`update ioBroker.${name} in the stable repository`,
				);
				setAuthActions([
					"fork ioBroker.repositories to the user or organization you choose (if not yet done)",
					"create a new branch",
					"update sources-dist-stable.json",
					"create a pull request for those changes",
				]);
				break;
		}
	}, [releaseAction, name]);

	const handleConsent = (ok: boolean) => {
		setAuthReason(undefined);
		if (ok) {
			let redirect = encodeURIComponent(`${url}/~${releaseAction}`);
			if (releaseVersion) {
				redirect += `/${releaseVersion}`;
			}
			window.location.href = `/login?redirect=${redirect}&scope=repo`;
		} else {
			setReleaseAction(undefined);
		}
	};
	const setReleaseInfo = (action: ReleaseAction, version?: string) => {
		setReleaseVersion(version);
		setReleaseAction(action);
	};
	const handleCreateRelease = () => setReleaseInfo("release");
	const handleToLatest = () => setReleaseInfo("to-latest");
	const handleToStable = (version: string) =>
		setReleaseInfo("to-stable", version);
	const handleCloseDialog = () => history.replace(url.replace(/\/~.+$/, ""));

	const classes = useStyles();
	const DataRow = (props: { row: ReleaseInfo }) => {
		const { row } = props;
		return (
			<TableRow>
				<TableCell className={classes.icons}>
					<Icons icons={row.icons} />
				</TableCell>
				<TableCell>{row.version}</TableCell>
				<TableCell>
					<Hidden smDown>{row.date}</Hidden>
					<Hidden mdUp>{row.shortDate}</Hidden>
				</TableCell>
				<TableCell>
					{row.commit && (
						<Link
							href={`https://github.com/${infos.repo.full_name}/commit/${row.commit}`}
							target="_blank"
						>
							{row.commit.substring(0, 7)}
						</Link>
					)}
					{!row.commit && (
						<Tooltip title="No git tag found for this release">
							<span>n/a</span>
						</Tooltip>
					)}
				</TableCell>
				{canPush && (
					<TableCell>
						{row.action === "release" && (
							<Button
								variant="contained"
								color="primary"
								size="small"
								disabled={!hasReleaseScript}
								startIcon={<NpmIcon />}
								onClick={handleCreateRelease}
							>
								Create new release
							</Button>
						)}
						{row.action === "to-stable" && (
							<Button
								variant="contained"
								color="primary"
								size="small"
								startIcon={<IoBrokerIcon />}
								onClick={() => handleToStable(row.version)}
							>
								Set as stable
							</Button>
						)}
						{row.action === "to-latest" && (
							<Button
								variant="contained"
								color="primary"
								size="small"
								startIcon={<LatestIcon />}
								onClick={handleToLatest}
							>
								Add to latest
							</Button>
						)}
					</TableCell>
				)}
			</TableRow>
		);
	};
	return (
		<Paper>
			<AuthConsentDialog
				reason={authReason || ""}
				actions={authActions}
				open={!!authReason}
				onCancel={() => handleConsent(false)}
				onContinue={() => handleConsent(true)}
			/>
			<Route path={`${path}/~release`}>
				<CreateReleaseDialog
					infos={infos}
					open={true}
					onClose={handleCloseDialog}
				/>
			</Route>
			<Route path={`${path}/~to-latest`}>
				<UpdateRepositoriesDialog
					infos={infos}
					user={user}
					action="to-latest"
					open={true}
					onClose={handleCloseDialog}
				/>
			</Route>
			<Route path={`${path}/~to-stable/:version`}>
				<UpdateRepositoriesDialog
					infos={infos}
					user={user}
					action="to-stable"
					open={true}
					onClose={handleCloseDialog}
				/>
			</Route>
			{canPush && rows?.length === 0 && (
				<Alert
					severity="error"
					action={
						<Button
							color="inherit"
							size="small"
							disabled={!hasReleaseScript}
							className={classes.button}
							onClick={handleCreateRelease}
						>
							Create initial release
						</Button>
					}
				>
					<AlertTitle>Not on npm</AlertTitle>
					This adapter was not yet published on npm.
				</Alert>
			)}
			{canPush && hasReleaseScript === false && (
				<Alert
					severity="warning"
					action={
						<Button
							color="inherit"
							size="small"
							className={classes.button}
							href="https://github.com/AlCalzone/release-script#installation"
							target="_blank"
						>
							Learn more
						</Button>
					}
				>
					<AlertTitle>No release script</AlertTitle>
					This adapter is not configured to use the release script.
					You won't be able to create new releases from this page.
				</Alert>
			)}
			{canPush === false && (
				<Alert severity="info">
					<AlertTitle>No push permissions</AlertTitle>
					You don't have push permissions for this adapter. Therefore
					you won't be able to create new releases or update
					ioBroker.repositories.
				</Alert>
			)}
			{rows?.length !== 0 && (
				<TableContainer>
					<Table size="small" stickyHeader>
						<TableHead>
							<TableRow>
								<TableCell
									className={classes.icons}
								></TableCell>
								<TableCell>Release</TableCell>
								<TableCell>Date</TableCell>
								<TableCell>Commit</TableCell>
								{canPush && <TableCell>Action</TableCell>}
							</TableRow>
						</TableHead>
						<TableBody>
							{!rows ? (
								<TableRow>
									<TableCell colSpan={5}>
										<LinearProgress />
									</TableCell>
								</TableRow>
							) : (
								rows.map((row, i) => (
									<DataRow row={row} key={i} />
								))
							)}
						</TableBody>
					</Table>
				</TableContainer>
			)}
		</Paper>
	);
}
