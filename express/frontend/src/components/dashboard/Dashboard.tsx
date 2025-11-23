import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import {
	Accordion,
	AccordionDetails,
	AccordionSummary,
	Typography,
} from "@mui/material";
import axios from "axios";
import { useEffect, useState } from "react";
import {
	AdapterContextProvider,
	AdapterRepoName,
} from "../../contexts/AdapterContext";
import {
	AdapterListType,
	AddableAdapterListType,
	useAdapterList,
} from "../../contexts/AdapterListContext";
import { useUserContext } from "../../contexts/UserContext";
import { CardButton } from "../CardButton";
import { AdapterCard } from "./AdapterCard";
import { AddWatchDialog } from "./AddWatchDialog";
import { CardGrid } from "./CardGrid";
import { DashboardCard, DashboardCardProps } from "./DashboardCard";
import { LoginButton } from "./LoginButton";
import { getToolsCards, resourcesCards, socialCards } from "./static";

const FAVORITE_ADAPTERS_CATEGORY = "Favorite Adapters";
const MY_ADAPTERS_CATEGORY = "My Adapters";
const WATCHED_ADAPTERS_CATEGORY = "Watched Adapters";
const COLLAPSED_CATEGORIES_KEY = "dashboard.categories.collapsed";

type DashboardCategories = Record<
	string,
	DashboardCardProps[] | AdapterRepoName[]
>;

export function Dashboard() {
	const { user, login } = useUserContext();
	const { adapters, add } = useAdapterList();

	const [categories, setCategories] = useState<DashboardCategories>(() => ({
		Resources: resourcesCards,
		Social: socialCards,
		Tools: getToolsCards(!!user),
		[MY_ADAPTERS_CATEGORY]: [],
	}));
	const [collapsed, setCollapsed] = useState<ReadonlyArray<string>>(() => {
		try {
			return JSON.parse(
				localStorage.getItem(COLLAPSED_CATEGORIES_KEY) || "[]",
			);
		} catch (e) {
			console.error(e);
			return [];
		}
	});
	const [openAddDialog, setOpenAddDialog] =
		useState<AddableAdapterListType>();

	const handleAccordion = (title: string) => {
		setCollapsed((old) => {
			const result = [...old];
			const index = result.indexOf(title);
			if (index < 0) {
				result.push(title);
			} else {
				result.splice(index, 1);
			}
			localStorage.setItem(
				COLLAPSED_CATEGORIES_KEY,
				JSON.stringify(result),
			);
			return result;
		});
	};

	useEffect(() => {
		if (!user) {
			const loginCard = {
				title: "Login Required",
				img: "images/github.png",
				text: `You must be logged in to see your adapters.`,
				buttons: [<LoginButton />],
			};

			setCategories({
				Resources: resourcesCards,
				Social: socialCards,
				Tools: getToolsCards(false),
				[MY_ADAPTERS_CATEGORY]: [loginCard],
			});
			return;
		}

		const categories: DashboardCategories = {
			Resources: resourcesCards,
			Social: socialCards,
			Tools: getToolsCards(true),
		};
		if (adapters.favorites?.length) {
			categories[FAVORITE_ADAPTERS_CATEGORY] = adapters.favorites;
		}
		if (adapters.own?.length) {
			categories[MY_ADAPTERS_CATEGORY] = adapters.own;
		} else {
			categories[MY_ADAPTERS_CATEGORY] = [
				{
					title: "No adapters found",
					img: "images/adapter-creator.png",
					text: "You can create your first ioBroker adapter by answering questions in the Adapter Creator.",
					buttons: [
						<CardButton
							text="Open Adapter Creator"
							to="/create-adapter"
						/>,
					],
				},
			];
		}
		categories[WATCHED_ADAPTERS_CATEGORY] = adapters.watches ?? [];
		setCategories(categories);
	}, [user, adapters, login]);

	useEffect(() => {
		const updateBlogCard = async () => {
			const url =
				"https://raw.githubusercontent.com/ioBroker/ioBroker.docs/master/engine/front-end/public/blog.json";
			const { data: blog } = await axios.get<{
				pages: Record<
					string,
					{
						date: string;
						title: Record<string, string>;
						logo: string;
					}
				>;
			}>(url);
			const page = Object.values(blog.pages)[0];
			if (!page) {
				return;
			}
			setCategories((old) => {
				const res = old.Resources;
				const index = res.findIndex(
					(c) => "title" in c && c.title === "Blog",
				);
				if (index < 0) {
					return old;
				}
				const card = res[index];
				if (!("text" in card) || card.text.includes("\n")) {
					return old;
				}
				const date = page.date.replace(
					/^(\d{4})\.(\d{2})\.(\d{2})$/,
					"$3.$2.$1",
				);
				res[index] = {
					...card,
					img: `https://www.iobroker.net/${page.logo}`,
					text: `${card.text}\n \nLatest entry: ${page.title.en} (${date})`,
				};

				return { ...old };
			});
		};
		updateBlogCard().catch(console.error);
	}, []);

	return (
		<>
			{user && (
				<AddWatchDialog
					type={openAddDialog}
					open={!!openAddDialog}
					onClose={(repo) => {
						setOpenAddDialog(undefined);
						if (repo && openAddDialog) {
							add(openAddDialog, repo);
						}
					}}
				/>
			)}
			{Object.keys(categories).map((title) => {
				const cards = categories[title];
				const type: AdapterListType =
					title === WATCHED_ADAPTERS_CATEGORY
						? "watches"
						: title === FAVORITE_ADAPTERS_CATEGORY
							? "favorites"
							: "own";
				return (
					<Accordion
						key={title}
						expanded={!collapsed.includes(title)}
						onChange={() => handleAccordion(title)}
					>
						<AccordionSummary
							expandIcon={<ExpandMoreIcon />}
							aria-controls={`${title}-content`}
							id={`${title}-header`}
						>
							<Typography variant="h5">{title}</Typography>
						</AccordionSummary>
						<AccordionDetails>
							<CardGrid
								onAdd={
									type === "watches"
										? () => setOpenAddDialog(type)
										: undefined
								}
							>
								{cards.map((card) =>
									"title" in card ? (
										<DashboardCard
											key={card.title}
											{...card}
										/>
									) : (
										<AdapterContextProvider
											repoName={card}
											key={card.name}
										>
											<AdapterCard type={type} />
										</AdapterContextProvider>
									),
								)}
							</CardGrid>
						</AccordionDetails>
					</Accordion>
				);
			})}
		</>
	);
}
