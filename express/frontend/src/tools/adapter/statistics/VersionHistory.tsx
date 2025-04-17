import { Box } from "@mui/material";
import ReactECharts from "echarts-for-react";
import { useEffect, useState } from "react";
import { coerce } from "semver";
import sort from "semver/functions/sort";
import { useAdapterContext } from "../../../contexts/AdapterContext";
import { getStatisticsHistory } from "../../../lib/ioBroker";

const chartDefaults = {
	title: {
		text: "Installed version history",
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

export function VersionHistory() {
	const { name } = useAdapterContext();
	const [option, setOption] = useState<any>();
	const [showLoading, setShowLoading] = useState(true);

	useEffect(() => {
		setOption(undefined);
		setShowLoading(true);
		const loadHistory = async () => {
			const stats = await getStatisticsHistory(name);
			const versions = new Set<string>();
			for (const date of Object.keys(stats.counts)) {
				Object.keys(stats.counts[date].versions)
					.map((v) => coerce(v))
					.filter((v) => !!v)
					.forEach((v) => versions.add(v!.version));
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
		loadHistory().catch((e) => {
			console.error(e);
			setShowLoading(false);
			setOption(undefined);
		});
	}, [name]);
	if (!option && !showLoading) {
		return null;
	}
	return (
		<Box sx={{ marginTop: 2 }}>
			<ReactECharts
				style={{ height: "400px" }}
				loadingOption={{
					type: "default",
				}}
				showLoading={showLoading}
				option={option || { ...chartDefaults }}
			/>
		</Box>
	);
}
