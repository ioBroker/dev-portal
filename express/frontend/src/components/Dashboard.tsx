import Accordion from "@material-ui/core/Accordion";
import AccordionDetails from "@material-ui/core/AccordionDetails";
import AccordionSummary from "@material-ui/core/AccordionSummary";
import Badge from "@material-ui/core/Badge";
import Button from "@material-ui/core/Button";
import Card from "@material-ui/core/Card";
import CardActions from "@material-ui/core/CardActions";
import CardContent from "@material-ui/core/CardContent";
import CardMedia from "@material-ui/core/CardMedia";
import CircularProgress from "@material-ui/core/CircularProgress";
import Grid from "@material-ui/core/Grid";
import Hidden from "@material-ui/core/Hidden";
import IconButton from "@material-ui/core/IconButton";
import { makeStyles } from "@material-ui/core/styles";
import Tooltip from "@material-ui/core/Tooltip";
import Typography from "@material-ui/core/Typography";
import ExpandMoreIcon from "@material-ui/icons/ExpandMore";
import clsx from "clsx";
import React, { useEffect, useState } from "react";
import { Link, useHistory } from "react-router-dom";
import { handleLogin } from "../App";
import { GitHubComm, User } from "../lib/gitHub";
import * as H from "history";
import {
	AdapterInfos,
	getAdapterInfos,
	getLatest,
	getMyAdapterInfos,
	getSentryProjectInfos,
	getSentryStats,
	getWatchedAdapterInfos,
	getWeblateAdapterComponents,
	hasDiscoverySupport,
} from "../lib/ioBroker";
import { User as DbUser } from "../../../backend/src/global/user";
import { ProjectInfo } from "../../../backend/src/global/sentry";
import { AdapterCheckLocationState } from "../tools/AdapterCheck";
import { getToolsCards, resourcesCards, socialCards } from "./dashboard-static";
import {
	AdapterCheckIcon,
	AddCardIcon,
	CloseIcon,
	DiscoveryIcon,
	GitHubIcon,
	SentryIcon,
	WeblateIcon,
} from "./Icons";
import CardActionArea from "@material-ui/core/CardActionArea";
import axios from "axios";
import { getApiUrl } from "../lib/utils";
import Dialog from "@material-ui/core/Dialog";
import DialogTitle from "@material-ui/core/DialogTitle";
import DialogContent from "@material-ui/core/DialogContent";
import DialogContentText from "@material-ui/core/DialogContentText";
import Autocomplete from "@material-ui/lab/Autocomplete";
import TextField from "@material-ui/core/TextField";
import InputAdornment from "@material-ui/core/InputAdornment";
import DialogActions from "@material-ui/core/DialogActions";
import Popper from "@material-ui/core/Popper";
import Grow from "@material-ui/core/Grow";
import Paper from "@material-ui/core/Paper";
import MenuList from "@material-ui/core/MenuList";
import MenuItem from "@material-ui/core/MenuItem";
import ClickAwayListener from "@material-ui/core/ClickAwayListener";
import ListItemIcon from "@material-ui/core/ListItemIcon";
import List from "@material-ui/core/List";
import ListItem from "@material-ui/core/ListItem";
import ListItemAvatar from "@material-ui/core/ListItemAvatar";
import Avatar from "@material-ui/core/Avatar";
import ListItemText from "@material-ui/core/ListItemText";

const MY_ADAPTERS_CATEGORY = "My Adapters";
const WATCHED_ADAPTERS_CATEGORY = "Watched Adapters";
const COLLAPSED_CATEGORIES_KEY = "DASH_COLLAPSED_CATEGORIES";

const uc = encodeURIComponent;

export interface CardButtonProps {
	text?: string;
	icon?: JSX.Element;
	link?: string;
	url?: string;
	onClick?: () => void;
	disabled?: boolean;
}

export function CardButton(props: CardButtonProps) {
	const { text, icon, link, url, onClick, disabled } = props;
	const buttonProps: {
		component?: any;
		to?: string;
		href?: string;
		target?: string;
		onClick?: () => void;
	} = {};
	if (link) {
		buttonProps.component = Link;
		buttonProps.to = link;
	} else if (url) {
		buttonProps.href = url;
		buttonProps.target = "_blank";
	} else {
		buttonProps.onClick = onClick;
	}
	return (
		<>
			{text && (
				<Button
					size="small"
					color="primary"
					disabled={disabled}
					{...buttonProps}
				>
					{text}
				</Button>
			)}
			{!text && icon && (
				<IconButton
					size="small"
					color="primary"
					disabled={disabled}
					{...buttonProps}
				>
					{icon}
				</IconButton>
			)}
		</>
	);
}

