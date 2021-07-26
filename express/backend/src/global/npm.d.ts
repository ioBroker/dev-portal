export type DistTags = Record<string, string>;

export type Scripts = Record<string, string>;

export interface Repository {
	type: string;
	url: string;
}

export interface Human {
	name: string;
	email: string;
}

export interface Bugs {
	url: string;
}

export type Dependencies = Record<string, string>;

export type Engines = Record<string, string>;

export interface Dist {
	shasum: string;
	tarball: string;
}

export interface NpmOperationalInternal {
	host: string;
	tmp: string;
}

export interface Directories {}
export interface VersionMetaData {
	name: string;
	version: string;
	description: string;
	main: string;
	scripts: Scripts;
	repository: Repository;
	keywords: string[];
	author: Human;
	contributors?: Human[];
	license: string;
	bugs: Bugs;
	homepage: string;
	dependencies: Dependencies;
	gitHead: string;
	dist: Dist;
	maintainers?: Human[];
	directories: Directories;
	engines?: Engines;
}
export type Versions = Record<string, VersionMetaData>;
export type Times = Record<string, string>;
export interface PackageMetaData {
	_id: string;
	_rev: string;
	name: string;
	description: string;
	["dist-tags"]: DistTags;
	versions: Versions;
	readme: string;
	maintainers: Human[];
	time: Times;
	homepage: string;
	keywords: string[];
	repository: Repository;
	author: Human;
	bugs: Bugs;
	license: string;
	readmeFilename: string;
}
