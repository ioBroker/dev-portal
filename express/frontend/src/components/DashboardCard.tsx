import Card from "@material-ui/core/Card";
import CardActionArea from "@material-ui/core/CardActionArea";
import CardActions from "@material-ui/core/CardActions";
import CardContent from "@material-ui/core/CardContent";
import CardMedia from "@material-ui/core/CardMedia";
import CircularProgress from "@material-ui/core/CircularProgress";
import Hidden from "@material-ui/core/Hidden";
import IconButton from "@material-ui/core/IconButton";
import { makeStyles } from "@material-ui/core/styles";
import Typography from "@material-ui/core/Typography";
import clsx from "clsx";
import React from "react";
import { useHistory } from "react-router-dom";
import { AddCardIcon, CloseIcon } from "./Icons";

const useStyles = makeStyles((theme) => ({
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
	img?: string;
	badges?: Record<string, string>;
	text: string;
	buttons?: JSX.Element[];
	squareImg?: boolean;
	to?: string;
	url?: string;
	onClose?: () => void;
}

export function DashboardCard(props: DashboardCardProps) {
	const {
		title,
		img,
		badges,
		text,
		buttons,
		squareImg,
		to,
		url,
		onClose,
	} = props;
	const classes = useStyles();
	const history = useHistory();
	const handleCardClick = to
		? () => history.push(to)
		: url
		? () => window.open(url, "_blank")
		: undefined;
	return (
		<Card className={classes.card} raised={true}>
			{onClose && (
				<div className={classes.closeButton}>
					<IconButton onClick={onClose} size="small">
						<CloseIcon />
					</IconButton>
				</div>
			)}
			{img && (
				<Hidden xsDown>
					<CardMedia
						className={clsx(
							classes.cardMedia,
							squareImg && classes.adapterCardMedia,
							handleCardClick && classes.clickableCard,
						)}
						image={img}
						title={title}
						onClick={handleCardClick}
					/>
				</Hidden>
			)}
			<CardContent
				className={clsx(
					classes.cardContent,
					handleCardClick && classes.clickableCard,
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
				<CardActions>{buttons}</CardActions>
			)}
		</Card>
	);
}

export function LoadingCard() {
	const classes = useStyles();
	return (
		<Card className={classes.card} raised={true}>
			<CircularProgress size="50%" className={classes.loadingProgress} />
		</Card>
	);
}

export function AddCard(props: { onClick: () => void }) {
	const { onClick } = props;
	const classes = useStyles();
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
