import AppBar from "@material-ui/core/AppBar";
import Button from "@material-ui/core/Button";
import CssBaseline from "@material-ui/core/CssBaseline";
import Divider from "@material-ui/core/Divider";
import Drawer from "@material-ui/core/Drawer";
import IconButton from "@material-ui/core/IconButton";
import { makeStyles } from "@material-ui/core/styles";
import Toolbar from "@material-ui/core/Toolbar";
import Typography from "@material-ui/core/Typography";
import ChevronLeftIcon from "@material-ui/icons/ChevronLeft";
import MenuIcon from "@material-ui/icons/Menu";
import GitHubIcon from "@material-ui/icons/GitHub";
import clsx from "clsx";
import React, { useEffect } from "react";
import { BrowserRouter as Router, Route, Switch } from "react-router-dom";
import { useCookies } from "react-cookie";
import UserMenu from "./components/UserMenu";
import Container from "@material-ui/core/Container";
import Dashboard from "./components/Dashboard";
import { GitHubComm, User } from "./lib/gitHub";

const drawerWidth = 240;
export const gitHubTokenCookie = "gh-token";

const useStyles = makeStyles((theme) => ({
	root: {
		display: "flex",
	},
	toolbar: {
		paddingRight: 24, // keep right padding when drawer closed
	},
	toolbarIcon: {
		display: "flex",
		alignItems: "center",
		justifyContent: "flex-end",
		padding: "0 8px",
		...theme.mixins.toolbar,
	},
	appBar: {
		zIndex: theme.zIndex.drawer + 1,
		transition: theme.transitions.create(["width", "margin"], {
			easing: theme.transitions.easing.sharp,
			duration: theme.transitions.duration.leavingScreen,
		}),
	},
	appBarShift: {
		marginLeft: drawerWidth,
		width: `calc(100% - ${drawerWidth}px)`,
		transition: theme.transitions.create(["width", "margin"], {
			easing: theme.transitions.easing.sharp,
			duration: theme.transitions.duration.enteringScreen,
		}),
	},
	menuButton: {
		marginRight: 36,
	},
	menuButtonHidden: {
		display: "none",
	},
	title: {
		flexGrow: 1,
	},
	drawerPaper: {
		position: "relative",
		whiteSpace: "nowrap",
		width: drawerWidth,
		transition: theme.transitions.create("width", {
			easing: theme.transitions.easing.sharp,
			duration: theme.transitions.duration.enteringScreen,
		}),
	},
	drawerPaperClose: {
		overflowX: "hidden",
		transition: theme.transitions.create("width", {
			easing: theme.transitions.easing.sharp,
			duration: theme.transitions.duration.leavingScreen,
		}),
		width: theme.spacing(7),
		[theme.breakpoints.up("sm")]: {
			width: theme.spacing(9),
		},
	},
	appBarSpacer: theme.mixins.toolbar,
	content: {
		flexGrow: 1,
		height: "100vh",
		overflow: "auto",
	},
	container: {
		paddingTop: theme.spacing(4),
		paddingBottom: theme.spacing(4),
	},
	paper: {
		padding: theme.spacing(2),
		display: "flex",
		overflow: "auto",
		flexDirection: "column",
	},
	fixedHeight: {
		height: 240,
	},
}));

export function handleLogin() {
	const url = encodeURIComponent(window.location.pathname);
	if (window.location.port === "3000") {
		alert(
			"Login is not supported in local development mode, please use docker-compose to test login",
		);
	} else {
		window.location.href = `/login?redirect=${url}`;
	}
}

export default function App() {
	const classes = useStyles();

	const [cookies /*setCookie*/, , removeCookie] = useCookies([
		gitHubTokenCookie,
	]);
	const [open, setOpen] = React.useState(false);
	const [user, setUser] = React.useState<User | undefined>();
	const [hasLogin, setHasLogin] = React.useState(false);

	const handleDrawerOpen = () => {
		setOpen(true);
	};

	const handleDrawerClose = () => {
		setOpen(false);
	};

	const handleLogout = () => {
		setHasLogin(true);
		removeCookie(gitHubTokenCookie);
		delete cookies[gitHubTokenCookie];
		setUser(undefined);
	};

	useEffect(() => {
		const ghToken = cookies[gitHubTokenCookie];
		if (ghToken && !user && !hasLogin) {
			const fetchUser = async () => {
				try {
					const gitHub = GitHubComm.forToken(ghToken as string);
					setUser(await gitHub.getUser());
					return;
				} catch (e) {
					console.error(e);
				}
				// remove the token if we didn't get the user info
				removeCookie(gitHubTokenCookie);
				setUser(undefined);
				setHasLogin(true);
			};
			fetchUser();
		} else if (!user) {
			setHasLogin(true);
		}
	}, [cookies, user, hasLogin, removeCookie]);

	const fixedHeightPaper = clsx(classes.paper, classes.fixedHeight);

	return (
		<Router>
			<div className={classes.root}>
				<CssBaseline />

				<AppBar
					position="absolute"
					className={clsx(
						classes.appBar,
						open && classes.appBarShift,
					)}
				>
					<Toolbar className={classes.toolbar}>
						<IconButton
							edge="start"
							color="inherit"
							aria-label="open drawer"
							onClick={handleDrawerOpen}
							className={clsx(
								classes.menuButton,
								open && classes.menuButtonHidden,
							)}
						>
							<MenuIcon />
						</IconButton>
						<Typography
							component="h1"
							variant="h6"
							color="inherit"
							noWrap
							className={classes.title}
						>
							ioBroker Developer Portal
						</Typography>
						{/* 
						<IconButton color="inherit">
							<Badge badgeContent={4} color="secondary">
								<NotificationsIcon />
							</Badge>
						</IconButton>*/}
						{hasLogin && !user && (
							<Button
								color="inherit"
								startIcon={<GitHubIcon />}
								onClick={handleLogin}
							>
								Login
							</Button>
						)}
						{user && (
							<UserMenu user={user} onLogout={handleLogout} />
						)}
					</Toolbar>
				</AppBar>
				<Drawer
					variant="permanent"
					classes={{
						paper: clsx(
							classes.drawerPaper,
							!open && classes.drawerPaperClose,
						),
					}}
					open={open}
				>
					<div className={classes.toolbarIcon}>
						<IconButton onClick={handleDrawerClose}>
							<ChevronLeftIcon />
						</IconButton>
					</div>
					<Divider />
				</Drawer>
				<main className={classes.content}>
					<div className={classes.appBarSpacer} />
					<Container maxWidth="lg" className={classes.container}>
						<Switch>
							{/* 
          <Route path="/about">
            <About />
          </Route>
          <Route path="/users">
            <Users />
          </Route>*/}
							<Route path="/">
								<Dashboard user={user} />
							</Route>
						</Switch>
					</Container>
				</main>
			</div>
		</Router>
	);
}
