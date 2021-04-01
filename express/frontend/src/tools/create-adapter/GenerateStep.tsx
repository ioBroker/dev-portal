import { Answers } from "@iobroker/create-adapter/build/core";
import Accordion from "@material-ui/core/Accordion";
import AccordionDetails from "@material-ui/core/AccordionDetails";
import AccordionSummary from "@material-ui/core/AccordionSummary";
import Button from "@material-ui/core/Button";
import Card from "@material-ui/core/Card";
import CardActions from "@material-ui/core/CardActions";
import CardContent from "@material-ui/core/CardContent";
import CircularProgress from "@material-ui/core/CircularProgress";
import Grid from "@material-ui/core/Grid";
import { makeStyles } from "@material-ui/core/styles";
import Typography from "@material-ui/core/Typography";
import ExpandMoreIcon from "@material-ui/icons/ExpandMore";
import GitHubIcon from "@material-ui/icons/GitHub";
import React, { useEffect, useRef } from "react";
import { User } from "../../lib/gitHub";
import useWebSocket, { ReadyState } from "react-use-websocket";
import Dialog from "@material-ui/core/Dialog";
import DialogTitle from "@material-ui/core/DialogTitle";
import DialogContent from "@material-ui/core/DialogContent";
import DialogContentText from "@material-ui/core/DialogContentText";
import DialogActions from "@material-ui/core/DialogActions";

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
}));

export type GeneratorTarget = "github" | "zip";

interface LogMessage {
	log: string;
	isError: boolean;
}
interface Result {
	result: boolean;
}
function isLogMessage(obj: unknown): obj is LogMessage {
	return Object.prototype.hasOwnProperty.call(obj, "log");
}

export interface GeneratorDialogProps {
	target: GeneratorTarget;
	answers: Answers;
	onClose: () => void;
}

export function GeneratorDialog(props: GeneratorDialogProps) {
	const { target, answers, onClose } = props;

	type LogItem = { color: string; text: string };

	const [log, setLog] = React.useState<LogItem[]>([]);
	const [completed, setCompleted] = React.useState(false);

	const { sendMessage, lastMessage, readyState } = useWebSocket(
		"ws://localhost:8080/ws/create-adapter",
	);

	const logEndRef = useRef<any>();

	const startMessage = JSON.stringify({ answers, target });
	useEffect(() => {
		if (readyState === ReadyState.OPEN) {
			setCompleted(false);
			sendMessage(startMessage);
		}
	}, [readyState, sendMessage, startMessage]);

	useEffect(() => {
		console.log("msg", lastMessage);
		if (typeof lastMessage?.data === "string") {
			const appendLog = (text: string, color: string) =>
				setLog((old) => [...old, { text, color }]);
			try {
				const obj = JSON.parse(lastMessage.data) as LogMessage | Result;
				if (isLogMessage(obj)) {
					const msg = obj;
					appendLog(msg.log, msg.isError ? "red" : "black");
				} else if (obj.result) {
					appendLog("Completed sucessfully", "green");
					setCompleted(true);
				} else {
					appendLog("Failed", "red");
					setCompleted(true);
				}
			} catch (error) {
				console.error(error);
			}
		}
	}, [lastMessage]);

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
				<Button
					onClick={() => onClose()}
					disabled={!completed}
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

	const [generator, setGenerator] = React.useState<GeneratorTarget>();

	useEffect(() => {
		if (startGenerator) {
			setGenerator("github");
		}
	}, [startGenerator]);

	return (
		<>
			{!!generator && (
				<GeneratorDialog
					target={generator}
					answers={answers}
					onClose={() => setGenerator(undefined)}
				/>
			)}
			<Accordion>
				<AccordionSummary expandIcon={<ExpandMoreIcon />}>
					<Typography>Your adapter configuration</Typography>
				</AccordionSummary>
				<AccordionDetails className={classes.configPreview}>
					<pre>{JSON.stringify(answers, null, 2)}</pre>
				</AccordionDetails>
			</Accordion>
			<Grid container spacing={4}>
				<Grid item xs={12} sm={6} md={4} lg={3}>
					<Card>
						<CardContent>
							<Typography variant="h5" component="h2">
								Create GitHub Repository
							</Typography>
							<Typography variant="body2" component="p">
								Your code will be uploaded to a newly created
								GitHub Repository for the user or organisation
								you choose.
							</Typography>
							<Typography color="textSecondary">
								You will be asked by GitHub to authorize this
								application. The generated authentication token
								is never transmitted to anybody but GitHub and
								will not be stored by this website. Nobody but
								you will be able to modify the generated
								repository.
							</Typography>
						</CardContent>
						<CardActions>
							<Button
								size="small"
								onClick={() => onRequestLogin()}
								startIcon={<GitHubIcon />}
								disabled={!user || !!generator}
							>
								Create Repository
							</Button>
						</CardActions>
					</Card>
				</Grid>
			</Grid>
		</>
	);
}
