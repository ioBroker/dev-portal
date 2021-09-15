import { IncomingMessage } from "http";
import path from "path";
import { env } from "process";
import rimraf from "rimraf";
import { v4 } from "uuid";
import WebSocket from "ws";
import { ClientServerMessage, ServerClientMessage } from "../global/websocket";

export const tempDir = path.join(
	path.resolve(env.TEMP_DIR || ".temp/"),
	"ws-apps",
);

console.log(`Clearing ${tempDir}`);
rimraf(tempDir, (e) => e && console.error(e));

export abstract class WebSocketConnectionHandler<
	T extends ClientServerMessage
> {
	protected readonly cookies: Readonly<Record<string, string>>;
	protected readonly id = v4();
	protected readonly rootDir: string;

	constructor(
		protected readonly client: WebSocket,
		protected readonly request: IncomingMessage,
	) {
		this.cookies = (request.headers.cookie || "")
			.split(";")
			.map((c) => c.trim().split("=", 2))
			.reduce<Record<string, string>>(
				(all, [name, value]) => ({ ...all, [name]: value }),
				{},
			);
		this.rootDir = path.join(tempDir, this.id);

		this.logLocal("Client connected");

		client.on("error", (e) => this.logLocal("Client error", e));
		client.on("close", (code, reason) => {
			this.logLocal("Closed", code, reason);
			rimraf(this.rootDir, (e) => {
				e && this.logLocal("Rimraf error", e);
			});
		});
		client.on("message", (data) => {
			this.logLocal("Received message", data);
			try {
				if (typeof data !== "string") {
					throw new Error(`Wrong data type: ${data}`);
				}
				const message = JSON.parse(data) as ClientServerMessage;
				this.handleMessage(message as T)
					.catch((e) => {
						this.log(`${e}`, true);
						this.sendFailureMessage(e);
					})
					.catch((e) =>
						this.logLocal("Fatal message handling exception", e),
					);
			} catch (error) {
				this.log(`Bad message received: ${error}`, true);
				this.sendFailureMessage(error);
				client.close();
			}
		});
	}

	protected abstract handleMessage(message: T): Promise<void>;

	protected abstract sendFailureMessage(e: any): void;

	protected sendMsg(msg: ServerClientMessage) {
		this.client.send(JSON.stringify(msg));
	}

	protected log(msg: string, isError?: boolean) {
		this.logLocal(isError ? "ERROR ->" : "INFO  ->", msg);
		this.sendMsg({ log: msg, isError: !!isError });
	}

	protected logLocal(message?: any, ...optionalParams: any[]) {
		console.log(this.constructor.name, this.id, message, ...optionalParams);
	}
}
