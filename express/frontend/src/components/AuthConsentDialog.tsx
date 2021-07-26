import Button from "@material-ui/core/Button";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogContentText from "@material-ui/core/DialogContentText";
import DialogTitle from "@material-ui/core/DialogTitle";

export interface AuthConsentDialogProps {
	reason: string;
	actions: string[];
	open: boolean;
	/**
	 * This will be called when the dialog must be closed,
	 * independent of what the user clicked.
	 */
	onClose: () => void;
	onContinue: () => void;
}

export default function AuthConsentDialog(props: AuthConsentDialogProps) {
	const { reason, actions, open, onClose, onContinue } = props;
	const handleContinue = () => {
		onClose();
		onContinue();
	};
	return (
		<Dialog open={open} onClose={onClose}>
			<DialogTitle>
				Allow extended access to your GitHub account?
			</DialogTitle>
			<DialogContent>
				<DialogContentText>
					To {reason} we need extended permissions for your GitHub
					account.
					<br />
					We will do the following:
					<ul>
						{actions.map((action) => (
							<li>{action}</li>
						))}
					</ul>
					No interaction with your repositories will ever be made
					without this prompt showing up.
					<br />
					If you click "Agree", you will be forwarded to GitHub for
					authentication. The received authentication token is never
					transmitted to anybody but GitHub and will not be stored by
					this website.
				</DialogContentText>
			</DialogContent>
			<DialogActions>
				<Button onClick={onClose} color="primary">
					Disagree
				</Button>
				<Button onClick={handleContinue} color="primary" autoFocus>
					Agree
				</Button>
			</DialogActions>
		</Dialog>
	);
}
