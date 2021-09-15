import { Answers } from "@iobroker/create-adapter";

// client -> server
export interface GenerateAdapterMessage {
	answers: Answers;
	secrets: Record<string, string>;
}

export type ReleaseType = "major" | "minor" | "patch";
export interface CreateReleaseMessage {
	owner: string;
	repo: string;
	type: ReleaseType;
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
