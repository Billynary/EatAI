# EatAI

Food management for a single household: what is in the fridge, what is about to
expire, what to buy, and what to cook with it. Vanilla HTML/CSS/JS in front, a
small Express API behind it, PostgreSQL underneath. Everything runs in Docker.

## Stack

| Part       | Technology                                      |
| ---------- | ----------------------------------------------- |
| Frontend   | Vanilla HTML5, CSS3, JavaScript (no build step) |
| API        | Node.js 22, Express                             |
| Database   | PostgreSQL 17                                   |
| Recipes    | OpenAI Assistants API                           |
| Deployment | Docker Compose, nginx reverse proxy             |

## Quick start

```bash
make env          # copy .env.example to .env, then fill in the secrets
make up           # build and start the stack
```

Open <http://localhost:8080>. `make help` lists every target.

## Layout

```
apps/api/         Express REST API
  src/config.js     every environment variable, resolved once
  src/db.js         PostgreSQL pool
  src/routes/       HTTP routes
apps/web/         static frontend served by nginx
db/               schema (init.sql) and migrations
deploy/           Dockerfiles and nginx configuration
docs/             working notes, not tracked in git
```

## Configuration

All settings live in `.env`; see `.env.example` for the full list. The API is the
only component that reads secrets, and no key ever reaches the browser.

| Variable                                | Meaning                                    |
| --------------------------------------- | ------------------------------------------ |
| `HTTP_PORT`                             | published port of the reverse proxy        |
| `BACKEND_PORT`                          | port the API listens on inside the network |
| `POSTGRES_*`                            | database host, credentials and name        |
| `OPENAI_API_KEY`, `OPENAI_ASSISTANT_ID` | recipe generation                          |

Only the proxy publishes a port. The API and the database stay on the internal
compose network.

## API

| Method   | Path                    | Purpose                              |
| -------- | ----------------------- | ------------------------------------ |
| `GET`    | `/api/health`           | liveness probe                       |
| `GET`    | `/api/food`             | list inventory, soonest expiry first |
| `POST`   | `/api/food`             | add an item                          |
| `PUT`    | `/api/food/:id`         | update an item                       |
| `DELETE` | `/api/food/:id`         | remove an item                       |
| `POST`   | `/api/generate-recipes` | recipes from the current inventory   |

## Development

```bash
make logs                 # follow the logs
make shell SERVICE=api    # shell inside a container
make lint                 # eslint
make fmt                  # prettier
make clean                # stop and drop the volumes
```

The database schema is applied from `db/init.sql` on first start only. Later
changes go into `db/migrations/` as numbered files; see `docs/migrations.md`.
