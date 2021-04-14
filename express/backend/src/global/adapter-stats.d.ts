import { DateString, Version } from "./iobroker";

export interface AdapterVersions {
	versions: Record<Version, number>;
	total: number;
}

export interface AdapterStatistics {
	counts: Record<DateString, AdapterVersions>;
	latest: Record<DateString, Version>;
	stable: Record<DateString, Version>;
}
