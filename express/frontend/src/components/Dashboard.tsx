import Accordion from "@material-ui/core/Accordion";
import AccordionDetails from "@material-ui/core/AccordionDetails";
import AccordionSummary from "@material-ui/core/AccordionSummary";
import Avatar from "@material-ui/core/Avatar";
import Badge from "@material-ui/core/Badge";
import Button from "@material-ui/core/Button";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogContentText from "@material-ui/core/DialogContentText";
import DialogTitle from "@material-ui/core/DialogTitle";
import IconButton from "@material-ui/core/IconButton";
import InputAdornment from "@material-ui/core/InputAdornment";
import List from "@material-ui/core/List";
import ListItem from "@material-ui/core/ListItem";
import ListItemAvatar from "@material-ui/core/ListItemAvatar";
import ListItemText from "@material-ui/core/ListItemText";
import TextField from "@material-ui/core/TextField";
import Tooltip from "@material-ui/core/Tooltip";
import Typography from "@material-ui/core/Typography";
import ExpandMoreIcon from "@material-ui/icons/ExpandMore";
import Autocomplete from "@material-ui/lab/Autocomplete";
import axios from "axios";
import * as H from "history";
import React, { useEffect, useState } from "react";
import { useHistory } from "react-router-dom";
import { ProjectInfo } from "../../../backend/src/global/sentry";
import { User as DbUser } from "../../../backend/src/global/user";
import { handleLogin } from "../App";
import { GitHubComm, Repository, User } from "../lib/gitHub";
import {
	AdapterInfos,
	getAdapterInfos,
	getAllRatings,
	getLatest,
	getMyAdapterInfos,
	getSentryProjectInfos,
	getSentryStats,
	getWatchedAdapterInfos,
	getWeblateAdapterComponents,
	hasDiscoverySupport,
} from "../lib/ioBroker";
import { equalIgnoreCase, getApiUrl } from "../lib/utils";
import { AdapterCheckLocationState } from "../tools/AdapterCheck";
import { CardButton } from "./CardButton";
import { CardGrid, CardGridProps } from "./CardGrid";
import { getToolsCards, resourcesCards, socialCards } from "./dashboard-static";
import { DashboardCardProps } from "./DashboardCard";
import {
	AdapterCheckIcon,
	DiscoveryIcon,
	GitHubIcon,
	SentryIcon,
	WeblateIcon,
} from "./Icons";

const MY_ADAPTERS_CATEGORY = "My Adapters";
const WATCHED_ADAPTERS_CATEGORY = "Watched Adapters";
const COLLAPSED_CATEGORIES_KEY = "DASH_COLLAPSED_CATEGORIES";

const uc = encodeURIComponent;

