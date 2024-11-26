import { useEffect, useRef, useState } from "react";
import { WebSocketHook } from "react-use-websocket/dist/lib/types";
import {
	LogMessage,
	ServerClientMessage,
} from "../../../backend/src/global/websocket";

type LogItem = { color: string; text: string };

export type LogHandler = (text: string, color: string) => void;

export function isLogMessage(obj: unknown): obj is LogMessage {
	return Object.prototype.hasOwnProperty.call(obj, "log");
}

export interface WebsocketLogProps {
	webSocket: WebSocketHook;
	onMessageReceived?: (
		msg: ServerClientMessage,
		appendLog: LogHandler,
	) => void;
}

export function WebSocketLog(props: WebsocketLogProps) {
	const { webSocket, onMessageReceived } = props;

	const [log, setLog] = useState<LogItem[]>([]);

	const { lastJsonMessage } = webSocket;

	const logEndRef = useRef<any>();

	useEffect(() => {
		if (!lastJsonMessage) {
			return;
		}
		console.log("msg", lastJsonMessage);
		const appendLog = (text: string, color: string) =>
			setLog((old) => {
				if (old.length > 0 && old[old.length - 1].text === text) {
					// prevent duplicate log messages
					return old;
				}
				return [...old, { text, color }];
			});
		try {
			const msg = lastJsonMessage as ServerClientMessage;
			if (isLogMessage(msg)) {
				const logMsg = msg;
				appendLog(logMsg.log, logMsg.isError ? "red" : "black");
			}
			if (onMessageReceived) {
				onMessageReceived(msg, appendLog);
			}
		} catch (error) {
			console.error(error);
		}
	}, [lastJsonMessage, onMessageReceived]);

	useEffect(() => {
		logEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [log]);

	return (
		<>
			{log.map((entry, i) => (
				<pre key={i} style={{ color: entry.color, margin: 0 }}>
					{entry.text}
				</pre>
			))}
			<div ref={logEndRef} />
		</>
	);
}
