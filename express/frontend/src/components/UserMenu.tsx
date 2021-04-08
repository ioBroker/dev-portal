import ClickAwayListener from "@material-ui/core/ClickAwayListener";
import Grow from "@material-ui/core/Grow";
import IconButton from "@material-ui/core/IconButton";
import ListItemIcon from "@material-ui/core/ListItemIcon";
import MenuItem from "@material-ui/core/MenuItem";
import MenuList from "@material-ui/core/MenuList";
import Paper from "@material-ui/core/Paper";
import Popper from "@material-ui/core/Popper";
import { makeStyles } from "@material-ui/core/styles";
import Tooltip from "@material-ui/core/Tooltip";
import React from "react";
import Typography from "@material-ui/core/Typography";
import { User } from "../lib/gitHub";
import { LogoutIcon } from "./Icons";

const useStyles = makeStyles((theme) => ({
	avatar: {
		width: "1.2em",
		borderRadius: "50%",
	},
}));

interface UserMenuProps {
	user: User;
	onLogout: () => void;
}

export default function UserMenu(props: UserMenuProps) {
	const { user, onLogout } = props;

	const classes = useStyles();

	const [open, setOpen] = React.useState(false);
	const anchorRef = React.useRef<any>();

	const handleToggle = () => {
		setOpen((prevOpen) => !prevOpen);
	};

	const handleClose = (event: any) => {
		if (anchorRef.current && anchorRef.current?.contains(event.target)) {
			return;
		}

		setOpen(false);
	};

	const handleLogout = (event: any) => {
		handleClose(event);
		onLogout();
	};

	function handleListKeyDown(event: any) {
		if (event.key === "Tab") {
			event.preventDefault();
			setOpen(false);
		}
	}

	const prevOpen = React.useRef(open);
	React.useEffect(() => {
		if (prevOpen.current === true && open === false) {
			anchorRef.current?.focus();
		}

		prevOpen.current = open;
	}, [open]);

	return (
		<>
			<Tooltip title={user.name || user.login}>
				<IconButton
					ref={anchorRef}
					aria-controls={open ? "menu-list-grow" : undefined}
					aria-haspopup="true"
					onClick={handleToggle}
				>
					<img
						className={classes.avatar}
						src={user.avatar_url}
						alt={user.login}
					/>
				</IconButton>
			</Tooltip>
			<Popper
				open={open}
				anchorEl={anchorRef.current}
				role={undefined}
				transition
				disablePortal
			>
				{({ TransitionProps, placement }) => (
					<Grow
						{...TransitionProps}
						style={{
							transformOrigin:
								placement === "bottom"
									? "center top"
									: "center bottom",
						}}
					>
						<Paper>
							<ClickAwayListener onClickAway={handleClose}>
								<MenuList
									autoFocusItem={open}
									id="menu-list-grow"
									onKeyDown={handleListKeyDown}
								>
									<MenuItem onClick={handleLogout}>
										<ListItemIcon>
											<LogoutIcon fontSize="small" />
										</ListItemIcon>
										<Typography variant="inherit">
											Logout
										</Typography>
									</MenuItem>
								</MenuList>
							</ClickAwayListener>
						</Paper>
					</Grow>
				)}
			</Popper>
		</>
	);
}
