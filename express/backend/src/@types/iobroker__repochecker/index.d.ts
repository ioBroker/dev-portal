declare module "@iobroker/repochecker" {
	export function handler(
		request: CheckRequest,
		ctx: unknown,
		callback: (error: unknown, result?: CheckResult) => void,
	);

	export type CheckRequest = {
		queryStringParameters: {
			url: string;
			branch?: string;
		};
	};

	export type CheckResult = {
		statusCode: number;
		headers: Record<string, any>;
		body: string;
	};
}
