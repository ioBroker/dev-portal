import { Paper } from "@mui/material";
import { useEffect, useState } from "react";
import { CardButton } from "../../components/CardButton";
import {
	AdapterCheckButton,
	AdapterDiscoveryButton,
	AdapterGitHubButton,
	AdapterNpmButton,
	AdapterSentryButton,
	AdapterWeblateButton,
} from "../../components/dashboard/AdapterCard";
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

export function AdapterDashboard() {
	const { name } = useAdapterContext();
	const [cards, setCards] = useState<DashboardCardProps[]>([]);

	useEffect(() => {
		setCards([]);
		const loadCards = async () => {
			const [latest, ratings, versions] = await Promise.all([
				getLatest(),
				getAllRatings(),
				getCurrentVersions(name).catch(() => null),
			]);
			const cards: DashboardCardProps[] = [];
			cards.push({
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
				cards.push({
					title: "Statistics",
					text: "Learn more about the usage and distribution of your adapter.",
					to: "statistics",
					buttons: [<CardButton text="Show" to="statistics" />],
				});
			}
			if (ratings[name]) {
				cards.push({
					title: "Ratings",
					text: "Have a look at how users are rating your adapter.",
					rating: ratings[name].rating,
					to: "ratings",
					buttons: [<CardButton text="Show" to="ratings" />],
				});
			}
			setCards(cards);
		};
		loadCards().catch(console.error);
	}, [name]);

	return (
		<>
			<Paper
				sx={{ p: 1, mb: 2, gap: 1, display: "flex", flexWrap: "wrap" }}
				elevation={7}
			>
				<AdapterGitHubButton />
				<AdapterNpmButton />
				<AdapterCheckButton />
				<AdapterDiscoveryButton />
				<AdapterSentryButton />
				<AdapterWeblateButton />
			</Paper>
			<CardGrid>
				{cards.map((card) => (
					<DashboardCard key={card.title} {...card} />
				))}
			</CardGrid>
		</>
	);
}
