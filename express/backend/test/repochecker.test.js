const assert = require("node:assert/strict");
const { test } = require("node:test");
const repochecker = require("@iobroker/repochecker");
const { COOKIE_NAME_PORTAL_TOKEN } = require("../src/auth");
const router = require("../src/api/repochecker").default;
const routeStack = router.stack[0].route.stack;
const route = routeStack[routeStack.length - 1].handle;

const url = "https://github.com/example/ioBroker.test";

function request(token, query = { url }) {
	return {
		query,
		universalCookies: {
			get: (name) => (name === COOKIE_NAME_PORTAL_TOKEN ? token : undefined),
		},
	};
}

function response() {
	return {
		status(code) {
			this.statusCode = code;
			return this;
		},
		send(body) {
			this.body = body;
			return this;
		},
	};
}

const tick = () => new Promise((resolve) => setImmediate(resolve));

test("passes the cookie token to repochecker without changing the environment", async (t) => {
	const environment = { ...process.env };
	let parameters;
	t.mock.method(repochecker, "handler", (request, ctx, callback) => {
		parameters = request.queryStringParameters;
		assert.equal(ctx, null);
		callback(null, { statusCode: 201, body: "checked" });
	});

	for (const token of ["test-token", undefined, ""]) {
		const res = response();
		await route(request(token, { url, branch: "main" }), res);
		assert.deepEqual(parameters, {
			url,
			branch: "main",
			githubToken: token || undefined,
		});
		assert.equal(res.statusCode, 201);
		assert.equal(res.body, "checked");
	}
	assert.deepEqual({ ...process.env }, environment);
});

test("allows only one check per user at a time", async (t) => {
	const pending = [];
	t.mock.method(repochecker, "handler", (request, ctx, callback) => {
		pending.push({ request, callback });
	});
	const first = response();
	const firstCheck = route(request("user-token"), first);
	await tick();

	const second = response();
	await route(request("user-token"), second);
	assert.equal(second.statusCode, 429);
	assert.equal(pending.length, 1);

	const other = response();
	const otherCheck = route(request("other-token"), other);
	await tick();
	assert.equal(pending.length, 2);
	assert.equal(pending[1].request.queryStringParameters.githubToken, "other-token");

	pending[0].callback(null, { statusCode: 200, body: "first" });
	pending[1].callback(null, { statusCode: 200, body: "other" });
	await Promise.all([firstCheck, otherCheck]);
	assert.equal(first.body, "first");
	assert.equal(other.body, "other");

	const retry = response();
	const retryCheck = route(request("user-token"), retry);
	await tick();
	pending[2].callback(null, { statusCode: 200, body: "retry" });
	await retryCheck;
	assert.equal(retry.statusCode, 200);
});

test("queues checks beyond the parallel limit", async (t) => {
	const pending = [];
	t.mock.method(repochecker, "handler", (request, ctx, callback) => {
		pending.push({ request, callback });
	});
	const tokens = ["a", "b", "c", "d"];
	const responses = tokens.map(() => response());
	const checks = tokens.map((token, i) => route(request(token), responses[i]));
	await tick();
	assert.equal(pending.length, 3);

	pending[0].callback(null, { statusCode: 200, body: "a" });
	await tick();
	assert.equal(pending.length, 4);
	assert.equal(pending[3].request.queryStringParameters.githubToken, "d");

	for (const p of pending.slice(1)) {
		p.callback(null, { statusCode: 200, body: p.request.queryStringParameters.githubToken });
	}
	await Promise.all(checks);
	assert.deepEqual(responses.map((r) => r.body), tokens);
});

test("rejects checks when the queue is full", async (t) => {
	const pending = [];
	t.mock.method(repochecker, "handler", (request, ctx, callback) => {
		pending.push({ request, callback });
	});
	// 3 running + 10 queued; requests without a token bypass the per-user guard
	const accepted = Array.from({ length: 13 }, () => response());
	const checks = accepted.map((res) => route(request(undefined), res));
	await tick();
	assert.equal(pending.length, 3);

	const rejected = response();
	await route(request(undefined), rejected);
	assert.equal(rejected.statusCode, 429);

	while (pending.length) {
		pending.shift().callback(null, { statusCode: 200, body: "ok" });
		await tick();
	}
	await Promise.all(checks);
	assert.ok(accepted.every((res) => res.statusCode === 200));
});

test("does not expose errors or tokens in responses or logs", async (t) => {
	const log = t.mock.method(console, "error", () => {});
	const error = new Error("test-token");
	const handler = t.mock.method(repochecker, "handler");
	for (const implementation of [
		(request, ctx, callback) => callback(error),
		(request, ctx, callback) => callback(null),
		() => {
			throw error;
		},
	]) {
		handler.mock.mockImplementation(implementation);
		const res = response();
		await route(request("test-token"), res);
		assert.equal(res.statusCode, 500);
		assert.equal(res.body, "Repochecker request failed");
	}
	assert.equal(log.mock.calls.length, 3);
	for (const call of log.mock.calls) {
		assert.deepEqual(call.arguments, ["Repochecker request failed"]);
	}
});
