const assert = require("node:assert/strict");
const { test } = require("node:test");
const repochecker = require("@iobroker/repochecker");
const router = require("../src/api/repochecker").default;
const route = router.stack[0].route.stack[0].handle;

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

test("passes header tokens to repochecker without changing the environment", async (t) => {
	const environment = { ...process.env };
	let parameters;
	t.mock.method(repochecker, "handler", (request, ctx, callback) => {
		parameters = request.queryStringParameters;
		assert.equal(ctx, null);
		callback(null, { statusCode: 201, body: "checked" });
	});

	for (const [authorization, githubToken] of [
		[["Bearer", "test-token"].join(" "), "test-token"],
		[" token test-token ", "test-token"],
		["test-token", "test-token"],
		[undefined, undefined],
		[" ", undefined],
	]) {
		const res = response();
		await route({
			query: { url: "https://github.com/example/ioBroker.test", branch: "main" },
			headers: { authorization },
		}, res);
		assert.deepEqual(parameters, {
			url: "https://github.com/example/ioBroker.test",
			branch: "main",
			githubToken,
		});
		assert.equal(res.statusCode, 201);
		assert.equal(res.body, "checked");
	}
	assert.deepEqual({ ...process.env }, environment);
});

test("rejects overlapping checks to avoid sharing library credentials", async (t) => {
	const pending = [];
	t.mock.method(repochecker, "handler", (request, ctx, callback) => {
		pending.push({ request, callback });
	});
	const responses = [response(), response()];
	const checks = ["first-token", "second-token"].map((token, index) =>
		route({
			query: { url: "https://github.com/example/ioBroker.test" },
			headers: { authorization: ["Bearer", token].join(" ") },
		}, responses[index]),
	);
	assert.equal(pending[0].request.queryStringParameters.githubToken, "first-token");
	assert.equal(pending.length, 1);
	assert.equal(responses[1].statusCode, 503);
	assert.equal(responses[1].body, "Repochecker is busy; please try again later");
	pending[0].callback(null, { statusCode: 200, body: "first" });
	await Promise.all(checks);
	assert.equal(responses[0].body, "first");

	const retry = route({
		query: { url: "https://github.com/example/ioBroker.test" },
		headers: { authorization: ["Bearer", "second-token"].join(" ") },
	}, responses[1]);
	assert.equal(pending[1].request.queryStringParameters.githubToken, "second-token");
	pending[1].callback(null, { statusCode: 200, body: "second" });
	await retry;
	assert.equal(responses[1].statusCode, 200);
	assert.equal(responses[1].body, "second");
});

test("does not expose errors or tokens in responses or logs", async (t) => {
	const log = t.mock.method(console, "error", () => {});
	const error = new Error("test-token");
	const handler = t.mock.method(repochecker, "handler");
	for (const implementation of [
		(request, ctx, callback) => callback(error),
		(request, ctx, callback) => callback(null),
		() => { throw error; },
	]) {
		handler.mock.mockImplementation(implementation);
		const res = response();
		await route({
			query: { url: "https://github.com/example/ioBroker.test" },
			headers: { authorization: ["Bearer", "test-token"].join(" ") },
		}, res);
		assert.equal(res.statusCode, 500);
		assert.equal(res.body, "Repochecker request failed");
	}
	assert.equal(log.mock.calls.length, 3);
	for (const call of log.mock.calls) {
		assert.deepEqual(call.arguments, ["Repochecker request failed"]);
	}
});
