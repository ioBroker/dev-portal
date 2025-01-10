import {
	Divider,
	LinearProgress,
	List,
	ListItem,
	ListItemAvatar,
	ListItemText,
	Paper,
	Rating,
	SxProps,
	Theme,
	Tooltip,
	Typography,
} from "@mui/material";
import { Fragment, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
	Rating as IoBrokerRating,
	RatingComment,
} from "../../../../backend/src/global/iobroker";
import { getAdapterRatings, getAllRatings } from "../../lib/ioBroker";

const sxList: SxProps<Theme> = {
	width: "100%",
};
const sxAvatar: SxProps<Theme> = {
	paddingRight: 2,
};

function GlobalRating(props: { title: string; rating: IoBrokerRating }) {
	const { title, rating } = props;
	return (
		<ListItem>
			<ListItemAvatar>
				<Tooltip title={`Rating: ${rating.r}`}>
					<Typography sx={sxAvatar}>
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

export function AdapterRatings() {
	const { name } = useParams<{ name: string }>();

	const [overallRating, setOverallRating] = useState<IoBrokerRating>();
	const [currentRating, setCurrentRating] = useState<
		IoBrokerRating & { version: string }
	>();
	const [comments, setComments] = useState<RatingComment[]>();

	useEffect(() => {
		const loadRatings = async () => {
			if (!name) {
				return;
			}
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

	return (
		<>
			<Paper
				sx={{ marginBottom: 1 }}
				hidden={!currentRating && !overallRating}
			>
				<List sx={sxList}>
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
				<List sx={sxList}>
					{!comments && (
						<ListItem>
							<ListItemText primary={<LinearProgress />} />
						</ListItem>
					)}
					{comments &&
						comments.map((c, i) => (
							<Fragment key={c.ts}>
								{!!i && (
									<Divider variant="middle" component="li" />
								)}
								<ListItem alignItems="flex-start">
									<ListItemAvatar>
										<Typography>
											<Rating
												sx={sxAvatar}
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
							</Fragment>
						))}
				</List>
			</Paper>
		</>
	);
}
