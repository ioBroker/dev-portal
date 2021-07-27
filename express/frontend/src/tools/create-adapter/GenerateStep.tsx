import { Answers } from "@iobroker/create-adapter/build/core";
import Accordion from "@material-ui/core/Accordion";
import AccordionDetails from "@material-ui/core/AccordionDetails";
import AccordionSummary from "@material-ui/core/AccordionSummary";
import Button from "@material-ui/core/Button";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogContentText from "@material-ui/core/DialogContentText";
import DialogTitle from "@material-ui/core/DialogTitle";
import { makeStyles } from "@material-ui/core/styles";
import Typography from "@material-ui/core/Typography";
import ExpandMoreIcon from "@material-ui/icons/ExpandMore";
import React, { useEffect, useRef } from "react";
import useWebSocket from "react-use-websocket";
import { WebSocketHook } from "react-use-websocket/dist/lib/types";
import {
	GeneratorTarget,
	LogMessage,
	ServerClientMessage,
} from "../../../../backend/src/global/websocket";
import AuthConsentDialog from "../../components/AuthConsentDialog";
import { CardButton } from "../../components/CardButton";
import { CardGrid } from "../../components/CardGrid";
import { DashboardCardProps } from "../../components/DashboardCard";
import { DownloadIcon, GitHubIcon } from "../../components/Icons";
import { User } from "../../lib/gitHub";
import { getWebSocketUrl } from "../../lib/utils";

const useStyles = makeStyles((theme) => ({
	configPreview: {
		overflowX: "hidden",
	},
	log: {
		flexFlow: "column",
		maxHeight: "400px",
		overflowY: "scroll",
		overflowX: "auto",
	},
	accordion: {
		margin: `${theme.spacing(2)}px 0 !important`,
	},
}));
function isLogMessage(obj: unknown): obj is LogMessage {
	return Object.prototype.hasOwnProperty.call(obj, "log");
}

type GeneratorState = "idle" | "generating" | "success" | "failed";

export interface GeneratorDialogProps {
	webSocket: WebSocketHook;
	target: GeneratorTarget;
	answers: Answers;
	onClose: () => void;
}

export function GeneratorDialog(props: GeneratorDialogProps) {
	const { webSocket, target, answers, onClose } = props;

	type LogItem = { color: string; text: string };

	const [log, setLog] = React.useState<LogItem[]>([]);
	const [state, setState] = React.useState<GeneratorState>("idle");
	const [resultLink, setResultLink] = React.useState<string>();

	const { lastJsonMessage } = webSocket;

	const logEndRef = useRef<any>();

	const startMessage = JSON.stringify({ answers, target });
	useEffect(() => {
		if (state === "idle" && target) {
			//console.log(state, target, "--> sendMessage", startMessage);
			setLog([]);
			webSocket.sendMessage(startMessage);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [target, state]);

	useEffect(() => {
		if (!lastJsonMessage) {
			return;
		}
		console.log("msg", lastJsonMessage);
		const appendLog = (text: string, color: string) =>
			setLog((old) => [...old, { text, color }]);
		try {
			const msg = lastJsonMessage as ServerClientMessage;
			if (isLogMessage(msg)) {
				const logMsg = msg;
				appendLog(logMsg.log, logMsg.isError ? "red" : "black");
			} else if (msg.result) {
				appendLog("Completed sucessfully", "green");
				setResultLink(msg.resultLink);
				setState("success");
			} else {
				appendLog("Failed", "red");
				setState("failed");
			}
		} catch (error) {
			console.error(error);
		}
	}, [lastJsonMessage]);

	useEffect(() => {
		logEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [log]);

	return (
		<Dialog
			open
			scroll="paper"
			maxWidth="md"
			fullWidth
			aria-labelledby="scroll-dialog-title"
			aria-describedby="scroll-dialog-description"
		>
			<DialogTitle id="scroll-dialog-title">
				Generating Adapter...
			</DialogTitle>
			<DialogContent dividers>
				<DialogContentText style={{ minHeight: "60vh" }}>
					{log.map((entry, i) => (
						<pre key={i} style={{ color: entry.color, margin: 0 }}>
							{entry.text}
						</pre>
					))}
					<div ref={logEndRef} />
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
					disabled={state !== "success" && state !== "failed"}
					color="primary"
				>
					Close
				</Button>
			</DialogActions>
		</Dialog>
	);
}

export interface GenerateStepProps {
	answers: Answers;
	user?: User;
	startGenerator?: boolean;
	onRequestLogin: () => void;
}

export function GenerateStep(props: GenerateStepProps) {
	const { answers, user, startGenerator, onRequestLogin } = props;
	const classes = useStyles();

	const webSocket = useWebSocket(getWebSocketUrl("create-adapter"));

	const [generator, setGenerator] = React.useState<GeneratorTarget>();
	const [consentOpen, setConsentOpen] = React.useState(false);

	useEffect(() => {
		if (startGenerator) {
			setGenerator("github");
		}
	}, [startGenerator]);

	const onRequestZip = () => {
		setGenerator("zip");
	};

	const cards: DashboardCardProps[] = [
		{
			title: "Create GitHub Repository",
			text:
				"Your code will be uploaded to a newly created GitHub repository for the user or organisation you choose.",
			buttons: [
				<CardButton
					text="Create Repository"
					startIcon={<GitHubIcon />}
					onClick={() => setConsentOpen(true)}
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
				actions={[
					`create a new repository called ioBroker.${answers.adapterName} for the user or organisation you choose`,
					"upload all generated files",
				]}
				open={consentOpen}
				onClose={() => setConsentOpen(false)}
				onContinue={onRequestLogin}
			/>
			{!!generator && (
				<GeneratorDialog
					webSocket={webSocket}
					target={generator}
					answers={answers}
					onClose={() => setGenerator(undefined)}
				/>
			)}
			<Accordion className={classes.accordion}>
				<AccordionSummary expandIcon={<ExpandMoreIcon />}>
					<Typography>Your adapter configuration</Typography>
				</AccordionSummary>
				<AccordionDetails className={classes.configPreview}>
					<pre>{JSON.stringify(answers, null, 2)}</pre>
				</AccordionDetails>
			</Accordion>
			<CardGrid cards={cards} />
		</>
	);
}
