import { Question } from "@iobroker/create-adapter/build/core";

export function getQuestionName(question: Question): string {
	return typeof question.name === "function"
		? question.name()
		: question.name;
}

export function getQuestionMessage(question: Question): string {
	return typeof question.message === "function"
		? (question.message() as string) // TODO: should we support promises here?!
		: question.message;
}
