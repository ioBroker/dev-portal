import {
	Avatar,
	Badge,
	Dialog,
	DialogTitle,
	IconButton,
	List,
	ListItem,
	ListItemAvatar,
	ListItemText,
	Tooltip,
} from "@mui/material";
import { forwardRef, useEffect, useState } from "react";
import { Rating as IoBrokerRating } from "../../../../backend/src/global/iobroker";
import { ProjectInfo } from "../../../../backend/src/global/sentry";
import { useAdapterContext } from "../../contexts/AdapterContext";
import {
	AdapterListType,
	useAdapterList,
} from "../../contexts/AdapterListContext";
import { useUserContext } from "../../contexts/UserContext";
import { GitHubComm } from "../../lib/gitHub";
import {
	getAllRatings,
	getSentryProjectInfos,
	getSentryStats,
	getWeblateAdapterComponents,
	hasDiscoverySupport,
} from "../../lib/ioBroker";
import { CardButton } from "../CardButton";
import {
	AdapterCheckIcon,
	DiscoveryIcon,
	GitHubIcon,
	SentryIcon,
	WeblateIcon,
} from "../Icons";
import { DashboardCard } from "./DashboardCard";

const uc = encodeURIComponent;

export function AdapterCard({ type }: { type: AdapterListType }) {
	const {
		add,
		remove,
		adapters: { favorites },
	} = useAdapterList();
	const { name, repoName, info, repo } = useAdapterContext();

	const [rating, setRating] = useState<IoBrokerRating>();
	const text =
		info?.desc?.en ||
		(repo ? repo.description || "No description available" : "...");
	const isFavorite = !!favorites?.some(
		(f) => f.owner === repoName.owner && f.name === repoName.name,
	);

	useEffect(() => {
		getAllRatings()
			.then((ratings) => setRating(ratings[name]?.rating))
			.catch(console.error);
	}, [name]);
	return (
		<DashboardCard
			title={`ioBroker.${name}`}
			to={`/adapter/${repoName.owner}/${repoName.name}`}
			img={info?.extIcon}
			liked={isFavorite}
			onLikeChanged={(liked) => {
				if (liked) {
					add(
						"favorites",
						`${repoName.owner}/${repoName.name}`,
					).catch(console.error);
				} else {
					remove("favorites", repoName).catch(console.error);
				}
			}}
			badges={{
				"npm version": `https://img.shields.io/npm/v/iobroker.${name}.svg`,
				"Stable version": `https://iobroker.live/badges/${name}-stable.svg`,
			}}
			rating={rating}
			text={text}
			onClose={
				type === "watches"
					? () => {
							remove(type, repoName).catch(console.error);
						}
					: undefined
			}
			buttons={[
				<AdapterGitHubButton />,
				<CardButton
					icon={
						<Tooltip title="Start Adapter Check">
							<AdapterCheckIcon />
						</Tooltip>
					}
					to={`/adapter-check?repo=${repo?.full_name}`}
					disabled={!repo}
				/>,
				<AdapterDiscoveryButton />,
				<AdapterSentryButton />,
				<AdapterWeblateButton />,
			]}
			squareImg
		/>
	);
}

function AdapterGitHubButton() {
	const [counts, setCounts] = useState("");
	const [color, setColor] = useState<"primary" | "error">("primary");
	const { user } = useUserContext();
	const { repo } = useAdapterContext();

	useEffect(() => {
		const loadPullRequests = async () => {
			if (!user || !repo) {
				return;
			}
			if (!repo.open_issues) {
				setCounts("no open PRs / no open issues");
				return;
			}

			const gitHub = GitHubComm.forToken(user.token);
			const pullRequests = await gitHub
				.getRepo(repo)
				.getPullRequests("open");
			const prCount = pullRequests.length;
			const issueCount = repo.open_issues - prCount;
			const getText = (value: number, type: string) => {
				return `${value || "no"} open ${type}${value === 1 ? "" : "s"}`;
			};

			setCounts(
				`${getText(prCount, "PR")} / ${getText(issueCount, "issue")}`,
			);
			setColor(prCount > 0 ? "error" : "primary");
		};
		loadPullRequests().catch(console.error);
	}, [repo, user]);

	return (
		<CardButton
			icon={
				<Tooltip title={`GitHub Repository (${counts})`}>
					<Badge badgeContent={repo?.open_issues} color={color}>
						<GitHubIcon />
					</Badge>
				</Tooltip>
			}
			url={repo?.html_url}
			disabled={!repo}
		/>
	);
}

function AdapterDiscoveryButton() {
	const { name } = useAdapterContext();
	const [discoveryLink, setDiscoveryLink] = useState<string>();

	useEffect(() => {
		hasDiscoverySupport(name).then((d) => {
			if (d) {
				setDiscoveryLink(
					`https://github.com/ioBroker/ioBroker.discovery/blob/master/lib/adapters/` +
						`${uc(name)}.js`,
				);
			}
		});
	}, [name]);
	return (
		<Tooltip
			title={`${
				discoveryLink ? "S" : "Not s"
			}upported by ioBroker.discovery`}
		>
			<span>
				<CardButton
					disabled={!discoveryLink}
					icon={<DiscoveryIcon />}
					url={discoveryLink}
				/>
			</span>
		</Tooltip>
	);
}

