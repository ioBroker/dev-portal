import { Question } from "@iobroker/create-adapter/build/core";

export const STORAGE_KEY_ANSWERS_AFTER_LOGIN = "creator-answers-after-login";
export const STORAGE_KEY_CURRENT_ANSWERS = "creator-current-answers";

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
