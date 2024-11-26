import { useCookies } from "react-cookie";
import { Outlet, Link as RouterLink, useLocation } from "react-router-dom";
import {
	Divider,
	ListItem,
	ListItemIcon,
	ListItemText,
	Tooltip,
} from "@mui/material";
import { AdapterCheckIcon, CreateAdapterIcon, DashboardIcon } from "./Icons";
import { useUserContext } from "../contexts/UserContext";
import { useAdapterList } from "../contexts/AdapterListContext";
import { notEmpty } from "../lib/utils";
import { useDrawerContext } from "../contexts/DrawerContext";

function NavListItem({
	link,
	title,
	icon,
}: {
	link: string;
	title: string;
	icon: JSX.Element;
}) {
	const { isOpen } = useDrawerContext();
	const location = useLocation();
	const selected =
		link.length > 1
			? !!location.pathname && location.pathname.startsWith(link)
			: location.pathname === link;
	return (
		<ListItem
			component={RouterLink}
			to={link}
			sx={{
				color: "inherit",
				backgroundColor: (theme) =>
					selected ? theme.palette.action.selected : undefined,
				"&:hover": (theme) => ({
					backgroundColor: theme.palette.action.hover,
				}),
			}}
		>
			<ListItemIcon sx={{ alignItems: "center" }}>
				<Tooltip title={isOpen ? "" : title}>{icon}</Tooltip>
			</ListItemIcon>
			<ListItemText primary={title} />
		</ListItem>
	);
}

export function NavList() {
	const { user } = useUserContext();
	const { own, watched } = useAdapterList();
	return (
		<>
			<NavListItem link="/" title="Dashboard" icon={<DashboardIcon />} />

			<Divider />

			<NavListItem
				link="/create-adapter"
				title="Adapter Creator"
				icon={<CreateAdapterIcon />}
			/>
			{user && (
				<NavListItem
					link="/adapter-check"
					title="Adapter Check"
					icon={<AdapterCheckIcon />}
				/>
			)}

			<Divider />

			{own
				.map((a) => a.info)
				.filter(notEmpty)
				.map(({ name, extIcon }) => (
					<NavListItem
						key={name}
						link={`/adapter/${name}`}
						title={`ioBroker.${name}`}
						icon={
							<img
								src={extIcon}
								style={{ height: "2em" }}
								alt={name}
							/>
						}
					/>
				))}

			{!!own.length && <Divider />}

			{watched
				.map((a) => a.info)
				.filter(notEmpty)
				.map(({ name, extIcon }) => (
					<NavListItem
						key={name}
						link={`/adapter/${name}`}
						title={`ioBroker.${name}`}
						icon={
							<img
								src={extIcon}
								style={{ height: "2em" }}
								alt={name}
							/>
						}
					/>
				))}

			{!!watched.length && <Divider />}
		</>
	);
}
