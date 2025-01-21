import { Paper } from "@mui/material";
import { VersionHistory } from "./VersionHistory";
import { CurrentVersions } from "./CurrentVersions";

export function Statistics() {
	return (
		<>
			<Paper sx={{ padding: 2 }}>
				<CurrentVersions />
			</Paper>
			<Paper sx={{ padding: 2, marginTop: 2 }}>
				<VersionHistory />
			</Paper>
		</>
	);
}
