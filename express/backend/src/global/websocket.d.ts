import { Answers } from "@iobroker/create-adapter";

// client -> server
export type GeneratorTarget = "github" | "zip";
export interface GenarateAdapterMessage {
	answers: Answers;
	target: GeneratorTarget;
}
export type ClientServerMessage = GenarateAdapterMessage;

// server -> client
export interface LogMessage {
	log: string;
	isError: boolean;
}
export interface GenerateAdapterResultMessage {
	result: boolean;
	resultLink?: string;
}
export type ServerClientMessage = LogMessage | GenerateAdapterResultMessage;
