import {
	QuestionGroup,
	questionGroups,
	testCondition,
} from "@iobroker/create-adapter/build/src/lib/core/questions";
import Button from "@material-ui/core/Button";
import Divider from "@material-ui/core/Divider";
import Grid from "@material-ui/core/Grid";
import Paper from "@material-ui/core/Paper";
import Step from "@material-ui/core/Step";
import StepLabel from "@material-ui/core/StepLabel";
import Stepper from "@material-ui/core/Stepper";
import { makeStyles } from "@material-ui/core/styles";
import Typography from "@material-ui/core/Typography";
import React, { useEffect } from "react";
import { GitHubComm, User } from "../../lib/gitHub";
import { getQuestionName } from "./common";
import { AnswerChanged, QuestionView } from "./QuestionView";

const useStyles = makeStyles((theme) => ({
	root: {
		padding: theme.spacing(2),
	},
	stepper: {
		padding: theme.spacing(1),
	},
	divider: {
		marginTop: theme.spacing(1),
		marginBottom: theme.spacing(1),
	},
}));

const initialAnswers: Record<string, any> = {
	expert: "yes",
	cli: false,
};

interface GroupProps {
	group: QuestionGroup;
	answers: Record<string, any>;
	onAnswerChanged: (name: string, value: any, error: boolean) => void;
}

export const Group = (props: GroupProps): JSX.Element => {
	const { group, answers, onAnswerChanged } = props;

	const [errors, setErrors] = React.useState<boolean[]>([]);

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
		<Grid container spacing={1}>
			<Grid item xs={12}>
				<Typography variant="h6">{group.headline}</Typography>
			</Grid>
			{group.questions.map((question, i) => {
				if (
					!testCondition(question.condition, answers) ||
					(question.expert && answers.expert === "no")
				) {
					return null;
				}
				return (
					<Grid item xs={12}>
						<QuestionView
							key={i}
							question={question}
							answers={answers}
							onAnswerChanged={(value, error) =>
								handleAnswerChanged(value, error, i)
							}
						/>
					</Grid>
				);
			})}
		</Grid>
	);
};

export interface CreateAdapterProps {
	user?: User;
}

export default function CreateAdapter(props: CreateAdapterProps) {
	const { user } = props;
	const classes = useStyles();

	const [activeStep, setActiveStep] = React.useState(0);
	const [hasError, setHasError] = React.useState(false);
	const [processing, setProcessing] = React.useState(false);
	const [answers, _setAnswers] = React.useState({ ...initialAnswers });

	const setAnswers = (
		newAnswers: React.SetStateAction<Record<string, any>>,
	): void => {
		console.log(newAnswers);
		_setAnswers(newAnswers);
	};

	useEffect(() => {
		if (user) {
			const author: Record<string, string> = {
				authorName: user.name || user.login,
				authorGithub: user.login,
			};
			if (user.email) {
				author.authorEmail = user.email;
				setAnswers((a) => ({ ...a, ...author }));
			} else {
				setAnswers((a) => ({ ...a, ...author }));
				const getEmails = async () => {
					const emails = await GitHubComm.forToken(
						user.token,
					).getEmails();
					const email =
						emails.find((e) => e.visibility === "public") ||
						emails.find((e) => e.primary);
					if (email) {
						setAnswers((a) => ({ ...a, authorEmail: email.email }));
					}
				};
				getEmails().catch(console.error);
			}
		}
	}, [user]);
	return (
		<Paper className={classes.root}>
			<Stepper activeStep={activeStep} className={classes.stepper}>
				{questionGroups.map((group) => (
					<Step key={group.title}>
						<StepLabel>{group.title}</StepLabel>
					</Step>
				))}
				<Step>
					<StepLabel>Generate</StepLabel>
				</Step>
			</Stepper>
			<Divider className={classes.divider} />
			{questionGroups[activeStep] ? (
				<Group
					key={questionGroups[activeStep].title}
					group={questionGroups[activeStep]}
					answers={answers}
					onAnswerChanged={(name, value, error) => {
						if (
							JSON.stringify(answers[name]) !==
							JSON.stringify(value)
						) {
							answers[name] = value;
							setAnswers({ ...answers });
						}
						setHasError(error);
					}}
				/>
			) : (
				<Grid>TODO: implement</Grid>
			)}
			<Grid container spacing={1}>
				<Grid item>
					<Button
						variant="contained"
						disabled={activeStep === 0 || processing}
						onClick={() => setActiveStep(activeStep - 1)}
					>
						Previous
					</Button>
				</Grid>
				<Grid item>
					<Button
						color="primary"
						variant="contained"
						disabled={
							activeStep === questionGroups.length ||
							processing ||
							hasError
						}
						onClick={() => setActiveStep(activeStep + 1)}
					>
						Next
					</Button>
				</Grid>
			</Grid>
		</Paper>
	);
}
