import { ToStableMessage } from "../global/websocket";
import { GIT_COMMIT } from "../version";
import { Context, RepositoriesConnectionHandler } from "./repositories-handler";

export class ToStableConnectionHandler extends RepositoriesConnectionHandler<ToStableMessage> {
	protected async handleMessage(message: ToStableMessage): Promise<void> {
		if (!message.version.match(/^[0-9\.]+$/)) {
			throw new Error(`Invalid version number ${message.version}`);
		}

		return super.handleMessage(message);
	}

	protected getBranchName(context: Context<ToStableMessage>): string {
		return `${context.adapterName}-${context.message.version}`;
	}

	protected async updateRepositories(
		context: Context<ToStableMessage>,
	): Promise<void> {
		const {
			adapterName,
			message: { version },
		} = context;
		this.log(`Updating ${adapterName} to ${version} locally`);
		await this.exec(
			`npm run updateStable -- --name ${adapterName} --version "${version}"`,
		);
		await this.exec(`git add sources-dist-stable.json`);
		await this.exec(`git commit -m "Updated ${adapterName} to ${version}"`);
	}

	protected getPullRequestDetails(
		context: Context<ToStableMessage>,
	): { title: string; body: string } {
		const {
			adapterName,
			message: { version },
		} = context;
		return {
			title: `Update ${adapterName} to ${version}`,
			body: `Please update my adapter ioBroker.${adapterName} to version ${version}.\n\n*This pull request was created by https://www.iobroker.dev ${GIT_COMMIT}.*`,
		};
	}
}
