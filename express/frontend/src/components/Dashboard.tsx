import Accordion from "@material-ui/core/Accordion";
import AccordionDetails from "@material-ui/core/AccordionDetails";
import AccordionSummary from "@material-ui/core/AccordionSummary";
import Badge from "@material-ui/core/Badge";
import Button from "@material-ui/core/Button";
import Card from "@material-ui/core/Card";
import CardActionArea from "@material-ui/core/CardActionArea";
import CardActions from "@material-ui/core/CardActions";
import CardContent from "@material-ui/core/CardContent";
import CardMedia from "@material-ui/core/CardMedia";
import CircularProgress from "@material-ui/core/CircularProgress";
import Grid from "@material-ui/core/Grid";
import Hidden from "@material-ui/core/Hidden";
import IconButton from "@material-ui/core/IconButton";
import { makeStyles } from "@material-ui/core/styles";
import Typography from "@material-ui/core/Typography";
import GitHubIcon from "@material-ui/icons/GitHub";
import ExpandMoreIcon from "@material-ui/icons/ExpandMore";
import axios from "axios";
import clsx from "clsx";
import React, { useEffect, useState } from "react";
import { Link, useHistory } from "react-router-dom";
import { handleLogin } from "../App";
import { User } from "../lib/gitHub";
import { getMyAdapterRepos, Repository } from "../lib/ioBroker";

interface CardButtonProps {
	text?: string;
	icon?: JSX.Element;
	link?: string;
	url?: string;
	onClick?: () => void;
	disabled?: boolean;
}

function CardButton(props: CardButtonProps) {
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
	loadingProgress: {
		marginTop: "40%",
		marginBottom: "40%",
		marginLeft: "25%",
	},
}));

interface DashboardCardProps {
	title: string;
	img: string;
	text: string;
	buttons?: JSX.Element[];
	squareImg?: boolean;
}

function DashboardCard(props: DashboardCardProps) {
	const { title, img, text, buttons, squareImg } = props;
	const classes = useCardStyles();
	return (
		<Card className={classes.card}>
			<Hidden xsDown>
				<CardMedia
					className={clsx(
						classes.cardMedia,
						squareImg && classes.adapterCardMedia,
					)}
					image={img}
					title={title}
				/>
			</Hidden>
			<CardContent className={classes.cardContent}>
				<Typography gutterBottom variant="h6" component="h2">
					{title}
				</Typography>
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
		marginTop: theme.spacing(1),
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
	const tools = [
		{
			title: "Documentation",
			img: "images/doc.jpg",
			text:
				"Read all the important information about ioBroker development.",
			buttons: [
				<CardButton
					text="Open"
					url="https://www.iobroker.net/#en/documentation/dev/adapterdev.md"
				/>,
			],
		},
		{
			title: "Adapter Creator",
			img: "images/adapter-creator.png",
			text:
				"Create a new ioBroker adapter by answering questions. The resulting adapter can be downloaded as a zip file or directly exported to a new GitHub repository.",
			buttons: [<CardButton text="Open" link="/create-adapter" />],
		},
		{
			title: "Adapter Check",
			img: "images/adapter-check.png",
			text:
				"Verify your ioBroker adapters to see if it matches the requirements to be added to the repository." +
				(user ? "" : "\nYou must be logged in to use this tool."),
			buttons: [
				user ? (
					<CardButton text="Open" link="/adapter-check" />
				) : (
					<CardButton text="Login" onClick={handleLogin} />
				),
			],
		},
		{
			title: "Weblate",
			img: "images/weblate.png",
			text:
				"Manage the translations of your adapters in all available languages.",
			buttons: [
				<CardButton
					text="Open"
					url="https://weblate.iobroker.net/projects/adapters/"
				/>,
			],
		},
		{
			title: "Community Initiatives",
			img: "images/iobroker.png",
			text: "Project management board for ioBroker Community Initiatives",
			buttons: [
				<CardButton
					text="open"
					url="https://github.com/ioBroker/Community/projects/1"
				/>,
			],
		},
		{
			title: "Forum",
			img: "images/iobroker.png",
			text:
				"Get in touch with other developers and discuss features.\nIn other sections of the forum you can request user feedback about your adapter releases.",
			buttons: [
				<CardButton
					text="Open"
					url="https://forum.iobroker.net/category/8/entwicklung"
				/>,
			],
		},
	];
	const [adapters, setAdapters] = useState<DashboardCardProps[]>([]);
	const [expanded, setExpanded] = useState({
		0: true,
		1: true,
	});

	const handleAccordion = (index: 0 | 1) => {
		setExpanded((old) => ({ ...old, [index]: !old[index] }));
	};

	useEffect(() => {
		const loadAdapters = async (user: User) => {
			setAdapters([]); // clear the list (and show the spinner)
			const adapters: DashboardCardProps[] = [];

			const repos = await getMyAdapterRepos(user.token);
			const latest = await Repository.getLatest();
			//console.log(repos);
			for (const repo of repos) {
				try {
					let info = latest[repo.name.split(".")[1]];
					const defaultBranch = repo.default_branch || "master";
					if (!info) {
						try {
							const ioPackage = await axios.get(
								`https://raw.githubusercontent.com/${repo.full_name}/${defaultBranch}/io-package.json`,
							);
							info = ioPackage.data.common;
						} catch (error) {
							console.error(error);
							continue;
						}
					}
					//console.log(repo);
					adapters.push({
						title: repo.name,
						img: info?.extIcon,
						text:
							info?.desc?.en ||
							repo.description ||
							"No description available",
						squareImg: true,
						buttons: [
							<CardButton
								icon={
									<Badge
										badgeContent={repo.open_issues}
										color="secondary"
									>
										<GitHubIcon />
									</Badge>
								}
								url={repo.html_url}
							/>,
						],
					});
				} catch (error) {
					console.error(error);
				}
			}

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
			setAdapters([...adapters]);
		};

		if (user) {
			loadAdapters(user).catch((e) => console.log(e));
		} else {
			const loginCard = (type: string) => ({
				title: "Login Required",
				img: "images/github.png",
				text: `You must be logged in to see your ${type}.`,
				buttons: [<CardButton text="Login" onClick={handleLogin} />],
			});
			setAdapters([loginCard("adapters")]);
		}
	}, [user]);

	return (
		<>
			<Accordion
				expanded={expanded[0]}
				onChange={() => handleAccordion(0)}
			>
				<AccordionSummary
					expandIcon={<ExpandMoreIcon />}
					aria-controls="panel1a-content"
					id="panel1a-header"
				>
					<Typography variant="h5">Tools</Typography>
				</AccordionSummary>
				<AccordionDetails>
					<CardGrid cards={tools} />
				</AccordionDetails>
			</Accordion>
			<Accordion
				expanded={expanded[1]}
				onChange={() => handleAccordion(1)}
			>
				<AccordionSummary
					expandIcon={<ExpandMoreIcon />}
					aria-controls="panel1a-content"
					id="panel1a-header"
				>
					<Typography variant="h5">My Adapters</Typography>
				</AccordionSummary>
				<AccordionDetails>
					<CardGrid cards={adapters} />
				</AccordionDetails>
			</Accordion>
		</>
	);
}
