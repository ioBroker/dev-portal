// specified environment variables
export const env: Readonly<{
	ALLOW_CORS?: string;
	HTTP_PUBLIC_PATH?: string;
	TEMP_DIR?: string;
	PORTAL_GITHUB_OAUTH_CLIENT_ID: string;
	PORTAL_GITHUB_OAUTH_CLIENT_SECRET: string;
	CREATOR_GITHUB_OAUTH_CLIENT_ID: string;
	CREATOR_GITHUB_OAUTH_CLIENT_SECRET: string;
	WEBLATE_ACCESS_TOKEN?: string;
	SENTRY_AUTH_TOKEN?: string;
}> = process.env as any;

export async function delay(ms: number): Promise<void> {
	return new Promise<void>((resolve) => setTimeout(resolve, ms));
}
