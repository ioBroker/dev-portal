import { Answers } from "@iobroker/create-adapter/build/core";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import {
	Accordion,
	AccordionDetails,
	AccordionSummary,
	Button,
	Dialog,
	DialogActions,
	DialogContent,
	DialogContentText,
	DialogTitle,
	TextField,
	Typography,
} from "@mui/material";
import { useEffect, useState } from "react";
import useWebSocket from "react-use-websocket";
import { WebSocketHook } from "react-use-websocket/dist/lib/types";
import {
	GenerateAdapterMessage,
	LogMessage,
	ServerClientMessage,
} from "../../../../backend/src/global/websocket";
import { AuthConsentDialog } from "../../components/AuthConsentDialog";
import { CardButton } from "../../components/CardButton";
import { CardGrid } from "../../components/dashboard/CardGrid";
import { DashboardCardProps } from "../../components/dashboard/DashboardCard";
import { DownloadIcon, GitHubIcon } from "../../components/Icons";
import { LogHandler, WebSocketLog } from "../../components/WebSocketLog";
import { User } from "../../lib/gitHub";
import { getWebSocketUrl } from "../../lib/utils";

const STORAGE_KEY_SECRETS_AFTER_LOGIN = "creator-secrets-after-login";

function isLogMessage(obj: unknown): obj is LogMessage {
	return Object.prototype.hasOwnProperty.call(obj, "log");
}

type GeneratorState = "idle" | "generating" | "success" | "failed";
type GeneratorTarget = "github" | "zip";

export type AnswersWithoutTarget = Omit<Answers, "target">;

export interface TokensDialogProps {
	adapterName: string;
	tokens: string[];
	open: boolean;
	onContinue: (secrets: Record<string, string>) => void;
	onCancel: () => void;
}

export function TokensDialog(props: TokensDialogProps) {
	const { adapterName, tokens, open, onContinue, onCancel } = props;

	const [index, setIndex] = useState(0);
	const [secrets, setSecrets] = useState<Record<string, string>>({});
	const [value, setValue] = useState("");

	useEffect(() => {
		if (open) {
			setSecrets({});
			setIndex(0);
			setValue("");
		}
	}, [open]);

	const handleValueChange = (event: any) => {
		setValue(event.target.value);
	};

	const handleContinue = () => {
		const newSecrets = { ...secrets, [tokens[index]]: value };
		if (index === tokens.length - 1) {
			onContinue(newSecrets);
		} else {
			setSecrets(newSecrets);
			setIndex((i) => i + 1);
			setValue("");
		}
	};
	return (
		<Dialog open={open} onClose={onCancel}>
			<DialogTitle>Create {tokens[index]}</DialogTitle>
			<DialogContent>
				{tokens[index] === "AUTO_MERGE_TOKEN" && (
					<DialogContentText>
						To use Dependabot you must provide a GitHub Personal
						Access Token with the permission "public_repo".
						<br />
						Please follow these steps:
						<ol>
							<li>
								Open the{" "}
								<a
									href="https://github.com/settings/tokens"
									target="tokens"
								>
									tokens settings
								</a>{" "}
								of your GitHub account
							</li>
							<li>Click on "Generate new token"</li>
							<li>
								As a "Note" enter:{" "}
								<code>
									ioBroker.{adapterName} dependabot-auto-merge
								</code>
							</li>
							<li>
								Set the expiration to <code>No expiration</code>
							</li>
							<li>
								Only check the box next to{" "}
								<code>public_repo</code>
							</li>
							<li>Click on "Generate token"</li>
							<li>
								Copy the generated token; it should start with{" "}
								<code>ghp_...</code>
							</li>
							<li>Paste the token here:</li>
						</ol>
						<TextField
							id="auto-merge-token"
							label="AUTO_MERGE_TOKEN"
							fullWidth
							value={value}
							onChange={handleValueChange}
						/>
						<br />
						This token will not be stored anywhere but in your
						repository secrets.
					</DialogContentText>
				)}
				{tokens[index] === "NPM_TOKEN" && (
					<DialogContentText>
						To use the release script with GitHub Actions you must
						provide a npm Access Token with the type "Automation".
						<br />
						Please follow these steps:
						<ol>
							<li>
								Open the tokens settings of your{" "}
								<a
									href="https://www.npmjs.com/"
									target="tokens"
								>
									npmjs
								</a>{" "}
								account (
								<code>
									https://www.npmjs.com/settings/&lt;username&gt;/tokens
								</code>
								)
							</li>
							<li>Click on "Generate New Token"</li>
							<li>
								Select the type <code>Automation</code>
							</li>
							<li>Click on "Generate Token"</li>
							<li>Copy the generated token</li>
							<li>Paste the token here:</li>
						</ol>
						<TextField
							id="npm-token"
							label="NPM_TOKEN"
							fullWidth
							value={value}
							onChange={handleValueChange}
						/>
						<br />
						This token will not be stored anywhere but in your
						repository secrets.
					</DialogContentText>
				)}
			</DialogContent>
			<DialogActions>
				<Button onClick={onCancel} color="primary">
					Cancel
				</Button>
				<Button onClick={handleContinue} color="primary">
					Continue
				</Button>
			</DialogActions>
		</Dialog>
	);
}

