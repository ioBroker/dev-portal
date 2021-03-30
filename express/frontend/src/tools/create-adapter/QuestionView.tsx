import { CheckResult } from "@iobroker/create-adapter/build/src/lib/core/actionsAndTransformers";
import { UploadedIcon } from "@iobroker/create-adapter/build/src/lib/core/questions";
import {
	Question,
	QuestionMeta,
} from "@iobroker/create-adapter/build/src/lib/core/questions";
import Checkbox from "@material-ui/core/Checkbox";
import FormControl from "@material-ui/core/FormControl";
import FormControlLabel from "@material-ui/core/FormControlLabel";
import FormGroup from "@material-ui/core/FormGroup";
import FormHelperText from "@material-ui/core/FormHelperText";
import FormLabel from "@material-ui/core/FormLabel";
import InputLabel from "@material-ui/core/InputLabel";
import MenuItem from "@material-ui/core/MenuItem";
import Paper from "@material-ui/core/Paper";
import Radio from "@material-ui/core/Radio";
import RadioGroup from "@material-ui/core/RadioGroup";
import Select from "@material-ui/core/Select";
import Switch from "@material-ui/core/Switch";
import TextField from "@material-ui/core/TextField";
import Tooltip from "@material-ui/core/Tooltip";
import axios from "axios";
import {
	ArrayPromptOptions,
	Choice,
	SpecificPromptOptions,
	StringPromptOptions,
} from "enquirer";
import React, { useEffect } from "react";
import Dropzone, { FileRejection } from "react-dropzone";
import { AdapterSettingsView } from "./AdapterSettingsView";
import { getQuestionMessage, getQuestionName } from "./common";

export type AnswerChanged = (value: any, error: boolean) => void;

export interface QuestionViewProps<T = SpecificPromptOptions> {
	question: T & QuestionMeta;
	answers: Record<string, any>;
	onAnswerChanged: AnswerChanged;
}

const isRequired = (question: Question): boolean => {
	return (
		(question.optional !== true || question.required === true) &&
		question.type !== "multiselect"
	);
};

export function useValueState<T = any>(
	props: QuestionViewProps,
	defaultValue: T,
	modify?: (value: T) => T,
): [T, React.Dispatch<React.SetStateAction<T>>] {
	const { question, answers, onAnswerChanged } = props;
	const name = getQuestionName(question);
	let originalValue = answers[name];
	if (!originalValue) {
		if (typeof question.initial === "function") {
			// special case for us: initial can be dependent on previous answers
			originalValue = (question.initial as any)(answers);
		} else if (question.initial) {
			originalValue = question.initial;
		}
	}

	if (modify) {
		originalValue = modify(originalValue);
	}

	originalValue = originalValue || defaultValue;

	const [value, setValue] = React.useState<T>(originalValue);

	//console.log("originalValue", question.name, originalValue);
	useEffect(() => {
		// ensure the value is set to "error" if it is required
		onAnswerChanged(
			originalValue,
			(!originalValue || originalValue.length === 0) &&
				isRequired(question),
		);
		if (!value) {
			setValue(originalValue);
		}
	}, [originalValue]);

	return [value, setValue];
}
const checkAdapterExistence = async (name: string): Promise<CheckResult> => {
	try {
		const encodedName = encodeURIComponent(name);
		await axios.get(
			`https://api.npms.io/v2/package/iobroker.${encodedName}`,
		);
		return `The adapter ioBroker.${name} already exists!`;
	} catch (e) {
		return true;
	}
};

