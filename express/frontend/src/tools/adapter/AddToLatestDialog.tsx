import Button from "@material-ui/core/Button";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogContentText from "@material-ui/core/DialogContentText";
import DialogTitle from "@material-ui/core/DialogTitle";
import LinearProgress from "@material-ui/core/LinearProgress";
import Table from "@material-ui/core/Table";
import TableBody from "@material-ui/core/TableBody";
import TableCell from "@material-ui/core/TableCell";
import TableContainer from "@material-ui/core/TableContainer";
import TableRow from "@material-ui/core/TableRow";
import Alert from "@material-ui/lab/Alert";
import AlertTitle from "@material-ui/lab/AlertTitle";
import axios from "axios";
import { useEffect } from "react";
import { useState } from "react";
import { useParams } from "react-router-dom";
import useWebSocket from "react-use-websocket";
import { ServerClientMessage } from "../../../../backend/src/global/websocket";
import { GitHubIcon } from "../../components/Icons";
import WebSocketLog, {
	isLogMessage,
	LogHandler,
} from "../../components/WebSocketLog";
import { GitHubComm, User } from "../../lib/gitHub";
import { AdapterInfos, checkAdapter } from "../../lib/ioBroker";
import { getWebSocketUrl } from "../../lib/utils";
import {
	Message,
	MessageIcon,
	useStyles as useAdapterCheckStyles,
} from "../AdapterCheck";

function AdapterCheckStep(props: {
	infos: AdapterInfos;
	user: User;
	onSuccess: () => void;
}) {
	const { infos, user, onSuccess } = props;
	const { name } = useParams<{ name: string }>();
	const [errors, setErrors] = useState<Message[]>();
	const [pullRequestUrl, setPullRequestUrl] = useState<string>();

	useEffect(() => {
		const findPullRequest = async () => {
			const gitHub = GitHubComm.forToken(user.token);
			const repo = gitHub.getRepo("ioBroker", "ioBroker.repositories");
			const prs = await repo.getPullRequests("open");
			const diffs = await Promise.all(
				prs.map((pr) => repo.compare(pr.base.sha, pr.head.sha)),
			);
			// check the diffs for an add (line starts with "+") of this adapter
			const index = diffs.findIndex((diff) =>
				diff.files.some(
					(file) =>
						file.filename === "sources-dist.json" &&
						file.patch?.match(
							new RegExp(`^\\+\\s*"${name}"\\s*:\\s*`, "m"),
						),
				),
			);
			return index < 0 ? undefined : prs[index].html_url;
		};
		const runAdapterCheck = async () => {
			try {
				const awaitCheckAdapter = checkAdapter(infos.repo.full_name);
				const pr = await findPullRequest();
				setPullRequestUrl(pr);
				const results = await awaitCheckAdapter;
				setErrors(results.errors.map((c) => new Message("error", c)));
			} catch (error) {
				setErrors([new Message("error", error)]);
			}
		};
		runAdapterCheck().catch(console.error);
	}, [infos, user, name]);

	useEffect(() => {
		if (errors && errors.length === 0 && !pullRequestUrl) {
			onSuccess();
		}
	}, [errors, pullRequestUrl, onSuccess]);

	const classes = useAdapterCheckStyles();
	if (pullRequestUrl) {
		return (
			<Alert
				severity="error"
				action={
					<Button
						color="inherit"
						size="small"
						target="_blank"
						href={pullRequestUrl}
					>
						Show
					</Button>
				}
			>
				<AlertTitle>Open pull request</AlertTitle>
				You already have an open pull request to add ioBroker.{name} to
				beta/latest.
			</Alert>
		);
	}
	if (!errors) {
		return (
			<>
				We are checking your adapter for issues, please wait...
				<LinearProgress />
			</>
		);
	}
	return (
		<>
			Please fix the following errors before you can continue:
			<TableContainer>
				<Table size="small">
					<TableBody>
						{errors.map((error, i) => (
							<TableRow key={i}>
								<TableCell
									scope="row"
									className={classes.tableIcon}
								>
									<MessageIcon type={error.type} />
								</TableCell>
								<TableCell>{error.text}</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</TableContainer>
		</>
	);
}

interface AddToLatestDialogProps {
	infos: AdapterInfos;
	user: User;
	open: boolean;
	onClose: () => void;
}
export default function AddToLatestDialog(props: AddToLatestDialogProps) {
	const { infos, user, open, onClose } = props;
	const { name } = useParams<{ name: string }>();

	const webSocket = useWebSocket(getWebSocketUrl("to-latest"));

	const [step, setStep] = useState<"check" | "add">("check");
	const [busy, setBusy] = useState(false);
	const [resultLink, setResultLink] = useState<string>();

	useEffect(() => {
		if (step === "add") {
			setBusy(true);
			const start = async () => {
				const owner = infos.repo.owner?.login!;
				const repo = infos.repo.name;
				const { data: ioPackage } = await axios.get(
					`https://raw.githubusercontent.com/${owner}/${repo}/${infos.repo.default_branch}/io-package.json`,
				);

				webSocket.sendJsonMessage({
					owner,
					repo,
					type: ioPackage.common.type,
				});
			};
			start().catch(console.error);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [step, infos, user]);

	const handleMessage = (msg: ServerClientMessage, appendLog: LogHandler) => {
		if (isLogMessage(msg)) {
			return;
		}
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
			<DialogTitle>
				Add ioBroker.{name} to beta/latest repository
			</DialogTitle>
			<DialogContent dividers>
				<DialogContentText style={{ minHeight: "60vh" }}>
					{step === "check" && (
						<AdapterCheckStep
							infos={infos}
							user={user}
							onSuccess={() => setStep("add")}
						/>
					)}
					{step === "add" && (
						<WebSocketLog
							webSocket={webSocket}
							onMessageReceived={handleMessage}
						/>
					)}
				</DialogContentText>
			</DialogContent>
			<DialogActions>
				{step === "add" && (
					<Button
						href={resultLink || ""}
						target="_blank"
						disabled={busy || !resultLink}
						color="primary"
						startIcon={<GitHubIcon />}
					>
						Show Pull Request
					</Button>
				)}
				<Button
					onClick={() => onClose()}
					disabled={busy}
					color="primary"
				>
					{step === "check" ? "Cancel" : "Close"}
				</Button>
			</DialogActions>
		</Dialog>
	);
}
