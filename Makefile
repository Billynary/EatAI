.DEFAULT_GOAL := help
.PHONY: help env up down restart logs ps health shell lint fmt clean

# Container engine. Podman is what this machine runs; override with
#   make CONTAINER=docker <target>
CONTAINER ?= podman
COMPOSE ?= $(CONTAINER) compose
# Published port: from .env when it exists, otherwise the compose default.
PORT := $(shell sed -n 's/^HTTP_PORT=//p' .env 2>/dev/null | tail -1)
PORT := $(if $(PORT),$(PORT),8080)
SERVICE ?= api

help: ## Show this help
	@grep -hE '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-10s\033[0m %s\n", $$1, $$2}'

env: ## Create .env from .env.example if missing
	@test -f .env || (cp .env.example .env && echo "created .env - fill in the secrets")

up: env ## Build and start the stack
	$(COMPOSE) up -d --build
	@echo "http://localhost:$(PORT)"

down: ## Stop the stack, keep the volumes
	$(COMPOSE) down

restart: ## Restart the stack
	$(COMPOSE) restart

logs: ## Follow the logs
	$(COMPOSE) logs -f

ps: ## Show service status
	$(COMPOSE) ps

health: ## Ask the API how it is doing
	@curl -fsS "http://localhost:$(PORT)/api/health" && echo

shell: ## Open a shell in a service (SERVICE=api)
	$(COMPOSE) exec $(SERVICE) sh

lint: ## Run the linters
	$(COMPOSE) run --rm --no-deps api npx eslint src

fmt: ## Format the sources
	npx prettier --write .

clean: ## Stop the stack and delete the volumes
	$(COMPOSE) down -v
