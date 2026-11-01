const assert = require("node:assert/strict");
const { test } = require("node:test");
const repochecker = require("@iobroker/repochecker");
const { COOKIE_NAME_PORTAL_TOKEN } = require("../src/auth");
const user = require("../src/api/user");
const {
	default: router,
	MAX_PARALLEL_CHECKS,
	MAX_QUEUED_CHECKS,
} = require("../src/api/repochecker");
const routeStack = router.stack[0].route.stack;
const route = routeStack[routeStack.length - 1].handle;

const url = "https://github.com/example/ioBroker.test";

// Lookups for tokens starting with "slow-" wait until this is resolved.
let slowLogins = Promise.resolve();

// avoid GitHub requests when resolving the user name for the log
user.getGitHubLogin = async (req) => {
	const token = req.universalCookies.get(COOKIE_NAME_PORTAL_TOKEN);
	if (token.startsWith("slow-")) {
		await slowLogins;
	}
	if (token === "unknown-user-token") {
		throw new Error("lookup failed");
	}
	return `login-of-${token}`;
};

function request(token, query = { url }) {
	return {
		query,
		universalCookies: {
			get: (name) =>
				name === COOKIE_NAME_PORTAL_TOKEN ? token : undefined,
		},
	};
}

function response() {
	const listeners = {};
	return {
		writableFinished: false,
		on(event, listener) {
			listeners[event] = listener;
			return this;
		},
		// simulates the connection being closed, by the server or the client
		close() {
			listeners.close?.();
		},
		status(code) {
			this.statusCode = code;
			return this;
		},
		send(body) {
			this.body = body;
			this.writableFinished = true;
			this.close();
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

	const res = response();
	await route(request("test-token", { url, branch: "main" }), res);
	assert.deepEqual(parameters, {
		url,
		branch: "main",
		githubToken: "test-token",
	});
	assert.equal(res.statusCode, 201);
	assert.equal(res.body, "checked");
	assert.deepEqual({ ...process.env }, environment);
});

test("rejects requests without a login cookie", async (t) => {
	const handler = t.mock.method(repochecker, "handler", () => {});
	for (const token of [undefined, ""]) {
		const res = response();
		await route(request(token), res);
		assert.equal(res.statusCode, 401);
	}
	assert.equal(handler.mock.calls.length, 0);
});

// Completes pending checks one by one until none are left.
async function drain(pending) {
	while (pending.length) {
		const { request, callback } = pending.shift();
		callback(null, {
			statusCode: 200,
			body: request.queryStringParameters.githubToken,
		});
		await tick();
	}
}

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
	assert.equal(other.statusCode, undefined);

	await drain(pending);
	await Promise.all([firstCheck, otherCheck]);
	assert.equal(first.body, "user-token");
	assert.equal(other.body, "other-token");

	const retry = response();
	const retryCheck = route(request("user-token"), retry);
	await tick();
	await drain(pending);
	await retryCheck;
	assert.equal(retry.statusCode, 200);
});

test("queues checks beyond the parallel limit", async (t) => {
	const pending = [];
	t.mock.method(repochecker, "handler", (request, ctx, callback) => {
		pending.push({ request, callback });
	});
	const tokens = Array.from(
		{ length: MAX_PARALLEL_CHECKS + 1 },
		(_, i) => `token-${i}`,
	);
	const responses = tokens.map(() => response());
	const checks = tokens.map((token, i) =>
		route(request(token), responses[i]),
	);
	await tick();
	assert.equal(pending.length, MAX_PARALLEL_CHECKS);
	assert.equal(responses[MAX_PARALLEL_CHECKS].statusCode, undefined);

	await drain(pending);
	await Promise.all(checks);
	assert.deepEqual(
		responses.map((r) => r.body),
		tokens,
	);
});

test("rejects checks when the queue is full", async (t) => {
	const pending = [];
	t.mock.method(repochecker, "handler", (request, ctx, callback) => {
		pending.push({ request, callback });
	});
	// fill all running slots and the queue, each from a different user
	const accepted = Array.from(
		{ length: MAX_PARALLEL_CHECKS + MAX_QUEUED_CHECKS },
		() => response(),
	);
	const checks = accepted.map((res, i) => route(request(`token-${i}`), res));
	await tick();
	assert.equal(pending.length, MAX_PARALLEL_CHECKS);

	const rejected = response();
	await route(request("one-too-many"), rejected);
	assert.equal(rejected.statusCode, 429);

	await drain(pending);
	await Promise.all(checks);
	assert.ok(accepted.every((res) => res.statusCode === 200));
});

