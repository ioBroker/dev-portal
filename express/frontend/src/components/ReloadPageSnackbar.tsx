import Button from "@material-ui/core/Button";
import Snackbar from "@material-ui/core/Snackbar";
import Alert from "@material-ui/lab/Alert";
import axios from "axios";
import React, { useEffect, useState } from "react";
import { Version } from "../../../backend/src/global/version";
import { getApiUrl } from "../lib/utils";
import { GIT_BRANCH, GIT_COMMIT } from "../version";

interface ReloadPageSnackbarProps {}

export default function ReloadPageSnackbar(props: ReloadPageSnackbarProps) {
	const [open, setOpen] = useState(false);
	const [timerRunning, setTimerRunning] = useState(false);

	useEffect(() => {
		let foundVersion = `${GIT_COMMIT}@${GIT_BRANCH}`;
		setInterval(async () => {
			const url = getApiUrl("version");
			const {
				data: { branch, commit },
			} = await axios.get<Version>(url);
			const newVersion = `${commit}@${branch}`;
			if (newVersion !== foundVersion) {
				setOpen(true);
				foundVersion = newVersion;
			}
		}, 60 * 1000);
	}, [timerRunning]);

	if (!timerRunning) {
		setTimerRunning(true);
	}

	function handleClose() {
		setOpen(false);
	}

	function handleReload() {
		window.location.reload();
	}

	return (
		<Snackbar
			anchorOrigin={{
				vertical: "top",
				horizontal: "center",
			}}
			open={open}
			onClose={handleClose}
		>
			<Alert onClose={handleClose} severity="warning">
				The site has been updated on the server, would you like to
				reload it?
				<Button color="primary" size="small" onClick={handleReload}>
					RELOAD
				</Button>
			</Alert>
		</Snackbar>
	);
}
