import {
	AdapterSelectOption,
	AdapterSettings,
	SelectAdapterSettings,
} from "@iobroker/create-adapter/build/core";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import {
	Checkbox,
	Grid2,
	IconButton,
	Input,
	MenuItem,
	Select,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
} from "@mui/material";
import React, { Dispatch, useState } from "react";
import { QuestionViewProps, useValueState } from "./QuestionView";

export const AdapterSettingOption = (props: {
	option: AdapterSelectOption;
	canDelete: boolean;
	onChange: (option?: AdapterSelectOption) => void;
}): JSX.Element => {
	const { option, canDelete, onChange } = props;
	const [text, setText] = useState(option.text);
	const [value, setValue] = useState(option.value);

	const handleChange = (): void => onChange({ text, value });
	return (
		<>
			<Grid2 item xs={5}>
				<Input
					value={text}
					onChange={(e) => setText(e.target.value)}
					onBlur={() => handleChange()}
				/>
			</Grid2>
			<Grid2 item xs={5}>
				<Input
					value={value}
					onChange={(e) => setValue(e.target.value)}
					onBlur={() => handleChange()}
				/>
			</Grid2>
			<Grid2 item xs={2}>
				<IconButton
					size="small"
					aria-label="delete"
					onClick={() => onChange()}
					disabled={!canDelete}
				>
					<DeleteIcon fontSize="inherit" />
				</IconButton>
			</Grid2>
		</>
	);
};

export const AdapterSettingOptions = (props: {
	options: AdapterSelectOption[];
	onChange: (options: AdapterSelectOption[]) => void;
}): JSX.Element => {
	const { options, onChange } = props;

	const handleChange = (
		index: number,
		option?: AdapterSelectOption,
	): void => {
		if (option) {
			options[index] = option;
		} else {
			options.splice(index, 1);
		}
		onChange([...options]);
	};

	const onAddClick = (): void => {
		options.push({
			text: `Item ${options.length + 1}`,
			value: `item${options.length + 1}`,
		});
		onChange([...options]);
	};

	return (
		<Grid2 container spacing={0} style={{ width: "30vw" }}>
			<Grid2 item xs={5}>
				Text
			</Grid2>
			<Grid2 item xs={5}>
				Value
			</Grid2>
			<Grid2 item xs={2}>
				<IconButton
					size="small"
					aria-label="add"
					onClick={() => onAddClick()}
				>
					<AddIcon fontSize="inherit" />
				</IconButton>
			</Grid2>
			{options.map((option, i) => (
				<AdapterSettingOption
					key={i}
					option={option}
					canDelete={options.length > 1}
					onChange={(o) => handleChange(i, o)}
				/>
			))}
		</Grid2>
	);
};

