import { MongoClient, Db } from "mongodb";
import {
	AdapterRepo as GitHubAdapterRepo,
	RepoAdapter,
	Statistics,
	User,
} from "./schemas";

let client: MongoClient | null = null;
let connectionPromise: Promise<Db> | null = null;

export function createClient() {
	return new MongoClient("mongodb://mongo/dev-portal");
}

export async function connectDatabase(): Promise<Db> {
	if (client) {
		return client.db();
	}
	
	// Prevent race conditions by reusing the connection promise
	if (connectionPromise) {
		return connectionPromise;
	}
	
	connectionPromise = (async () => {
		client = createClient();
		try {
			await client.connect();
			
			// Set up event listeners to detect disconnections
			client.on("close", () => {
				console.log("MongoDB connection closed unexpectedly");
				client = null;
				connectionPromise = null;
			});
			
			client.on("error", (error) => {
				console.error("MongoDB client error:", error);
			});
			
			const db = client.db();
			console.log("MongoDB connected successfully");
			return db;
		} catch (error) {
			console.error("Error connecting to MongoDB:", error);
			// Clean up failed client
			if (client) {
				try {
					await client.close();
				} catch (closeError) {
					console.error("Error closing MongoDB client after failed connection:", closeError);
				}
			}
			client = null;
			throw error;
		}
	})();
	
	try {
		return await connectionPromise;
	} finally {
		// Clean up the promise after it's fulfilled
		connectionPromise = null;
	}
}

export async function closeDatabaseConnection(): Promise<void> {
	if (client) {
		try {
			client.removeAllListeners();
			await client.close();
			console.log("MongoDB connection closed");
		} catch (error) {
			console.error("Error closing MongoDB connection:", error);
		} finally {
			client = null;
			connectionPromise = null;
		}
	}
}

export async function dbConnect() {
	const db = await connectDatabase();

	return {
		rawStatistics: () => db.collection<Statistics>("raw-statistics"),
		repoAdapters: () => db.collection<RepoAdapter>("repo-adapters"),
		gitHubRepos: () => db.collection<GitHubAdapterRepo>("github-repos"),
		users: () => db.collection<User>("users"),
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
