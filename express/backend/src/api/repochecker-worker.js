'use strict';

const { handler } = require('@iobroker/repochecker');

function send(message) {
    if (process.send) {
        process.send(message);
    }
}

function serializeError(error) {
    if (!error) {
        return undefined;
    }

    if (error instanceof Error) {
        return {
            name: error.name,
            message: error.message,
            stack: error.stack,
        };
    }

    return error;
}

const request = JSON.parse(process.argv[2] || '{}');

process.on('uncaughtException', error => {
    send({ error: serializeError(error) });
    process.exit(1);
});

process.on('unhandledRejection', error => {
    send({ error: serializeError(error) });
    process.exit(1);
});

handler(request, null, (error, result) => {
    send({
        error: serializeError(error),
        result,
    });
    process.exit(error || !result ? 1 : 0);
});
