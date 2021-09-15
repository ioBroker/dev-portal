import Button from "@material-ui/core/Button";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogContentText from "@material-ui/core/DialogContentText";
import DialogTitle from "@material-ui/core/DialogTitle";
import Grid from "@material-ui/core/Grid";
import MenuItem from "@material-ui/core/MenuItem";
import TextField from "@material-ui/core/TextField";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import useWebSocket from "react-use-websocket";
import * as semver from "semver";
import {
	ReleaseType,
	ServerClientMessage,
} from "../../../../backend/src/global/websocket";
import { GitHubIcon } from "../../components/Icons";
import WebSocketLog, {
	isLogMessage,
	LogHandler,
} from "../../components/WebSocketLog";
import { AdapterInfos } from "../../lib/ioBroker";
import { getWebSocketUrl } from "../../lib/utils";

const releaseTypes: ReleaseType[] = ["patch", "minor", "major"];

function SelectVersion(props: {
	infos: AdapterInfos;
	onSelected: (type?: ReleaseType) => void;
}) {
	const { infos, onSelected } = props;
	const [type, setType] = useState<ReleaseType>();
	const [version, setVersion] = useState<string>();
	const [versions, setVersions] = useState<
		{ value: ReleaseType; label: string }[]
	>([]);

	const handleChange = (event: any) => setType(event.target.value);

	useEffect(() => onSelected(type), [type, onSelected]);
	useEffect(() => {
		const version = infos.info?.version;
		setVersion(version);
		if (version) {
			setVersions(
				releaseTypes.map((type: ReleaseType) => ({
					value: type,
					label: semver.inc(version, type) || "-",
				})),
			);
		} else {
			setVersions([]);
		}
	}, [infos]);

	return (
		<Grid container direction="column" spacing={2}>
			<Grid item xs={8} sm={6} md={4}>
				<TextField
					label="Current Version"
					disabled
					fullWidth
					value={version || ""}
					variant="outlined"
				/>
			</Grid>
			<Grid item xs={8} sm={6} md={4}>
				<TextField
					select
					fullWidth
					label="New Version"
					value={type || ""}
					onChange={handleChange}
					helperText="Please select the version to create"
					variant="outlined"
				>
					{versions.map((version) => (
						<MenuItem key={version.value} value={version.value}>
							{version.label} ({version.value})
						</MenuItem>
					))}
				</TextField>
			</Grid>
		</Grid>
	);
}

interface CreateReleaseDialogProps {
	infos: AdapterInfos;
	open: boolean;
	onClose: () => void;
}
export default function CreateReleaseDialog(props: CreateReleaseDialogProps) {
	const { infos, open, onClose } = props;
	const { name } = useParams<{ name: string }>();

	const webSocket = useWebSocket(getWebSocketUrl("release"));

	const [step, setStep] = useState<"choose" | "create">("choose");
	const [type, setType] = useState<ReleaseType>();
	const [busy, setBusy] = useState(false);
	const [done, setDone] = useState(false);
	const [resultLink, setResultLink] = useState<string>();

	useEffect(() => {
		if (step === "create" && !busy && !done) {
			setBusy(true);
			const start = async () => {
				const owner = infos.repo.owner?.login!;
				const repo = infos.repo.name;
				webSocket.sendJsonMessage({ owner, repo, type });
			};
			start().catch(console.error);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [step, busy, done, infos, type]);

	const handleMessage = (msg: ServerClientMessage, appendLog: LogHandler) => {
		if (isLogMessage(msg)) {
			return;
		}
		setDone(true);
		setBusy(false);
		if (msg.result) {
			appendLog("Completed successfully", "green");
			setResultLink(msg.resultLink);
		} else {
			appendLog("Failed", "red");
		}
	};

	return (
		<Dialog
			open={open}
			onClose={onClose}
			scroll="paper"
			maxWidth="md"
			fullWidth
			disableBackdropClick={busy}
			disableEscapeKeyDown={busy}
		>
			<DialogTitle>Create new release of ioBroker.{name}</DialogTitle>
			<DialogContent dividers>
				<DialogContentText style={{ minHeight: "60vh" }}>
					{step === "choose" && (
						<SelectVersion
							infos={infos}
							onSelected={(type) => setType(type)}
						/>
					)}
					{step === "create" && (
						<WebSocketLog
							webSocket={webSocket}
							onMessageReceived={handleMessage}
						/>
					)}
				</DialogContentText>
			</DialogContent>
			<DialogActions>
				{step === "create" && (
					<Button
						href={resultLink || ""}
						target="_blank"
						disabled={busy || !resultLink}
						color="primary"
						startIcon={<GitHubIcon />}
					>
						Show Workflow
					</Button>
				)}
				<Button
					onClick={() => onClose()}
					disabled={busy}
					color="primary"
				>
					{step === "choose" ? "Cancel" : "Close"}
				</Button>
				{step === "choose" && (
					<Button
						onClick={() => setStep("create")}
						disabled={!type}
						color="primary"
					>
						Start
					</Button>
				)}
			</DialogActions>
		</Dialog>
	);
}
