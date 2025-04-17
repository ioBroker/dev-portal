import {
	CircularProgress,
	Divider,
	ListItem,
	ListItemIcon,
	ListItemText,
	Tooltip,
} from "@mui/material";
import { Link as RouterLink, useLocation } from "react-router-dom";
import {
	AdapterContextProvider,
	AdapterRepoName,
	useAdapterContext,
} from "../contexts/AdapterContext";
import { useAdapterList } from "../contexts/AdapterListContext";
import { useDrawerContext } from "../contexts/DrawerContext";
import { useUserContext } from "../contexts/UserContext";
import { AdapterCheckIcon, CreateAdapterIcon, DashboardIcon } from "./Icons";

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
	const {
		adapters: { own, watches, favorites },
	} = useAdapterList();
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

			<AdapterNavListItems adapters={favorites} />
			<AdapterNavListItems adapters={own} />
			<AdapterNavListItems adapters={watches} />
		</>
	);
}

function AdapterNavListItems({ adapters }: { adapters?: AdapterRepoName[] }) {
	return (
		<>
			{adapters?.map((repo) => (
				<AdapterContextProvider key={repo.name} repoName={repo}>
					<AdapterNavListItem />
				</AdapterContextProvider>
			))}
			{!!adapters?.length && <Divider />}
		</>
	);
}

function AdapterNavListItem() {
	const { name, repoName, info } = useAdapterContext();
	return (
		<NavListItem
			link={`/adapter/${repoName.owner}/${repoName.name}`}
			title={`ioBroker.${name}`}
			icon={
				info ? (
					<img
						src={info.extIcon}
						style={{ height: "2em" }}
						alt={name}
					/>
				) : (
					<CircularProgress size="2em" />
				)
			}
		/>
	);
}
