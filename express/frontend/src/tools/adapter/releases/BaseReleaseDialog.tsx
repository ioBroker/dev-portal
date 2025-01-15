import { Dialog, DialogActions } from "@mui/material";
import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";

export function BaseReleaseDialog({
	busy,
	renderButtons,
	children,
}: {
	busy?: boolean;
	renderButtons: (onClose: () => void) => ReactNode;
	children: ReactNode;
}) {
	const navigate = useNavigate();
	const onClose = () => {
		navigate("..");
	};

	return (
		<Dialog
			open
			onClose={onClose}
			scroll="paper"
			maxWidth="md"
			fullWidth
			disableEscapeKeyDown={busy}
		>
			{children}
			<DialogActions>{renderButtons(onClose)}</DialogActions>
		</Dialog>
	);
}
