import axios from "axios";
import { Router } from "express";
import { env } from "../common";

const router = Router();

router.get<any>("/api/weblate/*", async function (req, res) {
	try {
		const result = await axios.get(
			`https://weblate.iobroker.net/api/${req.params["0"]}`,
			{
				headers: {
					accept: "application/json",
					authorization: `Token ${env.WEBLATE_ACCESS_TOKEN}`,
				},
			},
		);
		res.send(result.data);
	} catch (error: any) {
		console.error(error);
		res.status(500).send(error.message || error);
	}
});

export default router;
