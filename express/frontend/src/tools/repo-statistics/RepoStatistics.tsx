import { default as AddIcon } from "@mui/icons-material/Add";
import { default as ChecklistIcon } from "@mui/icons-material/Checklist";
import { default as DeleteIcon } from "@mui/icons-material/Delete";
import { default as FilterIcon } from "@mui/icons-material/FilterAlt";
import { default as InfoIcon } from "@mui/icons-material/InfoOutlined";
import {
	Autocomplete,
	Badge,
	Box,
	Button,
	Card,
	CardContent,
	Checkbox,
	Chip,
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
	FormControlLabel,
	Grid2,
	IconButton,
	Menu,
	MenuItem,
	TextField,
	Tooltip,
	Typography,
} from "@mui/material";
import axios from "axios";
import { Fragment, useEffect, useMemo, useState } from "react";
import Chart from "react-google-charts";
import { useSearchParams } from "react-router-dom";
import { CardGrid } from "../../components/dashboard/CardGrid";
import { getApiUrl } from "../../lib/utils";

type GraphData = [string, string | number][];
type StatisticsData = {
	name: string;
	data: GraphData;
};

const allStats: {
	section: string;
	stats: { name: string; title: string; description: string }[];
}[] = [
	{
		section: "Repository",
		stats: [
			{
				name: "owner",
				title: "GitHub Repository Owner",
				description: "The owner of the GitHub repository",
			},
			{
				name: "publishState",
				title: "Published to",
				description:
					"Where the adapter is published: GitHub (not published), npm (only on npm), latest (ioBroker latest repository) or stable (ioBroker stable repository)",
			},
		],
	},
	{
		section: "io-package.json",
		stats: [
			{
				name: "mode",
				title: "Adapter Mode",
				description: "The mode of the adapter (daemon, schedule, etc.)",
			},
			{
				name: "type",
				title: "Adapter Type",
				description:
					"The type of the adapter (energy, iot-system, etc.)",
			},
			{
				name: "compact",
				title: "Supports Compact Mode",
				description: "Whether the adapter supports compact mode or not",
			},
			{
				name: "connectionType",
				title: "Connection Type",
				description:
					"The connection type of the adapter (cloud, local, etc.)",
			},
			{
				name: "dataSource",
				title: "Data Source",
				description:
					"The data source of the adapter (poll, push, etc.)",
			},
			{
				name: "tier",
				title: "Adapter Tier",
				description: "The tier number of the adapter (1-3)",
			},
			{
				name: "adminUiConfig",
				title: "Admin Config UI",
				description:
					"Technology used for the admin configuration UI (JSON, materialize, etc.)",
			},
			{
				name: "adminUiTab",
				title: "Admin Tab UI",
				description:
					"Technology used for the admin tab UI (JSON, materialize, etc.)",
			},
			{
				name: "depJsController",
				title: "js-controller Dependency",
				description:
					"The version of js-controller the adapter depends on",
			},
			{
				name: "depAdmin",
				title: "Admin Dependency",
				description: "The version of admin the adapter depends on",
			},
		],
	},
	{
		section: "create-adapter",
		stats: [
			{
				name: "language",
				title: "Programming Language",
				description:
					"The programming language used when creating the adapter (JavaScript, TypeScript, etc.)",
			},
			{
				name: "nodeVersion",
				title: "Node.js Version",
				description:
					"The minimal Node.js version the adapter was targeting upon creation",
			},
			{
				name: "creatorVersion",
				title: "Creator Version",
				description: "The version of the create-adapter tool used.",
			},
			{
				name: "target",
				title: "Adapter Target",
				description:
					"How the adapter was created: GitHub (using DevPortal), directory (local execution), zip (downloaded zip file from DevPortal).",
			},
			{
				name: "connectionIndicator",
				title: "Connection Indicator",
				description:
					"Whether the adapter had a connection indicator upon creation",
			},
			{
				name: "dependabot",
				title: "Dependabot Enabled",
				description:
					"Whether Dependabot was enabled for the adapter upon creation",
			},
			{
				name: "releaseScript",
				title: "Use Release Script",
				description:
					"Whether the adapter used the release script upon creation",
			},
			{
				name: "quotes",
				title: "Quotes Style",
				description:
					"The style of quotes used in the code (single, double, etc.)",
			},
			{
				name: "indentation",
				title: "Indentation Style",
				description:
					"The style of indentation used in the code (spaces, tabs, etc.)",
			},
		],
	},
];

const defaultStats = [
	"owner",
	"mode",
	"type",
	"adminUiConfig",
	"language",
	"nodeVersion",
];

