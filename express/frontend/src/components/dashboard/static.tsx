import { CardButton } from "../CardButton";
import { DashboardCardProps } from "./DashboardCard";
import { LoginButton } from "./LoginButton";

export const resourcesCards: DashboardCardProps[] = [
	{
		title: "Documentation",
		img: "images/doc.jpg",
		text: "Read all the important information about ioBroker development.",
		url: "https://www.iobroker.net/#en/documentation/dev/adapterdev.md",
		buttons: [
			<CardButton
				text="Open"
				url="https://www.iobroker.net/#en/documentation/dev/adapterdev.md"
			/>,
		],
	},
	{
		title: "Blog",
		img: "images/iobroker.png",
		text: "Get the latest news about ioBroker.",
		url: "https://www.iobroker.net/#en/blog",
		buttons: [
			<CardButton
				text="English"
				url="https://www.iobroker.net/#en/blog"
			/>,
			<CardButton
				text="Deutsch"
				url="https://www.iobroker.net/#de/blog"
			/>,
		],
	},
	{
		title: "Best Practices",
		img: "images/best-practices.jpg",
		text: "Development and coding best practices help you to create a great adapter.",
		url: "https://github.com/ioBroker/ioBroker.repositories#development-and-coding-best-practices",
		buttons: [
			<CardButton
				text="Open"
				url="https://github.com/ioBroker/ioBroker.repositories#development-and-coding-best-practices"
			/>,
		],
	},
	{
		title: "Review Checklist",
		img: "images/code-review.svg",
		squareImg: true,
		text: "When you complete this checklist, your adapter should meet all requirements to be added to the repository.",
		url: "https://github.com/ioBroker/ioBroker.repositories/blob/master/REVIEW_CHECKLIST.md#adapter-review-checklist",
		buttons: [
			<CardButton
				text="Open"
				url="https://github.com/ioBroker/ioBroker.repositories/blob/master/REVIEW_CHECKLIST.md#adapter-review-checklist"
			/>,
		],
	},
	{
		title: "Community Initiatives",
		img: "images/iobroker.png",
		text: "Project management board for ioBroker Community Initiatives",
		url: "https://github.com/ioBroker/Community/projects/1",
		buttons: [
			<CardButton
				text="open"
				url="https://github.com/ioBroker/Community/projects/1"
			/>,
		],
	},
];

export const socialCards: DashboardCardProps[] = [
	{
		title: "Developer Forum",
		img: "images/iobroker.png",
		text: "Get in touch with other developers and discuss features.\nIn other sections of the forum you can request user feedback about your adapter releases.",
		url: "https://forum.iobroker.net/category/8/entwicklung",
		buttons: [
			<CardButton
				text="Open"
				url="https://forum.iobroker.net/category/8/entwicklung"
			/>,
		],
	},
	{
		title: "Telegram (Development Starters)",
		img: "images/telegram.svg",
		squareImg: true,
		text: "This Telegram channel is for everyone who is just starting to develop an ioBroker adapter. Here you can ask questions and help each other.",
		url: "https://t.me/+gsX-e8k4mLtmZjZk",
		buttons: [
			<CardButton
				text="Beitreten (🇩🇪)"
				url="https://t.me/+gsX-e8k4mLtmZjZk"
			/>,
		],
	},
	{
		title: "Telegram (Development)",
		img: "images/telegram.svg",
		squareImg: true,
		text: "In the telegram channels for ioBroker development (in English and German) you can exchange ideas and ask questions.",
		url: "https://t.me/ioBroker_development",
		buttons: [
			<CardButton
				text="Join (🇬🇧)"
				url="https://t.me/+_vpz82YsJgxkMTUy"
			/>,
			<CardButton
				text="Beitreten (🇩🇪)"
				url="https://t.me/ioBroker_development"
			/>,
		],
	},
	{
		title: "Discord",
		img: "images/discord.png",
		squareImg: true,
		text: "Get in touch with other developers and discuss features on our Discord server.",
		url: "https://discord.gg/HwUCwsH",
		buttons: [<CardButton text="Join" url="https://discord.gg/HwUCwsH" />],
	},
];

export function getToolsCards(isLoggedIn: boolean) {
	const tools: DashboardCardProps[] = [
		{
			title: "Adapter Creator",
			img: "images/adapter-creator.png",
			text: "Create a new ioBroker adapter by answering questions. The resulting adapter can be downloaded as a zip file or directly exported to a new GitHub repository.",
			to: "/create-adapter",
			buttons: [<CardButton text="Open" to="/create-adapter" />],
		},
		{
			title: "Adapter Check",
			img: "images/adapter-check.png",
			text:
				"Verify your ioBroker adapter to see if it matches the requirements to be added to the repository." +
				(isLoggedIn ? "" : "\nYou must be logged in to use this tool."),
			to: isLoggedIn ? "/adapter-check" : undefined,
			buttons: [
				isLoggedIn ? (
					<CardButton text="Open" to="/adapter-check" />
				) : (
					<LoginButton />
				),
			],
		},
		{
			title: "Weblate",
			img: "images/weblate.png",
			text: "Manage the translations of your adapters in all available languages.",
			url: "https://weblate.iobroker.net/projects/adapters/",
			buttons: [
				<CardButton
					text="Open"
					url="https://weblate.iobroker.net/projects/adapters/"
				/>,
			],
		},
	];
	if (isLoggedIn) {
		tools.push({
			title: "Adapter Statistics",
			img: "images/statistics.png",
			text: "Get insights into all adapters found on GitHub.",
			to: "/statistics",
			buttons: [<CardButton text="Open" to="/statistics" />],
		});
	}
	return tools;
}