function logLines(mock) {
	return mock.mock.calls.map((call) => call.arguments.join(" "));
}

test("logs start and end of a check with user, repository and time needed", async (t) => {
	const log = t.mock.method(console, "log", () => {});
	const warn = t.mock.method(console, "warn", () => {});
	t.mock.method(repochecker, "handler", (request, ctx, callback) => {
		callback(null, {
			statusCode: 200,
			body: JSON.stringify({ errors: [1, 2], warnings: [1] }),
		});
	});
	await route(request("test-token", { url, branch: "dev" }), response());
	await tick();

	const lines = logLines(log);
	assert.equal(lines.length, 3);
	assert.match(
		lines[0],
		/#\d+ by login-of-test-token for "https:\/\/github.com\/example\/ioBroker.test" \(branch "dev"\) requested/,
	);
	assert.match(lines[1], /started after \d+\.\ds in queue/);
	assert.match(
		lines[2],
		/finished with status 200 \(2 errors, 1 warning\), time needed \d+\.\ds \(queued \d+\.\ds, checking \d+\.\ds\)/,
	);
	assert.equal(warn.mock.calls.length, 0);
});

test("logs when the connection closes before the result is sent", async (t) => {
	t.mock.method(console, "log", () => {});
	const warn = t.mock.method(console, "warn", () => {});
	let finish;
	t.mock.method(repochecker, "handler", (request, ctx, callback) => {
		finish = callback;
	});
	const res = response();
	const check = route(request("unknown-user-token"), res);
	await tick();
	res.close();
	await tick();
	assert.match(
		logLines(warn)[0],
		/#\d+ by unknown for .* connection closed by client or proxy after \d+\.\ds, before the result was sent/,
	);

	finish(null, { statusCode: 200, body: "{}" });
	await check;
	assert.equal(warn.mock.calls.length, 1);
});

test("slow login lookups do not let requests bypass the queue limit", async (t) => {
	t.mock.method(console, "log", () => {});
	const pending = [];
	t.mock.method(repochecker, "handler", (request, ctx, callback) => {
		pending.push({ request, callback });
	});
	let releaseLogins;
	slowLogins = new Promise((resolve) => (releaseLogins = resolve));

	const total = MAX_PARALLEL_CHECKS + MAX_QUEUED_CHECKS;
	const responses = Array.from({ length: total + 1 }, () => response());
	const checks = responses.map((res, i) => route(request(`slow-${i}`), res));
	// the last request is rejected right away, while all lookups are pending
	assert.equal(responses[total].statusCode, 429);

	releaseLogins();
	await tick();
	assert.equal(pending.length, MAX_PARALLEL_CHECKS);
	await drain(pending);
	await Promise.all(checks);
	assert.ok(responses.slice(0, total).every((res) => res.statusCode === 200));
});

test("logs a disconnect that happens during the login lookup", async (t) => {
	t.mock.method(console, "log", () => {});
	const warn = t.mock.method(console, "warn", () => {});
	let finish;
	t.mock.method(repochecker, "handler", (request, ctx, callback) => {
		finish = callback;
	});
	let releaseLogins;
	slowLogins = new Promise((resolve) => (releaseLogins = resolve));

	const res = response();
	const check = route(request("slow-token"), res);
	res.close();
	releaseLogins();
	await tick();
	assert.match(
		logLines(warn)[0],
		/#\d+ by login-of-slow-token for .* connection closed by client or proxy after \d+\.\ds/,
	);
	finish(null, { statusCode: 200, body: "{}" });
	await check;
});

test("does not expose errors or tokens in responses or logs", async (t) => {
	t.mock.method(console, "log", () => {});
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
	await tick();
	assert.equal(log.mock.calls.length, 3);
	for (const line of logLines(log)) {
		assert.match(
			line,
			/^Repochecker #\d+ by login-of-test-token for .* failed, time needed \d+\.\ds$/,
		);
	}
});
