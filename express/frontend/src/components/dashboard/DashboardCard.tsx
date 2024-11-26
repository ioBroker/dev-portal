import {
	Box,
	Card,
	CardActionArea,
	CardActions,
	CardContent,
	CardMedia,
	CircularProgress,
	Hidden,
	IconButton,
	Rating,
	Typography,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { Rating as IoBrokerRating } from "../../../../backend/src/global/iobroker";
import { AddCardIcon, CloseIcon } from "../Icons";

export interface DashboardCardProps {
	title: string;
	img?: string;
	badges?: Record<string, string>;
	rating?: IoBrokerRating;
	text: string;
	buttons?: JSX.Element[];
	squareImg?: boolean;
	to?: string;
	url?: string;
	onClick?: () => void;
	onClose?: () => void;
}

export function DashboardCard({
	title,
	img,
	badges,
	rating,
	text,
	buttons,
	squareImg,
	to,
	url,
	onClick,
	onClose,
}: DashboardCardProps) {
	const navigate = useNavigate();
	const handleCardClick = to
		? () => navigate(to)
		: url
			? () => window.open(url, "_blank")
			: onClick;
	return (
		<Card
			sx={{
				height: "100%",
				display: "flex",
				flexDirection: "column",
			}}
			raised={true}
		>
			{onClose && (
				<Box
					sx={{
						height: "0px",
						overflowY: "visible",
						textAlign: "right",
					}}
				>
					<IconButton onClick={onClose} size="small">
						<CloseIcon />
					</IconButton>
				</Box>
			)}
			{img && (
				<Hidden xsDown>
					<CardMedia
						sx={{
							paddingTop: "56.25%", // 16:9
							marginLeft: squareImg ? "22%" : undefined,
							marginRight: squareImg ? "22%" : undefined,
							marginTop: squareImg ? "2%" : undefined,
							marginBottom: squareImg ? "-2%" : undefined,
							cursor: handleCardClick ? "pointer" : undefined,
						}}
						image={img}
						title={title}
						onClick={handleCardClick}
					/>
				</Hidden>
			)}
			<CardContent
				sx={{
					flexGrow: 1,
					cursor: handleCardClick ? "pointer" : undefined,
				}}
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
				{rating && (
					<Typography>
						<Rating
							size="small"
							value={rating.r}
							precision={0.1}
							readOnly
						/>{" "}
						({rating.c})
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
	return (
		<Card
			sx={{
				height: "100%",
				display: "flex",
				flexDirection: "column",
			}}
			raised={true}
		>
			<CircularProgress
				size="50%"
				sx={(theme) => ({
					marginLeft: "25%",
					[theme.breakpoints.up("sm")]: {
						marginTop: "40%",
						marginBottom: "40%",
					},
				})}
			/>
		</Card>
	);
}

export function AddCard(props: { onClick: () => void }) {
	const { onClick } = props;
	return (
		<Card
			sx={{
				height: "100%",
				display: "flex",
				flexDirection: "column",
			}}
			raised={true}
		>
			<CardActionArea
				sx={{
					height: "100%",
				}}
				onClick={onClick}
			>
				<AddCardIcon
					fontSize="large"
					color="primary"
					sx={(theme) => ({
						width: "100%",
						minHeight: "4em",
						[theme.breakpoints.up("sm")]: {
							marginTop: "40%",
							marginBottom: "40%",
						},
					})}
				/>
			</CardActionArea>
		</Card>
	);
}
