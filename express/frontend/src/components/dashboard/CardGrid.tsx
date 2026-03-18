import { Grid } from "@mui/material";
import { ReactNode } from "react";
import { AddCard } from "./AddCard";
import { LoadingCard } from "./LoadingCard";

export interface CardGridProps {
	onAdd?: () => void;
	children: ReactNode[];
}

const itemSizes = {
	xs: 12,
	sm: 6,
	md: 4,
	lg: 3,
} as const;

export function CardGrid({ children, onAdd }: CardGridProps) {
	return (
		<Grid container spacing={4} sx={{ marginBottom: 1 }}>
			{children.length > 0 &&
				children.map((child, index) => (
					<Grid key={index} size={itemSizes}>
						{child}
					</Grid>
				))}
			{onAdd && (
				<Grid size={itemSizes}>
					<AddCard onClick={onAdd} />
				</Grid>
			)}
			{children.length === 0 && !onAdd && (
				<Grid size={itemSizes}>
					<LoadingCard />
				</Grid>
			)}
		</Grid>
	);
}
