import { Grid2 } from "@mui/material";
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
		<Grid2 container spacing={4} sx={{ marginBottom: 1 }}>
			{children.length > 0 &&
				children.map((child, index) => (
					<Grid2 key={index} size={itemSizes}>
						{child}
					</Grid2>
				))}
			{onAdd && (
				<Grid2 size={itemSizes}>
					<AddCard onClick={onAdd} />
				</Grid2>
			)}
			{children.length === 0 && !onAdd && (
				<Grid2 size={itemSizes}>
					<LoadingCard />
				</Grid2>
			)}
		</Grid2>
	);
}
