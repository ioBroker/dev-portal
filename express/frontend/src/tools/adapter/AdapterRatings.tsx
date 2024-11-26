import {
	Divider,
	LinearProgress,
	List,
	ListItem,
	ListItemAvatar,
	ListItemText,
	makeStyles,
	Paper,
	Rating,
	Tooltip,
	Typography,
} from "@mui/material";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
	Rating as IoBrokerRating,
	RatingComment,
} from "../../../../backend/src/global/iobroker";
import { getAdapterRatings, getAllRatings } from "../../lib/ioBroker";

const useStyles = makeStyles((theme) => ({
	firstPaper: {
		marginBottom: theme.spacing(),
	},
	list: {
		width: "100%",
	},
	avatar: {
		paddingRight: theme.spacing(2),
	},
}));

function GlobalRating(props: { title: string; rating: IoBrokerRating }) {
	const { title, rating } = props;
	const classes = useStyles();
	return (
		<ListItem>
			<ListItemAvatar>
				<Tooltip title={`Rating: ${rating.r}`}>
					<Typography className={classes.avatar}>
						<Rating
							size="large"
							value={rating.r}
							precision={0.1}
							readOnly
						/>
					</Typography>
				</Tooltip>
			</ListItemAvatar>
			<ListItemText
				primary={<Typography variant="h5">{title}</Typography>}
				secondary={`${rating.c} ratings`}
			/>
		</ListItem>
	);
}

export interface AdapterRatingsProps {}

export function AdapterRatings(props: AdapterRatingsProps) {
	const { name } = useParams<{ name: string }>();

	const [overallRating, setOverallRating] = useState<IoBrokerRating>();
	const [currentRating, setCurrentRating] = useState<
		IoBrokerRating & { version: string }
	>();
	const [comments, setComments] = useState<RatingComment[]>();

	useEffect(() => {
		const loadRatings = async () => {
			try {
				const [allRatings, adapterRatings] = await Promise.all([
					getAllRatings(),
					getAdapterRatings(name),
				]);
				const myRatings = allRatings[name];
				if (myRatings) {
					setOverallRating(myRatings.rating);
					const version = Object.keys(myRatings).find(
						(k) => k !== "rating",
					);
					if (version) {
						setCurrentRating({ ...myRatings[version], version });
					}
				}

				setComments(adapterRatings.comments.reverse());
			} catch (error) {
				setComments([]);
				throw error;
			}
		};
		loadRatings().catch(console.error);
	}, [name]);

	const classes = useStyles();
	return (
		<>
			<Paper
				className={classes.firstPaper}
				hidden={!currentRating && !overallRating}
			>
				<List className={classes.list}>
					{currentRating && (
						<>
							<GlobalRating
								title={`Version ${currentRating.version}`}
								rating={currentRating}
							/>
							<Divider variant="middle" component="li" />
						</>
					)}
					{overallRating && (
						<GlobalRating title="Overall" rating={overallRating} />
					)}
				</List>
			</Paper>
			<Paper hidden={comments?.length === 0}>
				<List className={classes.list}>
					{!comments && (
						<ListItem>
							<ListItemText primary={<LinearProgress />} />
						</ListItem>
					)}
					{comments &&
						comments.map((c, i) => (
							<>
								{!!i && (
									<Divider
										key={i}
										variant="middle"
										component="li"
									/>
								)}
								<ListItem key={i} alignItems="flex-start">
									<ListItemAvatar>
										<Typography>
											<Rating
												className={classes.avatar}
												value={c.rating}
												readOnly
											/>
										</Typography>
									</ListItemAvatar>
									<ListItemText
										primary={c.comment}
										secondary={`${new Date(
											c.ts,
										).toLocaleString("de")} / v${
											c.version
										}`}
									/>
								</ListItem>
							</>
						))}
				</List>
			</Paper>
		</>
	);
}
