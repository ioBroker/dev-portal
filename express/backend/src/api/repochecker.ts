import { CheckRequest, CheckResult, handler } from "@iobroker/repochecker";
import { Router } from "express";

const router = Router();

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

router.get("/api/repochecker/", async function (req, res) {
	try {
		const result = await runRepochecker({
			queryStringParameters: {
				url: req.query.url as string,
				branch: req.query.branch as string | undefined,
				githubToken: getGithubToken(req.headers.authorization),
			},
		});
		res.status(result.statusCode).send(result.body);
	} catch {
		console.error("Repochecker request failed");
		res.status(500).send("Repochecker request failed");
	}
});

export default router;
