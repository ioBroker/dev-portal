import Chart from "react-google-charts";
import { Box, CircularProgress, Typography } from "@mui/material";
import { useAdapterContext } from "../../../contexts/AdapterContext";
import { useEffect, useState } from "react";
import { getCurrentVersions } from "../../../lib/ioBroker";

type GraphData = [string, string | number][];

export function CurrentVersions() {
	const { name } = useAdapterContext();
	const [graphData, setGraphData] = useState<GraphData>();

	useEffect(() => {
		setGraphData(undefined);
		const loadHistory = async () => {
			const stats = await getCurrentVersions(name);
			const data: GraphData = [["Version", "Count"]];
			for (const [version, count] of Object.entries(
				stats.versions,
			).reverse()) {
				data.push([version, count]);
			}
			setGraphData(data);
		};
		loadHistory().catch((e) => {
			console.error(e);
			setGraphData(undefined);
		});
	}, [name]);

	return (
		<Box>
			<Typography variant="h6" gutterBottom>
				Currently installed versions
			</Typography>
			<Chart
				width="100%"
				height="300px"
				chartType="PieChart"
				loader={<CircularProgress size="200px" />}
				data={graphData}
				options={{
					is3D: true,
					backgroundColor: "transparent",
					sliceVisibilityThreshold: 0.05,
					/*colors: [
					iconStyles.error.color,
					iconStyles.warning.color,
					iconStyles.check.color,
				],*/
				}}
			/>
		</Box>
	);
}
