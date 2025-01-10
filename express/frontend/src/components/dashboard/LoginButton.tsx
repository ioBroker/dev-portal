import { useUserContext } from "../../contexts/UserContext";
import { CardButton } from "../CardButton";

export function LoginButton() {
	const { login } = useUserContext();
	return <CardButton text="Login" onClick={login} />;
}
