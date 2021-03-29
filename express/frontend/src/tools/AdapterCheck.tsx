import Typography from "@material-ui/core/Typography";
import React, { useEffect, useState } from "react";
import Autocomplete from "@material-ui/lab/Autocomplete";
import { getMyAdapterRepos } from "../lib/ioBroker";
import { User } from "../lib/gitHub";
import TextField from "@material-ui/core/TextField";
import { makeStyles } from "@material-ui/core/styles";
import Button from "@material-ui/core/Button";
import Grid from "@material-ui/core/Grid";
import axios from "axios";
import CircularProgress from "@material-ui/core/CircularProgress";
import Divider from "@material-ui/core/Divider";
import TableContainer from "@material-ui/core/TableContainer";
import { TableCell } from "@material-ui/core";
import Table from "@material-ui/core/Table";
import TableBody from "@material-ui/core/TableBody";
import TableRow from "@material-ui/core/TableRow";
import Paper from "@material-ui/core/Paper";

import CheckIcon from "@material-ui/icons/DoneOutlined";
import ErrorIcon from "@material-ui/icons/Cancel";
import WarningIcon from "@material-ui/icons/Announcement";
import { OverridableComponent } from "@material-ui/core/OverridableComponent";
import Chart from "react-google-charts";

const URL =
	"https://3jjxddo33l.execute-api.eu-west-1.amazonaws.com/default/checkAdapter";

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

const useStyles = makeStyles((theme) => ({
	title: {
		marginBottom: theme.spacing(1),
	},
	comboBox: {
		width: "400px",
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

type CheckResult = string | Record<string, any>;

interface CheckResults {
	version: string;
	result: string;
	checks: CheckResult[];
	warnings: CheckResult[];
	errors: CheckResult[];
}

type MessageType = "check" | "warning" | "error";

class Message {
	public readonly text: string;

	constructor(public readonly type: MessageType, result: CheckResult) {
		this.text =
			typeof result === "string" ? result : JSON.stringify(result);
	}
}

export interface MessageIconParams {
	type: MessageType;
}

export function MessageIcon(params: MessageIconParams) {
	const { type } = params;
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

export interface AdapterCheckParams {
	user: User;
}

export default function AdapterCheck(params: AdapterCheckParams) {
	const { user } = params;
	const classes = useStyles();
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

	const handleStartClick = async () => {
		setMessages([]);
		setBusy(true);
		try {
			const result = await axios.get<CheckResults>(
				`${URL}?url=https://github.com/${encodeURIComponent(repoName)}`,
			);
			const messages = result.data.errors.map(
				(c) => new Message("error", c),
			);
			messages.push(
				...result.data.warnings.map((c) => new Message("warning", c)),
			);
			messages.push(
				...result.data.checks.map((c) => new Message("check", c)),
			);
			setMessages(messages);
		} catch (error) {
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
