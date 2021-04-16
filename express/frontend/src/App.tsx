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
import clsx from "clsx";
import React, { useEffect } from "react";
import {
	Link as RouterLink,
	Route,
	Switch,
	useHistory,
	useLocation,
} from "react-router-dom";
import { useCookies } from "react-cookie";
import UserMenu from "./components/UserMenu";
import Container from "@material-ui/core/Container";
import Dashboard from "./components/Dashboard";
import { GitHubComm, User } from "./lib/gitHub";
import AdapterCheck from "./tools/AdapterCheck";
import Link from "@material-ui/core/Link";
import CreateAdapter from "./tools/create-adapter/CreateAdapter";
import ListItem from "@material-ui/core/ListItem";
import ListItemIcon from "@material-ui/core/ListItemIcon";
import ListItemText from "@material-ui/core/ListItemText";
import Tooltip from "@material-ui/core/Tooltip";
import Hidden from "@material-ui/core/Hidden";
import {
	AdapterCheckIcon,
	CreateAdapterIcon,
	DashboardIcon,
	GitHubIcon,
} from "./components/Icons";
import AdapterDetails from "./tools/AdapterDetails";
import { getMyAdapterInfos, getWatchedAdapterInfos } from "./lib/ioBroker";

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
		/*[theme.breakpoints.up("sm")]: {
			width: theme.spacing(7),
		},*/
	},
	navIcon: {
		height: "2em",
	},
	appBarSpacer: theme.mixins.toolbar,
	content: {
		flexGrow: 1,
		height: "100vh",
		overflowY: "scroll",
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

interface NaviListItemProps {
	link: string;
	title: string;
	icon: JSX.Element;
	open: boolean;
}

function NaviListItem(props: NaviListItemProps) {
	const { link, title, icon, open } = props;
	const history = useHistory();
	const location = useLocation();
	const navigate = (link: string) => history.push(link);
	return (
		<ListItem
			button
			onClick={() => navigate(link)}
			selected={location.pathname === link}
		>
			<ListItemIcon>
				<Tooltip title={open ? "" : title}>{icon}</Tooltip>
			</ListItemIcon>
			<ListItemText primary={title} />
		</ListItem>
	);
}

export function handleLogin() {
	if (window.location.port === "3000") {
		alert(
			"Login is not supported in local development mode, please use docker-compose to test login",
		);
	} else {
		const url = encodeURIComponent(window.location.pathname);
		window.location.href = `/login?redirect=${url}`;
	}
}

interface AdapterLink {
	name: string;
	icon?: string;
}

export default function App() {
	const classes = useStyles();

	const [cookies /*setCookie*/, , removeCookie] = useCookies([
		gitHubTokenCookie,
	]);
	const [open, setOpen] = React.useState(false);
	const [user, setUser] = React.useState<User>();
	const [isLoggedIn, setIsLoggedIn] = React.useState<boolean>();
	const [myAdapters, setMyAdapters] = React.useState<AdapterLink[]>();
	const [watchedAdapters, setWatchedAdapters] = React.useState<
		AdapterLink[]
	>();

	const handleDrawerOpen = () => {
		setOpen(true);
	};

	const handleDrawerClose = () => {
		setOpen(false);
	};

	const handleLogout = () => {
		setIsLoggedIn(false);
		removeCookie(gitHubTokenCookie);
		delete cookies[gitHubTokenCookie];
		setUser(undefined);
	};

	useEffect(() => {
		const ghToken = cookies[gitHubTokenCookie];
		if (ghToken && !user && isLoggedIn === undefined) {
			const fetchUser = async () => {
				try {
					const gitHub = GitHubComm.forToken(ghToken as string);
					setUser(await gitHub.getUser());
					setIsLoggedIn(true);
					return;
				} catch (e) {
					console.error(e);
				}
				// remove the token if we didn't get the user info
				removeCookie(gitHubTokenCookie);
				setUser(undefined);
				setIsLoggedIn(false);
			};
			fetchUser().catch(console.error);
		} else if (!user) {
			setUser(undefined);
			setIsLoggedIn(false);
			setMyAdapters(undefined);
			setWatchedAdapters(undefined);
		}
	}, [cookies, user, isLoggedIn, removeCookie]);

	useEffect(() => {
		if (!user) {
			return;
		}
		loadAdapters(user).catch(console.error);
	}, [user]);

	const loadAdapters = async (user: User) => {
		const [myAdapterInfos, watchedAdapterInfos] = await Promise.all([
			getMyAdapterInfos(user.token),
			getWatchedAdapterInfos(user.token),
		]);
		const myAdapters = myAdapterInfos
			.filter((i) => i)
			.map(({ info }) => {
				return { name: info?.name!, icon: info?.extIcon };
			});
		const watchedAdapters = watchedAdapterInfos
			.filter((i) => i)
			.map(({ info }) => {
				return { name: info?.name!, icon: info?.extIcon };
			});
		setMyAdapters(myAdapters);
		setWatchedAdapters(watchedAdapters);
	};

	const handleAdapterListChanged = () => {
		if (user) {
			loadAdapters(user).catch(console.error);
		}
	};
	return (
		<div className={classes.root}>
			<CssBaseline />

			<AppBar
				position="absolute"
				className={clsx(classes.appBar, open && classes.appBarShift)}
			>
				<Toolbar className={classes.toolbar}>
					<Hidden xsDown>
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
					</Hidden>
					<Typography
						variant="h6"
						color="inherit"
						noWrap
						className={classes.title}
					>
						<Link component={RouterLink} to="/" color="inherit">
							ioBroker Developer Portal
						</Link>
					</Typography>
					{isLoggedIn === false && (
						<Button
							color="inherit"
							startIcon={<GitHubIcon />}
							onClick={handleLogin}
						>
							Login
						</Button>
					)}
					{user && <UserMenu user={user} onLogout={handleLogout} />}
				</Toolbar>
			</AppBar>
			{isLoggedIn !== undefined && (
				<>
					<Hidden xsDown>
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

							<NaviListItem
								link="/"
								title="Dashboard"
								icon={<DashboardIcon />}
								open={open}
							/>

							<Divider />

							<NaviListItem
								link="/create-adapter"
								title="Adapter Creator"
								icon={<CreateAdapterIcon />}
								open={open}
							/>
							{user && (
								<NaviListItem
									link="/adapter-check"
									title="Adapter Check"
									icon={<AdapterCheckIcon />}
									open={open}
								/>
							)}

							<Divider />

							{myAdapters &&
								myAdapters.map((a) => (
									<NaviListItem
										key={a.name}
										link={`/adapter/${a.name}`}
										title={`ioBroker.${a.name}`}
										icon={
											<img
												src={a.icon}
												className={classes.navIcon}
												alt={a.name}
											/>
										}
										open={open}
									/>
								))}

							{myAdapters && <Divider />}

							{watchedAdapters &&
								watchedAdapters.map((a) => (
									<NaviListItem
										key={a.name}
										link={`/adapter/${a.name}`}
										title={`ioBroker.${a.name}`}
										icon={
											<img
												src={a.icon}
												className={classes.navIcon}
												alt={a.name}
											/>
										}
										open={open}
									/>
								))}

							{watchedAdapters && watchedAdapters.length > 0 && (
								<Divider />
							)}
						</Drawer>
					</Hidden>
					<main className={classes.content}>
						<div className={classes.appBarSpacer} />
						<Container maxWidth="lg" className={classes.container}>
							<Switch>
								<Route path="/create-adapter">
									<CreateAdapter user={user} />
								</Route>
								{user && (
									<Route path="/adapter-check">
										<AdapterCheck user={user} />
									</Route>
								)}
								{user && (
									<Route path="/adapter/:name">
										<AdapterDetails />
									</Route>
								)}
								<Route path="/">
									<Dashboard
										user={user}
										onAdapterListChanged={
											handleAdapterListChanged
										}
									/>
								</Route>
							</Switch>
						</Container>
					</main>
				</>
			)}
		</div>
	);
}
