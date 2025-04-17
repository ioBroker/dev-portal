import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import {
	Accordion,
	AccordionDetails,
	AccordionSummary,
	Typography,
} from "@mui/material";
import { useEffect, useState } from "react";
import { CardButton } from "../../components/CardButton";
import { CardGrid } from "../../components/dashboard/CardGrid";
import {
	DashboardCard,
	DashboardCardProps,
} from "../../components/dashboard/DashboardCard";
import { useAdapterContext } from "../../contexts/AdapterContext";
import {
	getAllRatings,
	getCurrentVersions,
	getLatest,
} from "../../lib/ioBroker";

const CATEGORY_GENERAL = "General";
const CATEGORY_FEATURES = "Features";
const EMPTY_CARDS = {
	[CATEGORY_GENERAL]: [],
	[CATEGORY_FEATURES]: [],
};

export function AdapterDashboard() {
	const { name } = useAdapterContext();
	const [categories, setCategories] =
		useState<Record<string, DashboardCardProps[]>>(EMPTY_CARDS);
	const [collapsed, setCollapsed] = useState<boolean[]>([]);

	useEffect(() => {
		setCategories(EMPTY_CARDS);
		const loadCards = async () => {
			const [latest, ratings, versions] = await Promise.all([
				getLatest(),
				getAllRatings(),
				getCurrentVersions(name).catch(() => null),
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
			if (latest[name] || versions?.total) {
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
				[CATEGORY_GENERAL]: generalCards,
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
				const cards = categories[title];
				return (
					<Accordion
						key={title}
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
							<CardGrid>
								{cards.map((card) => (
									<DashboardCard key={card.title} {...card} />
								))}
							</CardGrid>
						</AccordionDetails>
					</Accordion>
				);
			})}
		</>
	);
}
