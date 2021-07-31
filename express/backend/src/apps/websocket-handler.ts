import { IncomingMessage } from "http";
import { Socket } from "net";
import WebSocket from "ws";
import { CreateAdapterConnectionHandler } from "./create-adapter";
import { ReleaseConnectionHandler } from "./release-handler";
import { ToLatestConnectionHandler } from "./to-latest";
import { ToStableConnectionHandler } from "./to-stable";

const wss = new WebSocket.Server({ noServer: true });
wss.on("error", (e) => console.error("WSS", e));
wss.on("connection", handleConnection);

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
	if (request.url === "/ws/create-adapter") {
		new CreateAdapterConnectionHandler(client, request);
		return;
	}
	if (request.url === "/ws/release") {
		new ReleaseConnectionHandler(client, request);
		return;
	}
	if (request.url === "/ws/to-latest") {
		new ToLatestConnectionHandler(client, request);
		return;
	}
	if (request.url === "/ws/to-stable") {
		new ToStableConnectionHandler(client, request);
		return;
	}

	console.log("Unknown WS URL:", request.url);
	client.close();
}
