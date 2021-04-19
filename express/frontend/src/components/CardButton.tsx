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
}

export function CardButton<T extends CardButtonProps>(props: T) {
	const { text, icon, to, url, onClick, ...additionalProps } = props;
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
					{...buttonProps}
					{...additionalProps}
				>
					{text}
				</Button>
			)}
			{!text && icon && (
				<IconButton
					size="small"
					color="primary"
					{...buttonProps}
					{...additionalProps}
				>
					{icon}
				</IconButton>
			)}
		</>
	);
}
