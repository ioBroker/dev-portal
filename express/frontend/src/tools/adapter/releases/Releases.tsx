import {
	Alert,
	AlertTitle,
	Button,
	Hidden,
	LinearProgress,
	Link,
	Paper,
	SxProps,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	Tooltip,
} from "@mui/material";
import axios from "axios";
import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { coerce } from "semver";
import { AuthConsentDialog } from "../../../components/AuthConsentDialog";
import {
	GitHubIcon,
	IoBrokerIcon,
	LatestIcon,
	NpmIcon,
} from "../../../components/Icons";
import { useAdapterContext } from "../../../contexts/AdapterContext";
import { useUserToken } from "../../../contexts/UserContext";
import { GitHubComm } from "../../../lib/gitHub";
import { getLatest } from "../../../lib/ioBroker";
import { getPackage as getPackageMetaData } from "../../../lib/npm";
import { RepositoriesAction } from "./UpdateRepositoriesDialog";

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

const sxIcon: SxProps = {
	paddingRight: "2px",
};

function Icons(props: { icons: ReleaseIcon[] }) {
	const { icons } = props;
	return (
		<>
			{icons.map((icon) => {
				switch (icon) {
					case "github":
						return (
							<Tooltip title="Current state on GitHub" key={icon}>
								<GitHubIcon sx={sxIcon} />
							</Tooltip>
						);
					case "npm":
						return (
							<Tooltip title="Latest version on npm" key={icon}>
								<NpmIcon sx={sxIcon} />
							</Tooltip>
						);
					case "beta":
						return (
							<Tooltip
								title="In ioBroker beta/latest repository"
								key={icon}
							>
								<LatestIcon sx={sxIcon} />
							</Tooltip>
						);
					case "stable":
						return (
							<Tooltip
								title="In ioBroker stable repository"
								key={icon}
							>
								<IoBrokerIcon sx={sxIcon} />
							</Tooltip>
						);
					default:
						return undefined;
				}
			})}
		</>
	);
}

const sxIcons: SxProps = {
	width: "1%",
	whiteSpace: "nowrap",
};

const sxButton: SxProps = {
	whiteSpace: "nowrap",
};

export function Releases() {
	const token = useUserToken();
	const { name, repo } = useAdapterContext();
	const location = useLocation();
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
			const gitHub = GitHubComm.forToken(token);
			const repoComm = gitHub.getRepo(repo!);
			const [npm, fullRepo, tags, latest, defaultHead] =
				await Promise.all([
					tryGetPackageMetaData(),
					repoComm.getRepo(),
					repoComm.getTags(),
					getLatest(),
					repoComm.getRef(`heads/${repo!.default_branch}`),
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
				const commit = await repoComm.getCommit(defaultHead.object.sha);
				const release: ReleaseInfo = {
					version: `(${repo!.default_branch})`,
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
	}, [name, token, repo]);

	useEffect(() => {
		const checkPackageInfo = async () => {
			const { data: pkg } = await axios.get<any>(
				`https://raw.githubusercontent.com/${repo!.full_name}/${repo!.default_branch}/package.json`,
			);
			setHasReleaseScript(!!pkg.scripts?.release);
		};
		setHasReleaseScript(undefined);
		checkPackageInfo().catch(console.error);
	}, [repo]);

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
			let redirect = encodeURIComponent(
				`${location.pathname}/~${releaseAction}`,
			);
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

	const DataRow = (props: { row: ReleaseInfo }) => {
		const { row } = props;
		return (
			<TableRow>
				<TableCell sx={sxIcons}>
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
							href={`https://github.com/${repo!.full_name}/commit/${row.commit}`}
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
			<Outlet />
			{canPush && rows?.length === 0 && (
				<Alert
					severity="error"
					action={
						<Button
							color="inherit"
							size="small"
							disabled={!hasReleaseScript}
							sx={sxButton}
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
							sx={sxButton}
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
								<TableCell sx={sxIcons}></TableCell>
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
