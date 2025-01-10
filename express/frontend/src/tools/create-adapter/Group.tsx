import {
	QuestionGroup,
	testCondition,
} from "@iobroker/create-adapter/build/core";
import { Grid2, Typography } from "@mui/material";
import { useState } from "react";
import { QuestionView } from "./QuestionView";
import { getQuestionName } from "./common";

export interface GroupProps {
	group: QuestionGroup;
	answers: Record<string, any>;
	onAnswerChanged: (name: string, value: any, error: boolean) => void;
}

export function Group({ group, answers, onAnswerChanged }: GroupProps) {
	const [errors, setErrors] = useState<boolean[]>([]);

	const handleAnswerChanged = (value: any, error: boolean, index: number) => {
		errors[index] = error;
		//console.log(getQuestionName(q), errors);
		setErrors(errors);
		onAnswerChanged(
			getQuestionName(group.questions[index]),
			value,
			errors.some((e) => e),
		);
	};

	return (
		<Grid2 container spacing={1}>
			<Grid2 size={12}>
				<Typography variant="h6">{group.headline}</Typography>
			</Grid2>
			{group.questions.map((question, i) => {
				if (
					!testCondition(question.condition, answers) ||
					(question.expert && answers.expert === "no")
				) {
					return null;
				}
				return (
					<Grid2 key={i} size={12}>
						<QuestionView
							question={question}
							answers={answers}
							onAnswerChanged={(value, error) =>
								handleAnswerChanged(value, error, i)
							}
						/>
					</Grid2>
				);
			})}
		</Grid2>
	);
}
