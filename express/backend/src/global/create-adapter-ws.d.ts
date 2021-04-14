import { Answers } from "@iobroker/create-adapter";

export type GeneratorTarget = "github" | "zip";

// client -> server
export interface StartMessage {
	answers: Answers;
	target: GeneratorTarget;
}
export type ClientServerMessage = StartMessage;

// server -> client
export interface LogMessage {
	log: string;
	isError: boolean;
}
export interface ResultMessage {
	result: boolean;
	resultLink?: string;
}
export type ServerClientMessage = LogMessage | ResultMessage;
