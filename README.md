# ioBroker Developer Portal

This repository contains all code used in the ioBroker Developer Portal at https://www.iobroker.dev

## Development

### Setup

To install the application you can run `npm install` in these directories:

-   `./express/frontend`
-   `./express/backend`

# Build

To build the application you can run `npm build` in these directories:

-   `./express/frontend`
-   `./express/backend`

# Hot-reload on code changes

You may also use hot-reload of both the backend and frontend code.
For this, you can start each applications with the respective command:

-   frontend: `npm run start` (open http://localhost:3000/ with your browser)
-   backend: `npm run watch` (open http://localhost:8080/ with your browser)

Note: running the backend in watch mode will not use the frontend in hot-reload!

## Deployment

The orchestration is done using docker-compose.

### Running the server

1. Create a file called `docker-compose.override.yml` in this root directory and configure all environment variables and the port to expose:

```yml
version: "3"
services:
    express:
        ports:
            - "80:8080"
        environment:
            PORTAL_GITHUB_OAUTH_CLIENT_ID: 1234567890abcdefghij
            PORTAL_GITHUB_OAUTH_CLIENT_SECRET: 123456e0a66c140657890abcdefghij7236c1406
            CREATOR_GITHUB_OAUTH_CLIENT_ID: abcdefghij1234567890
            CREATOR_GITHUB_OAUTH_CLIENT_SECRET: abcdefghij7236c1406123456e0a66c140657890
```

2. In this root directory call `docker-compose up --build`

### Environment variables

The following environment variables can be configured:

-   `PORTAL_GITHUB_OAUTH_CLIENT_ID`: GitHub Client ID of your OAuth App that is used for general portal login (see below)
-   `PORTAL_GITHUB_OAUTH_CLIENT_SECRET`: Client secret belonging to the above OAuth App
-   `CREATOR_GITHUB_OAUTH_CLIENT_ID`: GitHub Client ID of your OAuth App that is used to create and modify repositories (see below)
-   `CREATOR_GITHUB_OAUTH_CLIENT_SECRET`: Client secret belonging to the above OAuth App

### GitHub OAuth Apps

Two [OAuth App](https://github.com/settings/applications/new) are required to run this server:

-   The general portal login application will always only ask for public data (and the e-mail address) and is used to authenticate the user, find his GitHub repositories and other publicly available information. The e-mail address might be used at a later time to send information about ioBroker development to the user (after consent!). The [scope](https://docs.github.com/en/developers/apps/scopes-for-oauth-apps) the OAuth request is `user:email`.
-   Adapter Creator application will ask the user for much more permissons than the portal OAuth app. It is used to create repositories using the Adapter Creator and allow to modify code from this application. No interaction with the repository will ever be made without the user consenting at the given moment (there are no overnight jobs or anything like that). The [scope](https://docs.github.com/en/developers/apps/scopes-for-oauth-apps) the OAuth request is `repo`.

Both applications must point to `https://<your-server>/auth/` as the Authorization callback URL. For development this URL might be something like `http://localhost:8080/auth/`.
