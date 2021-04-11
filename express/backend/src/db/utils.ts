import { MongoClient } from "mongodb";

export function createClient() {
	return new MongoClient("mongodb://mongo/dev-portal");
}

function escapeKey(key: string) {
	return key.replace(/'/g, "''").replace(/\./g, "':").replace(/\$/g, "'£");
}

function unescapeKey(key: string) {
	return key.replace(/''/g, "'").replace(/':/g, ".").replace(/'£/g, "$");
}

function transformObjectKeys<T>(obj: T, transform: (key: string) => string): T {
	if (typeof obj !== "object") {
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
