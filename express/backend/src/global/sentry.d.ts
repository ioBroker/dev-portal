export interface ProjectInfo {
	id: string;
	slug: string;
	adapterName: string;
}

export interface ProjectStatistics {
	team: Team;
	teams: Team[];
	id: string;
	name: string;
	slug: string;
	isBookmarked: boolean;
	isMember: boolean;
	hasAccess: boolean;
	dateCreated: Date;
	environments: string[];
	features: string[];
	firstEvent: Date;
	firstTransactionEvent: boolean;
	platform: string;
	platforms: string[];
	latestRelease?: any;
	hasUserReports: boolean;
	latestDeploys?: any;
	stats: number[][];
}

export interface Team {
	id: string;
	slug: string;
	name: string;
}
