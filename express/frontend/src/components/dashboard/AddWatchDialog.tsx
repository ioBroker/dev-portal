import { useEffect, useState } from "react";
import { useUserContext } from "../../contexts/UserContext";
import { getAdapterInfos, getLatest } from "../../lib/ioBroker";
import { GitHubComm } from "../../lib/gitHub";
import {
	Autocomplete,
	Button,
	Dialog,
	DialogActions,
	DialogContent,
	DialogContentText,
	DialogTitle,
	InputAdornment,
	TextField,
} from "@mui/material";

export function AddWatchDialog({
	open,
	onClose,
}: {
	open?: boolean;
	onClose: (repo?: string) => void;
}) {
	const { user } = useUserContext();

	const [repoNames, setRepoNames] = useState<string[]>([]);
	const [repoName, setRepoName] = useState("");
	const [error, setError] = useState("");
	const [validating, setValidating] = useState(false);

	useEffect(() => {
		if (!open) {
			return;
		}
		const loadData = async () => {
			const latest = await getLatest();
			const names = Object.keys(latest).map((adapterName) =>
				latest[adapterName].meta.replace(
					/^\w+:\/\/[^/]+\/([^/]+\/[^/]+)\/.+$/,
					"$1",
				),
			);
			setRepoNames(names);
		};
		loadData().catch(console.error);
	}, [open]);

	const validate = async () => {
		setValidating(true);
		try {
			const gitHub = GitHubComm.forToken(user!.token);
			const [owner, repo] = repoName.split("/", 2);
			const latest = await getLatest();
			const infos = await getAdapterInfos(
				await gitHub.getRepo(owner, repo).getRepo(),
				latest,
			);
			if (!infos.info) {
				throw new Error("This is not an ioBroker adapter");
			}
			onClose(repoName);
		} catch (error: any) {
			setError(error.message || error);
		} finally {
			setValidating(false);
		}
	};

	return (
		<Dialog
			open={!!open}
			onClose={() => onClose()}
			aria-labelledby="add-watch-dialog-title"
		>
			<DialogTitle id="add-watch-dialog-title">
				Add an adapter
			</DialogTitle>
			<DialogContent>
				<DialogContentText>
					Please choose a GitHub repository of an ioBroker adapter to
					add to your list of watched adapters.
				</DialogContentText>
				<Autocomplete
					freeSolo
					options={repoNames}
					getOptionLabel={(option) => option}
					inputValue={repoName}
					onInputChange={(_e, value) => {
						setRepoName(value);
						setError("");
					}}
					renderInput={(params) => (
						<TextField
							{...params}
							disabled={validating}
							error={!!error}
							helperText={error}
							label="Adapter Repository"
							variant="outlined"
							InputProps={{
								...params.InputProps,
								startAdornment: (
									<InputAdornment position="start">
										https://github.com/
									</InputAdornment>
								),
							}}
						/>
					)}
				/>
			</DialogContent>
			<DialogActions>
				<Button
					onClick={() => onClose()}
					disabled={validating}
					color="primary"
				>
					Cancel
				</Button>
				<Button
					onClick={validate}
					disabled={validating}
					color="primary"
				>
					Add
				</Button>
			</DialogActions>
		</Dialog>
	);
}
