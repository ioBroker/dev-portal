import cors from "cors";
import express from "express";
import { IncomingMessage } from "http";
import { Socket } from "net";
import path from "path";
import adapterApi from "./api/adapter";
import sentryApi from "./api/sentry";
import userApi from "./api/user";
import weblateProxy from "./api/weblate-proxy";
import {
	handleUpgrade,
	router as createAdapterRouter,
} from "./apps/create-adapter";
import auth from "./auth";
import { env } from "./common";
import { startCronJobs } from "./cron";
import { GIT_BRANCH, GIT_COMMIT } from "./version";

console.log(
	`Starting portal express application from ${GIT_COMMIT}@${GIT_BRANCH}`,
);

const app = express();
const port = 8080;

if (env.ALLOW_CORS) {
	app.use(cors());
}

const publicPath = env.HTTP_PUBLIC_PATH
	? path.resolve(env.HTTP_PUBLIC_PATH)
	: path.join(__dirname, "public");
app.use(express.static(publicPath));

app.use(auth);

// api
app.use(weblateProxy);
app.use(adapterApi);
app.use(userApi);
app.use(sentryApi);
app.get("/api/version", function (_req, res) {
	res.send({
		branch: GIT_BRANCH,
		commit: GIT_COMMIT,
	});
});
app.get("/api/*", function (_req, res) {
	// ensure that unknown API calls don't end up serving the HTML below
	res.status(404).send("API endpoint not found");
});

// apps
app.use(createAdapterRouter);

app.get("/*", function (_req, res) {
	res.sendFile(path.join(publicPath, "index.html"));
});

const server = app.listen(port, () => {
	console.log(`Express app listening at http://localhost:${port}`);
});

server.on(
	"upgrade",
	(request: IncomingMessage, socket: Socket, head: Buffer) => {
		if (request.url === "/ws/create-adapter") {
			handleUpgrade(request, socket, head);
		} else {
			socket.destroy();
		}
	},
);

startCronJobs();
