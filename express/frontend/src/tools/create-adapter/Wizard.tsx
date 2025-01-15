import { questionGroups } from "@iobroker/create-adapter/build/core";
import KeyboardArrowLeft from "@mui/icons-material/KeyboardArrowLeft";
import KeyboardArrowRight from "@mui/icons-material/KeyboardArrowRight";
import {
	Button,
	Divider,
	Grid2,
	Hidden,
	MobileStepper,
	Paper,
	Step,
	StepButton,
	Stepper,
} from "@mui/material";
import axios from "axios";
import { useEffect, useState } from "react";
import { useUserContext } from "../../contexts/UserContext";
import { GitHubComm } from "../../lib/gitHub";
import { getApiUrl } from "../../lib/utils";
import {
	STORAGE_KEY_ANSWERS_AFTER_LOGIN,
	STORAGE_KEY_CURRENT_ANSWERS,
} from "./common";
import { AnswersWithoutTarget, GenerateStep } from "./GenerateStep";
import { Group } from "./Group";

const initialAnswers: Record<string, any> = {
	expert: "yes",
	cli: false,
};

export function Wizard() {
	const { user } = useUserContext();

	const [version, setVersion] = useState("");
	const [activeStep, setActiveStep] = useState(0);
	const [hasError, setHasError] = useState(false);
	const [answers, setAnswers] = useState({ ...initialAnswers });
	const [startGenerator, setStartGenerator] = useState<boolean>();

	useEffect(() => {
		const currentAnswers = window.localStorage.getItem(
			STORAGE_KEY_CURRENT_ANSWERS,
		);
		if (currentAnswers) {
			console.log("Loaded current answers", currentAnswers);
			setAnswers(JSON.parse(currentAnswers));
		}
	}, []);

	useEffect(() => {
		console.log("Storing current answers", answers);
		window.localStorage.setItem(
			STORAGE_KEY_CURRENT_ANSWERS,
			JSON.stringify(answers),
		);
	}, [answers]);

	useEffect(() => {
		if (!user) {
			return;
		}

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
				console.log("Loaded answers after login", loadedAnswers);
				window.localStorage.removeItem(STORAGE_KEY_ANSWERS_AFTER_LOGIN);
				window.localStorage.setItem(
					STORAGE_KEY_CURRENT_ANSWERS,
					loadedAnswers,
				);
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
			const { data } = await axios.get<any>(
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

	const hasPrevious = activeStep !== 0;
	const handlePrevious = () => setActiveStep(activeStep - 1);
	const hasNext = activeStep !== questionGroups.length && !hasError;
	const handleNext = () => setActiveStep(activeStep + 1);

	return (
		<Paper sx={{ padding: 2 }}>
			<Hidden xsDown>
				<Stepper
					activeStep={activeStep}
					sx={{ padding: 1 }}
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
				<Divider
					sx={{
						marginTop: 1,
						marginBottom: 1,
					}}
				/>
			</Hidden>
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
					answers={answers as AnswersWithoutTarget}
					user={user}
					startGenerator={startGenerator}
					onRequestLogin={handleLoginRequest}
				/>
			)}
			<Hidden xsDown>
				<Grid2 container spacing={1}>
					<Grid2>
						<Button
							variant="contained"
							disabled={!hasPrevious}
							onClick={handlePrevious}
						>
							Previous
						</Button>
					</Grid2>
					<Grid2>
						<Button
							color="primary"
							variant="contained"
							disabled={!hasNext}
							onClick={handleNext}
						>
							Next
						</Button>
					</Grid2>
					<Grid2
						sx={{
							marginLeft: "auto",
							color: "#ccc",
						}}
					>
						<br />
						{version}
					</Grid2>
				</Grid2>
			</Hidden>
			<Hidden smUp>
				<MobileStepper
					steps={questionGroups.length + 1}
					position="static"
					variant="text"
					activeStep={activeStep}
					backButton={
						<Button
							size="small"
							onClick={handlePrevious}
							disabled={!hasPrevious}
						>
							<KeyboardArrowLeft />
							Back
						</Button>
					}
					nextButton={
						<Button
							size="small"
							onClick={handleNext}
							disabled={!hasNext}
						>
							Next
							<KeyboardArrowRight />
						</Button>
					}
				/>
			</Hidden>
		</Paper>
	);
}