export interface GeneratorDialogProps {
	webSocket: WebSocketHook;
	answers: Answers;
	secrets: Record<string, string>;
	onClose: () => void;
}

export function GeneratorDialog(props: GeneratorDialogProps) {
	const { webSocket, answers, secrets, onClose } = props;
	const { target } = answers;

	const [state, setState] = useState<GeneratorState>("idle");
	const [resultLink, setResultLink] = useState<string>();

	const msg: GenerateAdapterMessage = {
		answers,
		secrets,
	};
	const startMessage = JSON.stringify(msg);
	useEffect(() => {
		if (state === "idle" && target) {
			//console.log(state, target, "--> sendMessage", startMessage);
			webSocket.sendMessage(startMessage);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [target, state]);

	const handleMessage = (msg: ServerClientMessage, appendLog: LogHandler) => {
		if (isLogMessage(msg)) {
			return;
		}
		if (msg.result) {
			appendLog("Completed successfully", "green");
			setResultLink(msg.resultLink);
			setState("success");
		} else {
			appendLog("Failed", "red");
			setState("failed");
		}
	};

	const canClose = state === "success" || state === "failed";

	return (
		<Dialog
			open
			scroll="paper"
			maxWidth="md"
			fullWidth
			disableEscapeKeyDown={!canClose}
			aria-labelledby="scroll-dialog-title"
			aria-describedby="scroll-dialog-description"
		>
			<DialogTitle id="scroll-dialog-title">
				Generating Adapter...
			</DialogTitle>
			<DialogContent dividers>
				<DialogContentText style={{ minHeight: "60vh" }}>
					<WebSocketLog
						webSocket={webSocket}
						onMessageReceived={handleMessage}
					/>
				</DialogContentText>
			</DialogContent>
			<DialogActions>
				{target === "zip" && (
					<Button
						href={resultLink || ""}
						target="_blank"
						disabled={state !== "success" || !resultLink}
						color="primary"
						startIcon={<DownloadIcon />}
					>
						Download
					</Button>
				)}
				{target === "github" && (
					<Button
						href={resultLink || ""}
						target="_blank"
						disabled={state !== "success" || !resultLink}
						color="primary"
						startIcon={<GitHubIcon />}
					>
						Open Repository
					</Button>
				)}
				<Button
					onClick={() => onClose()}
					disabled={!canClose}
					color="primary"
				>
					Close
				</Button>
			</DialogActions>
		</Dialog>
	);
}

export interface GenerateStepProps {
	answers: AnswersWithoutTarget;
	user?: User;
	startGenerator?: boolean;
	onRequestLogin: () => void;
}

export function GenerateStep(props: GenerateStepProps) {
	const { answers, user, startGenerator, onRequestLogin } = props;

	const webSocket = useWebSocket(getWebSocketUrl("create-adapter"));

	const [generator, setGenerator] = useState<GeneratorTarget>();
	const [consentOpen, setConsentOpen] = useState(false);
	const [tokensOpen, setTokensOpen] = useState(false);
	const [consentActions, setConsentActions] = useState<string[]>([]);
	const [tokens, setTokens] = useState<string[]>([]);
	const [secrets, setSecrets] = useState<Record<string, string>>({});

	useEffect(() => {
		if (startGenerator) {
			const loadedSecrets = window.localStorage.getItem(
				STORAGE_KEY_SECRETS_AFTER_LOGIN,
			);
			if (loadedSecrets) {
				window.localStorage.removeItem(STORAGE_KEY_SECRETS_AFTER_LOGIN);
				setSecrets(JSON.parse(loadedSecrets));
			} else {
				setSecrets({});
			}
			setGenerator("github");
		}
	}, [startGenerator]);

	useEffect(() => {
		const tokens: string[] = [];
		if (answers.dependabot === "yes") {
			tokens.push("AUTO_MERGE_TOKEN");
		}
		if (answers.releaseScript === "yes") {
			tokens.push("NPM_TOKEN");
		}
		const actions = [
			`create a new repository called ioBroker.${answers.adapterName} for the user or organization you choose`,
			"upload all generated files",
		];
		if (tokens.length > 0) {
			actions.push(
				`add the following token${
					tokens.length === 1 ? "" : "s"
				} to your repository: ${tokens.join(", ")}`,
			);
		}
		setConsentActions(actions);
		setTokens(tokens);
	}, [answers]);

	const onRequestZip = () => {
		setGenerator("zip");
	};

	const onRequestGitHub = () => {
		if (tokens.length > 0) {
			setTokensOpen(true);
		} else {
			setConsentOpen(true);
		}
	};

	const onSecretsEntered = (secrets: Record<string, string>) => {
		window.localStorage.setItem(
			STORAGE_KEY_SECRETS_AFTER_LOGIN,
			JSON.stringify(secrets),
		);
		setTokensOpen(false);
		setConsentOpen(true);
	};

	const cards: DashboardCardProps[] = [
		{
			title: "Create GitHub Repository",
			text: "Your code will be uploaded to a newly created GitHub repository for the user or organization you choose.",
			buttons: [
				<CardButton
					text="Create Repository"
					startIcon={<GitHubIcon />}
					onClick={() => onRequestGitHub()}
					disabled={!user || !!generator}
				/>,
			],
		},
		{
			title: "Download Zip File",
			text:
				"You will get a link to download a zip file.\n" +
				"The generated zip file contains all files to start writing your own adapter code.",
			buttons: [
				<CardButton
					text="Create Zip File"
					startIcon={<DownloadIcon />}
					onClick={() => onRequestZip()}
					disabled={!user || !!generator}
				/>,
			],
		},
	];

	return (
		<>
			<AuthConsentDialog
				reason="create a new adapter repository"
				actions={consentActions}
				open={consentOpen}
				onCancel={() => setConsentOpen(false)}
				onContinue={onRequestLogin}
			/>
			<TokensDialog
				adapterName={answers.adapterName}
				tokens={tokens}
				open={tokensOpen}
				onCancel={() => setTokensOpen(false)}
				onContinue={onSecretsEntered}
			/>
			{!!generator && (
				<GeneratorDialog
					webSocket={webSocket}
					answers={{ ...answers, target: generator }}
					secrets={secrets}
					onClose={() => setGenerator(undefined)}
				/>
			)}
			<Accordion sx={{ marginTop: 2 }}>
				<AccordionSummary expandIcon={<ExpandMoreIcon />}>
					<Typography>Your adapter configuration</Typography>
				</AccordionSummary>
				<AccordionDetails
					sx={{
						overflowX: "hidden",
					}}
				>
					<pre>{JSON.stringify(answers, null, 2)}</pre>
				</AccordionDetails>
			</Accordion>
			<CardGrid cards={cards} />
		</>
	);
}
