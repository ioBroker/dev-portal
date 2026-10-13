import { CheckRequest, CheckResult, handler } from "@iobroker/repochecker";
import { Router } from "express";
import Cookies from "universal-cookie";
import cookiesMiddleware from "universal-cookie-express";
import { COOKIE_NAME_PORTAL_TOKEN } from "../auth";

const router = Router();

// Each check performs many HTTP requests, so only a few may run at once;
// additional checks wait in a bounded queue until a slot becomes free.
const MAX_PARALLEL_CHECKS = 3;
const MAX_QUEUED_CHECKS = 10;
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
	try {
		const result = await withCheckSlot(() =>
			runRepochecker({
				queryStringParameters: {
					url: req.query.url as string,
					branch: req.query.branch as string | undefined,
					githubToken: ghToken,
				},
			}),
		);
		res.status(result.statusCode).send(result.body);
	} catch {
		console.error("Repochecker request failed");
		res.status(500).send("Repochecker request failed");
	} finally {
		activeTokens.delete(ghToken);
	}
});

export default router;
