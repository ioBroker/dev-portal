import Button from "@material-ui/core/Button";
import IconButton from "@material-ui/core/IconButton";
import React from "react";
import { Link } from "react-router-dom";

export interface CardButtonProps {
	text?: string;
	icon?: JSX.Element;
	to?: string;
	url?: string;
	onClick?: () => void;
	disabled?: boolean;
}

export function CardButton(props: CardButtonProps) {
	const { text, icon, to, url, onClick, disabled } = props;
	const buttonProps: {
		component?: any;
		to?: string;
		href?: string;
		target?: string;
		onClick?: () => void;
	} = {};
	if (to) {
		buttonProps.component = Link;
		buttonProps.to = to;
	} else if (url) {
		buttonProps.href = url;
		buttonProps.target = "_blank";
	} else {
		buttonProps.onClick = onClick;
	}
	return (
		<>
			{text && (
				<Button
					size="small"
					color="primary"
					disabled={disabled}
					{...buttonProps}
				>
					{text}
				</Button>
			)}
			{!text && icon && (
				<IconButton
					size="small"
					color="primary"
					disabled={disabled}
					{...buttonProps}
				>
					{icon}
				</IconButton>
			)}
		</>
	);
}
