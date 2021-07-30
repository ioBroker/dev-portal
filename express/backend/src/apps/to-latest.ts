import { checkAdapterName } from "@iobroker/create-adapter";
import { request } from "@octokit/request";
import { spawn } from "child_process";
import { mkdirp, remove } from "fs-extra";
import path from "path";
import { COOKIE_NAME_CREATOR_TOKEN } from "../auth";
import { ToLatestMessage } from "../global/websocket";
import { GIT_COMMIT } from "../version";
import { WebSocketConnectionHandler } from "./websocket-connection-handler";

const ORG = "ioBroker";
const REPOSITORY = "ioBroker.repositories";

const PAGE_SIZE = 100;

const uc = encodeURIComponent;

export class ToLatestConnectionHandler extends WebSocketConnectionHandler<ToLatestMessage> {
	protected async handleMessage(message: ToLatestMessage): Promise<void> {
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

		let forkName = await this.findFork(user.login!, requestWithAuth);
		if (forkName) {
			this.log(`Found fork ${user.login}/${forkName}`);
		} else {
			const { data: fork } = await requestWithAuth(
				"POST /repos/{owner}/{repo}/forks{?org,organization}",
				{
					owner: ORG,
					repo: REPOSITORY,
				},
			);
			forkName = fork.name;
			this.log(`Created fork ${user.login}/${forkName}`);
		}

		this.log(`Cloning repository from GitHub`);
		const baseDir = path.join(this.rootDir, REPOSITORY);
		await remove(baseDir);
		await mkdirp(baseDir);
		const baseUrl = `https://${uc(user.login!)}:${uc(token)}@github.com/`;
		await this.exec(
			`git clone "${baseUrl}${uc(user.login)}/${uc(forkName)}.git" .`,
		);
		await this.exec(
			`git remote add upstream "${baseUrl}${ORG}/${REPOSITORY}.git"`,
		);
		await this.exec(`git fetch upstream`);

		const branchName = `${adapterName}-to-latest`;
		this.log(`Creating branch ${branchName}`);
		await this.exec(`git checkout -b ${branchName} upstream/master`);

		this.log(
			`Adding ${adapterName} to latest locally (this may take a while)`,
		);
		await this.exec(`npm i`);
		await this.exec(
			`npm run addToLatest -- --name ${adapterName} --type "${type}"`,
		);
		await this.exec(`git add sources-dist.json`);
		await this.exec(
			`git commit -m "Added ${adapterName} to sources-dist.json"`,
		);

		this.log(`Pushing changes to ${user.login}/${forkName}`);
		await this.exec(`git push origin ${branchName}`);

		this.log(`Creating pull request on ${ORG}/${REPOSITORY}`);
		const { data: pullRequest } = await requestWithAuth(
			"POST /repos/{owner}/{repo}/pulls",
			{
				owner: ORG,
				repo: REPOSITORY,
				head: `${user.login}:${branchName}`,
				base: "master",
				maintainer_can_modify: true,
				title: `Add ${adapterName} to latest`,
				body: `Please add my adapter ioBroker.${adapterName} to latest.\n\n*This pull request was created by https://www.iobroker.dev ${GIT_COMMIT}.*`,
			},
		);

		this.log(`Created pull request #${pullRequest.number}`);
		this.sendMsg({ result: true, resultLink: pullRequest.html_url });
	}

	private exec(cmd: string) {
		return new Promise<void>((resolve, reject) => {
			const child = spawn(cmd, [], {
				cwd: path.join(this.rootDir, REPOSITORY),
				stdio: "inherit",
				shell: true,
			});
			child
				.on("error", (err) => reject(err))
				.on("exit", (code) => (code === 0 ? resolve() : reject(code)));
		});
	}

	protected sendFailureMessage(e: any): void {
		this.sendMsg({ result: false });
	}

	private async findFork(username: string, requestWithAuth: typeof request) {
		try {
			const { data: repo } = await requestWithAuth(
				"GET /repos/{owner}/{repo}",
				{
					owner: username,
					repo: REPOSITORY,
				},
			);
			if (repo?.parent?.full_name === `${ORG}/${REPOSITORY}`) {
				return repo.name;
			}
		} catch {
			// ignore error and simply search for the fork in all repos
		}
		let page = 0;
		let repos;
		do {
			repos = await requestWithAuth("GET /users/{username}/repos", {
				username,
				page: page++,
				per_page: PAGE_SIZE,
			});
			for (const repo of repos.data.filter((r) => r.fork)) {
				const { data: details } = await requestWithAuth(
					"GET /repos/{owner}/{repo}",
					{
						owner: repo.owner?.login!,
						repo: repo.name,
					},
				);
				if (details.parent?.full_name === `${ORG}/${REPOSITORY}`) {
					return repo.name;
				}
			}
		} while (repos.data.length === PAGE_SIZE);
	}
}
