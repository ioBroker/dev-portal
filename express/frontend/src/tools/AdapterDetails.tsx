import Hidden from "@material-ui/core/Hidden";
import Paper from "@material-ui/core/Paper";
import { makeStyles } from "@material-ui/core/styles";
import Typography from "@material-ui/core/Typography";
import React, { useEffect, useState } from "react";
import { useParams } from "react-router";
import ReactECharts from "echarts-for-react";
import axios from "axios";
import { AdapterStatistics } from "../../../backend/src/global/adapter-stats";
import sort from "semver/functions/sort";
import { getApiUrl } from "../lib/utils";

const uc = encodeURIComponent;

const useStyles = makeStyles((theme) => ({
	root: {
		padding: theme.spacing(2),
	},
	chart: {
		marginTop: theme.spacing(2),
	},
}));

const chartDefaults = {
	title: {
		text: "Installed versions",
	},
	tooltip: {
		trigger: "axis",
		axisPointer: {
			type: "cross",
			label: {
				backgroundColor: "#6a7985",
			},
		},
	},
	legend: {
		data: [],
	},
	toolbox: {
		feature: {
			saveAsImage: {},
		},
	},
	grid: {
		left: "3%",
		right: "4%",
		bottom: "3%",
		containLabel: true,
	},
	dataZoom: [
		{
			show: true,
			realtime: true,
		},
		{
			type: "inside",
			realtime: true,
		},
	],
	xAxis: [
		{
			type: "time",
		},
	],
	yAxis: [
		{
			type: "value",
		},
	],
	series: [],
};

export interface AdapterDetailsProps {}

export default function AdapterDetails(props: AdapterDetailsProps) {
	const classes = useStyles();
	const { name } = useParams<{ name: string }>();
	const [option, setOption] = useState<any>();
	const [showLoading, setShowLoading] = useState(true);

	useEffect(() => {
		setOption(undefined);
		setShowLoading(true);
		const loadStatistics = async () => {
			const url = getApiUrl(`adapter/${uc(name)}/stats`);
			const { data: stats } = await axios.get<AdapterStatistics>(url);

			const versions = new Set<string>();
			for (const date of Object.keys(stats.counts)) {
				Object.keys(stats.counts[date].versions).forEach((v) =>
					versions.add(v),
				);
			}

			const sortedVersions = Array.from(versions);
			sort(sortedVersions);
			const series: any[] = sortedVersions.map((v) => ({
				name: v,
				type: "line",
				stack: name,
				areaStyle: {},
				emphasis: {
					focus: "series",
				},
				data: Object.keys(stats.counts).map((date) => [
					date,
					stats.counts[date].versions[v] || 0,
				]),
			}));

			// the "total" series is used also for version markers
			series.push({
				name: "Total",
				type: "line",
				symbol: "circle",
				lineStyle: { color: "black", width: 1.5 },
				itemStyle: { color: "black" },
				label: {
					show: true,
					position: "top",
				},
				data: Object.keys(stats.counts).map((date) => [
					date,
					stats.counts[date].total,
				]),
				markLine: {
					data: [
						// all stable version markers
						...Object.keys(stats.stable).map((date) => [
							{
								name: `Stable\n${stats.stable[date]}`,
								xAxis: date,
								yAxis: 0,
							},
							{
								name: "end",
								xAxis: date,
								yAxis: "max",
							},
						]),
						// all latest that aren't in stable
						...Object.keys(stats.latest)
							.filter((date) => !stats.stable[date])
							.map((date) => [
								{
									name: `Latest\n${stats.latest[date]}`,
									xAxis: date,
									yAxis: 0,
								},
								{
									name: "end",
									xAxis: date,
									yAxis: "max",
								},
							]),
					],
				},
			});

			setShowLoading(false);
			setOption({
				...chartDefaults,
				series,
			});
		};
		loadStatistics().catch((e) => {
			console.error(e);
			setShowLoading(false);
			setOption(undefined);
		});
	}, [name]);
	return (
		<Paper className={classes.root}>
			<Typography variant="h3">
				<Hidden xsDown>Adapter</Hidden> ioBroker.{name}
			</Typography>
			{(option || showLoading) && (
				<ReactECharts
					className={classes.chart}
					style={{ height: "400px" }}
					loadingOption={{
						type: "default",
					}}
					showLoading={showLoading}
					option={option || { ...chartDefaults }}
				/>
			)}
		</Paper>
	);
}