export const AdapterSetting = (props: {
	setting: AdapterSettings;
	onChange: (setting?: AdapterSettings) => void;
}): JSX.Element => {
	const { setting, onChange } = props;
	const [key, setKey] = useState(setting.key);
	const [inputType, setInputType] = useState(setting.inputType);
	const [label, setLabel] = useState(setting.label);
	const [options, setOptions] = useState(
		(setting as SelectAdapterSettings).options,
	);
	const [defaultValue, setDefaultValue] = useState<any>(
		(setting as SelectAdapterSettings).defaultValue,
	);

	const handleChange = (): void =>
		onChange({ key, label, inputType, options, defaultValue });
	const setAndHandleChange = (
		value: any,
		setter: Dispatch<any>,
		name: keyof SelectAdapterSettings,
	): void => {
		setter(value);
		const newSetting = { key, label, inputType, options, defaultValue };
		(newSetting as any)[name] = value;
		onChange(newSetting);
	};
	const onChangeInputType = (type: typeof inputType): void => {
		const newSetting = {
			key,
			label,
			inputType: type,
			options: options as AdapterSelectOption[] | undefined,
			defaultValue,
		};
		switch (type) {
			case "text":
				newSetting.defaultValue = "";
				newSetting.options = undefined;
				break;
			case "checkbox":
				newSetting.defaultValue = false;
				newSetting.options = undefined;
				break;
			case "number":
				newSetting.defaultValue = 0;
				newSetting.options = undefined;
				break;
			case "select":
				newSetting.defaultValue = "item1";
				newSetting.options = [{ text: "Item 1", value: "item1" }];
				setOptions(newSetting.options);
				break;
		}
		setDefaultValue(newSetting.defaultValue);
		setInputType(type);
		setOptions(newSetting.options as any);
		onChange(newSetting as AdapterSettings);
	};
	return (
		<TableRow>
			<TableCell scope="row">
				<Input
					value={key}
					onChange={(e) => setKey(e.target.value)}
					onBlur={() => handleChange()}
				/>
			</TableCell>
			<TableCell>
				<Input
					value={label}
					onChange={(e) => setLabel(e.target.value)}
					onBlur={() => handleChange()}
				/>
			</TableCell>
			<TableCell>
				<Select
					value={inputType}
					onChange={(e) => onChangeInputType(e.target.value as any)}
				>
					<MenuItem value="text">string</MenuItem>
					<MenuItem value="number">number</MenuItem>
					<MenuItem value="checkbox">boolean</MenuItem>
					<MenuItem value="select">select</MenuItem>
				</Select>
			</TableCell>
			<TableCell>
				{inputType === "select" ? (
					<AdapterSettingOptions
						options={options}
						onChange={(options) =>
							setAndHandleChange(options, setOptions, "options")
						}
					/>
				) : (
					"-"
				)}
			</TableCell>
			<TableCell>
				{inputType === "text" ? (
					<Input
						value={defaultValue}
						onChange={(e) => setDefaultValue(e.target.value)}
						onBlur={() => handleChange()}
					/>
				) : null}
				{inputType === "checkbox" ? (
					<Checkbox
						checked={!!defaultValue}
						onChange={(e, value) =>
							setAndHandleChange(
								value,
								setDefaultValue,
								"defaultValue",
							)
						}
					/>
				) : null}
				{inputType === "number" ? (
					<Input
						type="number"
						value={defaultValue}
						onChange={(e) => setDefaultValue(e.target.value)}
						onBlur={() => handleChange()}
					/>
				) : null}
				{inputType === "select" ? (
					<Select
						value={defaultValue}
						onChange={(e) =>
							setAndHandleChange(
								e.target.value,
								setDefaultValue,
								"defaultValue",
							)
						}
					>
						{options.map((opt, i) => (
							<MenuItem key={i} value={opt.value}>
								{opt.text}
							</MenuItem>
						))}
					</Select>
				) : null}
			</TableCell>
			<TableCell>
				<IconButton aria-label="delete" onClick={() => onChange()}>
					<DeleteIcon fontSize="small" />
				</IconButton>
			</TableCell>
		</TableRow>
	);
};

export const AdapterSettingsView = (props: QuestionViewProps): JSX.Element => {
	const { onAnswerChanged } = props;

	const [value, setValue] = useValueState<AdapterSettings[]>(props, [
		{
			key: "option1",
			defaultValue: true,
			inputType: "checkbox",
		},
		{
			key: "option2",
			defaultValue: "42",
			inputType: "text",
		},
	]);

	const onAddClick = (): void => {
		value.push({
			key: `option${value.length + 1}`,
			defaultValue: "",
			inputType: "text",
		});
		setValue([...value]);
		onAnswerChanged(value, false);
	};

	const handleChange = (index: number, setting?: AdapterSettings): void => {
		if (setting) {
			value[index] = setting;
		} else {
			value.splice(index, 1);
		}
		setValue([...value]);
		onAnswerChanged(value, false);
	};

	return (
		<TableContainer>
			<Table size="small">
				<TableHead>
					<TableRow>
						<TableCell>Name</TableCell>
						<TableCell>Title</TableCell>
						<TableCell>Type</TableCell>
						<TableCell>Options</TableCell>
						<TableCell>Default value</TableCell>
						<TableCell>
							<IconButton
								aria-label="add"
								onClick={() => onAddClick()}
							>
								<AddIcon fontSize="small" />
							</IconButton>
						</TableCell>
					</TableRow>
				</TableHead>
				<TableBody>
					{value.map((setting, i) => (
						<AdapterSetting
							key={setting.key}
							setting={setting}
							onChange={(setting) => handleChange(i, setting)}
						/>
					))}
				</TableBody>
			</Table>
		</TableContainer>
	);
};
