import WarningIcon from "@mui/icons-material/Announcement";
import ErrorIcon from "@mui/icons-material/Cancel";
import CheckIcon from "@mui/icons-material/DoneOutlined";
import {
	Autocomplete,
	Button,
	CircularProgress,
	Divider,
	Grid2,
	InputAdornment,
	Paper,
	SxProps,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableRow,
	TextField,
	Theme,
	Typography,
} from "@mui/material";
import { OverridableComponent } from "@mui/material/OverridableComponent";
import { useEffect, useState } from "react";
import Chart from "react-google-charts";
import { useLocation } from "react-router-dom";
import { useUserToken } from "../contexts/UserContext";
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

const sxDivider: SxProps = {
	marginTop: 1,
	marginBottom: 1,
};

export const sxTableIcon: SxProps<Theme> = {
	maxWidth: (theme) => theme.spacing(4),
};

type MessageType = keyof typeof iconStyles;

export class Message {
	public readonly text: string;

	constructor(
		public readonly type: MessageType,
		result: CheckResult,
	) {
		this.text =
			typeof result === "string" ? result : JSON.stringify(result);
	}
}

export interface MessageIconProps {
	type: MessageType;
}

export function MessageIcon(props: MessageIconProps) {
	const { type } = props;
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

	return <Icon sx={{ color: iconStyles[type].color }} />;
}

export interface AdapterCheckLocationState {
	repoFullName?: string;
}

export function AdapterCheck() {
	const token = useUserToken();
	let location = useLocation();
	const [repoNames, setRepoNames] = useState<string[]>([]);
	const [repoName, setRepoName] = useState("");
	const [busy, setBusy] = useState(false);
	const [messages, setMessages] = useState<Message[]>([]);
	useEffect(() => {
		const loadData = async () => {
			const repos = await getMyAdapterRepos(token);
			setRepoNames(repos.map((r) => r.full_name));
		};
		loadData().catch(console.error);
	}, [token]);

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
			<Typography
				variant="h4"
				sx={{
					marginBottom: 1,
				}}
			>
				Adapter Check
			</Typography>

			<Grid2 container direction="row" alignItems="center" spacing={1}>
				<Grid2>
					<Autocomplete
						freeSolo
						disabled={busy}
						options={repoNames}
						getOptionLabel={(option) => option}
						sx={{ width: 500 }}
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
				</Grid2>
				<Grid2>
					<Button
						variant="contained"
						color="primary"
						disabled={!repoName || busy}
						onClick={handleStartClick}
					>
						Start Check
					</Button>
				</Grid2>
			</Grid2>

			{busy && (
				<>
					<Divider sx={sxDivider} />
					<Typography variant="h5">
						<CircularProgress /> {`Checking ${repoName}...`}
					</Typography>
				</>
			)}

			{messages.length > 0 && (
				<>
					<Divider sx={sxDivider} />
					<Paper sx={{ marginBottom: 1 }}>
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
										<TableCell scope="row" sx={sxTableIcon}>
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