const handleValueChange = async (
	props: QuestionViewProps,
	value: any,
	setError: React.Dispatch<React.SetStateAction<string>>,
): Promise<void> => {
	const { question, onAnswerChanged } = props;
	try {
		// Apply an optional transformation
		if (typeof question.resultTransform === "function") {
			// disable the "next" button until we have the result
			onAnswerChanged(value, true);
			const transformed = question.resultTransform(value);
			value =
				transformed instanceof Promise
					? await transformed
					: transformed;
		}

		// Test the result
		if (question.action !== undefined) {
			const testResult = await question.action(value, {
				checkAdapterExistence,
			});
			if (typeof testResult === "string") {
				setError(testResult);
				onAnswerChanged(value, true);
				return;
			}
		}

		setError("");
		onAnswerChanged(value, false);
	} catch (e) {
		setError(JSON.stringify(e));
		onAnswerChanged(value, true);
	}
};

const choiceToValue = (choice?: string | Choice): string | undefined => {
	if (choice === undefined) {
		return undefined;
	}
	if (typeof choice === "string") {
		return choice;
	}
	if (choice.value !== undefined) {
		return choice.value;
	}

	return choice.message;
};

export const InputRenderer = (
	props: QuestionViewProps<StringPromptOptions>,
): JSX.Element => {
	const { question } = props;

	const [value, setValue] = useValueState(props, "");
	const [error, setError] = React.useState("");

	return (
		<TextField
			fullWidth
			size="small"
			error={!!error}
			required={isRequired(question)}
			label={question.label}
			value={value}
			helperText={error || `${question.message} ${question.hint || ""}`}
			onChange={(e) => setValue(e.target.value)}
			onBlur={(e) => handleValueChange(props, e.target.value, setError)}
		/>
	);
};

export const BooleanSelectRenderer = (
	props: QuestionViewProps<ArrayPromptOptions>,
): JSX.Element => {
	const { question } = props;

	const [value, setValue] = useValueState(props, "no");
	const [error, setError] = React.useState("");

	const handleChange = (
		_event: React.ChangeEvent<HTMLInputElement>,
		checked: boolean,
	): void => {
		const newValue = checked ? "yes" : "no";
		setValue(newValue);
		handleValueChange(props, newValue, setError);
	};

	return (
		<FormControl
			component="fieldset"
			fullWidth
			size="small"
			error={!!error}
			required={isRequired(question)}
		>
			<FormLabel component="legend">{question.message}</FormLabel>
			<FormGroup>
				<FormControlLabel
					control={
						<Switch
							checked={value === "yes"}
							onChange={handleChange}
						/>
					}
					label={question.label}
				/>
			</FormGroup>
			<FormHelperText>{error || question.hint || " "}</FormHelperText>
		</FormControl>
	);
};

export const RadioSelectRenderer = (
	props: QuestionViewProps<ArrayPromptOptions>,
): JSX.Element => {
	const { question } = props;

	const [value, setValue] = useValueState(props, "no");
	const [error, setError] = React.useState("");

	const handleChange = (
		_event: React.ChangeEvent<HTMLInputElement>,
		value: string,
	): void => {
		setValue(value);
		handleValueChange(props, value, setError);
	};

	return (
		<FormControl component="fieldset">
			<FormLabel component="legend">{question.message}</FormLabel>
			<RadioGroup value={value} onChange={handleChange} row>
				{question.choices.map((c: string | Choice, i: number) =>
					typeof c === "string" ? (
						<FormControlLabel
							key={i}
							value={choiceToValue(c)}
							control={<Radio />}
							label={c}
						/>
					) : (
						<FormControlLabel
							key={i}
							value={choiceToValue(c)}
							control={<Radio />}
							disabled={!!c.disabled}
							label={c.name || c.message}
						/>
					),
				)}
			</RadioGroup>
			<FormHelperText>{error || question.hint || " "}</FormHelperText>
		</FormControl>
	);
};

