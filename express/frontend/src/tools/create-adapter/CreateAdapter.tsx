import {
	Answers,
	QuestionGroup,
	questionGroups,
	testCondition,
} from "@iobroker/create-adapter/build/core";
import Button from "@material-ui/core/Button";
import Divider from "@material-ui/core/Divider";
import Grid from "@material-ui/core/Grid";
import Paper from "@material-ui/core/Paper";
import Step from "@material-ui/core/Step";
import StepButton from "@material-ui/core/StepButton";
import Stepper from "@material-ui/core/Stepper";
import { makeStyles } from "@material-ui/core/styles";
import Typography from "@material-ui/core/Typography";
import React, { useEffect } from "react";
import { Route, Switch, useHistory, useRouteMatch } from "react-router-dom";
import { CardGrid } from "../../components/CardGrid";
import { CardButton } from "../../components/CardButton";
import { DashboardCardProps } from "../../components/DashboardCard";
import { GitHubComm, User } from "../../lib/gitHub";
import { getQuestionName } from "./common";
import { GenerateStep } from "./GenerateStep";
import { QuestionView } from "./QuestionView";
import axios from "axios";
import { getApiUrl } from "../../lib/utils";

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
	version: {
		marginLeft: "auto",
		color: "#ccc",
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
					<Grid item xs={12} key={i}>
						<QuestionView
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

const STORAGE_KEY_ANSWERS_AFTER_LOGIN = "creator-answers-after-login";
const STORAGE_KEY_CURRENT_ANSWERS = "creator-current-answers";

export interface WizardProps {
	user?: User;
}

function Wizard(props: WizardProps) {
	const { user } = props;
	const classes = useStyles();

	const [version, setVersion] = React.useState("");
	const [activeStep, setActiveStep] = React.useState(0);
	const [hasError, setHasError] = React.useState(false);
	const [answers, setAnswers] = React.useState({ ...initialAnswers });
	const [startGenerator, setStartGenerator] = React.useState<boolean>();

	useEffect(() => {
		const currentAnswers = window.localStorage.getItem(
			STORAGE_KEY_CURRENT_ANSWERS,
		);
		if (currentAnswers) {
			setAnswers(JSON.parse(currentAnswers));
		}
	}, []);

	useEffect(() => {
		console.log(answers);
		window.localStorage.setItem(
			STORAGE_KEY_CURRENT_ANSWERS,
			JSON.stringify(answers),
		);
	}, [answers]);

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

	useEffect(() => {
		if (startGenerator) {
			return;
		}
		try {
			const loadedAnswers = window.localStorage.getItem(
				STORAGE_KEY_ANSWERS_AFTER_LOGIN,
			);
			if (loadedAnswers) {
				window.localStorage.removeItem(STORAGE_KEY_ANSWERS_AFTER_LOGIN);
				setAnswers(JSON.parse(loadedAnswers));
				setStartGenerator(true);
				setActiveStep(questionGroups.length);
				setTimeout(() => setStartGenerator(false), 500);
			}
		} catch (e) {
			console.error(e);
		}
	}, [startGenerator]);

	useEffect(() => {
		if (version) {
			return;
		}
		const getVersion = async () => {
			const { data } = await axios.get(
				getApiUrl("create-adapter/version"),
			);
			setVersion(`${data.name} ${data.version}`);
		};
		getVersion().catch(console.error);
	}, [version]);

	const handleLoginRequest = () => {
		window.localStorage.setItem(
			STORAGE_KEY_ANSWERS_AFTER_LOGIN,
			JSON.stringify(answers),
		);

		const url = encodeURIComponent(window.location.pathname);
		window.location.href = `/login?redirect=${url}&scope=repo`;
	};

	return (
		<Paper className={classes.root}>
			<Stepper
				activeStep={activeStep}
				className={classes.stepper}
				alternativeLabel
			>
				{questionGroups.map((group, index) => (
					<Step key={group.title}>
						<StepButton onClick={() => setActiveStep(index)}>
							{group.title}
						</StepButton>
					</Step>
				))}
				<Step>
					<StepButton
						onClick={() => setActiveStep(questionGroups.length)}
					>
						Generate
					</StepButton>
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
				<GenerateStep
					answers={answers as Answers}
					user={user}
					startGenerator={startGenerator}
					onRequestLogin={handleLoginRequest}
				/>
			)}
			<Grid container spacing={1}>
				<Grid item>
					<Button
						variant="contained"
						disabled={activeStep === 0}
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
							activeStep === questionGroups.length || hasError
						}
						onClick={() => setActiveStep(activeStep + 1)}
					>
						Next
					</Button>
				</Grid>
				<Grid item className={classes.version}>
					<br />
					{version}
				</Grid>
			</Grid>
		</Paper>
	);
}

export interface CreateAdapterProps {
	user?: User;
}

export default function CreateAdapter(props: CreateAdapterProps) {
	const { user } = props;

	const { path, url } = useRouteMatch();

	const history = useHistory();

	const onClickWizard = () => {
		window.localStorage.removeItem(STORAGE_KEY_CURRENT_ANSWERS);
		history.push(`${url}/wizard`);
	};

	const [cards, setCards] = React.useState<DashboardCardProps[]>([
		{
			title: "Create New Adapter Online",
			img: "images/adapter-creator.png",
			text:
				"This web tool allows you to generate adapter code and either download it as a zip file or upload it to a new GitHub repository.",
			onClick: onClickWizard,
			buttons: [
				<CardButton text="Let's get started" onClick={onClickWizard} />,
			],
		},
		{
			title: "Local Command Line",
			img: "images/command-line.svg",
			text:
				"You can create a new adapter locally by running\n'npx @iobroker/create-adapter'\nin your terminal or cmd.",
			url: "https://github.com/ioBroker/create-adapter#readme",
			buttons: [
				<CardButton
					text="Learn more"
					url="https://github.com/ioBroker/create-adapter#readme"
				/>,
			],
		},
	]);

	useEffect(() => {
		const removeContinueCard = () => {
			setCards((c) => {
				if (c.length === 3) {
					c.shift();
				}
				return [...c];
			});
		};
		const currentAnswers = window.localStorage.getItem(
			STORAGE_KEY_CURRENT_ANSWERS,
		);
		if (currentAnswers) {
			const answers = JSON.parse(currentAnswers) as Answers;
			if (answers.adapterName) {
				const icon = answers.icon?.data;
				const handleClose = () => {
					window.localStorage.removeItem(STORAGE_KEY_CURRENT_ANSWERS);
					removeContinueCard();
				};
				const card = {
					title: `Continue with ioBroker.${answers.adapterName}`,
					img:
						typeof icon === "string"
							? icon
							: "images/adapter-creator.png",
					squareImg: typeof icon === "string",
					text: `Continue the online wizard for ioBroker.${answers.adapterName} with all your answers from the last time you used the creator.`,
					to: `${url}/wizard`,
					buttons: [
						<CardButton text="Continue" to={`${url}/wizard`} />,
					],
					onClose: handleClose,
				};
				setCards((c) => {
					if (c.length === 3) {
						c.shift();
					}
					return [card, ...c];
				});
			} else {
				removeContinueCard();
			}
		}
	}, [url, history.location]);

	return (
		<Switch>
			<Route exact path={path}>
				<CardGrid cards={cards} />
			</Route>
			<Route path={`${path}/wizard`}>
				<Wizard user={user} />
			</Route>
		</Switch>
	);
}
