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
