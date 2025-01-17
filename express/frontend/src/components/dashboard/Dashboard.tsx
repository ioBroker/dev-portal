import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import {
	Accordion,
	AccordionDetails,
	AccordionSummary,
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
	Typography,
} from "@mui/material";
import axios from "axios";
import React, { useEffect, useState } from "react";
import { ProjectInfo } from "../../../../backend/src/global/sentry";
import { useAdapterList } from "../../contexts/AdapterListContext";
import { useUserContext } from "../../contexts/UserContext";
import { GitHubComm, Repository } from "../../lib/gitHub";
import {
	AdapterInfos,
	getAllRatings,
	getSentryProjectInfos,
	getSentryStats,
	getWeblateAdapterComponents,
	hasDiscoverySupport,
} from "../../lib/ioBroker";
import { notEmpty } from "../../lib/utils";
import { CardButton } from "../CardButton";
import {
	AdapterCheckIcon,
	DiscoveryIcon,
	GitHubIcon,
	SentryIcon,
	WeblateIcon,
} from "../Icons";
import { AddWatchDialog } from "./AddWatchDialog";
import { CardGrid, CardGridProps } from "./CardGrid";
import { DashboardCardProps } from "./DashboardCard";
import { LoginButton } from "./LoginButton";
import { getToolsCards, resourcesCards, socialCards } from "./static";

const MY_ADAPTERS_CATEGORY = "My Adapters";
const WATCHED_ADAPTERS_CATEGORY = "Watched Adapters";
const COLLAPSED_CATEGORIES_KEY = "DASH_COLLAPSED_CATEGORIES";

const uc = encodeURIComponent;

