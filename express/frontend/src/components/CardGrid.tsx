import Grid from "@material-ui/core/Grid";
import { makeStyles } from "@material-ui/core/styles";
import React from "react";
import {
	AddCard,
	DashboardCard,
	DashboardCardProps,
	LoadingCard,
} from "./DashboardCard";

const useStyles = makeStyles((theme) => ({
	cardGrid: {
		marginBottom: theme.spacing(1),
	},
}));

export interface CardGridProps {
	cards: DashboardCardProps[];
	onAdd?: () => void;
}

export function CardGrid(props: CardGridProps) {
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
