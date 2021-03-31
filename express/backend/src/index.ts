import axios from "axios";
import express from "express";
import path from "path";
import Cookies from "universal-cookie";
import cookiesMiddleware from "universal-cookie-express";
import { decrypt, encrypt } from "./crypto";

const app = express();
const port = 8080;

export const COOKIE_NAME_PORTAL_TOKEN = "gh-token";
export const COOKIE_NAME_CREATOR_TOKEN = "gh-creator-token";

// specified environment variables
export const env: Readonly<{
	HTTP_PUBLIC_PATH?: string;
	PORTAL_GITHUB_OAUTH_CLIENT_ID: string;
	PORTAL_GITHUB_OAUTH_CLIENT_SECRET: string;
	CREATOR_GITHUB_OAUTH_CLIENT_ID: string;
	CREATOR_GITHUB_OAUTH_CLIENT_SECRET: string;
}> = process.env as any;

type LoginState = { redirect: string; scope?: string };

const publicPath = env.HTTP_PUBLIC_PATH
	? path.resolve(env.HTTP_PUBLIC_PATH)
	: path.join(__dirname, "public");

app.use(express.static(publicPath));

app.get("/login", function (req, res) {
	const { redirect, scope } = req.query;
	const state = encodeURIComponent(
		encrypt<LoginState>({
			redirect: typeof redirect !== "string" ? "/" : redirect,
			scope: typeof scope !== "string" ? undefined : scope,
		}),
	);
	const clientId =
		scope === "repo"
			? env.CREATOR_GITHUB_OAUTH_CLIENT_ID
			: env.PORTAL_GITHUB_OAUTH_CLIENT_ID;
	const requestScope = scope === "repo" ? "repo" : "user:email";
	const url = `https://github.com/login/oauth/authorize?client_id=${clientId}&scope=${requestScope}&state=${state}`;
	res.redirect(url);
});

app.use(cookiesMiddleware()).get("/auth", async function (req, res) {
	const { code, state } = req.query;
	const cookies = (req as any)["universalCookies"] as Cookies;
	console.log("/auth request:", req.headers, req.query);

	let login: LoginState = { redirect: "/" };
	try {
		login = decrypt<LoginState>(state as string);
	} catch (e) {
		console.error(e);
	}
	console.log("login with", login);

	const result = await axios.post(
		"https://github.com/login/oauth/access_token",
		{
			client_id: login.scope
				? env.CREATOR_GITHUB_OAUTH_CLIENT_ID
				: env.PORTAL_GITHUB_OAUTH_CLIENT_ID,
			client_secret: login.scope
				? env.CREATOR_GITHUB_OAUTH_CLIENT_SECRET
				: env.PORTAL_GITHUB_OAUTH_CLIENT_SECRET,
			code,
			state,
		},
		{
			headers: {
				accept: "application/json",
			},
		},
	);

	if (typeof result.data.access_token === "string") {
		cookies.set(
			login.scope ? COOKIE_NAME_CREATOR_TOKEN : COOKIE_NAME_PORTAL_TOKEN,
			result.data.access_token,
		);
	}

	res.redirect(
		`${req.protocol}://${req.get("host")}${encodeURI(login.redirect)}`,
	);
});

app.get("/*", function (_req, res) {
	res.sendFile(path.join(publicPath, "index.html"));
});

app.listen(port, () => {
	console.log(`Express app listening at http://localhost:${port}`);
});
