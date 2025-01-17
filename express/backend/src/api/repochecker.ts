import { handler } from "@iobroker/repochecker";
import { Router } from "express";

const router = Router();

router.get("/api/repochecker/", async function (req, res) {
	handler(
		{
			queryStringParameters: {
				url: req.query.url as string,
				branch: req.query.branch as string | undefined,
			},
		},
		null,
		(error, result) => {
			if (error || !result) {
				res.status(500).send(error);
			} else {
				res.status(result.statusCode).send(result.body);
			}
		},
	);
});

export default router;