export const ComboBoxSelectRenderer = (
	props: QuestionViewProps<ArrayPromptOptions>,
): JSX.Element => {
	const { question } = props;
	const name = getQuestionName(question);

	const [value, setValue] = useValueState(props, "", (v) =>
		typeof v === "string"
			? v
			: (choiceToValue(question.choices[v]) as string),
	);
	const [error, setError] = React.useState("");

	const handleChange = (
		e: React.ChangeEvent<{
			name?: string | undefined;
			value: unknown;
		}>,
	): void => {
		setValue(e.target.value as string);
		handleValueChange(props, e.target.value, setError);
	};
	return (
		<FormControl
			fullWidth
			size="small"
			error={!!error}
			required={isRequired(question)}
		>
			<InputLabel id={`label_${name}`}>{question.message}</InputLabel>
			<Select
				labelId={`label_${name}`}
				value={value}
				onChange={handleChange}
			>
				{question.choices.map((c: string | Choice, i: number) =>
					typeof c === "string" ? (
						<MenuItem key={i} value={choiceToValue(c)}>
							{c}
						</MenuItem>
					) : (
						<MenuItem
							key={i}
							value={choiceToValue(c)}
							disabled={!!c.disabled}
						>
							{c.name || c.message}
						</MenuItem>
					),
				)}
			</Select>
			<FormHelperText>{error || question.hint || " "}</FormHelperText>
		</FormControl>
	);
};

export const SelectRenderer = (
	props: QuestionViewProps<ArrayPromptOptions>,
): JSX.Element => {
	const { question } = props;
	if (question.choices.length === 2) {
		if (
			question.choices.some((c: string | Choice) => c === "yes") &&
			question.choices.some((c: string | Choice) => c === "no")
		) {
			return BooleanSelectRenderer(props);
		} else {
			return RadioSelectRenderer(props);
		}
	} else {
		return ComboBoxSelectRenderer(props);
	}
};

export const MultiSelectRenderer = (
	props: QuestionViewProps<ArrayPromptOptions>,
): JSX.Element => {
	const { question } = props;

	const [value, setValue] = useValueState<string[]>(
		props,
		[],
		(values) =>
			values.map((v: string | number) =>
				typeof v === "string"
					? v
					: (choiceToValue(question.choices[v]) as string),
			) || [],
	);
	const [error, setError] = React.useState("");

	const handleChange = (
		event: React.ChangeEvent<HTMLInputElement>,
		checked: boolean,
	): void => {
		let newValue = [...value];
		if (checked) {
			if (!value.includes(event.target.name)) {
				newValue.push(event.target.name);
			}
		} else {
			newValue = value.filter((v) => v !== event.target.name);
		}
		setValue(newValue);
		handleValueChange(props, newValue, setError);
	};
	return (
		<FormControl
			fullWidth
			size="small"
			error={!!error}
			required={isRequired(question)}
		>
			<FormLabel component="legend">{question.message}</FormLabel>
			<FormGroup row>
				{question.choices.map((c: string | Choice, i: number) =>
					typeof c === "string" ? (
						<FormControlLabel
							key={i}
							control={
								<Checkbox
									name={choiceToValue(c)}
									onChange={handleChange}
									checked={value.includes(c)}
								/>
							}
							label={c}
						/>
					) : (
						<Tooltip title={c.hint || ""} key={i}>
							<FormControlLabel
								control={
									<Checkbox
										name={choiceToValue(c)}
										onChange={handleChange}
										checked={value.includes(
											choiceToValue(c) || "",
										)}
									/>
								}
								label={c.name || c.message}
							/>
						</Tooltip>
					),
				)}
			</FormGroup>
			<FormHelperText>{error || " "}</FormHelperText>
		</FormControl>
	);
};

const SUPPORTED_IMAGE_TYPES: Record<string, string> = {
	"image/jpeg": "jpg",
	"image/png": "png",
	"image/gif": "gif",
	"image/svg+xml": "svg",
};

