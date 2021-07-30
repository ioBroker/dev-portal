import { Answers } from "@iobroker/create-adapter";

// client -> server
export type GeneratorTarget = "github" | "zip";
export interface GenarateAdapterMessage {
	answers: Answers;
	target: GeneratorTarget;
}
export interface ToLatestMessage {
	owner: string;
	repo: string;
	type: string;
}
export type ClientServerMessage = GenarateAdapterMessage | ToLatestMessage;

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
