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
import { useEffect, useState } from "react";
import { AddableAdapterListType } from "../../contexts/AdapterListContext";
import { useUserToken } from "../../contexts/UserContext";
import { GitHubComm } from "../../lib/gitHub";
import { getAdapterInfo, getLatest } from "../../lib/ioBroker";

export function AddWatchDialog({
	type,
	open,
	onClose,
}: {
	type?: AddableAdapterListType;
	open?: boolean;
	onClose: (repo?: string) => void;
}) {
	const token = useUserToken();

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
			const gitHub = GitHubComm.forToken(token);
			const [owner, repo] = repoName.split("/", 2);
			const info = await getAdapterInfo(
				await gitHub.getRepo(owner, repo).getRepo(),
			);
			if (!info) {
				throw new Error("This is not an ioBroker adapter");
			}
			onClose(repoName);
		} catch (error: any) {
			setError(error.message || error);
		} finally {
			setValidating(false);
		}
	};

	const typeName = type === "watches" ? "watched" : "favorite";

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
					add to your list of {typeName} adapters.
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
