import { ToLatestMessage } from "../global/websocket";
import { GIT_COMMIT } from "../version";
import { Context, RepositoriesConnectionHandler } from "./repositories-handler";

export class ToLatestConnectionHandler extends RepositoriesConnectionHandler<ToLatestMessage> {
	protected getBranchName(context: Context<ToLatestMessage>): string {
		return `${context.adapterName}-to-latest`;
	}

	protected async updateRepositories(
		context: Context<ToLatestMessage>,
	): Promise<void> {
		const {
			adapterName,
			message: { type },
		} = context;
		this.log(`Adding ${adapterName} to latest locally`);
		await this.exec(
			`npm run addToLatest -- --name ${adapterName} --type "${type}"`,
		);
		await this.exec(`git add sources-dist.json`);
		await this.exec(
			`git commit -m "Added ${adapterName} to sources-dist.json"`,
		);
	}

	protected getPullRequestDetails(
		context: Context<ToLatestMessage>,
	): { title: string; body: string } {
		const { adapterName } = context;
		return {
			title: `Add ${adapterName} to latest`,
			body: `Please add my adapter ioBroker.${adapterName} to latest.\n\n*This pull request was created by https://www.iobroker.dev ${GIT_COMMIT}.*`,
		};
	}
}
