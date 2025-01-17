import axios from "axios";
import { Router } from "express";
import { env } from "../common";

const WEBLATE_API = "https://weblate.iobroker.net/api/";
const ALLOWED_PATHS = ["/projects/", "/components/", "/languages/"];

const router = Router();

router.get<any>("/api/weblate/*", async function (req, res) {
	try {
		const userPath = `/${req.params["0"]}`;
		if (!ALLOWED_PATHS.some(path => userPath.startsWith(path))) {
			return res.status(400).send("Invalid path");
		}
		const url = new URL(`${WEBLATE_API}${req.params["0"]}`);
		const q = req.query;
		if (q.page) {
			url.searchParams.set("page", q.page as string);
		}

		const result = await axios.get<any>(url.toString(), {
			headers: {
				accept: "application/json",
				authorization: `Token ${env.WEBLATE_ACCESS_TOKEN}`,
			},
		});
		result.data.previous = convertLink(result.data.previous);
		result.data.next = convertLink(result.data.next);
		res.send(result.data);
	} catch (error: any) {
		console.error(error);
		res.status(500).send(error.message || error);
	}
});

function convertLink(link: string | null): string | null {
	if (!link) {
		return null;
	}
	return link.replace(WEBLATE_API, "/api/weblate/");
}

export default router;
