import { components } from "@octokit/openapi-types/dist-types/generated/types";
import { request } from "@octokit/request";
import { RequestInterface } from "@octokit/types";

export type User = components["schemas"]["public-user"] & {
	token: string;
};

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

	public async getUser(): Promise<User> {
		const user = await this.request("GET /user");
		return { ...user.data, token: this.token };
	}
}
