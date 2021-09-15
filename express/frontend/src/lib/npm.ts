import axios from "axios";
import { PackageMetaData } from "../../../backend/src/global/npm";
import { getApiUrl } from "./utils";

export async function getPackage(name: string) {
	const { data } = await axios.get<PackageMetaData>(
		getApiUrl(`npm/${encodeURIComponent(name)}`),
	);
	return data;
}
