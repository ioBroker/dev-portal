import Button from "@material-ui/core/Button";
import CircularProgress from "@material-ui/core/CircularProgress";
import Divider from "@material-ui/core/Divider";
import Grid from "@material-ui/core/Grid";
import InputAdornment from "@material-ui/core/InputAdornment";
import { OverridableComponent } from "@material-ui/core/OverridableComponent";
import Paper from "@material-ui/core/Paper";
import { makeStyles } from "@material-ui/core/styles";
import Table from "@material-ui/core/Table";
import TableBody from "@material-ui/core/TableBody";
import TableCell from "@material-ui/core/TableCell";
import TableContainer from "@material-ui/core/TableContainer";
import TableRow from "@material-ui/core/TableRow";
import TextField from "@material-ui/core/TextField";
import Typography from "@material-ui/core/Typography";
import WarningIcon from "@material-ui/icons/Announcement";
import ErrorIcon from "@material-ui/icons/Cancel";
import CheckIcon from "@material-ui/icons/DoneOutlined";
import Autocomplete from "@material-ui/lab/Autocomplete";
import React, { useEffect, useState } from "react";
import Chart from "react-google-charts";
import { useLocation } from "react-router-dom";
import { User } from "../lib/gitHub";
import { checkAdapter, CheckResult, getMyAdapterRepos } from "../lib/ioBroker";

const iconStyles = {
	check: {
		color: "#00b200",
	},
	warning: {
		color: "#bf9100",
	},
	error: {
		color: "#bf0000",
	},
};

export const useStyles = makeStyles((theme) => ({
	title: {
		marginBottom: theme.spacing(1),
	},
	comboBox: {
		width: "500px",
	},
	divider: {
		marginTop: theme.spacing(1),
		marginBottom: theme.spacing(1),
	},
	chartArea: {
		marginBottom: theme.spacing(1),
	},
	tableIcon: {
		maxWidth: theme.spacing(4),
	},
	...iconStyles,
}));

type MessageType = "check" | "warning" | "error";

export class Message {
	public readonly text: string;

	constructor(public readonly type: MessageType, result: CheckResult) {
		this.text =
			typeof result === "string" ? result : JSON.stringify(result);
	}
}

export interface MessageIconProps {
	type: MessageType;
}

export function MessageIcon(props: MessageIconProps) {
	const { type } = props;
	const classes = useStyles();
	let Icon: OverridableComponent<any>;
	switch (type) {
		case "check":
			Icon = CheckIcon;
			break;
		case "warning":
			Icon = WarningIcon;
			break;
		case "error":
			Icon = ErrorIcon;
			break;
		default:
			Icon = Typography;
			break;
	}

	return <Icon className={classes[type]} />;
}

export interface AdapterCheckLocationState {
	repoFullName?: string;
}

export interface AdapterCheckProps {
	user: User;
}

export default function AdapterCheck(props: AdapterCheckProps) {
	const { user } = props;
	const classes = useStyles();
	let location = useLocation();
	const [repoNames, setRepoNames] = useState<string[]>([]);
	const [repoName, setRepoName] = useState("");
	const [busy, setBusy] = useState(false);
	const [messages, setMessages] = useState<Message[]>([]);
	useEffect(() => {
		const loadData = async () => {
			const repos = await getMyAdapterRepos(user.token);
			setRepoNames(repos.map((r) => r.full_name));
		};
		loadData().catch(console.error);
	}, [user]);

	const incomingState = location.state as
		| AdapterCheckLocationState
		| undefined;
	useEffect(() => {
		if (incomingState?.repoFullName) {
			setRepoName(incomingState.repoFullName);
		}
	}, [incomingState]);

	const handleStartClick = async () => {
		setMessages([]);
		setBusy(true);
		try {
			const results = await checkAdapter(repoName);
			const messages = results.errors.map((c) => new Message("error", c));
			messages.push(
				...results.warnings.map((c) => new Message("warning", c)),
			);
			messages.push(
				...results.checks.map((c) => new Message("check", c)),
			);
			setMessages(messages);
		} catch (error: any) {
			setMessages([new Message("error", error)]);
		}
		setBusy(false);
	};

	const graphData = [
		["Result", "Count"],
		["Errors", messages.filter((m) => m.type === "error").length],
		["Warnings", messages.filter((m) => m.type === "warning").length],
		["OK", messages.filter((m) => m.type === "check").length],
	];

	return (
		<>
			<Typography variant="h4" className={classes.title}>
				Adapter Check
			</Typography>

			<Grid container direction="row" alignItems="center" spacing={1}>
				<Grid item>
					<Autocomplete
						freeSolo
						disabled={busy}
						options={repoNames}
						getOptionLabel={(option) => option}
						className={classes.comboBox}
						inputValue={repoName}
						onInputChange={(_e, value) => setRepoName(value)}
						renderInput={(params) => (
							<TextField
								{...params}
								label="Adapter"
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
				</Grid>
				<Grid item>
					<Button
						variant="contained"
						color="primary"
						disabled={!repoName || busy}
						onClick={handleStartClick}
					>
						Start Check
					</Button>
				</Grid>
			</Grid>

			{busy && (
				<>
					<Divider className={classes.divider} />
					<Typography variant="h5">
						<CircularProgress /> {`Checking ${repoName}...`}
					</Typography>
				</>
			)}

			{messages.length > 0 && (
				<>
					<Divider className={classes.divider} />
					<Paper className={classes.chartArea}>
						<Chart
							width="400px"
							height="200px"
							chartType="PieChart"
							loader={<CircularProgress size="200px" />}
							data={graphData}
							options={{
								is3D: true,
								backgroundColor: "transparent",
								colors: [
									iconStyles.error.color,
									iconStyles.warning.color,
									iconStyles.check.color,
								],
							}}
						/>
					</Paper>
					<TableContainer component={Paper}>
						<Table size="small">
							<TableBody>
								{messages.map((message, i) => (
									<TableRow key={i}>
										<TableCell
											scope="row"
											className={classes.tableIcon}
										>
											<MessageIcon type={message.type} />
										</TableCell>
										<TableCell>{message.text}</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</TableContainer>
				</>
			)}
		</>
	);
}
