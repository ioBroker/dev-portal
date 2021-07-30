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

export type PullRequestSimple = components["schemas"]["pull-request-simple"];

export type Tag = components["schemas"]["tag"];

const PAGE_SIZE = 100; // max 100

export class GitHubComm {
	private static readonly comms = new Map<string, GitHubComm>();
	public readonly request: RequestInterface<object>;
	private readonly repos = new Map<string, GitHubRepoComm>();

	private constructor(public readonly token: string) {
		this.request = request.defaults({
			headers: {
				authorization: `token ${token}`,
			},
		});
	}

	public static forToken(token: string): GitHubComm {
		if (!GitHubComm.comms.has(token)) {
			GitHubComm.comms.set(token, new GitHubComm(token));
		}

		return GitHubComm.comms.get(token)!;
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

	public getRepo(owner: string, repo: string): GitHubRepoComm;
	public getRepo(repo: Repository): GitHubRepoComm;
	public getRepo(owner: string | Repository, repo?: string): GitHubRepoComm {
		if (typeof owner !== "string") {
			repo = owner.name;
			owner = owner.owner!.login;
		}
		const key = `${owner}/${repo}`;
		if (!this.repos.has(key)) {
			this.repos.set(key, new GitHubRepoComm(owner, repo!, this));
		}
		return this.repos.get(key)!;
	}
}

export class GitHubRepoComm {
	private readonly baseOptions: { owner: string; repo: string };
	constructor(
		owner: string,
		repo: string,
		public readonly parent: GitHubComm,
	) {
		this.baseOptions = { owner, repo };
	}

	private get request() {
		return this.parent.request;
	}

	public readonly getRepo = AsyncCache.of(async () => {
		const result = await this.request("GET /repos/{owner}/{repo}", {
			...this.baseOptions,
		});
		return result.data;
	});

	public async getPullRequests(
		state?: "open" | "closed" | "all",
	): Promise<PullRequestSimple[]> {
		const result = await this.request("GET /repos/{owner}/{repo}/pulls", {
			...this.baseOptions,
			state,
		});
		return result.data;
	}

	public readonly getTags = AsyncCache.of(async () => {
		const result = await this.request("GET /repos/{owner}/{repo}/tags", {
			...this.baseOptions,
			per_page: 100,
		});
		return result.data;
	});

	public async getRef(ref: string) {
		const result = await this.request(
			"GET /repos/{owner}/{repo}/git/ref/{ref}",
			{
				...this.baseOptions,
				ref,
			},
		);
		return result.data;
	}

	public async getCommit(commit_sha: string) {
		const result = await this.request(
			"GET /repos/{owner}/{repo}/git/commits/{commit_sha}",
			{
				...this.baseOptions,
				commit_sha,
			},
		);
		return result.data;
	}

	public async compare(base: string, head: string) {
		const result = await this.request(
			"GET /repos/{owner}/{repo}/compare/{base}...{head}",
			{
				...this.baseOptions,
				base,
				head,
			},
		);
		return result.data;
	}
}
