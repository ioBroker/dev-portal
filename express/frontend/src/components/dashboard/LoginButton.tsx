import { useUserContext } from "../../contexts/UserContext";
import { CardButton } from "../CardButton";

export function LoginButton({ variant }: { variant?: string }) {
	const { login } = useUserContext();
	return <CardButton text="Login" onClick={login} variant={variant} />;
}
