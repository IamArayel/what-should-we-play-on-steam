# What Should We Play On Steam

Fork of [Timmy1e/what-should-we-play-on-steam](https://gitlab.com/Timmy1e/what-should-we-play-on-steam), originally created by Tim van Leuverden.

Finding a game to play with friends is often tedious: everyone compares their library with the others, by hand. This application compares the Steam libraries of several players to show the games they have in common, using the [Steam APIs](https://developer.valvesoftware.com/wiki/).

## Stack

- Node.js / Express server, EJS views, Vue 2 front end.
- Redis, required: it caches Steam API responses and the home page.
- SCSS (`public/styles`) and client JavaScript (`public/scripts`) are compiled on the fly by the server, there is no front-end build step.

## Prerequisites

- [Git](https://git-scm.com/)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (or Docker Engine with the Compose plugin on Linux)
- A Steam API key, generated at [steamcommunity.com/dev/apikey](https://steamcommunity.com/dev/apikey) (requires a Steam account, the requested domain name can be `localhost`)

> The Docker image is based on Node 13. Running the project without Docker would require that same version, because `node-sass` does not build on recent Node versions. Docker is therefore the recommended way.

## Installation

1. Clone the repository and move into it:

   ```sh
   git clone https://github.com/IamArayel/what-should-we-play-on-steam.git
   cd what-should-we-play-on-steam
   ```

2. Copy `.env.example` to `.env`, then set your Steam API key in it:

   ```env
   STEAM_KEY=YOUR_STEAM_KEY
   ```

   The `.env` file is ignored by Git and Docker: the key never ends up in the repository or in the image.

3. Start Docker Desktop and check that the daemon responds:

   ```sh
   docker info
   ```

   If the command returns a connection error, Docker Desktop is not started yet.

## Run the application locally

From the project root:

```sh
docker compose up --build
```

This command builds the image, starts Redis and the application, then shows the logs. The server is ready when `Listening on port 3000` appears. `Ctrl+C` stops everything.

The [docker-compose.yml](docker-compose.yml) file runs the application in development mode:

- the local source code is mounted into the container, changes are picked up without rebuilding the image;
- `NODE_ENV=development` disables the Express view cache and shows error details in the browser.

For later runs, `docker compose up` is enough. `--build` is only needed after changing the `Dockerfile` or `package.json`.

## Use the interface in the browser

1. Open [http://localhost:3000](http://localhost:3000).
2. For each player, enter their Steam custom URL (the part after `steamcommunity.com/id/`) or their 17-digit ID. A new field appears as soon as a name is entered. Once a player is found, typing at least 2 letters of one of their friends' names shows up to 8 suggestions with avatars, friends shared by several entered players first. Friends of players whose friends list is private are not suggested.
3. Click the dice: the application picks a random game among those all players own. Click the dice again to pick another one.

Steam profiles and game lists must be **public**, otherwise a player's games are not found.

To avoid typing the same players every time, save them as a group:

- **Save**: enter a name under "Groups", then click Save. Saving under an existing name replaces that group.
- **Load**: replaces the current player list with the group's players. Players can then be added or removed for this session only; click Save again to keep the changes.
- **Delete**: the trash button removes the group.

Groups are stored in the browser's `localStorage`, so they are only available in the browser where they were saved.

If port 3000 is already in use, replace `"3000:3000"` with `"8080:3000"` in `docker-compose.yml` and open [http://localhost:8080](http://localhost:8080).

## Work on the code

Depending on the changed file:

| Changed file | To see the change |
| --- | --- |
| `public/styles/*.scss`, `public/scripts/*.js` | Refresh the page |
| `views/*.ejs` | Clear the Redis cache (`docker compose exec redis redis-cli FLUSHALL`), then refresh the page. The home page is cached for 15 minutes. |
| `app.js`, `server.js`, `routes/`, `models/` | Restart the application: `docker compose restart app` |
| `package.json`, `Dockerfile` | Rebuild: `docker compose up --build` |

Redis keeps running across Git branch switches, so after `git checkout` the home page can still show the previous branch's HTML. To refresh the cache, run:

```bash
docker compose exec redis redis-cli FLUSHALL
```

## Environment variables

| Variable | Purpose | Default |
| --- | --- | --- |
| `STEAM_KEY` | Steam API key, read from `.env` | none, required |
| `REDIS_SERVICE_HOST` | Redis host | `127.0.0.1` (`redis` with Compose) |
| `REDIS_SERVICE_PORT` | Redis port | `6379` |
| `REDIS_EXPIRE` | Cache duration, in seconds | `900` |
| `PORT` | Server listening port | `3000` |
| `NODE_ENV` | `production` or `development` | `production` in the image, `development` with Compose |

## Stop and clean up

- Stop: `Ctrl+C` in the `docker compose up` terminal, or `docker compose stop` from another terminal.
- Remove containers and network: `docker compose down`.
- Also remove the built image: `docker compose down --rmi local`.

## Without Docker Compose

To run the image as in production (code baked into the image, no mount), with plain Docker commands:

```sh
docker network create wswpos
docker run -d --name wswpos-redis --network wswpos redis:7
docker build -t wswpos .
docker run --rm --init --name wswpos-app --network wswpos -p 3000:3000 -e STEAM_KEY=YOUR_STEAM_KEY -e REDIS_SERVICE_HOST=wswpos-redis wswpos
```

Clean up: `docker rm -f wswpos-redis`, `docker network rm wswpos`, `docker rmi wswpos`.

## CI/CD

The Docker image is built automatically by GitHub Actions and published to the project's [Container Registry](https://github.com/IamArayel/what-should-we-play-on-steam/pkgs/container/what-should-we-play-on-steam).
