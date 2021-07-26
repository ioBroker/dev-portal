import Accordion from "@material-ui/core/Accordion";
import AccordionSummary from "@material-ui/core/AccordionSummary";
import { useState } from "react";
import { CardGrid, CardGridProps } from "../../components/CardGrid";
import { DashboardCardProps } from "../../components/DashboardCard";
import ExpandMoreIcon from "@material-ui/icons/ExpandMore";
import Typography from "@material-ui/core/Typography";
import AccordionDetails from "@material-ui/core/AccordionDetails";
import { useParams, useRouteMatch } from "react-router-dom";
import { useEffect } from "react";
import { CardButton } from "../../components/CardButton";
import { AdapterInfos, getLatest } from "../../lib/ioBroker";

const CATEGORY_GENERAL = "General";
const CATEGORY_FEATURES = "Features";
const EMPTY_CARDS = {
	[CATEGORY_GENERAL]: { cards: [] },
	[CATEGORY_FEATURES]: { cards: [] },
};

export default function AdapterDashboard(props: { infos: AdapterInfos }) {
	const { infos } = props;
	const { name } = useParams<{ name: string }>();
	const { url } = useRouteMatch();
	const [categories, setCategories] = useState<Record<string, CardGridProps>>(
		EMPTY_CARDS,
	);
	const [collapsed, setCollapsed] = useState<boolean[]>([]);

	useEffect(() => {
		setCategories(EMPTY_CARDS);
		const loadCards = async () => {
			const latest = await getLatest();
			const generalCards: DashboardCardProps[] = [];
			generalCards.push({
				title: "Releases",
				text: "Manage releases of your adapter.",
				badges: {
					"npm version": `https://img.shields.io/npm/v/iobroker.${name}.svg`,
					"Stable version": `https://iobroker.live/badges/${name}-stable.svg`,
				},
				to: `${url}/releases`,
				buttons: [<CardButton text="Manage" to={`${url}/releases`} />],
			});
			if (latest[name]) {
				generalCards.push({
					title: "Statistics",
					text:
						"Learn more about the usage and distribution of your adapter.",
					to: `${url}/statistics`,
					buttons: [
						<CardButton text="Show" to={`${url}/statistics`} />,
					],
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
	}, [name, url]);

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