const SentryErrorBadge = React.forwardRef(
	(props: { errors: number[]; children: any }, ref: any) => {
		const { errors, children } = props;
		const errorCount = errors[0] || errors[1];
		const color = errors[0] ? "secondary" : "primary";
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

const useCardStyles = makeStyles((theme) => ({
	card: {
		height: "100%",
		display: "flex",
		flexDirection: "column",
	},
	closeButton: {
		height: "0px",
		overflowY: "visible",
		textAlign: "right",
	},
	cardActionArea: {
		height: "100%",
	},
	cardMedia: {
		paddingTop: "56.25%", // 16:9
	},
	adapterCardMedia: {
		marginLeft: "22%",
		marginRight: "22%",
	},
	cardContent: {
		flexGrow: 1,
	},
	clickableCard: {
		cursor: "pointer",
	},
	loadingProgress: {
		marginLeft: "25%",
		[theme.breakpoints.up("sm")]: {
			marginTop: "40%",
			marginBottom: "40%",
		},
	},
	centerIcon: {
		width: "100%",
		minHeight: "4em",
		[theme.breakpoints.up("sm")]: {
			marginTop: "40%",
			marginBottom: "40%",
		},
	},
}));

export interface DashboardCardProps {
	title: string;
	img: string;
	badges?: Record<string, string>;
	text: string;
	buttons?: JSX.Element[];
	squareImg?: boolean;
	to?: string;
	onClose?: () => void;
}

export function DashboardCard(props: DashboardCardProps) {
	const { title, img, badges, text, buttons, squareImg, to, onClose } = props;
	const classes = useCardStyles();
	const history = useHistory();
	const handleCardClick = !to ? undefined : () => history.push(to);
	return (
		<Card className={classes.card} raised={true}>
			{onClose && (
				<div className={classes.closeButton}>
					<IconButton onClick={onClose} size="small">
						<CloseIcon />
					</IconButton>
				</div>
			)}
			<Hidden xsDown>
				<CardMedia
					className={clsx(
						classes.cardMedia,
						squareImg && classes.adapterCardMedia,
						to && classes.clickableCard,
					)}
					image={img}
					title={title}
					onClick={handleCardClick}
				/>
			</Hidden>
			<CardContent
				className={clsx(
					classes.cardContent,
					to && classes.clickableCard,
				)}
				onClick={handleCardClick}
			>
				<Typography gutterBottom variant="h6" component="h2">
					{title}
				</Typography>
				{badges && (
					<Typography>
						{Object.keys(badges).map((name) => (
							<>
								<img src={badges[name]} alt={name} />
								&nbsp;
							</>
						))}
					</Typography>
				)}
				{text.split("\n").map((t) => (
					<Typography key={t}>{t}</Typography>
				))}
			</CardContent>
			{buttons && buttons.length > 0 && (
				<CardActions>{buttons.map((b) => b)}</CardActions>
			)}
		</Card>
	);
}

function LoadingCard() {
	const classes = useCardStyles();
	return (
		<Card className={classes.card} raised={true}>
			<CircularProgress size="50%" className={classes.loadingProgress} />
		</Card>
	);
}

function AddCard(props: { onClick: () => void }) {
	const { onClick } = props;
	const classes = useCardStyles();
	return (
		<Card className={classes.card} raised={true}>
			<CardActionArea
				className={classes.cardActionArea}
				onClick={onClick}
			>
				<AddCardIcon
					fontSize="large"
					color="primary"
					className={classes.centerIcon}
				/>
			</CardActionArea>
		</Card>
	);
}

const useStyles = makeStyles((theme) => ({
	cardGrid: {
		marginBottom: theme.spacing(1),
	},
}));

interface CardGridProps {
	cards: DashboardCardProps[];
	onAdd?: () => void;
}

function CardGrid(props: CardGridProps) {
	const { cards, onAdd } = props;
	const classes = useStyles();
	return (
		<Grid container spacing={4} className={classes.cardGrid}>
			{cards.length > 0 &&
				cards.map((card) => (
					<Grid item key={card.title} xs={12} sm={6} md={4} lg={3}>
						<DashboardCard {...card} />
					</Grid>
				))}
			{onAdd && (
				<Grid item xs={12} sm={6} md={4} lg={3}>
					<AddCard onClick={onAdd} />
				</Grid>
			)}
			{cards.length === 0 && !onAdd && (
				<Grid item xs={12} sm={6} md={4} lg={3}>
					<LoadingCard />
				</Grid>
			)}
		</Grid>
	);
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
				await gitHub.getRepo(owner, repo),
				latest,
			);
			if (!infos.info) {
				throw new Error("This is not an ioBroker adapter");
			}
			onClose(repoName);
		} catch (error) {
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
	onClose?: () => void,
): Promise<DashboardCardProps | undefined> {
	const { repo, info } = infos;
	if (!info) {
		return;
	}
	const [discoveryLink, weblateLink, sentryProjects] = await Promise.all([
		getDiscoveryLink(info.name),
		getWeblateLink(info.name),
		getSentryProjects(info.name),
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
			"npm version": `http://img.shields.io/npm/v/iobroker.${info.name}.svg`,
			"Stable version": `http://iobroker.live/badges/${info.name}-stable.svg`,
		},
		text: info?.desc?.en || repo.description || "No description available",
		squareImg: true,
		to: `/adapter/${info.name}`,
		buttons: [
			<CardButton
				icon={
					<Tooltip
						title={`GitHub Repository (${repo.open_issues} open issues/PRs)`}
					>
						<Badge
							badgeContent={repo.open_issues}
							color="secondary"
						>
							<GitHubIcon />
						</Badge>
					</Tooltip>
				}
				url={repo.html_url}
			/>,
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
	} catch (error) {
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
					getAdapterCard(info, history, () =>
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
					getAdapterCard(info, history).catch(console.error),
				),
			);

			const adapters = cards
				.filter((c) => !!c)
				.map((c) => c as DashboardCardProps);
			if (adapters.length === 0) {
				adapters.push({
					title: "No adapters found",
					img: "images/adapter-creator.png",
					text:
						"You can create your first ioBroker adapter by answering questions in the Adapter Creator.",
					buttons: [
						<CardButton
							text="Open Adapter Creator"
							link="/create-adapter"
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
			(w) => w !== info.repo.full_name,
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
