import Button from "@material-ui/core/Button";
import Card from "@material-ui/core/Card";
import CardActions from "@material-ui/core/CardActions";
import CardContent from "@material-ui/core/CardContent";
import CardMedia from "@material-ui/core/CardMedia";
import Grid from "@material-ui/core/Grid";
import { makeStyles } from "@material-ui/core/styles";
import Typography from "@material-ui/core/Typography";
import React, { useEffect, useState } from "react";
import { GitHubUser } from "./UserMenu";
import { Link } from "react-router-dom";
import IconButton from "@material-ui/core/IconButton";
import { handleLogin } from "./App";

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
	cardContent: {
		flexGrow: 1,
	},
}));

interface DashboardCardProps {
	title: string;
	img: string;
	text: string;
	buttons?: JSX.Element[];
}

function DashboardCard(props: DashboardCardProps) {
	const { title, img, text, buttons } = props;
	const classes = useCardStyles();
	return (
		<Card className={classes.card}>
			<CardMedia
				className={classes.cardMedia}
				image={img}
				title={title}
			/>
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

const useStyles = makeStyles((theme) => ({
	cardGrid: {
		marginTop: theme.spacing(1),
		marginBottom: theme.spacing(1),
	},
}));

interface DashboardProps {
	user?: GitHubUser;
}

export default function Dashboard(props: DashboardProps) {
	const { user } = props;
	const classes = useStyles();
	const tools = [
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
				"Verify an ioBroker adapter to see if it matches the requirements to be added to the repository." +
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
	];
	const [initiatives, setInitatives] = useState<DashboardCardProps[]>([]);
	const [adapters, setAdapters] = useState<DashboardCardProps[]>([]);

	useEffect(() => {
		if (user) {
		} else {
			const loginCard = (type: string) => ({
				title: "Login Required",
				img: "images/github.png",
				text: `You must be logged in to see your ${type}.`,
				buttons: [<CardButton text="Login" onClick={handleLogin} />],
			});
			setInitatives([loginCard("initiatives")]);
			setAdapters([loginCard("adapters")]);
		}
	}, [user]);

	return (
		<>
			<Typography variant="h5">Tools</Typography>

			<Grid container spacing={4} className={classes.cardGrid}>
				{tools.map((tool, i) => (
					<Grid item key={i} xs={12} sm={6} md={4} lg={3}>
						<DashboardCard {...tool} />
					</Grid>
				))}
			</Grid>

			<Typography variant="h5">My Adapters</Typography>
			<Grid container spacing={4} className={classes.cardGrid}>
				{adapters.map((adapter) => (
					<Grid item key={adapter.title} xs={12} sm={6} md={4} lg={3}>
						<DashboardCard {...adapter} />
					</Grid>
				))}
			</Grid>

			<Typography variant="h5">My Initiatives</Typography>
			<Grid container spacing={4} className={classes.cardGrid}>
				{initiatives.map((initiative) => (
					<Grid
						item
						key={initiative.title}
						xs={12}
						sm={6}
						md={4}
						lg={3}
					>
						<DashboardCard {...initiative} />
					</Grid>
				))}
			</Grid>
		</>
	);
}
