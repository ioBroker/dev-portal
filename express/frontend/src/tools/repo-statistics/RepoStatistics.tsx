import { default as ChecklistIcon } from "@mui/icons-material/Checklist";
import {
	Box,
	Button,
	Card,
	CardContent,
	Checkbox,
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
	FormControlLabel,
	IconButton,
	Typography,
} from "@mui/material";
import axios from "axios";
import { useEffect, useMemo, useState } from "react";
import Chart from "react-google-charts";
import { useSearchParams } from "react-router-dom";
import { CardGrid } from "../../components/dashboard/CardGrid";
import { getApiUrl } from "../../lib/utils";

type GraphData = [string, string | number][];
type StatisticsData = {
	title: string;
	data: GraphData;
};

const titles: Record<string, Record<string, string>> = {
	Repository: {
		owner: "GitHub Repository Owner",
		publishState: "Published to",
	},
	"io-package.json": {
		mode: "Adapter Mode",
		type: "Adapter Type",
		compact: "Supports Compact Mode",
		connectionType: "Connection Type",
		dataSource: "Data Source",
		tier: "Adapter Tier",
		adminUiConfig: "Admin Config UI",
		adminUiTab: "Admin Tab UI",
		depJsController: "js-controller Dependency",
		depAdmin: "Admin Dependency",
	},
	"create-adapter": {
		language: "Programming Language",
		nodeVersion: "Node.js Version",
		creatorVersion: "Creator Version",
		target: "Adapter Target",
		connectionIndicator: "Connection Indicator",
		dependabot: "Dependabot Enabled",
		releaseScript: "Use Release Script",
		quotes: "Quotes Style",
		indentation: "Indentation Style",
	},
};

const defaultStats = [
	"owner",
	"mode",
	"type",
	"adminUiConfig",
	"language",
	"nodeVersion",
];

export function RepoStatistics() {
	const [searchParams] = useSearchParams();
	const [statistics, setStatistics] = useState<
		Record<string, StatisticsData[]>
	>({ Loading: [] });
	const [settingsOpen, setSettingsOpen] = useState(false);

	const selectedStats = useMemo(
		() => searchParams.get("stats")?.split(",") ?? defaultStats,
		[searchParams],
	);

	useEffect(() => {
		const loadStatistics = async () => {
			setStatistics({ Loading: [] });
			const { data } = await axios.get<
				Record<string, Record<string, number>>
			>(getApiUrl(`statistics?stats=${selectedStats.join(",")}`));
			const statistics = Object.entries(data).map(([title, stat]) => {
				const valueCounts = Object.entries(stat).map(
					([value, count]) =>
						[value, count] satisfies [string, number],
				);
				valueCounts.sort((a, b) => b[1] - a[1]);
				const data: GraphData = [["Value", "Count"], ...valueCounts];
				return { title, data };
			});
			setStatistics({
				...Object.entries(titles)
					.filter(([, sectionTitles]) =>
						Object.keys(sectionTitles).some((name) =>
							selectedStats.includes(name),
						),
					)
					.reduce(
						(acc, [section, sectionTitles]) => {
							acc[section] = Object.entries(sectionTitles)
								.filter(([name]) =>
									selectedStats.includes(name),
								)
								.map(([name, title]) => ({
									title,
									data:
										statistics.find((s) => s.title === name)
											?.data ?? [],
								}));
							return acc;
						},
						{} as Record<string, StatisticsData[]>,
					),
			});
		};
		loadStatistics().catch(console.error);
	}, [selectedStats]);

	return (
		<>
			<Box
				sx={{
					display: "flex",
				}}
			>
				<Typography
					variant="h4"
					sx={{
						marginBottom: 1,
						flex: 1,
					}}
				>
					Repository Statistics
				</Typography>
				<IconButton onClick={() => setSettingsOpen(true)}>
					<ChecklistIcon />
				</IconButton>
				{settingsOpen && (
					<SettingsDialog
						onClose={() => setSettingsOpen(false)}
						open
					/>
				)}
			</Box>
			{Object.entries(statistics).map(([section, stats], index) => (
				<>
					<Typography
						variant="h6"
						sx={{
							marginBottom: 1,
						}}
					>
						{section}
					</Typography>
					<CardGrid>
						{stats.map(({ title, data }, index) => (
							<Card
								key={index}
								sx={{
									height: "100%",
									display: "flex",
									flexDirection: "column",
								}}
								raised={true}
							>
								<Box>
									<Chart
										width="100%"
										height="200px"
										chartType="PieChart"
										data={data}
										options={{
											is3D: true,
											backgroundColor: "transparent",
											sliceVisibilityThreshold: 0.01,
											chartArea: {
												top: 8,
												left: 8,
												right: 8,
												bottom: 8,
											},
										}}
									/>
								</Box>
								<CardContent
									sx={{
										flexGrow: 1,
									}}
								>
									<Typography
										gutterBottom
										variant="h6"
										component="h2"
									>
										{title}
									</Typography>
								</CardContent>
							</Card>
						))}
					</CardGrid>
				</>
			))}
		</>
	);
}

function SettingsDialog({
	open,
	onClose,
}: {
	open: boolean;
	onClose: () => void;
}) {
	const [searchParams, setSearchParams] = useSearchParams();

	const [selectedStats, setSelectedStats] = useState(
		() => searchParams.get("stats")?.split(",") ?? defaultStats,
	);

	const onStatChange = (stat: string, checked: boolean) => {
		if (checked) {
			setSelectedStats((prev) => [...prev, stat]);
		} else {
			setSelectedStats((prev) => prev.filter((s) => s !== stat));
		}
	};

	const onOk = () => {
		setSearchParams({ stats: selectedStats.join(",") });
		onClose();
	};

	return (
		<Dialog
			open={!!open}
			onClose={() => onClose()}
			aria-labelledby="dialog-title"
		>
			<DialogTitle id="dialog-title">
				Select Statistics to Display
			</DialogTitle>
			<DialogContent>
				{Object.entries(titles).map(([section, sectionTitles]) => (
					<Box key={section}>
						<Typography variant="h6">{section}</Typography>
						{Object.entries(sectionTitles).map(([name, title]) => (
							<Box key={name}>
								<FormControlLabel
									control={
										<Checkbox
											checked={selectedStats.includes(
												name,
											)}
											onChange={(_, checked) =>
												onStatChange(name, checked)
											}
										/>
									}
									label={title}
								/>
							</Box>
						))}
					</Box>
				))}
			</DialogContent>
			<DialogActions>
				<Button onClick={() => onClose()} color="primary">
					Cancel
				</Button>
				<Button onClick={onOk} color="primary">
					OK
				</Button>
			</DialogActions>
		</Dialog>
	);
}