const SentryErrorBadge = forwardRef(
	(props: { errors: number[]; children: any }, ref: any) => {
		const { errors, children } = props;
		const errorCount = errors[0] || errors[1];
		const color = errors[0] ? "error" : "primary";
		return (
			<Badge badgeContent={errorCount} color={color} {...props} ref={ref}>
				{children}
			</Badge>
		);
	},
);

function AdapterSentryButton() {
	const { name } = useAdapterContext();
	const [projects, setProjects] = useState<ProjectInfo[]>([]);
	const [tooltip, setTooltip] = useState("Sentry available for this adapter");
	const [errorCount, setErrorCount] = useState<number[]>();
	const [errorCounts, setErrorCounts] = useState<number[][]>([]);
	const [open, setOpen] = useState(false);

	useEffect(() => {
		const loadProjects = async () => {
			const allProjects = await getSentryProjectInfos();
			const projects = allProjects.filter((p) => p.adapterName === name);
			setProjects(projects);
			if (projects.length === 0) {
				return;
			}
			const stats24h = await getSentryStats(
				projects.map((p) => p.id),
				"24h",
			);
			const stats30d = await getSentryStats(
				projects.map((p) => p.id),
				"30d",
			);
			const errors = [
				stats24h.map(
					(stat) =>
						stat.stats?.reduce((old, num) => old + num[1], 0) ?? 0,
				),
				stats30d.map(
					(stat) =>
						stat.stats?.reduce((old, num) => old + num[1], 0) ?? 0,
				),
			];
			setErrorCounts(errors);

			const totalErrors = errors.map((e) =>
				e.reduce((old, err) => old + err, 0),
			);
			setErrorCount(totalErrors);

			if (totalErrors[0]) {
				setTooltip(
					`Sentry (${totalErrors[0]} errors in the last 24 hours)`,
				);
			} else {
				setTooltip(
					`Sentry (${totalErrors[1]} errors in the last 30 days)`,
				);
			}
		};
		loadProjects().catch((e) => console.error(name, e));
	}, [name]);

	if (projects.length === 0) {
		return (
			<Tooltip title="Sentry not used by this adapter">
				<span>
					<CardButton disabled icon={<SentryIcon />} />
				</span>
			</Tooltip>
		);
	} else if (projects.length === 1) {
		return (
			<CardButton
				icon={
					<Tooltip title={tooltip}>
						<SentryErrorBadge errors={errorCount || []}>
							<SentryIcon />
						</SentryErrorBadge>
					</Tooltip>
				}
				url={`https://sentry.iobroker.net/organizations/iobroker/issues/?project=${projects[0].id}`}
			/>
		);
	} else {
		const openProject = (project: ProjectInfo) => {
			window.open(
				`https://sentry.iobroker.net/organizations/iobroker/issues/?project=${project.id}`,
				"_blank",
			);
		};

		return (
			<>
				<IconButton
					size="small"
					color="primary"
					onClick={() => setOpen(true)}
				>
					<Tooltip title={tooltip}>
						<SentryErrorBadge errors={errorCount || []}>
							<SentryIcon />
						</SentryErrorBadge>
					</Tooltip>
				</IconButton>
				<Dialog
					onClose={() => setOpen(false)}
					aria-labelledby="sentry-dialog-title"
					open={open}
				>
					<DialogTitle id="sentry-dialog-title">
						Choose Sentry project
					</DialogTitle>
					<List>
						{projects.map((project, index) => (
							<ListItem
								onClick={() => openProject(project)}
								key={index}
							>
								<ListItemAvatar>
									<SentryErrorBadge
										errors={
											errorCounts.length > 0
												? [
														errorCounts[0][index],
														errorCounts[1][index],
													]
												: []
										}
									>
										<Avatar>
											<SentryIcon />
										</Avatar>
									</SentryErrorBadge>
								</ListItemAvatar>
								<ListItemText primary={project.slug} />
							</ListItem>
						))}
					</List>
				</Dialog>
			</>
		);
	}
}

function AdapterWeblateButton() {
	const { name } = useAdapterContext();
	const [weblateLink, setWeblateLink] = useState<string>();

	useEffect(() => {
		getWeblateAdapterComponents()
			.then((components) => {
				const component = components.find((c: any) => c.name === name);
				if (component) {
					setWeblateLink(
						`https://weblate.iobroker.net/projects/adapters/${uc(
							component.slug,
						)}/`,
					);
				}
			})
			.catch(console.error);
	}, [name]);

	return (
		<Tooltip
			title={`Translations ${
				weblateLink ? "" : "not "
			}available on Weblate`}
		>
			<span>
				<CardButton
					disabled={!weblateLink}
					icon={<WeblateIcon />}
					url={weblateLink ?? undefined}
				/>
			</span>
		</Tooltip>
	);
}