export function RepoStatistics() {
	const [searchParams, setSearchParams] = useSearchParams();
	const [statistics, setStatistics] = useState<
		Record<string, StatisticsData[]>
	>({ Loading: [] });
	const [chooseStatsOpen, setChooseStatsOpen] = useState(false);
	const [filtersOpen, setFiltersOpen] = useState(false);

	useEffect(() => {
		const loadStatistics = async () => {
			setStatistics({ Loading: [] });
			const selectedStats = getStatsFromSearchParams(searchParams).filter(
				// stats that are used as filter can't be shown
				(stat) => !searchParams.has(stat),
			);
			const params = new URLSearchParams(searchParams);
			params.set("stats", selectedStats.join(","));
			const { data } = await axios.get<
				Record<string, Record<string, number>>
			>(getApiUrl(`statistics?${params}`));
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
				...allStats
					.filter(({ stats }) =>
						stats.some((stat) => selectedStats.includes(stat.name)),
					)
					.reduce(
						(acc, { section, stats }) => {
							const add = stats
								.filter(({ name }) =>
									selectedStats.includes(name),
								)
								.map(({ name }) => ({
									name,
									data:
										statistics.find((s) => s.title === name)
											?.data ?? [],
								}))
								.filter(({ data }) => data.length);
							if (add.length > 0) {
								acc[section] = add;
							}
							return acc;
						},
						{} as Record<string, StatisticsData[]>,
					),
			});
		};
		loadStatistics().catch(console.error);
	}, [searchParams]);

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
				<IconButton onClick={() => setFiltersOpen(true)}>
					<Badge
						badgeContent={
							[...searchParams.entries()].filter(
								([k]) => k !== "stats",
							).length
						}
						color="primary"
					>
						<FilterIcon />
					</Badge>
				</IconButton>
				{filtersOpen && (
					<FilterDialog onClose={() => setFiltersOpen(false)} open />
				)}
				<IconButton onClick={() => setChooseStatsOpen(true)}>
					<Badge
						badgeContent={
							getStatsFromSearchParams(searchParams).length
						}
						color="primary"
					>
						<ChecklistIcon />
					</Badge>
				</IconButton>
				{chooseStatsOpen && (
					<ChooseStatsDialog
						onClose={() => setChooseStatsOpen(false)}
						open
					/>
				)}
			</Box>
			<Box>
				{[...searchParams.entries()]
					.filter(([k]) => k !== "stats")
					.map(([key, value]) => (
						<Chip
							key={key}
							label={`${getStatTitle(key)}: ${value}`}
							sx={{ marginRight: 1, marginBottom: 1 }}
							icon={<FilterIcon />}
							onDelete={() => {
								const params = new URLSearchParams(
									searchParams,
								);
								params.delete(key);
								setSearchParams(params);
							}}
						/>
					))}
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
						{stats.map(({ name, data }) => (
							<StatisticsCard
								key={name}
								name={name}
								data={data}
							/>
						))}
					</CardGrid>
				</>
			))}
		</>
	);
}

function StatisticsCard({ name, data }: { name: string; data: GraphData }) {
	const title = useMemo(() => getStatTitle(name), [name]);
	return (
		<Card
			key={name}
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
				<Typography gutterBottom variant="h6" component="h2">
					{title}
					<StatDescriptionIcon name={name} />
				</Typography>
			</CardContent>
		</Card>
	);
}

function StatDescriptionIcon({ name }: { name: string }) {
	const stat = useMemo(() => {
		for (const s of allStats.flatMap((s) => s.stats)) {
			if (s.name === name) {
				return s;
			}
		}
		return null;
	}, [name]);

	if (!stat) {
		return null;
	}

	return (
		<Tooltip title={stat.description} arrow>
			<InfoIcon
				fontSize="small"
				sx={{ marginLeft: 1, marginTop: "auto", marginBottom: "auto" }}
			/>
		</Tooltip>
	);
}

