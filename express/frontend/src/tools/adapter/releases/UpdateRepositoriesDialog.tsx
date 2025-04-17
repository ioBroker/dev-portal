import {
	Alert,
	AlertTitle,
	Button,
	DialogContent,
	DialogContentText,
	DialogTitle,
	LinearProgress,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableRow,
} from "@mui/material";
import axios from "axios";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import useWebSocket from "react-use-websocket";
import {
	ServerClientMessage,
	ToLatestMessage,
	ToStableMessage,
} from "../../../../../backend/src/global/websocket";
import { GitHubIcon } from "../../../components/Icons";
import {
	isLogMessage,
	LogHandler,
	WebSocketLog,
} from "../../../components/WebSocketLog";
import { useAdapterContext } from "../../../contexts/AdapterContext";
import { useUserContext, useUserToken } from "../../../contexts/UserContext";
import { GitHubComm } from "../../../lib/gitHub";
import { checkAdapter } from "../../../lib/ioBroker";
import { getWebSocketUrl } from "../../../lib/utils";
import { Message, MessageIcon, sxTableIcon } from "../../AdapterCheck";
import { BaseReleaseDialog } from "./BaseReleaseDialog";

export type RepositoriesAction = "to-stable" | "to-latest";

function AdapterCheckStep(props: {
	action: RepositoriesAction;
	onSuccess: () => void;
}) {
	const { action, onSuccess } = props;
	const [errors, setErrors] = useState<Message[]>();
	const [pullRequestUrl, setPullRequestUrl] = useState<string>();
	const token = useUserToken();
	const { name, repo } = useAdapterContext();

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
								`"icon"\\s*:\\s*"https:\\/\\/raw\\.githubusercontent\\.com\\/${repo?.owner?.login}\\/ioBroker\\.${repo?.name}[^"]+",\\s+"type"\\s*:\\s*"[^"]+",\\s+-\\s+"version"`,
							),
						);
		const findPullRequest = async () => {
			const gitHub = GitHubComm.forToken(token);
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
				const awaitCheckAdapter = checkAdapter(repo!.full_name);
				const pr = await findPullRequest();
				setPullRequestUrl(pr);
				const results = await awaitCheckAdapter;
				setErrors(results.errors.map((c) => new Message("error", c)));
			} catch (error: any) {
				setErrors([new Message("error", error)]);
			}
		};
		runAdapterCheck().catch(console.error);
	}, [repo, token, action, name]);

	useEffect(() => {
		if (errors && errors.length === 0 && !pullRequestUrl) {
			onSuccess();
		}
	}, [errors, pullRequestUrl, onSuccess]);

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
								<TableCell scope="row" sx={sxTableIcon}>
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
	action: RepositoriesAction;
}
export function UpdateRepositoriesDialog(props: UpdateRepositoriesDialogProps) {
	const { action } = props;
	const { version } = useParams<"version">();
	const { user } = useUserContext();
	const { name, repo } = useAdapterContext();

	const webSocket = useWebSocket(getWebSocketUrl(action));

	const [step, setStep] = useState<"check" | "add">("check");
	const [busy, setBusy] = useState(false);
	const [done, setDone] = useState(false);
	const [resultLink, setResultLink] = useState<string>();

	useEffect(() => {
		if (step === "add" && !busy && !done) {
			setBusy(true);
			const start = async () => {
				const owner = repo?.owner.login!;
				const repoName = repo?.name;
				let msg: Partial<ToLatestMessage & ToStableMessage> = {
					owner,
					repo: repoName,
				};
				if (action === "to-latest") {
					const { data: ioPackage } = await axios.get<any>(
						`https://raw.githubusercontent.com/${owner}/${repoName}/${repo?.default_branch}/io-package.json`,
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
	}, [step, busy, done, repo, action, version, user]);

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
		<BaseReleaseDialog
			busy={busy}
			renderButtons={(onClose) => (
				<>
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
				</>
			)}
		>
			<DialogTitle>{title} repository</DialogTitle>
			<DialogContent dividers>
				<DialogContentText style={{ minHeight: "60vh" }}>
					{step === "check" && (
						<AdapterCheckStep
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
		</BaseReleaseDialog>
	);
}
