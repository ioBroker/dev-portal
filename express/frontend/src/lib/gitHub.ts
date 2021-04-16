import { components } from "@octokit/openapi-types/dist-types/generated/types";
import { request } from "@octokit/request";
import { RequestInterface } from "@octokit/types";
import { AsyncCache } from "./utils";

export type User = components["schemas"]["public-user"] & {
	token: string;
};

export type MinimalRepository = components["schemas"]["minimal-repository"];
export type FullRepository = components["schemas"]["full-repository"];
export type Repository = MinimalRepository | FullRepository;

const PAGE_SIZE = 100; // max 100

export class GitHubComm {
	private static readonly comms: Record<string, GitHubComm> = {};
	public readonly request: RequestInterface<object>;

	private constructor(public readonly token: string) {
		this.request = request.defaults({
			headers: {
				authorization: `token ${token}`,
			},
		});
	}

	public static forToken(token: string): GitHubComm {
		if (!GitHubComm.comms[token]) {
			GitHubComm.comms[token] = new GitHubComm(token);
		}

		return GitHubComm.comms[token];
	}

	public readonly getUser = AsyncCache.of(async () => {
		const user = await this.request("GET /user");
		return { ...user.data, token: this.token };
	});

	public readonly getEmails = AsyncCache.of(async () => {
		const emails = await this.request("GET /user/emails");
		return emails.data;
	});

	public readonly getUserRepos = AsyncCache.of(
		async (): Promise<MinimalRepository[]> => {
			const user = await this.getUser();
			const result = [];
			let page = 0;
			let repos;
			do {
				repos = await this.request("GET /users/{username}/repos", {
					username: user.login,
					page: page++,
					per_page: PAGE_SIZE,
				});
				result.push(...repos.data);
			} while (repos.data.length === PAGE_SIZE);

			return result;
		},
	);

	public async getRepo(owner: string, repo: string): Promise<FullRepository> {
		const result = await this.request("GET /repos/{owner}/{repo}", {
			owner,
			repo,
		});
		return result.data;
	}
}
