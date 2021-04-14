import {
	Answers,
	createFiles as createAdapterFiles,
	File,
	writeFiles,
} from "@iobroker/create-adapter";
import { request as GitHubRequest } from "@octokit/request";
import archiver from "archiver";
import { execSync } from "child_process";
import { createHash } from "crypto";
import { Router } from "express";
import { existsSync, readFile } from "fs-extra";
import { IncomingMessage } from "http";
import mkdirp from "mkdirp";
import { Socket } from "net";
import path from "path";
import rimraf from "rimraf";
import { promisify } from "util";
import { v4 } from "uuid";
import WebSocket from "ws";
import { COOKIE_NAME_CREATOR_TOKEN } from "../auth";
import { delay, env } from "../common";
import {
	ClientServerMessage,
	ServerClientMessage,
	StartMessage,
} from "../global/create-adapter-ws";

const rimrafAsync = promisify(rimraf);

const tempDir = path.join(
	path.resolve(env.TEMP_DIR || ".temp/"),
	"create-adapter",
);

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

router.get("/create-adapter/:id/:hash/:filename", async (req, res) => {
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

	/*
  const files = [__dirname + '/files/上午.png', __dirname + '/files/中午.json'];

  for(const i in files) {
    archive.file(files[i], { name: path.basename(files[i]) });
  }*/

	archive.finalize();
});

const wss = new WebSocket.Server({ noServer: true });
wss.on("error", (e) => console.error("CreateAdapter:WSS", e));
wss.on("connection", handleConnection);

console.log(`Clearing ${tempDir}`);
rimraf(tempDir, (e) => e && console.error(e));

export function handleUpgrade(
	request: IncomingMessage,
	socket: Socket,
	head: Buffer,
) {
	wss.handleUpgrade(request, socket, head, (client) =>
		wss.emit("connection", client, request),
	);
}

function handleConnection(client: WebSocket, request: IncomingMessage) {
	const cookies = (request.headers.cookie || "")
		.split(";")
		.map((c) => c.trim().split("=", 2))
		.reduce<Record<string, string>>(
			(all, [name, value]) => ({ ...all, [name]: value }),
			{},
		);
	const id = v4();
	const root = path.join(tempDir, id);
	const creators = new Map<string, Promise<File[]>>();

	const sendMsg = (msg: ServerClientMessage) =>
		client.send(JSON.stringify(msg));

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
		sendMsg({ log: msg, isError: !!isError });
	};
	client.on("message", (data) => {
		console.log("message", data);
		try {
			if (typeof data !== "string") {
				throw new Error(`Wrong data type: ${data}`);
			}
			const message = JSON.parse(data) as ClientServerMessage;
			if (message.answers) {
				handleStartMessage(message)
					.catch((e) => {
						log(`${e}`, true);
						sendMsg({ result: false });
					})
					.catch((e) => console.error("CreateAdapter:Client", id, e));
			}
		} catch (error) {
			log(`Bad message received: ${error}`, true);
			client.close();
		}
	});

	const handleStartMessage = async (message: StartMessage) => {
		const { target, answers } = message;
		if (target === "github" && !cookies[COOKIE_NAME_CREATOR_TOKEN]) {
			throw new Error("GitHub token cookie is missing");
		}

		const hash = createHash("sha256")
			.update(JSON.stringify(answers))
			.digest("hex");
		const outputDir = path.join(root, hash);
		if (!creators.has(hash)) {
			creators.set(hash, createFiles(answers, outputDir));
		}
		const files = await creators.get(hash)!;

		if (target === "github") {
			const resultLink = await uploadToGitHub(answers, files, outputDir);
			sendMsg({ result: true, resultLink });
		} else if (target === "zip") {
			sendMsg({
				result: true,
				resultLink: `/create-adapter/${id}/${hash}/ioBroker.${answers.adapterName}.zip`,
			});
		} else {
			throw new Error(`Target ${target} not supported`);
		}
	};

	const createFiles = async (answers: Answers, outputDir: string) => {
		console.log(
			"CreateAdapter:Client",
			id,
			"Creating adapter for",
			answers,
		);
		await mkdirp(outputDir);
		await rimrafAsync(outputDir);

		log(`Generating all adapter files...`);
		const files = await createAdapterFiles(answers);
		log(`Generated ${files.length} files`);

		await writeFiles(outputDir, files);
		log(`Files written to disk`);
		return files;
	};

	const uploadToGitHub = async (
		answers: Answers,
		files: File[],
		outputDir: string,
	) => {
		const requestWithAuth = GitHubRequest.defaults({
			headers: {
				authorization: `token ${cookies[COOKIE_NAME_CREATOR_TOKEN]}`,
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
				log(`${error} - retrying...`);
				await delay(500);
			}
		}

		const treeRoot = buildTree(files);

		// delay a bit because GH sometimes takes forever to create the Git repo
		// this is a good moment to generate the package-lock.json file
		log(`Generating package-lock.json`);
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
			log(`Couldn't generate package-lock: ${error}`, true);
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

					log(`Uploaded "${node.file.name}" as ${uploaded.data.sha}`);
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
		return createdRepo.data.html_url;
	};
}

function buildTree(files: File[]) {
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
