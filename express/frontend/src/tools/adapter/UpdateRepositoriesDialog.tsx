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
import {
	ServerClientMessage,
	ToLatestMessage,
	ToStableMessage,
} from "../../../../backend/src/global/websocket";
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

export type RepositoriesAction = "to-stable" | "to-latest";

function AdapterCheckStep(props: {
	infos: AdapterInfos;
	user: User;
	action: RepositoriesAction;
	onSuccess: () => void;
}) {
	const { infos, user, action, onSuccess } = props;
	const { name } = useParams<{ name: string }>();
	const [errors, setErrors] = useState<Message[]>();
	const [pullRequestUrl, setPullRequestUrl] = useState<string>();

	useEffect(() => {
		// check the diffs for an add (line starts with "+") of this adapter
		const sameAdapter: (file: {
			filename: string;
			patch?: string;
		}) => boolean =
			action === "to-latest"
				? (file) =>
						file.filename === "sources-dist.json" &&
						!!file.patch?.match(
							new RegExp(`^\\+\\s*"${name}"\\s*:\\s*`, "m"),
						)
				: (file) =>
						file.filename === "sources-dist-stable.json" &&
						!!file.patch?.match(
							new RegExp(
								`"icon"\\s*:\\s*"https:\\/\\/raw\\.githubusercontent\\.com\\/${infos.repo.owner?.login}\\/ioBroker\\.${infos.repo.name}[^"]+",\\s+"type"\\s*:\\s*"[^"]+",\\s+-\\s+"version"`,
							),
						);
		const findPullRequest = async () => {
			const gitHub = GitHubComm.forToken(user.token);
			const repo = gitHub.getRepo("ioBroker", "ioBroker.repositories");
			const prs = await repo.getPullRequests("open");
			const diffs = await Promise.all(
				prs.map((pr) => repo.compare(pr.base.sha, pr.head.sha)),
			);
			const index = diffs.findIndex((diff) =>
				diff.files?.some(sameAdapter),
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
	}, [infos, user, action, name]);

	useEffect(() => {
		if (errors && errors.length === 0 && !pullRequestUrl) {
			onSuccess();
		}
	}, [errors, pullRequestUrl, onSuccess]);

	const classes = useAdapterCheckStyles();
	if (pullRequestUrl) {
		const text =
			action === "to-latest"
				? `add ioBroker.${name} to beta/latest`
				: `update the stable version of ioBroker.${name}`;
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
				You already have an open pull request to {text}.
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

interface UpdateRepositoriesDialogProps {
	infos: AdapterInfos;
	user: User;
	action: RepositoriesAction;
	open: boolean;
	onClose: () => void;
}
export default function UpdateRepositoriesDialog(
	props: UpdateRepositoriesDialogProps,
) {
	const { infos, user, action, open, onClose } = props;
	const { name, version } = useParams<{ name: string; version?: string }>();

	const webSocket = useWebSocket(getWebSocketUrl(action));

	const [step, setStep] = useState<"check" | "add">("check");
	const [busy, setBusy] = useState(false);
	const [done, setDone] = useState(false);
	const [resultLink, setResultLink] = useState<string>();

	useEffect(() => {
		if (step === "add" && !busy && !done) {
			setBusy(true);
			const start = async () => {
				const owner = infos.repo.owner?.login!;
				const repo = infos.repo.name;
				let msg: Partial<ToLatestMessage & ToStableMessage> = {
					owner,
					repo,
				};
				if (action === "to-latest") {
					const { data: ioPackage } = await axios.get(
						`https://raw.githubusercontent.com/${owner}/${repo}/${infos.repo.default_branch}/io-package.json`,
					);
					msg.type = ioPackage.common.type;
				} else {
					msg.version = version;
				}

				webSocket.sendJsonMessage(msg);
			};
			start().catch(console.error);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [step, busy, done, infos, action, version, user]);

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

	const title =
		action === "to-latest"
			? `Add ioBroker.${name} to beta/latest`
			: `Update ioBroker.${name} to ${version} in stable`;
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
			<DialogTitle>{title} repository</DialogTitle>
			<DialogContent dividers>
				<DialogContentText style={{ minHeight: "60vh" }}>
					{step === "check" && (
						<AdapterCheckStep
							infos={infos}
							user={user}
							action={action}
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
