import { Grid2 } from "@mui/material";
import {
	AddCard,
	DashboardCard,
	DashboardCardProps,
	LoadingCard,
} from "./DashboardCard";

export interface CardGridProps {
	cards: DashboardCardProps[];
	onAdd?: () => void;
}

const itemSizes = {
	xs: 12,
	sm: 6,
	md: 4,
	lg: 3,
} as const;

export function CardGrid(props: CardGridProps) {
	const { cards, onAdd } = props;
	return (
		<Grid2
			container
			spacing={4}
			sx={{ marginBottom: (theme) => theme.spacing(1) }}
		>
			{cards.length > 0 &&
				cards.map((card) => (
					<Grid2 key={card.title} size={itemSizes}>
						<DashboardCard {...card} />
					</Grid2>
				))}
			{onAdd && (
				<Grid2 size={itemSizes}>
					<AddCard onClick={onAdd} />
				</Grid2>
			)}
			{cards.length === 0 && !onAdd && (
				<Grid2 size={itemSizes}>
					<LoadingCard />
				</Grid2>
			)}
		</Grid2>
	);
}