function AdapterGitHubButton(props: { repo: Repository; user: User }) {
	const { repo, user } = props;
	const [counts, setCounts] = useState(`${repo.open_issues} open issues/PRs`);
	const [color, setColor] = useState<"primary" | "error">("primary");

	useEffect(() => {
		const loadPullRequests = async () => {
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
								button
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

interface AddWatchDialogProps {
	user: User;
	open?: boolean;
	onClose: (repo?: string) => void;
}

function AddWatchDialog(props: AddWatchDialogProps) {
	const { user, open, onClose } = props;

	const [repoNames, setRepoNames] = useState<string[]>([]);
	const [repoName, setRepoName] = useState("");
	const [error, setError] = useState("");
	const [validating, setValidating] = useState(false);

	useEffect(() => {
		if (!open) {
			return;
		}
		const loadData = async () => {
			const latest = await getLatest();
			const names = Object.keys(latest).map((adapterName) =>
				latest[adapterName].meta.replace(
					/^\w+:\/\/[^/]+\/([^/]+\/[^/]+)\/.+$/,
					"$1",
				),
			);
			setRepoNames(names);
		};
		loadData().catch(console.error);
	}, [open]);

	const validate = async () => {
		setValidating(true);
		try {
			const gitHub = GitHubComm.forToken(user.token);
			const [owner, repo] = repoName.split("/", 2);
			const latest = await getLatest();
			const infos = await getAdapterInfos(
				await gitHub.getRepo(owner, repo).getRepo(),
				latest,
			);
			if (!infos.info) {
				throw new Error("This is not an ioBroker adapter");
			}
			onClose(repoName);
		} catch (error: any) {
			setError(error.message || error);
		} finally {
			setValidating(false);
		}
	};

	return (
		<Dialog
			open={!!open}
			onClose={() => onClose()}
			aria-labelledby="add-watch-dialog-title"
		>
			<DialogTitle id="add-watch-dialog-title">
				Add an adapter
			</DialogTitle>
			<DialogContent>
				<DialogContentText>
					Please choose a GitHub repository of an ioBroker adapter to
					add to your list of watched adapters.
				</DialogContentText>
				<Autocomplete
					freeSolo
					options={repoNames}
					getOptionLabel={(option) => option}
					inputValue={repoName}
					onInputChange={(_e, value) => {
						setRepoName(value);
						setError("");
					}}
					renderInput={(params) => (
						<TextField
							{...params}
							disabled={validating}
							error={!!error}
							helperText={error}
							label="Adapter Repository"
							variant="outlined"
							InputProps={{
								...params.InputProps,
								startAdornment: (
									<InputAdornment position="start">
										https://github.com/
									</InputAdornment>
								),
							}}
						/>
					)}
				/>
			</DialogContent>
			<DialogActions>
				<Button
					onClick={() => onClose()}
					disabled={validating}
					color="primary"
				>
					Cancel
				</Button>
				<Button
					onClick={validate}
					disabled={validating}
					color="primary"
				>
					Add
				</Button>
			</DialogActions>
		</Dialog>
	);
}

async function getDiscoveryLink(adapterName: string) {
	return (await hasDiscoverySupport(adapterName))
		? `https://github.com/ioBroker/ioBroker.discovery/blob/master/lib/adapters/` +
				`${uc(adapterName)}.js`
		: "";
}

async function getWeblateLink(adapterName: string) {
	try {
		const components = await getWeblateAdapterComponents();
		const component = components.results.find(
			(c: any) => c.name === adapterName,
		);
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
	history: H.History<AdapterCheckLocationState>,
	user: User,
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
	const openAdapterCheck = () => {
		history.push("/adapter-check", {
			repoFullName: repo.full_name,
		});
	};

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
			<AdapterGitHubButton repo={repo} user={user} />,
			<CardButton
				icon={
					<Tooltip title="Start Adapter Check">
						<AdapterCheckIcon />
					</Tooltip>
				}
				onClick={openAdapterCheck}
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
						url={discoveryLink}
					/>
				</span>
			</Tooltip>,
			<AdapterSentryButton projects={sentryProjects} />,
			<Tooltip
				title={`Translations ${
					weblateLink ? "" : "not "
				}available on Weblate`}
			>
				<span>
					<CardButton
						disabled={!weblateLink}
						icon={<WeblateIcon />}
						url={weblateLink}
					/>
				</span>
			</Tooltip>,
		],
	};
}

interface DashboardProps {
	user?: User;
	onAdapterListChanged: () => void;
}

export default function Dashboard(props: DashboardProps) {
	const { user, onAdapterListChanged } = props;

	const history = useHistory<AdapterCheckLocationState>();
	const [categories, setCategories] = useState<Record<string, CardGridProps>>(
		{
			Resources: { cards: resourcesCards },
			Social: { cards: socialCards },
			Tools: { cards: getToolsCards(!!user) },
			[MY_ADAPTERS_CATEGORY]: { cards: [] },
		},
	);
	let storedCollapsed;
	try {
		storedCollapsed = JSON.parse(
			localStorage.getItem(COLLAPSED_CATEGORIES_KEY) || "[]",
		);
	} catch {
		storedCollapsed = [];
	}
	const [collapsed, setCollapsed] = useState<boolean[]>(storedCollapsed);
	const [showAddWatch, setShowAddWatch] = useState(false);

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

	const loadWatchedAdapters = async (user: User) => {
		setCategories((old) => ({
			...old,
			[WATCHED_ADAPTERS_CATEGORY]: { cards: [] },
		})); // clear the list (and show the spinner)

		let adapters: DashboardCardProps[] = [];
		try {
			const infos = await getWatchedAdapterInfos(user.token);
			const cards = await Promise.all(
				infos.map((info) =>
					getAdapterCard(info, history, user, () =>
						handleRemoveWatch(info).catch(console.error),
					).catch(console.error),
				),
			);

			adapters = cards
				.filter((c) => !!c)
				.map((c) => c as DashboardCardProps);
		} catch (error) {
			console.error(error);
		}

		setCategories((old) => ({
			...old,
			[WATCHED_ADAPTERS_CATEGORY]: {
				cards: [...adapters],
				onAdd: () => setShowAddWatch(true),
			},
		}));
	};

	useEffect(() => {
		const loadMyAdapters = async (user: User) => {
			setCategories((old) => ({
				...old,
				[MY_ADAPTERS_CATEGORY]: { cards: [] },
			})); // clear the list (and show the spinner)

			const infos = await getMyAdapterInfos(user.token);
			const cards = await Promise.all(
				infos.map((info) =>
					getAdapterCard(info, history, user).catch(console.error),
				),
			);

			const adapters = cards
				.filter((c) => !!c)
				.map((c) => c as DashboardCardProps);
			if (adapters.length === 0) {
				adapters.push({
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
				[MY_ADAPTERS_CATEGORY]: { cards: [...adapters] },
			}));
		};

		if (user) {
			loadMyAdapters(user).catch(console.error);
			loadWatchedAdapters(user).catch(console.error);
		} else {
			const loginCard = (type: string) => ({
				title: "Login Required",
				img: "images/github.png",
				text: `You must be logged in to see your ${type}.`,
				buttons: [<CardButton text="Login" onClick={handleLogin} />],
			});
			setCategories((old) => {
				const result = { ...old };
				result.Tools = { cards: getToolsCards(false) };
				result[MY_ADAPTERS_CATEGORY] = {
					cards: [loginCard("adapters")],
				};
				delete result[WATCHED_ADAPTERS_CATEGORY];
				return result;
			});
		}
	}, [user]);

	useEffect(() => {
		const updateBlogIcon = async () => {
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
				if (index >= 0) {
					const card = res.cards[index];
					const date = page.date.replace(
						/^(\d{4})\.(\d{2})\.(\d{2})$/,
						"$3.$2.$1",
					);
					res.cards[index] = {
						...card,
						img: `https://www.iobroker.net/${page.logo}`,
						text: `${card.text}\n \nLatest entry: ${page.title.en} (${date})`,
					};
				}
				return { ...old };
			});
		};
		updateBlogIcon().catch(console.error);
	}, []);

	const handleAddWatch = async (repo?: string) => {
		setShowAddWatch(false);
		if (!repo) {
			return;
		}
		try {
			setCategories((old) => ({
				...old,
				[WATCHED_ADAPTERS_CATEGORY]: { cards: [] },
			})); // show spinner
			const url = getApiUrl("user");
			const { data: dbUser } = await axios.get<DbUser>(url);
			dbUser.watches.push(repo);
			await axios.put(url, dbUser);
			onAdapterListChanged();
			await loadWatchedAdapters(user!);
		} catch (error) {
			console.error(error);
		}
	};

	const handleRemoveWatch = async (info: AdapterInfos) => {
		setCategories((old) => ({
			...old,
			[WATCHED_ADAPTERS_CATEGORY]: { cards: [] },
		})); // show spinner
		const url = getApiUrl("user");
		const { data: dbUser } = await axios.get<DbUser>(url);
		dbUser.watches = dbUser.watches.filter(
			(w) => !equalIgnoreCase(w, info.repo.full_name),
		);
		await axios.put(url, dbUser);
		onAdapterListChanged();
		await loadWatchedAdapters(user!);
	};

	return (
		<>
			{user && (
				<AddWatchDialog
					user={user}
					open={showAddWatch}
					onClose={handleAddWatch}
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
