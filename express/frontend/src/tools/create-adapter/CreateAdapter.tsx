import { CardGrid } from "../../components/CardGrid";
import { User } from "../../lib/gitHub";

export interface WizardProps {
	user?: User;
}

export interface CreateAdapterProps {
	user?: User;
}

export function CreateAdapter(props: CreateAdapterProps) {
	const { user } = props;

	const { path, url } = useRouteMatch();

	const history = useHistory();

	const onClickWizard = () => {
		window.localStorage.removeItem(STORAGE_KEY_CURRENT_ANSWERS);
		history.push(`${url}/wizard`);
	};

	return (
		<Switch>
			<Route exact path={path}>
				<CardGrid cards={cards} />
			</Route>
			<Route path={`${path}/wizard`}>
				<Wizard user={user} />
			</Route>
		</Switch>
	);
}
