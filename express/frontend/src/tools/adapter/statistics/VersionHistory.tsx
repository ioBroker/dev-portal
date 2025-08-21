import { Box, debounce } from "@mui/material";
import { EChartsOption, SeriesOption } from "echarts";
import ReactECharts from "echarts-for-react";
import { useEffect, useState } from "react";
import { coerce } from "semver";
import sort from "semver/functions/sort";
import { useAdapterContext } from "../../../contexts/AdapterContext";
import { getStatisticsHistory } from "../../../lib/ioBroker";

const chartDefaults: EChartsOption = {
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

async function loadSeries(
	name: string,
	start?: Date,
	end?: Date,
	existing?: SeriesOption[],
) {
	const stats = await getStatisticsHistory(name, start, end);
	const versions = new Set<string>();
	for (const date of Object.keys(stats.counts)) {
		Object.keys(stats.counts[date].versions)
			.map((v) => coerce(v))
			.filter((v) => !!v)
			.forEach((v) => versions.add(v!.version));
	}

	const sortedVersions = Array.from(versions);
	sort(sortedVersions);
	const series = sortedVersions.map<SeriesOption>((v) => {
		const existingData = (existing?.find((e) => e.name === v)?.data ??
			[]) as [string, number][];
		const data = [...existingData];
		Object.keys(stats.counts)
			.map((date) => [date, stats.counts[date].versions[v] || 0] as const)
			.forEach(([date, value]) => {
				if (
					!existingData.some(
						([existingDate]) => existingDate === date,
					)
				) {
					data.push([date, value]);
				}
			});
		data.sort((a, b) => a[0].localeCompare(b[0]));
		return {
			name: v,
			type: "line",
			stack: name,
			showSymbol: false,
			areaStyle: {},
			emphasis: {
				focus: "series",
			},
			data,
		};
	});

	// the "total" series is used also for version markers
	series.push({
		name: "Total",
		type: "line",
		symbol: "circle",
		showSymbol: false,
		lineStyle: { color: "black", width: 1.5 },
		itemStyle: { color: "black" },
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
			] as SeriesOption["markLine"]["data"],
		},
	});

	return series;
}

export function VersionHistory() {
	const { name } = useAdapterContext();
	const [option, setOption] = useState<EChartsOption>();
	const [showLoading, setShowLoading] = useState(true);

	useEffect(() => {
		setOption(undefined);
		setShowLoading(true);
		const loadHistory = async () => {
			const series = await loadSeries(name);
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

	async function onDataZoom(event: any, chart: any) {
		console.log("data zoom", event, chart);
		console.log("options", chart.getOption());

		// according to https://github.com/apache/echarts/issues/17919#issuecomment-1316090464
		const extent = chart
			.getModel()
			.getComponent("xAxis", 0)
			.axis.scale.getExtent();
		console.log("extent", extent);

		const series = await loadSeries(
			name,
			new Date(extent[0]),
			new Date(extent[1]),
			option?.series as SeriesOption[],
		);
		setOption({
			...chartDefaults,
			series,
		});
	}

	return (
		<Box sx={{ marginTop: 2 }}>
			<ReactECharts
				style={{ height: "400px" }}
				loadingOption={{
					type: "default",
				}}
				onEvents={{
					datazoom: debounce(onDataZoom, 250),
				}}
				showLoading={showLoading}
				option={option || { ...chartDefaults }}
			/>
		</Box>
	);
}
