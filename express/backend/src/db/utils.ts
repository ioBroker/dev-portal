import { MongoClient, Db } from "mongodb";
import {
	AdapterRepo as GitHubAdapterRepo,
	RepoAdapter,
	Statistics,
	User,
} from "./schemas";

let client: MongoClient | null = null;
let db: Db | null = null;
let connectionPromise: Promise<void> | null = null;

export function createClient() {
	return new MongoClient("mongodb://mongo/dev-portal");
}

export async function connectDatabase(): Promise<void> {
	if (client) {
		return;
	}
	
	// Prevent race conditions by reusing the connection promise
	if (connectionPromise) {
		return connectionPromise;
	}
	
	connectionPromise = (async () => {
		client = createClient();
		await client.connect();
		db = client.db();
		console.log("MongoDB connected successfully");
	})();
	
	await connectionPromise;
}

export async function closeDatabaseConnection(): Promise<void> {
	if (client) {
		await client.close();
		client = null;
		db = null;
		connectionPromise = null;
		console.log("MongoDB connection closed");
	}
}

export async function dbConnect() {
	if (!client || !db) {
		await connectDatabase();
	}

	return {
		rawStatistics: () => db!.collection<Statistics>("raw-statistics"),
		repoAdapters: () => db!.collection<RepoAdapter>("repo-adapters"),
		gitHubRepos: () => db!.collection<GitHubAdapterRepo>("github-repos"),
		users: () => db!.collection<User>("users"),
	};
}

function escapeKey(key: string) {
	return key.replace(/'/g, "''").replace(/\./g, "':").replace(/\$/g, "'£");
}

function unescapeKey(key: string) {
	return key.replace(/''/g, "'").replace(/':/g, ".").replace(/'£/g, "$");
}

function transformObjectKeys<T>(obj: T, transform: (key: string) => string): T {
	if (!obj || typeof obj !== "object") {
		return obj;
	}
	const keys = Object.keys(obj);
	const result = {} as any;
	for (const key of keys) {
		result[transform(key)] = transformObjectKeys(
			(obj as any)[key],
			transform,
		);
	}
	return result as T;
}

export function escapeObjectKeys<T>(obj: T): T {
	return transformObjectKeys(obj, escapeKey);
}

export function unescapeObjectKeys<T>(obj: T): T {
	return transformObjectKeys(obj, unescapeKey);
}
