import {
	Box,
	ClickAwayListener,
	Grow,
	IconButton,
	ListItemIcon,
	MenuItem,
	MenuList,
	Paper,
	Popper,
	Tooltip,
	Typography,
} from "@mui/material";
import { useEffect, useRef, useState } from "react";
import { User } from "../lib/gitHub";
import { LogoutIcon } from "./Icons";

interface UserMenuProps {
	user: User;
	onLogout: () => void;
}

export function UserMenu(props: UserMenuProps) {
	const { user, onLogout } = props;

	const [open, setOpen] = useState(false);
	const anchorRef = useRef<any>();

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

	const prevOpen = useRef(open);
	useEffect(() => {
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
					sx={{
						"& img": {
							width: "1.2em",
							borderRadius: "50%",
						},
					}}
				>
					<img src={user.avatar_url} alt={user.login} />
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
