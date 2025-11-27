import {
	Answers,
	createFiles as createAdapterFiles,
	File,
	writeFiles,
} from "@iobroker/create-adapter";
import createAdapter from "@iobroker/create-adapter/package.json";
import { request } from "@octokit/request";
import archiver from "archiver";
import { createHash } from "crypto";
import { Router } from "express";
import { existsSync } from "fs-extra";
import sodium from "libsodium-wrappers";
import mkdirp from "mkdirp";
import path from "path";
import rimraf from "rimraf";
import { promisify } from "util";
import { COOKIE_NAME_CREATOR_TOKEN } from "../auth";
import { delay } from "../common";
import { GenerateAdapterMessage } from "../global/websocket";
import {
	tempDir,
	WebSocketConnectionHandler,
} from "./websocket-connection-handler";

const rimrafAsync = promisify(rimraf);
const uc = encodeURIComponent;

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

export class CreateAdapterConnectionHandler extends WebSocketConnectionHandler<GenerateAdapterMessage> {
	private readonly creators = new Map<string, Promise<File[]>>();

	protected async handleMessage(
		message: GenerateAdapterMessage,
	): Promise<void> {
		const { answers, secrets } = message;
		const { target } = answers;
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
				secrets,
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
		secrets: Record<string, string>,
		files: File[],
		outputDir: string,
	) {
		const token = this.cookies[COOKIE_NAME_CREATOR_TOKEN];
		const requestWithAuth = request.defaults({
			headers: {
				authorization: `token ${token}`,
			},
		});

		this.log(`Connecting to GitHub...`);
		const { data: user } = await requestWithAuth("GET /user");
		this.log(`Connected to GitHub as ${user.login}`);

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
			owner: createdRepo.data.owner?.login || user.login,
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

		const exec = (cmd: string) => {
			return this.spawnAsync(cmd, outputDir);
		};

		// delay a bit because GH sometimes takes forever to create the Git repo
		// this is a good moment to generate the package-lock.json file
		this.log(`Generating package-lock.json`);
		try {
			await exec("npm install --package-lock-only");
		} catch (error) {
			this.log(`Couldn't generate package-lock: ${error}`, true);
		}

		this.log(`Connecting to repository on GitHub`);
		const baseUrl = `https://${uc(user.login!)}:${uc(token)}@github.com/`;
		await exec(`git init .`);
		await exec(
			`git remote add origin "${baseUrl}${options.owner}/${options.repo}.git"`,
		);
		await exec(`git config user.email "noreply@iobroker.net"`);
		await exec(`git config user.name "ioBroker Adapter Creator"`);
		await exec(`git add .`);
		await exec(`git commit -m "Initial commit by adapter creator"`);

		this.log(`Pushing initial commit to GitHub`);
		await exec(`git push --force origin master:${options.branch}`);

		if (secrets && Object.keys(secrets).length > 0) {
			this.log(`Storing ${Object.keys(secrets).length} secret(s)...`);

			const { data: keys } = await requestWithAuth(
				"GET /repos/{owner}/{repo}/actions/secrets/public-key",
				{
					...options,
				},
			);

			const binKey = sodium.from_base64(
				keys.key,
				sodium.base64_variants.ORIGINAL,
			);
			for (const [secretName, value] of Object.entries(secrets)) {
				const binSec = sodium.from_string(value);
				const encryptedBytes = sodium.crypto_box_seal(binSec, binKey);
				const encrypted = sodium.to_base64(
					encryptedBytes,
					sodium.base64_variants.ORIGINAL,
				);

				await requestWithAuth(
					"PUT /repos/{owner}/{repo}/actions/secrets/{secret_name}",
					{
						...options,
						secret_name: secretName,
						encrypted_value: encrypted,
						key_id: keys.key_id,
					},
				);

				this.log(`Added ${secretName}`);
			}
		}

		return createdRepo.data.html_url;
	}
}