function AdapterGitHubButton({ repo }: { repo: Repository }) {
	const [counts, setCounts] = useState(`${repo.open_issues} open issues/PRs`);
	const [color, setColor] = useState<"primary" | "error">("primary");
	const { user } = useUserContext();

	useEffect(() => {
		const loadPullRequests = async () => {
			if (!user) {
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
					<Badge badgeContent={repo.open_issues} color={color}>
						<GitHubIcon />
					</Badge>
				</Tooltip>
			}
			url={repo.html_url}
		/>
	);
}

const SentryErrorBadge = React.forwardRef(
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

function AdapterSentryButton(props: { projects: ProjectInfo[] }) {
	const { projects } = props;

	const [tooltip, setTooltip] = useState("Sentry available for this adapter");
	const [errorCount, setErrorCount] = useState<number[]>();
	const [errorCounts, setErrorCounts] = useState<number[][]>([]);
	const [open, setOpen] = useState(false);

	useEffect(() => {
		if (projects.length === 0) {
			return;
		}

		const loadProjectInfos = async () => {
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
					(stat) => stat.stats.reduce((old, num) => old + num[1], 0),
					0,
				),
				stats30d.map(
					(stat) => stat.stats.reduce((old, num) => old + num[1], 0),
					0,
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
		loadProjectInfos().catch(console.error);
	}, [projects]);

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

async function getDiscoveryLink(adapterName: string) {
	try {
		if (await hasDiscoverySupport(adapterName)) {
			return (
				`https://github.com/ioBroker/ioBroker.discovery/blob/master/lib/adapters/` +
				`${uc(adapterName)}.js`
			);
		}
		return "";
	} catch (error) {
		console.error(error);
		return "";
	}
}

async function getWeblateLink(adapterName: string) {
	try {
		const components = await getWeblateAdapterComponents();
		const component = components.find((c: any) => c.name === adapterName);
		if (component) {
			return (
				`https://weblate.iobroker.net/projects/adapters/` +
				`${uc(component.slug)}/`
			);
		}
	} catch {
		// ignore and leave "weblateLink" empty
	}

	return "";
}

async function getSentryProjects(adapterName: string) {
	const allProjects = await getSentryProjectInfos();
	return allProjects.filter((p) => p.adapterName === adapterName);
}

async function getAdapterCard(
	infos: AdapterInfos,
	onClose?: () => void,
): Promise<DashboardCardProps | undefined> {
	const { repo, info } = infos;
	if (!info) {
		return;
	}
	const [discoveryLink, weblateLink, sentryProjects, ratings] =
		await Promise.all([
			getDiscoveryLink(info.name),
			getWeblateLink(info.name),
			getSentryProjects(info.name),
			getAllRatings(),
		]);

	return {
		title: repo.name,
		onClose,
		img: info?.extIcon,
		badges: {
			"npm version": `https://img.shields.io/npm/v/iobroker.${info.name}.svg`,
			"Stable version": `https://iobroker.live/badges/${info.name}-stable.svg`,
		},
		rating: ratings[info.name]?.rating,
		text: info?.desc?.en || repo.description || "No description available",
		squareImg: true,
		to: `/adapter/${info.name}`,
		buttons: [
			<AdapterGitHubButton repo={repo} />,
			<CardButton
				icon={
					<Tooltip title="Start Adapter Check">
						<AdapterCheckIcon />
					</Tooltip>
				}
				to={`/adapter-check?repo=${repo.full_name}`}
			/>,
			<Tooltip
				title={`${
					discoveryLink ? "S" : "Not s"
				}upported by ioBroker.discovery`}
			>
				<span>
					<CardButton
						disabled={!discoveryLink}
						icon={<DiscoveryIcon />}
						url={discoveryLink ?? undefined}
					/>
				</span>
			</Tooltip>,
			<AdapterSentryButton projects={sentryProjects ?? []} />,
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
			</Tooltip>,
		],
	};
}

export function Dashboard() {
	const { user, login } = useUserContext();
	const { own, watched, addWatched, removeWatched } = useAdapterList();

	const [categories, setCategories] = useState<Record<string, CardGridProps>>(
		{
			Resources: { cards: resourcesCards },
			Social: { cards: socialCards },
			Tools: { cards: getToolsCards(!!user) },
			[MY_ADAPTERS_CATEGORY]: { cards: [] },
		},
	);
	const [collapsed, setCollapsed] = useState<boolean[]>(() => {
		try {
			return JSON.parse(
				localStorage.getItem(COLLAPSED_CATEGORIES_KEY) || "[]",
			);
		} catch {
			return [];
		}
	});
	const [showAddWatchDialog, setShowAddWatchDialog] = useState(false);

	const handleAccordion = (index: number) => {
		setCollapsed((old) => {
			const result = [...old];
			result[index] = !result[index];
			localStorage.setItem(
				COLLAPSED_CATEGORIES_KEY,
				JSON.stringify(result),
			);
			return result;
		});
	};

	useEffect(() => {
		const load = async () => {
			if (!user) {
				const loginCard = {
					title: "Login Required",
					img: "images/github.png",
					text: `You must be logged in to see your adapters.`,
					buttons: [<LoginButton />],
				};

				setCategories((old) => {
					const categories = { ...old };
					categories.Tools = { cards: getToolsCards(false) };
					categories[MY_ADAPTERS_CATEGORY] = {
						cards: [loginCard],
					};
					delete categories[WATCHED_ADAPTERS_CATEGORY];
					return categories;
				});
				return;
			}

			setCategories((old) => ({
				...old,
				Tools: { cards: getToolsCards(true) },
				[MY_ADAPTERS_CATEGORY]: { cards: [] },
				[WATCHED_ADAPTERS_CATEGORY]: { cards: [] },
			})); // clear the list (and show the spinners)

			let adapters: DashboardCardProps[] = [];
			try {
				const cards = await Promise.all([
					...watched.map((info) =>
						getAdapterCard(info, () => removeWatched(info)).catch(
							console.error,
						),
					),
					...own.map((info) =>
						getAdapterCard(info).catch(console.error),
					),
				]);

				adapters = cards.filter(notEmpty);
			} catch (error) {
				console.error(error);
			}

			const ownAdapters = adapters.filter((a) => !a.onClose);
			const watchedAdapters = adapters.filter((a) => a.onClose);

			if (ownAdapters.length === 0) {
				ownAdapters.push({
					title: "No adapters found",
					img: "images/adapter-creator.png",
					text: "You can create your first ioBroker adapter by answering questions in the Adapter Creator.",
					buttons: [
						<CardButton
							text="Open Adapter Creator"
							to="/create-adapter"
						/>,
					],
				});
			}

			setCategories((old) => ({
				...old,
				Tools: { cards: getToolsCards(true) },
				[MY_ADAPTERS_CATEGORY]: {
					cards: ownAdapters,
				},
				[WATCHED_ADAPTERS_CATEGORY]: {
					cards: watchedAdapters,
					onAdd: () => setShowAddWatchDialog(true),
				},
			}));
		};
		load().catch(console.error);
	}, [removeWatched, user, own, watched, login]);

	useEffect(() => {
		const updateBlogCard = async () => {
			const url =
				"https://raw.githubusercontent.com/ioBroker/ioBroker.docs/master/engine/front-end/public/blog.json";
			const { data: blog } = await axios.get<{
				pages: Record<
					string,
					{
						date: string;
						title: Record<string, string>;
						logo: string;
					}
				>;
			}>(url);
			const page = Object.values(blog.pages)[0];
			if (!page) return;
			setCategories((old) => {
				const res = old.Resources;
				const index = res.cards.findIndex((c) => c.title === "Blog");
				if (index < 0) {
					return old;
				}
				const card = res.cards[index];
				if (card.text.includes("\n")) {
					return old;
				}
				const date = page.date.replace(
					/^(\d{4})\.(\d{2})\.(\d{2})$/,
					"$3.$2.$1",
				);
				res.cards[index] = {
					...card,
					img: `https://www.iobroker.net/${page.logo}`,
					text: `${card.text}\n \nLatest entry: ${page.title.en} (${date})`,
				};

				return { ...old };
			});
		};
		updateBlogCard().catch(console.error);
	}, []);

	return (
		<>
			{user && (
				<AddWatchDialog
					open={showAddWatchDialog}
					onClose={(repo) => {
						setShowAddWatchDialog(false);
						if (repo) {
							addWatched(repo);
						}
					}}
				/>
			)}
			{Object.keys(categories).map((title, index) => {
				const grid = categories[title];
				return (
					<Accordion
						key={index}
						expanded={!collapsed[index]}
						onChange={() => handleAccordion(index)}
					>
						<AccordionSummary
							expandIcon={<ExpandMoreIcon />}
							aria-controls={`${title}-content`}
							id={`${title}-header`}
						>
							<Typography variant="h5">{title}</Typography>
						</AccordionSummary>
						<AccordionDetails>
							<CardGrid {...grid} />
						</AccordionDetails>
					</Accordion>
				);
			})}
		</>
	);
}
