import axios from "axios";
import { Router } from "express";

const router = Router();

const request = axios.create({
	baseURL: "https://registry.npmjs.org/",
});

router.get<any>("/api/npm/*splat", async function (req, res) {
	try {
		const userPath = Array.isArray(req.params.splat)
			? req.params.splat.join("/")
			: req.params.splat;
		const result = await request.get(`/${userPath}`);
		res.send(result.data);
	} catch (error: any) {
		console.error(error);
		res.status(500).send(error.message || error);
	}
});

export default router;
