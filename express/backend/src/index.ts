import express from "express";
import path from "path";

const app = express();
const port = 8080;

const publicPath = process.env.HTTP_PUBLIC_PATH
	? path.resolve(process.env.HTTP_PUBLIC_PATH)
	: path.join(__dirname, "public");

app.use(express.static(publicPath));

app.get("/*", function (_req, res) {
	res.sendFile(path.join(publicPath, "index.html"));
});

app.listen(port, () => {
	console.log(`Express app listening at http://localhost:${port}`);
});
