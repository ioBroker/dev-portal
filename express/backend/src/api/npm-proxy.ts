import axios from "axios";
import { Router } from "express";

const router = Router();

const request = axios.create({
	baseURL: "https://registry.npmjs.org/",
});

router.get("/api/npm/*", async function (req, res) {
	try {
		const result = await request.get(`/${req.params["0"]}`);
		res.send(result.data);
	} catch (error) {
		console.error(error);
		res.status(500).send(error.message || error);
	}
});

export default router;
