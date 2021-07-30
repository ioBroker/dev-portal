import {
	Answers,
	createFiles as createAdapterFiles,
	File,
	writeFiles,
} from "@iobroker/create-adapter";
import createAdapter from "@iobroker/create-adapter/package.json";
import { request } from "@octokit/request";
import archiver from "archiver";
import { execSync } from "child_process";
import { createHash } from "crypto";
import { Router } from "express";
import { existsSync, readFile } from "fs-extra";
import mkdirp from "mkdirp";
import path from "path";
import rimraf from "rimraf";
import { promisify } from "util";
import { COOKIE_NAME_CREATOR_TOKEN } from "../auth";
import { delay } from "../common";
import { GenarateAdapterMessage } from "../global/websocket";
import {
	tempDir,
	WebSocketConnectionHandler,
} from "./websocket-connection-handler";

const rimrafAsync = promisify(rimraf);

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

export const router = Router();

router.get("/api/create-adapter/version", async (_req, res) => {
	res.send({
		name: createAdapter.name,
		version: createAdapter.version,
		integrity: createAdapter._integrity,
	});
});

router.get("/api/create-adapter/:id/:hash/:filename", async (req, res) => {
	if (
		!req.params.id.match(/^[0-9a-f\-]+$/) ||
		!req.params.hash.match(/^[0-9a-f]+$/)
	) {
		res.sendStatus(400);
		return;
	}
	const baseDir = path.join(tempDir, req.params.id, req.params.hash);
	if (!existsSync(baseDir)) {
		res.sendStatus(404);
		return;
	}
	const archive = archiver("zip");

	archive.on("error", function (err) {
		res.status(500).send({ error: err.message });
	});

	//on stream closed we can end the request
	archive.on("end", function () {
		console.log("Archive wrote %d bytes", archive.pointer());
	});

	//set the archive name
	res.attachment(req.params.filename);

	//this is the streaming magic
	archive.pipe(res);

	archive.directory(baseDir, false);

	archive.finalize();
});

export class CreateAdapterConnectionHandler extends WebSocketConnectionHandler<GenarateAdapterMessage> {
	private readonly creators = new Map<string, Promise<File[]>>();

	protected async handleMessage(
		message: GenarateAdapterMessage,
	): Promise<void> {
		const { target, answers } = message;
		if (target === "github" && !this.cookies[COOKIE_NAME_CREATOR_TOKEN]) {
			throw new Error("GitHub token cookie is missing");
		}

		const hash = createHash("sha256")
			.update(JSON.stringify(answers))
			.digest("hex");
		const outputDir = path.join(this.rootDir, hash);
		if (!this.creators.has(hash)) {
			this.creators.set(hash, this.createFiles(answers, outputDir));
		}
		const files = await this.creators.get(hash)!;

		if (target === "github") {
			const resultLink = await this.uploadToGitHub(
				answers,
				files,
				outputDir,
			);
			this.sendMsg({ result: true, resultLink });
		} else if (target === "zip") {
			this.sendMsg({
				result: true,
				resultLink: `/api/create-adapter/${this.id}/${hash}/ioBroker.${answers.adapterName}.zip`,
			});
		} else {
			throw new Error(`Target ${target} not supported`);
		}
	}

	protected sendFailureMessage(e: any): void {
		this.sendMsg({ result: false });
	}

	private async createFiles(answers: Answers, outputDir: string) {
		this.logLocal("Creating adapter for", answers);
		await mkdirp(outputDir);
		await rimrafAsync(outputDir);

		this.log(`Generating all adapter files...`);
		const files = await createAdapterFiles(answers);
		this.log(`Generated ${files.length} files`);

		await writeFiles(outputDir, files);
		this.log(`Files written to disk`);
		return files;
	}

	private async uploadToGitHub(
		answers: Answers,
		files: File[],
		outputDir: string,
	) {
		const requestWithAuth = request.defaults({
			headers: {
				authorization: `token ${this.cookies[COOKIE_NAME_CREATOR_TOKEN]}`,
			},
		});

		this.log(`Connecting to GitHub...`);
		const user = await requestWithAuth("GET /user");
		this.log(`Connected to GitHub as ${user.data.login}`);

		const createdRepo = await requestWithAuth("POST /user/repos", {
			name: `ioBroker.${answers.adapterName}`,
			description: answers.description,
			has_projects: false,
			has_wiki: false,
			auto_init: true,
			allow_squash_merge: false,
			allow_rebase_merge: false,
		});
		this.log(`Created repository ${createdRepo.data.full_name}`);

		const options = {
			owner: createdRepo.data.owner?.login || user.data.login,
			repo: createdRepo.data.name,
			branch: createdRepo.data.default_branch,
		};

		let lastCommit;
		for (let i = 4; ; i--) {
			//         ^-- exit condition is in the catch block below
			try {
				lastCommit = await requestWithAuth(
					"GET /repos/{owner}/{repo}/branches/{branch}",
					options,
				);
				break;
			} catch (error) {
				if (i === 0) {
					throw error;
				}
				this.log(`${error} - retrying...`);
				await delay(500);
			}
		}

		const treeRoot = this.buildTree(files);

		// delay a bit because GH sometimes takes forever to create the Git repo
		// this is a good moment to generate the package-lock.json file
		this.log(`Generating package-lock.json`);
		try {
			execSync("npm install --package-lock-only", {
				cwd: outputDir,
				stdio: "inherit",
			});
			treeRoot.children.push({
				name: "package-lock.json",
				children: [],
				file: {
					name: "package-lock.json",
					content: "",
					noReformat: true,
				},
			});
		} catch (error) {
			this.log(`Couldn't generate package-lock: ${error}`, true);
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
					const filePath = path.join(outputDir, node.file.name);
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

					this.log(
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
			this.log(`Created directory "${parent.name}" as ${tree.data.sha}`);
			return tree.data.sha;
		};

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
		this.log(`Committed ${commit.data.sha}`);

		const refUpdate = await requestWithAuth(
			"PATCH /repos/{owner}/{repo}/git/refs/{ref}",
			{
				...options,
				ref: `heads/${options.branch}`,
				sha: commit.data.sha,
			},
		);
		this.log(`${options.branch} updated to ${refUpdate.data.object.sha}`);
		return createdRepo.data.html_url;
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

		this.logLocal("tree", root);
		return root;
	}
}
