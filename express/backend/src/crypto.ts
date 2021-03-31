import * as crypto from "crypto";

const algorithm = "aes-256-ctr";
const secretKey = "5gfHDnY9DfVPgztDe8EblkJpsuL6KWDt";
const iv = crypto.randomBytes(16);

export function encrypt<T>(obj: T) {
	const cipher = crypto.createCipheriv(algorithm, secretKey, iv);
	const encrypted = Buffer.concat([
		cipher.update(JSON.stringify(obj), "utf8"),
		cipher.final(),
	]);

	return encrypted.toString("base64");
}

export function decrypt<T>(encrypted: string): T {
	const decipher = crypto.createDecipheriv(algorithm, secretKey, iv);
	const decrpyted = Buffer.concat([
		decipher.update(Buffer.from(encrypted, "base64")),
		decipher.final(),
	]);

	return JSON.parse(decrpyted.toString("utf8"));
}
