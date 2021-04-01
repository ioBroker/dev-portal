// specified environment variables
export const env: Readonly<{
	HTTP_PUBLIC_PATH?: string;
	TEMP_DIR?: string;
	PORTAL_GITHUB_OAUTH_CLIENT_ID: string;
	PORTAL_GITHUB_OAUTH_CLIENT_SECRET: string;
	CREATOR_GITHUB_OAUTH_CLIENT_ID: string;
	CREATOR_GITHUB_OAUTH_CLIENT_SECRET: string;
}> = process.env as any;
