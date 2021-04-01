import {
	Answers,
	createFiles,
	File,
	writeFiles,
} from "@iobroker/create-adapter";
import { request as GitHubRequest } from "@octokit/request";
import { readFile } from "fs-extra";
import { IncomingMessage } from "http";
import mkdirp from "mkdirp";
import { Socket } from "net";
import path from "path";
import rimraf from "rimraf";
import { promisify } from "util";
import { v4 } from "uuid";
import WebSocket from "ws";
import { COOKIE_NAME_CREATOR_TOKEN } from "./auth";
import { env } from "./common";

const rimrafAsync = promisify(rimraf);

const tempDir = path.join(
	path.resolve(env.TEMP_DIR || ".temp/"),
	"create-adapter",
);

type GeneratorTarget = "github" | "zip";

interface TreeNode {
	name: string;
	file?: File;
	children: TreeNode[];
}

type GitHubTreeItem = {
	path?: string;
	mode?: "100644" | "100755" | "040000" | "160000" | "120000";
	type?: "blob" | "tree" | "commit";
	sha?: string | null;
	/* content?: string; // not used */
};

export class CreateAdapter {
	private readonly wss = new WebSocket.Server({ noServer: true });
	constructor() {
		this.wss.on("error", (e) => console.error("CreateAdapter:WSS", e));
		this.wss.on("connection", (client, request) =>
			this.handleConnection(client, request),
		);
	}

	public handleUpgrade(
		request: IncomingMessage,
		socket: Socket,
		head: Buffer,
	) {
		this.wss.handleUpgrade(request, socket, head, (client) =>
			this.wss.emit("connection", client, request),
		);
	}

