import {
	Box,
	Card,
	CardActions,
	CardContent,
	CardMedia,
	Hidden,
	IconButton,
	Rating,
	Typography,
} from "@mui/material";
import { Fragment } from "react";
import { useNavigate } from "react-router-dom";
import { Rating as IoBrokerRating } from "../../../../backend/src/global/iobroker";
import { CloseIcon, FavoriteIcon, NotFavoriteIcon } from "../Icons";

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
	liked?: boolean;
	onLikeChanged?: (liked: boolean) => void;
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
	liked,
	onLikeChanged,
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
			{liked !== undefined && (
				<Box
					sx={{
						height: "0px",
						overflowY: "visible",
						textAlign: "left",
					}}
				>
					<IconButton
						onClick={() => onLikeChanged?.(!liked)}
						size="small"
					>
						{liked ? (
							<FavoriteIcon color="error" />
						) : (
							<NotFavoriteIcon />
						)}
					</IconButton>
				</Box>
			)}
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
							<Fragment key={name}>
								<img src={badges[name]} alt={name} />
								&nbsp;
							</Fragment>
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
				<CardActions sx={{ flexWrap: "wrap" }}>
					{buttons.map((b, i) => (
						<Fragment key={i}>{b}</Fragment>
					))}
				</CardActions>
			)}
		</Card>
	);
}
