import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import "./index.css";
import reportWebVitals from "./reportWebVitals";
import { router } from "./router";
import { GIT_BRANCH, GIT_COMMIT } from "./version";
import { createTheme, ThemeProvider } from "@mui/material";

console.log(`ioBroker developer portal ${GIT_COMMIT}@${GIT_BRANCH}`);

const theme = createTheme({
	palette: {
		primary: {
			main: "#3f51b5",
		},
	},
});

const root = ReactDOM.createRoot(
	document.getElementById("root") as HTMLElement,
);
root.render(
	<React.StrictMode>
		<ThemeProvider theme={theme}>
			<RouterProvider router={router} />
		</ThemeProvider>
	</React.StrictMode>,
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
