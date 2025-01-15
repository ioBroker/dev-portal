import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CardButton } from "../../components/CardButton";
import { CardGrid } from "../../components/dashboard/CardGrid";
import { DashboardCardProps } from "../../components/dashboard/DashboardCard";
import { AnswersWithoutTarget, STORAGE_KEY_CURRENT_ANSWERS } from "./common";

export function StartCreateAdapter() {
	const navigate = useNavigate();

	const onClickWizard = () => {
		window.localStorage.removeItem(STORAGE_KEY_CURRENT_ANSWERS);
		navigate(`./wizard`);
	};

	const [cards, setCards] = useState<DashboardCardProps[]>([
		{
			title: "Create New Adapter Online",
			img: "images/adapter-creator.png",
			text: "This web tool allows you to generate adapter code and either download it as a zip file or upload it to a new GitHub repository.",
			onClick: onClickWizard,
			buttons: [
				<CardButton text="Let's get started" onClick={onClickWizard} />,
			],
		},
		{
			title: "Local Command Line",
			img: "images/command-line.svg",
			text: "You can create a new adapter locally by running\n'npx @iobroker/create-adapter'\nin your terminal or cmd.",
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
			const answers = JSON.parse(currentAnswers) as AnswersWithoutTarget;
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
					to: `./wizard`,
					buttons: [<CardButton text="Continue" to={`./wizard`} />],
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
	}, []);

	return <CardGrid cards={cards} />;
}