export const IconUploadRenderer = (props: QuestionViewProps): JSX.Element => {
	const { question, onAnswerChanged } = props;

	const [value, setValue] = useValueState<UploadedIcon | undefined>(
		props,
		undefined,
	);
	const [error, setError] = React.useState("");
	const handleDropImage = async (
		files: File[],
		rejected: FileRejection[],
	) => {
		try {
			if (files && files.hasOwnProperty("target")) {
				files = (files as any).target.files;
			}

			if (!files || !files.length) {
				if (rejected && rejected.length) {
					throw new Error(
						"File is rejected. May be wrong format or too big > 300k.",
					);
				}
			}
			const file = files[files.length - 1];

			if (!file) {
				throw new Error("No file found.");
			}
			const icon = new Promise<string>((resolve, reject) => {
				const reader = new FileReader();
				reader.onload = () => {
					resolve(reader.result as string);
				};
				reader.onabort = () => {
					console.error("file reading was aborted");
					reject("file reading was aborted");
				};
				reader.onerror = (e) => {
					console.error("file reading has failed");
					reject("file reading has failed: " + e);
				};

				reader.readAsDataURL(file);
			});
			const base64 = await icon;
			// figure out the extension, base64 is something like:
			// "data:image/jpeg;base64,/9j/4A..." or
			// "data:image/svg+xml;base64,PD9..."
			const match = base64.match(/^data:([^;]+);/);
			if (!match) {
				throw new Error(
					`Unknown media type in ${base64.substring(0, 25)}`,
				);
			}
			const extension = SUPPORTED_IMAGE_TYPES[match[1]];
			if (!extension) {
				throw new Error(`Unsupported media type: ${match[1]}`);
			}
			const newValue = {
				data: base64,
				extension,
			};
			setError("");
			setValue(newValue);
			onAnswerChanged(newValue, false);
		} catch (e) {
			setError(e.message);
			setValue(undefined);
			onAnswerChanged(undefined, false);
		}
	};
	return (
		<Dropzone
			onDrop={(files, rejected) => handleDropImage(files, rejected)}
			maxSize={300000}
			accept={Object.keys(SUPPORTED_IMAGE_TYPES).join(", ")}
		>
			{({ getRootProps, getInputProps, isDragActive }) => {
				return (
					<FormControl
						fullWidth
						size="small"
						error={!!error}
						required={isRequired(question)}
					>
						<FormLabel component="legend">
							{question.message}
						</FormLabel>
						<Paper
							elevation={3}
							style={{ padding: "24px", margin: "8px 0 8px 0" }}
							{...getRootProps()}
						>
							<input {...getInputProps()} />
							{value ? (
								<img
									key={"image-preview"}
									src={value.data as string}
									alt="icon"
									style={{ width: "auto" }}
								/>
							) : null}
							{isDragActive ? (
								<FormHelperText>
									Drop icon here...
								</FormHelperText>
							) : (
								<FormHelperText>
									Drop your adapter icon here,
									<br />
									or click to select a file to upload.
								</FormHelperText>
							)}
						</Paper>
						<FormHelperText>{error}</FormHelperText>
					</FormControl>
				);
			}}
		</Dropzone>
	);
};

type QuestionViewImpl = (props: QuestionViewProps<any>) => JSX.Element;

const specialRenderers: Record<string, QuestionViewImpl> = {
	icon: IconUploadRenderer,
	adapterSettings: AdapterSettingsView,
};

const defaultRenderers: Record<string, QuestionViewImpl> = {
	input: InputRenderer,
	select: SelectRenderer,
	multiselect: MultiSelectRenderer,
};

export const QuestionView = (props: QuestionViewProps): JSX.Element => {
	const q = props.question;
	const question = {
		...q,
		message: getQuestionMessage(q).replace(/:\s*$/, ""),
	};
	const name = getQuestionName(question);
	const renderProps = { ...props, question };
	if (specialRenderers[name]) {
		return specialRenderers[name](renderProps);
	}

	if (defaultRenderers[question.type]) {
		return defaultRenderers[question.type](renderProps);
	}

	return (
		<div>
			No renderer found for {name} ({question.type}): {question.message}
		</div>
	);
};
