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
import { User } from "../lib/gitHub";
import {
	AdapterInfos,
	getMyAdapterInfos,
	getWeblateAdapterComponents,
	hasDiscoverySupport,
} from "../lib/ioBroker";
import { AdapterCheckLocationState } from "../tools/AdapterCheck";
import { getToolsCards, resourcesCards, socialCards } from "./dashboard-static";
import {
	AdapterCheckIcon,
	DiscoveryIcon,
	GitHubIcon,
	WeblateIcon,
} from "./Icons";

const MY_ADAPTERS_CATEGORY = "My Adapters";
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

const useCardStyles = makeStyles((theme) => ({
	card: {
		height: "100%",
		display: "flex",
		flexDirection: "column",
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
		marginTop: "40%",
		marginBottom: "40%",
		marginLeft: "25%",
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
}

export function DashboardCard(props: DashboardCardProps) {
	const { title, img, badges, text, buttons, squareImg, to } = props;
	const classes = useCardStyles();
	const history = useHistory();
	const handleCardClick = !to ? undefined : () => history.push(to);
	return (
		<Card className={classes.card} raised={true}>
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
		<Card className={classes.card}>
			<CircularProgress size="50%" className={classes.loadingProgress} />
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
}

function CardGrid(props: CardGridProps) {
	const { cards } = props;
	const classes = useStyles();
	return (
		<Grid container spacing={4} className={classes.cardGrid}>
			{cards.length > 0 &&
				cards.map((card) => (
					<Grid item key={card.title} xs={12} sm={6} md={4} lg={3}>
						<DashboardCard {...card} />
					</Grid>
				))}
			{cards.length === 0 && (
				<Grid item xs={12} sm={6} md={4} lg={3}>
					<LoadingCard />
				</Grid>
			)}
		</Grid>
	);
}

interface DashboardProps {
	user?: User;
}

export default function Dashboard(props: DashboardProps) {
	const { user } = props;

	const history = useHistory<AdapterCheckLocationState>();
	const [categories, setCategories] = useState<
		Record<string, DashboardCardProps[]>
	>({
		Resources: resourcesCards,
		Social: socialCards,
		Tools: getToolsCards(!!user),
		[MY_ADAPTERS_CATEGORY]: [],
	});
	let storedCollapsed;
	try {
		storedCollapsed = JSON.parse(
			localStorage.getItem(COLLAPSED_CATEGORIES_KEY) || "[]",
		);
	} catch (error) {
		storedCollapsed = [];
	}
	const [collapsed, setCollapsed] = useState<boolean[]>(storedCollapsed);

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
		const getAdapterCard = async (infos: AdapterInfos) => {
			const { repo, info } = infos;
			if (!info) {
				return;
			}
			const discoveryLink = (await hasDiscoverySupport(info.name))
				? `https://github.com/ioBroker/ioBroker.discovery/blob/master/lib/adapters/` +
				  `${uc(info.name)}.js`
				: "";

			let weblateLink = "";
			try {
				const components = await getWeblateAdapterComponents();
				const component = components.results.find(
					(c: any) => c.name === info.name,
				);
				if (component) {
					weblateLink =
						`https://weblate.iobroker.net/projects/adapters/` +
						`${uc(component.slug)}/`;
				}
			} catch {
				// ignore and leave "weblateLink" empty
			}

			const openAdapterCheck = () => {
				history.push("/adapter-check", {
					repoFullName: repo.full_name,
				});
			};

			return {
				title: repo.name,
				img: info?.extIcon,
				badges: {
					"npm version": `http://img.shields.io/npm/v/iobroker.${info.name}.svg`,
					"Stable version": `http://iobroker.live/badges/${info.name}-stable.svg`,
				},
				text:
					info?.desc?.en ||
					repo.description ||
					"No description available",
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
		};

		const loadAdapters = async (user: User) => {
			setCategories((old) => ({ ...old, [MY_ADAPTERS_CATEGORY]: [] })); // clear the list (and show the spinner)

			const infos = await getMyAdapterInfos(user.token);
			const cards = await Promise.all(
				infos.map(async (info) => {
					try {
						return await getAdapterCard(info);
					} catch (error) {
						console.error(error);
					}
				}),
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

				Tools: getToolsCards(true),
				[MY_ADAPTERS_CATEGORY]: [...adapters],
			}));
		};

		if (user) {
			loadAdapters(user).catch(console.error);
		} else {
			const loginCard = (type: string) => ({
				title: "Login Required",
				img: "images/github.png",
				text: `You must be logged in to see your ${type}.`,
				buttons: [<CardButton text="Login" onClick={handleLogin} />],
			});
			setCategories((old) => ({
				...old,
				Tools: getToolsCards(false),
				[MY_ADAPTERS_CATEGORY]: [loginCard("adapters")],
			}));
		}
	}, [user]);

	return (
		<>
			{Object.keys(categories).map((title, index) => {
				const cards = categories[title];
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
							<CardGrid cards={cards} />
						</AccordionDetails>
					</Accordion>
				);
			})}
		</>
	);
}