function ChooseStatsDialog({
	open,
	onClose,
}: {
	open: boolean;
	onClose: () => void;
}) {
	const [searchParams, setSearchParams] = useSearchParams();

	const [selectedStats, setSelectedStats] = useState(() =>
		getStatsFromSearchParams(searchParams),
	);

	const onStatChange = (stat: string, checked: boolean) => {
		if (checked) {
			setSelectedStats((prev) => [...prev, stat]);
		} else {
			setSelectedStats((prev) => prev.filter((s) => s !== stat));
		}
	};

	const onOk = () => {
		const params = new URLSearchParams(searchParams);
		params.set("stats", selectedStats.join(","));
		setSearchParams(params);
		onClose();
	};

	return (
		<Dialog
			open={!!open}
			onClose={() => onClose()}
			aria-labelledby="dialog-title"
			fullWidth
			maxWidth="md"
		>
			<DialogTitle id="dialog-title">
				Select Statistics to Display
			</DialogTitle>
			<DialogContent>
				<Grid2 container spacing={2}>
					{allStats.map(({ section, stats }) => (
						<Grid2
							size={{
								xs: 12,
								md: 4,
							}}
							key={section}
						>
							<Typography variant="h6">{section}</Typography>
							{stats.map(({ name, title }) => (
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
						</Grid2>
					))}
				</Grid2>
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

function getStatsFromSearchParams(searchParams: URLSearchParams): string[] {
	return searchParams.get("stats")?.split(",") ?? defaultStats;
}

function getStatTitle(key: string): string {
	return getStat(key)?.title ?? key;
}

function getStat(key: string) {
	for (const stat of allStats.flatMap((s) => s.stats)) {
		if (stat.name === key) {
			return stat;
		}
	}
}

function FilterDialog({
	open,
	onClose,
}: {
	open: boolean;
	onClose: () => void;
}) {
	const [searchParams, setSearchParams] = useSearchParams();

	const [filters, setFilters] = useState(() =>
		[...searchParams.entries()]
			.filter(([key]) => key !== "stats")
			.map(([key, value]: [string, string]) => ({
				key,
				value,
			})),
	);

	const onOk = () => {
		const params = new URLSearchParams(
			filters.map((f) => [f.key, f.value]),
		);
		if (searchParams.has("stats")) {
			params.set("stats", searchParams.get("stats")!);
		}
		setSearchParams(params);
		onClose();
	};

	const onAddFilter = (name: string) => {
		setFilters((prev) => [...prev, { key: name, value: "" }]);
	};

	return (
		<Dialog
			open={!!open}
			onClose={() => onClose()}
			aria-labelledby="dialog-title"
			fullWidth
			maxWidth="sm"
		>
			<DialogTitle id="dialog-title">
				Filter Statistics to Display
			</DialogTitle>
			<DialogContent>
				{filters.map((filter) => (
					<StatisticsFilter
						key={filter.key}
						name={filter.key}
						value={filter.value}
						onChange={(value) =>
							setFilters((prev) =>
								prev.map((f) =>
									f.key === filter.key ? { ...f, value } : f,
								),
							)
						}
						onDelete={() =>
							setFilters((prev) =>
								prev.filter((f) => f.key !== filter.key),
							)
						}
					/>
				))}
				<Box>
					<AddFilterButton
						onAddFilter={onAddFilter}
						filters={filters}
					/>
				</Box>
			</DialogContent>
			<DialogActions>
				<Button onClick={() => onClose()} color="primary">
					Cancel
				</Button>
				<Button
					onClick={onOk}
					color="primary"
					disabled={filters.some(({ value }) => !value)}
				>
					OK
				</Button>
			</DialogActions>
		</Dialog>
	);
}

function StatisticsFilter({
	name,
	value,
	onChange,
	onDelete,
}: {
	name: string;
	value: string;
	onChange: (value: string) => void;
	onDelete: () => void;
}) {
	const stat = useMemo(() => getStat(name), [name]);

	const [options, setOptions] = useState<string[]>();

	useEffect(() => {
		const loadOptions = async () => {
			const { data } = await axios.get<
				Record<string, Record<string, number>>
			>(getApiUrl(`statistics?stats=${name}`));
			const stat = data[name];
			setOptions(Object.keys(stat ?? {}).sort());
		};
		loadOptions().catch(console.error);
	}, [name]);

	return (
		<Box sx={{ marginBottom: 1, marginTop: 1, display: "flex" }}>
			<Autocomplete
				key={name}
				sx={{ flex: 1 }}
				options={options ?? []}
				value={value || ""}
				onChange={(_, value) => onChange(value ?? "")}
				renderInput={(params) => (
					<TextField
						{...params}
						label={stat?.title}
						helperText={stat?.description}
						size="small"
					/>
				)}
				loading={!options}
				disableClearable
				autoHighlight
			/>
			<IconButton
				onClick={onDelete}
				sx={{
					alignSelf: "start",
				}}
			>
				<DeleteIcon />
			</IconButton>
		</Box>
	);
}

function AddFilterButton({
	onAddFilter,
	filters,
}: {
	onAddFilter: (name: string) => void;
	filters: { key: string; value: string }[];
}) {
	const [menuAnchor, setMenuAnchor] = useState<HTMLElement>();

	const onMenuClick = (event: React.MouseEvent<HTMLButtonElement>) => {
		setMenuAnchor(event.currentTarget);
	};

	const onMenuClose = () => {
		setMenuAnchor(undefined);
	};

	return (
		<>
			<Button
				variant="outlined"
				startIcon={<AddIcon />}
				onClick={onMenuClick}
			>
				Filter
			</Button>
			<Menu
				anchorEl={menuAnchor}
				open={!!menuAnchor}
				onClose={onMenuClose}
			>
				{allStats.map(({ section, stats }) => (
					<Fragment key={section}>
						<MenuItem
							sx={{
								fontStyle: "italic",
							}}
							disabled
						>
							{section}
						</MenuItem>
						{stats.map(({ name, title }) => (
							<MenuItem
								key={name}
								onClick={() => {
									onMenuClose();
									onAddFilter(name);
								}}
								disabled={filters.some(
									({ key }) => key === name,
								)}
								sx={{ ml: 2 }}
								dense
							>
								{title}
							</MenuItem>
						))}
					</Fragment>
				))}
			</Menu>
		</>
	);
}
