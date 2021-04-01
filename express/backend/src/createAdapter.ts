import { Answers, createFiles, writeFiles } from "@iobroker/create-adapter";
import { IncomingMessage } from "http";
import mkdirp from "mkdirp";
import { Socket } from "net";
import path from "path";
import rimraf from "rimraf";
import { promisify } from "util";
import { v4 } from "uuid";
import WebSocket from "ws";
import { env } from "./common";

const rimrafAsync = promisify(rimraf);

const tempDir = path.join(
	path.resolve(env.TEMP_DIR || ".temp/"),
	"create-adapter",
);

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
		console.log("Client connected", id, request.headers);
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
			client.send(JSON.stringify({ log: msg, isError }));
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
					createAdapter(message.answers as Answers)
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

		const createAdapter = async (answers: Answers) => {
			console.log(
				"CreateAdapter:Client",
				id,
				"Creating adapter for",
				answers,
			);
			await mkdirp(root);
			await rimrafAsync(root);
			const files = await createFiles(answers);
			log(`Generated ${files.length} files`);
			await writeFiles(root, files);
			log(`Files written to disk`);

			client.send(JSON.stringify({ result: true }));
		};
	}
}
