import { User } from "../lib/gitHub";

export interface CreateAdapterParams {
	user?: User;
}

export default function CreateAdapter(params: CreateAdapterParams) {
	return <div></div>;
}
