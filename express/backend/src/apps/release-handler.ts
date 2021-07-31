import { checkAdapterName } from "@iobroker/create-adapter";
import { request } from "@octokit/request";
import { spawn } from "child_process";
import { mkdirp, remove } from "fs-extra";
import { COOKIE_NAME_CREATOR_TOKEN } from "../auth";
import { CreateReleaseMessage } from "../global/websocket";
import { WebSocketConnectionHandler } from "./websocket-connection-handler";

const uc = encodeURIComponent;

export class ReleaseConnectionHandler extends WebSocketConnectionHandler<CreateReleaseMessage> {
	protected async handleMessage(
		message: CreateReleaseMessage,
	): Promise<void> {
		const { owner, repo, type } = message;
		const adapterName = repo.split(".", 2)[1];
		const nameCheck = await checkAdapterName(adapterName);
		if (nameCheck !== true) {
			throw new Error(nameCheck);
		}

		const token = this.cookies[COOKIE_NAME_CREATOR_TOKEN];
		if (!token) {
			throw new Error("GitHub token cookie is missing");
		}

		const requestWithAuth = request.defaults({
			headers: {
				authorization: `token ${token}`,
			},
		});

		this.log(`Connecting to GitHub...`);
		const { data: user } = await requestWithAuth("GET /user");
		this.log(`Connected to GitHub as ${user.login}`);

		this.log(`Cloning ${owner}/${repo} from GitHub`);
		await remove(this.rootDir);
		await mkdirp(this.rootDir);
		await this.exec(
			`git clone "https://${uc(user.login!)}:${uc(token)}@github.com/${uc(
				owner,
			)}/${uc(repo)}.git" .`,
		);
		await this.exec(`git config user.email "${user.email}"`);
		await this.exec(`git config user.name "${user.name || user.login}"`);

		this.log(`Installing dependencies (this may take a while)`);
		await this.exec(`npm ci`);

		this.log(`Executing release script for new ${type} release`);
		await this.exec(`npm run release ${type}`);

		this.sendMsg({
			result: true,
			resultLink: `https://github.com/${owner}/${repo}/actions/workflows/test-and-release.yml`,
		});
	}

	protected sendFailureMessage(e: any): void {
		this.sendMsg({ result: false });
	}

	protected exec(cmd: string) {
		return new Promise<void>((resolve, reject) => {
			const child = spawn(cmd, [], {
				cwd: this.rootDir,
				stdio: "inherit",
				shell: true,
			});
			child
				.on("error", (err) => reject(err))
				.on("exit", (code) =>
					code === 0
						? resolve()
						: reject(new Error(`Process exited with ${code}`)),
				);
		});
	}
}
