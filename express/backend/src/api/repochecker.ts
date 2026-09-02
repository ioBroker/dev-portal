import { CheckRequest, CheckResult } from "@iobroker/repochecker";
import { fork } from "child_process";
import { Router } from "express";
import path from "path";

const router = Router();

type RepocheckerWorkerResponse = {
	error?: unknown;
	result?: CheckResult;
};

function getGithubToken(authorization?: string | string[]) {
	if (typeof authorization !== "string") {
		return undefined;
	}

	const trimmed = authorization.trim();
	if (!trimmed) {
		return undefined;
	}

	const separatorIndex = trimmed.indexOf(" ");
	if (separatorIndex < 0) {
		return trimmed;
	}

	const scheme = trimmed.slice(0, separatorIndex).toLowerCase();
	if (scheme !== "bearer" && scheme !== "token") {
		return trimmed;
	}

	const token = trimmed.slice(separatorIndex + 1).trim();
	return token || undefined;
}

function getErrorMessage(error: unknown) {
	if (error instanceof Error) {
		return error.message;
	}

	return typeof error === "string"
		? error
		: "Repochecker request failed";
}

function runRepochecker(
	request: CheckRequest,
	githubToken?: string,
): Promise<CheckResult> {
	return new Promise((resolve, reject) => {
		let settled = false;
		const child = fork(path.join(__dirname, "repochecker-worker.js"), [
			JSON.stringify(request),
		], {
			env: githubToken
				? { ...process.env, OWN_GITHUB_TOKEN: githubToken }
				: process.env,
		});

		const finishWithError = (error: unknown) => {
			if (settled) {
				return;
			}
			settled = true;
			reject(error);
		};

		child.once("message", (message: RepocheckerWorkerResponse) => {
			if (message.result) {
				settled = true;
				resolve(message.result);
				return;
			}
			finishWithError(
				message.error || new Error("Repochecker returned no result"),
			);
		});
		child.once("error", finishWithError);
		child.once("exit", (code, signal) => {
			if (settled || code === 0) {
				return;
			}
			settled = true;
			reject(
				new Error(
					`Repochecker exited before responding (code=${code}, signal=${signal})`,
				),
			);
		});
	});
}

router.get("/api/repochecker/", async function (req, res) {
	try {
		const result = await runRepochecker(
			{
				queryStringParameters: {
					url: req.query.url as string,
					branch: req.query.branch as string | undefined,
				},
			},
			getGithubToken(req.headers.authorization),
		);
		res.status(result.statusCode).send(result.body);
	} catch (error) {
		res.status(500).send(getErrorMessage(error));
	}
});

export default router;
