import { request } from "@octokit/request";
import { json, Request, Router } from "express";
import NodeCache from "node-cache";
import Cookies from "universal-cookie";
import cookiesMiddleware from "universal-cookie-express";
import { COOKIE_NAME_PORTAL_TOKEN } from "../auth";
import { dbConnect } from "../db/utils";

const router = Router();

const loginCache = new NodeCache({
	stdTTL: 3600,
	checkperiod: 3600,
	useClones: false,
});

async function getGitHubLogin(req: Request) {
	const cookies = (req as any)["universalCookies"] as Cookies;
	const ghToken = cookies.get(COOKIE_NAME_PORTAL_TOKEN);
	if (!ghToken) {
		return undefined;
	}

	let login = loginCache.get<string>(ghToken);
	if (!login) {
		const requestWithAuth = request.defaults({
			headers: {
				authorization: `token ${ghToken}`,
			},
		});

		const user = await requestWithAuth("GET /user");
		login = user.data.login;
	}

	loginCache.set(ghToken, login);
	return login;
}

router.get("/api/user/", cookiesMiddleware(), async function (req, res) {
	try {
		const [db, login] = await Promise.all([
			dbConnect(),
			getGitHubLogin(req),
		]);
		const users = db.users();

		if (!login) {
			res.status(403).send("Not logged in");
			return;
		}

		let user = await users.findOne({ login });
		if (!user) {
			user = {
				login,
				watches: [],
			};
			await users.insertOne(user);
		}

		// we don't want to return the _id field (which is returned even if the signature doesn't say so)
		delete (user as any)._id;
		res.send(user);
	} catch (error) {
		console.error(error);
		res.status(500).send(error.message || error);
	}
});

router.put(
	"/api/user/",
	json(),
	cookiesMiddleware(),
	async function (req, res) {
		try {
			const [db, login] = await Promise.all([
				dbConnect(),
				getGitHubLogin(req),
			]);
			const users = db.users();

			if (!login) {
				res.status(403).send("Not logged in");
				return;
			}

			const user = { ...req.body };
			delete user.login;
			const result = await users.findOneAndUpdate(
				{ login },
				{ $set: user },
				{ upsert: true },
			);
			res.send(result.value);
		} catch (error) {
			console.error(error);
			res.status(500).send(error.message || error);
		}
	},
);

export default router;
