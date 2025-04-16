import { Card, CircularProgress } from "@mui/material";

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