	private handleConnection(client: WebSocket, request: IncomingMessage) {
		const id = v4();
		const root = path.join(tempDir, id);
		let started = false;

		console.log("Client connected", id);

		client.on("error", (e) => console.error("CreateAdapter:Client", id, e));
		client.on("close", (code, reason) => {
			console.log("CreateAdapter:Client", id, code, reason);
			rimrafAsync(root).catch((e) =>
				console.error("CreateAdapter:Client", id, e),
			);
		});
		const log = (msg: string, isError?: boolean) => {
			(isError ? console.error : console.log)(
				"CreateAdapter:Client",
				id,
				msg,
			);
			client.send(JSON.stringify({ log: msg, isError: !!isError }));
		};
		client.on("message", (data) => {
			try {
				if (typeof data !== "string") {
					throw new Error(`Wrong data type: ${data}`);
				}
				const message = JSON.parse(data);
				if (message.answers) {
					if (started) {
						return;
					}
					started = true;
					createAdapter(
						message.answers as Answers,
						message.target || ("zip" as GeneratorTarget),
					)
						.catch((e) => {
							log(`${e}`, true);
							client.send(JSON.stringify({ result: false }));
						})
						.catch((e) =>
							console.error("CreateAdapter:Client", id, e),
						);
				}
			} catch (error) {
				log(`Bad message received: ${error}`, true);
				client.close();
			}
		});

		const createAdapter = async (
			answers: Answers,
			target: GeneratorTarget,
		) => {
			const cookieHeader = request.headers.cookie || "";
			const cookies = cookieHeader
				.split(";")
				.map((c) => c.trim().split("=", 2))
				.reduce(
					(all, [name, value]) => ({ ...all, [name]: value }),
					{} as Record<string, string>,
				);
			if (target === "github" && !cookies[COOKIE_NAME_CREATOR_TOKEN]) {
				throw new Error("GitHub token cookie is missing");
			}

			console.log(
				"CreateAdapter:Client",
				id,
				"Creating adapter for",
				answers,
			);
			await mkdirp(root);
			await rimrafAsync(root);

			log(`Generating all adapter files...`);
			const files = await createFiles(answers);
			log(`Generated ${files.length} files`);

			await writeFiles(root, files);
			log(`Files written to disk`);

			if (target === "github") {
				await uploadToGitHub(
					answers,
					files,
					cookies[COOKIE_NAME_CREATOR_TOKEN],
				);
			} else {
				throw new Error(`Target ${target} not supported`);
			}
			client.send(JSON.stringify({ result: true }));
		};

		const uploadToGitHub = async (
			answers: Answers,
			files: File[],
			token: string,
		) => {
			const requestWithAuth = GitHubRequest.defaults({
				headers: {
					authorization: `token ${token}`,
				},
			});
			log(`Connecting to GitHub...`);
			const user = await requestWithAuth("GET /user");
			log(`Connected to GitHub as ${user.data.login}`);

			const createdRepo = await requestWithAuth("POST /user/repos", {
				name: `ioBroker.${answers.adapterName}`,
				description: answers.description,
				has_projects: false,
				has_wiki: false,
				auto_init: true,
				allow_squash_merge: false,
				allow_rebase_merge: false,
			});
			log(`Created repository ${createdRepo.data.full_name}`);

			const options = {
				owner: createdRepo.data.owner?.login || user.data.login,
				repo: createdRepo.data.name,
				branch: createdRepo.data.default_branch,
			};

			let lastCommit;
			for (let i = 0; i < 5; i++) {
				try {
					lastCommit = await requestWithAuth(
						"GET /repos/{owner}/{repo}/branches/{branch}",
						options,
					);
					break;
				} catch (error) {
					log(`${error} - retrying...`);
				}
			}
			if (!lastCommit) {
				throw "Failed connecting to Git repository";
			}

			/**
			 * Recursively uploads all files and creates trees for each directory (depth-first).
			 * @param parent The node for which to upload files and create a tree.
			 * @returns the SHA of the uploaded tree.
			 */
			const uploadTree = async (
				parent: TreeNode,
				base_tree?: string,
			): Promise<string> => {
				const treeItems: GitHubTreeItem[] = [];
				for (const node of parent.children) {
					if (!node.file) {
						// directory
						const sha = await uploadTree(node);
						treeItems.push({
							path: node.name,
							mode: "040000",
							type: "tree",
							sha,
						});
					} else {
						// file
						const filePath = path.join(root, node.file.name);
						let content: string;
						let encoding = "utf-8";
						if (typeof node.file.content === "string") {
							content = await readFile(filePath, encoding);
						} else {
							encoding = "base64";
							content = node.file.content.toString("base64");
						}
						const uploaded = await requestWithAuth(
							"POST /repos/{owner}/{repo}/git/blobs",
							{
								...options,
								content,
								encoding,
							},
						);

						log(
							`Uploaded "${node.file.name}" as ${uploaded.data.sha}`,
						);
						treeItems.push({
							path: node.name,
							mode: "100644",
							type: "blob",
							sha: uploaded.data.sha,
						});
					}
				}

				const tree = await requestWithAuth(
					"POST /repos/{owner}/{repo}/git/trees",
					{
						...options,
						base_tree,
						tree: treeItems,
					},
				);
				log(`Created directory "${parent.name}" as ${tree.data.sha}`);
				return tree.data.sha;
			};

			const treeRoot = this.buildTree(files);
			const sha = await uploadTree(treeRoot, lastCommit.data.commit.sha);

			const commit = await requestWithAuth(
				"POST /repos/{owner}/{repo}/git/commits",
				{
					...options,
					message: "Initial commit by adapter creator",
					author: {
						name: "ioBroker Adapter Creator",
						email: "noreply@iobroker.net",
					},
					parents: [lastCommit.data.commit.sha],
					tree: sha,
				},
			);
			log(`Committed ${commit.data.sha}`);

			const refUpdate = await requestWithAuth(
				"PATCH /repos/{owner}/{repo}/git/refs/{ref}",
				{
					...options,
					ref: `heads/${options.branch}`,
					sha: commit.data.sha,
				},
			);
			log(`${options.branch} updated to ${refUpdate.data.object.sha}`);
		};
	}

	private buildTree(files: File[]) {
		const root: TreeNode = { name: "", children: [] };
		for (const file of files) {
			const pathParts = file.name.split(/[\/\\]/).filter((p) => !!p);
			let parent = root;
			for (let i = 0; i < pathParts.length - 1; i++) {
				let newParent = parent.children.find(
					(c) => c.name === pathParts[i],
				);
				if (!newParent) {
					newParent = { name: pathParts[i], children: [] };
					parent.children.push(newParent);
				}
				parent = newParent;
			}

			parent.children.push({
				name: pathParts[pathParts.length - 1],
				children: [],
				file,
			});
		}

		console.log("tree", root);
		return root;
	}
}
