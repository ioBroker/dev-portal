export class AsyncCache<T> {
	private resultPromise?: Promise<T>;
	constructor(private readonly init: () => Promise<T>) {}

	public static of<T>(init: () => Promise<T>): () => Promise<T> {
		return new AsyncCache(init).request;
	}

	public get request() {
		return () => {
			if (!this.resultPromise) {
				this.resultPromise = this.init();
			}

			return this.resultPromise;
		};
	}
}

export function getApiUrl(path: string) {
	if (window.location.port === "3000") {
		return `http://localhost:8080/api/${path}`;
	} else {
		return `/api/${path}`;
	}
}

export function getWebSocketUrl(path: string) {
	const loc = window.location;
	if (loc.port === "3000") {
		return `ws://localhost:8080/ws/${path}`;
	} else {
		const protocol = loc.protocol.replace(/^http/, "ws");
		return `${protocol}//${loc.host}/ws/create-adapter`;
	}
}
