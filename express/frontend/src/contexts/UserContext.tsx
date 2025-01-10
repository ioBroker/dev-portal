import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useState,
} from "react";
import { useCookies } from "react-cookie";
import { GitHubComm, User } from "../lib/gitHub";

export const gitHubTokenCookie = "gh-token";

export interface IUserContext {
	user?: User;
	isReady: boolean;
	login: () => void;
	logout: () => void;
}

export const UserContext = createContext<IUserContext | undefined>(undefined);

export function useUserContext() {
	const context = useContext(UserContext);
	if (!context) {
		throw new Error("UserContext missing");
	}
	return context;
}

export function useUserToken() {
	const { user } = useUserContext();
	const token = user?.token;
	if (!token) {
		throw new Error("User token missing");
	}
	return token;
}

export function UserProvider({ children }: { children: React.ReactNode }) {
	const [cookies, , removeCookie] = useCookies([gitHubTokenCookie]);
	const [user, setUser] = useState<User>();
	const [isReady, setReady] = useState(false);

	useEffect(() => {
		const ghToken = cookies[gitHubTokenCookie];
		if (ghToken && !user && !isReady) {
			const fetchUser = async () => {
				try {
					const gitHub = GitHubComm.forToken(ghToken as string);
					setUser(await gitHub.getUser());
					setReady(true);
					return;
				} catch (e) {
					console.error(e);
				}
				// remove the token if we didn't get the user info
				removeCookie(gitHubTokenCookie);
				setUser(undefined);
				setReady(true);
			};
			fetchUser().catch(console.error);
		} else if (!user) {
			setUser(undefined);
			setReady(true);
		}
	}, [cookies, user, isReady, removeCookie]);

	const login = useCallback(() => {
		const redirect = encodeURIComponent(window.location.pathname);
		if (window.location.port === "3000") {
			window.location.href = `http://localhost:8080/login?redirect=${redirect}`;
		} else {
			window.location.href = `/login?redirect=${redirect}`;
		}
	}, []);

	const logout = useCallback(() => {
		removeCookie(gitHubTokenCookie);
		delete cookies[gitHubTokenCookie];
		setUser(undefined);
	}, [cookies, removeCookie]);

	return (
		<UserContext.Provider value={{ user, login, logout, isReady }}>
			{children}
		</UserContext.Provider>
	);
}
