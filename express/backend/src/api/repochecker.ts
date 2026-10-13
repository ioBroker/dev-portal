import { CheckRequest, CheckResult, handler } from "@iobroker/repochecker";
import { Request, Router } from "express";
import Cookies from "universal-cookie";
import cookiesMiddleware from "universal-cookie-express";
import { COOKIE_NAME_PORTAL_TOKEN } from "../auth";
import { getGitHubLogin } from "./user";

const router = Router();

// Each check performs many HTTP requests, so only a few may run at once;
// additional checks wait in a bounded queue until a slot becomes free.
// TODO: Raise to 3 once repochecker isolates credentials per check. It
// currently keeps a module-level Axios instance (used by downloadURL and
// getFilesList) and log redaction state, so parallel checks could use or log
// another user's GitHub token.
// See https://github.com/ioBroker/ioBroker.repochecker/issues/1193
export const MAX_PARALLEL_CHECKS = 1;
export const MAX_QUEUED_CHECKS = 10;
let runningChecks = 0;
const waitingChecks: (() => void)[] = [];

// Only one check per user (GitHub token) may be running or queued at a time.
const activeTokens = new Set<string>();

function isQueueFull() {
	return (
		runningChecks >= MAX_PARALLEL_CHECKS &&
		waitingChecks.length >= MAX_QUEUED_CHECKS
	);
}

async function withCheckSlot<T>(fn: () => Promise<T>): Promise<T> {
	if (runningChecks >= MAX_PARALLEL_CHECKS) {
		await new Promise<void>((resolve) => waitingChecks.push(resolve));
	} else {
		runningChecks++;
	}
	try {
		return await fn();
	} finally {
		const next = waitingChecks.shift();
		if (next) {
			// hand the slot over directly to the next waiting check
			next();
		} else {
			runningChecks--;
		}
	}
}

let lastCheckId = 0;

function seconds(fromMs: number) {
	return `${((Date.now() - fromMs) / 1000).toFixed(1)}s`;
}

// Only used for logging, so a failed lookup must not fail the check.
async function getLoginForLog(req: Request) {
	try {
		return (await getGitHubLogin(req)) || "unknown";
	} catch {
		return "unknown";
	}
}

function describeResult(result: CheckResult) {
	try {
		const body = JSON.parse(result.body);
		return `status ${result.statusCode} (${body.errors?.length ?? "?"} errors, ${body.warnings?.length ?? "?"} warnings)`;
	} catch {
		return `status ${result.statusCode}`;
	}
}

function runRepochecker(request: CheckRequest): Promise<CheckResult> {
	return new Promise((resolve, reject) => {
		handler(request, null, (error, result) => {
			if (error || !result) {
				reject(error || new Error("Repochecker returned no result"));
			} else {
				resolve(result);
			}
		});
	});
}

router.get("/api/repochecker/", cookiesMiddleware(), async function (req, res) {
	const cookies = (req as any)["universalCookies"] as Cookies;
	const ghToken: string | undefined = cookies.get(COOKIE_NAME_PORTAL_TOKEN);
	if (!ghToken) {
		res.status(401).send("Not logged in");
		return;
	}
	if (activeTokens.has(ghToken)) {
		res.status(429).send(
			"A repository check is already running for your account; please try again later",
		);
		return;
	}
	if (isQueueFull()) {
		res.status(429).send(
			"Too many repository checks are waiting; please try again later",
		);
		return;
	}

	activeTokens.add(ghToken);
	const url = req.query.url as string;
	const branch = req.query.branch as string | undefined;
	const checkId = ++lastCheckId;
	const requestedAt = Date.now();
	const login = await getLoginForLog(req);
	const what = `#${checkId} by ${login} for ${JSON.stringify(url)}${branch ? ` (branch ${JSON.stringify(branch)})` : ""}`;
	let startedAt = requestedAt;
	console.log(
		`Repochecker ${what} requested (running: ${runningChecks}, queued: ${waitingChecks.length})`,
	);

	// A proxy (e.g. nginx with its 60s default timeout) may give up before the check is done
	res.on("close", () => {
		if (!res.writableFinished) {
			console.warn(
				`Repochecker ${what}: connection closed by client or proxy after ${seconds(requestedAt)}, before the result was sent`,
			);
		}
	});

	try {
		const result = await withCheckSlot(() => {
			startedAt = Date.now();
			console.log(
				`Repochecker ${what} started after ${seconds(requestedAt)} in queue`,
			);
			return runRepochecker({
				queryStringParameters: {
					url,
					branch,
					githubToken: ghToken,
				},
			});
		});
		console.log(
			`Repochecker ${what} finished with ${describeResult(result)}, time needed ${seconds(requestedAt)} (queued ${((startedAt - requestedAt) / 1000).toFixed(1)}s, checking ${seconds(startedAt)})`,
		);
		res.status(result.statusCode).send(result.body);
	} catch {
		console.error(
			`Repochecker ${what} failed, time needed ${seconds(requestedAt)}`,
		);
		res.status(500).send("Repochecker request failed");
	} finally {
		activeTokens.delete(ghToken);
	}
});

export default router;
