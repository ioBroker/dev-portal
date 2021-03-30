import axios from "axios";
import express from "express";
import path from "path";
import Cookies from "universal-cookie";
import cookiesMiddleware from "universal-cookie-express";

const app = express();
const port = 8080;
export const gitHubTokenCookie = "gh-token";

// specified environment variables
export const env: Readonly<{
	HTTP_PUBLIC_PATH?: string;
	PORTAL_GITHUB_OAUTH_CLIENT_ID: string;
	PORTAL_GITHUB_OAUTH_CLIENT_SECRET: string;
	CREATOR_GITHUB_OAUTH_CLIENT_ID: string;
	CREATOR_GITHUB_OAUTH_CLIENT_SECRET: string;
}> = process.env as any;

const publicPath = env.HTTP_PUBLIC_PATH
	? path.resolve(env.HTTP_PUBLIC_PATH)
	: path.join(__dirname, "public");

app.use(express.static(publicPath));

app.get("/login", function (req, res) {
	const { redirect } = req.query;

	const state = redirect || "/";
	const url = `https://github.com/login/oauth/authorize?client_id=${env.PORTAL_GITHUB_OAUTH_CLIENT_ID}&scope=user:email&state=${state}`;
	res.redirect(url);
});

app.use(cookiesMiddleware()).get("/auth", async function (req, res) {
	const { code, state } = req.query;
	const cookies = (req as any)["universalCookies"] as Cookies;
	console.log("/auth request:", req.headers);
	const result = await axios.post(
		"https://github.com/login/oauth/access_token",
		{
			client_id: env.PORTAL_GITHUB_OAUTH_CLIENT_ID,
			client_secret: env.PORTAL_GITHUB_OAUTH_CLIENT_SECRET,
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
		cookies.set(gitHubTokenCookie, result.data.access_token);
	}

	const path =
		typeof state === "string" && state.startsWith("/") ? state : "/";
	res.redirect(`${req.protocol}://${req.get("host")}${encodeURI(path)}`);
});

app.get("/*", function (_req, res) {
	res.sendFile(path.join(publicPath, "index.html"));
});

app.listen(port, () => {
	console.log(`Express app listening at http://localhost:${port}`);
});
