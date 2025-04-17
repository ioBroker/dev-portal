import { Card, CardActionArea } from "@mui/material";
import { AddCardIcon } from "../Icons";

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
