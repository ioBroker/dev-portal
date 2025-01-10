import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import {
	Accordion,
	AccordionDetails,
	AccordionSummary,
	Typography,
} from "@mui/material";
import { useEffect, useState } from "react";
import { CardButton } from "../../components/CardButton";
import { CardGrid, CardGridProps } from "../../components/dashboard/CardGrid";
import { DashboardCardProps } from "../../components/dashboard/DashboardCard";
import { useAdapter } from "../../contexts/AdapterContext";
import { getAllRatings, getLatest } from "../../lib/ioBroker";

const CATEGORY_GENERAL = "General";
const CATEGORY_FEATURES = "Features";
const EMPTY_CARDS = {
	[CATEGORY_GENERAL]: { cards: [] },
	[CATEGORY_FEATURES]: { cards: [] },
};

export function AdapterDashboard() {
	const { name } = useAdapter();
	const [categories, setCategories] =
		useState<Record<string, CardGridProps>>(EMPTY_CARDS);
	const [collapsed, setCollapsed] = useState<boolean[]>([]);

	useEffect(() => {
		setCategories(EMPTY_CARDS);
		const loadCards = async () => {
			const [latest, ratings] = await Promise.all([
				getLatest(),
				getAllRatings(),
			]);
			const generalCards: DashboardCardProps[] = [];
			generalCards.push({
				title: "Releases",
				text: "Manage releases of your adapter.",
				badges: {
					"npm version": `https://img.shields.io/npm/v/iobroker.${name}.svg`,
					"Stable version": `https://iobroker.live/badges/${name}-stable.svg`,
				},
				to: "releases",
				buttons: [<CardButton text="Manage" to="releases" />],
			});
			if (latest[name]) {
				generalCards.push({
					title: "Statistics",
					text: "Learn more about the usage and distribution of your adapter.",
					to: "statistics",
					buttons: [<CardButton text="Show" to="statistics" />],
				});
			}
			if (ratings[name]) {
				generalCards.push({
					title: "Ratings",
					text: "Have a look at how users are rating your adapter.",
					rating: ratings[name].rating,
					to: "ratings",
					buttons: [<CardButton text="Show" to="ratings" />],
				});
			}
			//const featureCards: DashboardCardProps[] = [];
			// features: discovery, sentry, weblate, create-adapter upgrades/changes, adapter-check?, adapter transfer (to community)
			setCategories({
				[CATEGORY_GENERAL]: { cards: generalCards },
				//[CATEGORY_FEATURES]: { cards: featureCards },
			});
		};
		loadCards().catch(console.error);
	}, [name]);

	const handleAccordion = (index: number) => {
		setCollapsed((old) => {
			const result = [...old];
			result[index] = !result[index];
			return result;
		});
	};

	return (
		<>
			{Object.keys(categories).map((title, index) => {
				const grid = categories[title];
				return (
					<Accordion
						key={index}
						expanded={!collapsed[index]}
						onChange={() => handleAccordion(index)}
					>
						<AccordionSummary
							expandIcon={<ExpandMoreIcon />}
							aria-controls={`${title}-content`}
							id={`${title}-header`}
						>
							<Typography variant="h5">{title}</Typography>
						</AccordionSummary>
						<AccordionDetails>
							<CardGrid {...grid} />
						</AccordionDetails>
					</Accordion>
				);
			})}
		</>
	);
}
