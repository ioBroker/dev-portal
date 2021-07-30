import { Answers } from "@iobroker/create-adapter";

// client -> server
export type GeneratorTarget = "github" | "zip";
export interface GenerateAdapterMessage {
	answers: Answers;
	target: GeneratorTarget;
}
export interface ToLatestMessage {
	owner: string;
	repo: string;
	type: string;
}
export interface ToStableMessage {
	owner: string;
	repo: string;
	version: string;
}
export type ClientServerMessage =
	| GenerateAdapterMessage
	| ToLatestMessage
	| ToStableMessage;

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
