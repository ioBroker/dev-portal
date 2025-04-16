import {
	Button,
	DialogContent,
	DialogContentText,
	DialogTitle,
	Grid2,
	MenuItem,
	TextField,
} from "@mui/material";
import { useEffect, useState } from "react";
import useWebSocket from "react-use-websocket";
import * as semver from "semver";
import {
	ReleaseType,
	ServerClientMessage,
} from "../../../../../backend/src/global/websocket";
import { GitHubIcon } from "../../../components/Icons";
import {
	isLogMessage,
	LogHandler,
	WebSocketLog,
} from "../../../components/WebSocketLog";
import { useAdapterContext } from "../../../contexts/AdapterContext";
import { getWebSocketUrl } from "../../../lib/utils";
import { BaseReleaseDialog } from "./BaseReleaseDialog";

const releaseTypes: ReleaseType[] = ["patch", "minor", "major"];

const gridSizes = {
	xs: 8,
	sm: 6,
	md: 4,
};

function SelectVersion(props: { onSelected: (type?: ReleaseType) => void }) {
	const { onSelected } = props;
	const [type, setType] = useState<ReleaseType>();
	const { info } = useAdapterContext();
	const [version, setVersion] = useState<string>();
	const [versions, setVersions] = useState<
		{ value: ReleaseType; label: string }[]
	>([]);

	const handleChange = (event: any) => setType(event.target.value);

	useEffect(() => onSelected(type), [type, onSelected]);
	useEffect(() => {
		const version = info?.version;
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
	}, [info]);

	return (
		<Grid2 container direction="column" spacing={2}>
			<Grid2 size={gridSizes}>
				<TextField
					label="Current Version"
					disabled
					fullWidth
					value={version || ""}
					variant="outlined"
				/>
			</Grid2>
			<Grid2 size={gridSizes}>
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
			</Grid2>
		</Grid2>
	);
}

export function CreateReleaseDialog() {
	const { name, repo } = useAdapterContext();

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
				webSocket.sendJsonMessage({
					owner: repo?.owner?.login,
					repo: repo?.name,
					type,
				});
			};
			start().catch(console.error);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [step, busy, done, repo, type]);

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
		<BaseReleaseDialog
			busy={busy}
			renderButtons={(onClose) => (
				<>
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
				</>
			)}
		>
			<DialogTitle>Create new release of ioBroker.{name}</DialogTitle>
			<DialogContent dividers>
				<DialogContentText style={{ minHeight: "60vh" }}>
					{step === "choose" && (
						<SelectVersion onSelected={(type) => setType(type)} />
					)}
					{step === "create" && (
						<WebSocketLog
							webSocket={webSocket}
							onMessageReceived={handleMessage}
						/>
					)}
				</DialogContentText>
			</DialogContent>
		</BaseReleaseDialog>
	);
}
