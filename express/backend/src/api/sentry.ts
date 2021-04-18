import axios from "axios";
import { Router } from "express";
import NodeCache from "node-cache";
import { env } from "../common";
import { ProjectInfo } from "../global/sentry";

const uc = encodeURIComponent;

const router = Router();

const cache = new NodeCache({
	stdTTL: 600,
	checkperiod: 100,
	useClones: true,
});
const PROJECTS_KEY = "projects";

const request = axios.create({
	baseURL:
		"https://sentry.iobroker.net/api/0/organizations/iobroker/projects/",
	headers: { Authorization: `Bearer ${env.SENTRY_AUTH_TOKEN}` },
});

router.get("/api/sentry/projects/", async function (req, res) {
	let projects = cache.get<ProjectInfo[]>(PROJECTS_KEY);
	if (projects) {
		res.send(projects);
		return;
	}
	try {
		projects = [];
		let url: string | undefined = "";
		while (url !== undefined) {
			const { data, headers } = await request.get(url);
			projects.push(
				...data
					.map((p: { id: string; slug: string }) => {
						const match = p.slug.match(/^iobroker-(.+?)(-react)?$/);
						if (match) {
							return {
								id: p.id,
								slug: p.slug,
								adapterName: match[1],
							};
						}
					})
					.filter((p: ProjectInfo) => !!p),
			);
			url = getNextLink(headers.link);
		}
		cache.set(PROJECTS_KEY, projects);
		res.send(projects);
	} catch (error) {
		console.error(error);
		res.status(500).send(error.message || error);
	}
});

router.get("/api/sentry/stats/", async function (req, res) {
	try {
		const { statsPeriod, query } = req.query;
		const period = uc((statsPeriod as string) || "24h");
		const { data } = await request.get(
			`?statsPeriod=${period}&query=${uc(query as string)}`,
		);
		res.send(data);
	} catch (error) {
		console.error(error);
		res.status(500).send(error.message || error);
	}
});

function getNextLink(linkHeader: string) {
	try {
		const links = linkHeader.split(", ").map((link) =>
			link.split("; ").reduce((prev, curr) => {
				const match = curr.match(/^<(.+)>$/);
				if (match) {
					return { ...prev, url: match[1] };
				}
				const parts = curr.split("=");
				return {
					...prev,
					[parts[0]]: parts[1].replace(/"/g, ""),
				};
			}, {} as { url: string; rel: string; results: string; cursor: string }),
		);
		const nextLink = links.find((link) => link.rel === "next");
		if (!nextLink) {
			return;
		}
		const hasResults = nextLink.results === "true";
		return hasResults ? nextLink.url : undefined;
	} catch (error) {
		console.error(error);
	}
}

export default router;
