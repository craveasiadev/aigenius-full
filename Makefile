# =====================================================================
# Aigenius-Full — convenience targets
# =====================================================================
SHELL := /bin/sh

COMPOSE ?= docker compose

.PHONY: help build up start stop down restart logs ps shell-app shell-mysql \
        migrate seed fresh cache clear-cache nuke pull

help: ## Show this help
	@awk 'BEGIN {FS = ":.*##"} /^[a-zA-Z_-]+:.*##/ { printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2 }' $(MAKEFILE_LIST)

build: ## Build all images (multi-stage, cached)
	$(COMPOSE) build --pull

up: ## Build + start in background (first boot does migrate + seed)
	$(COMPOSE) up -d --build

start: ## Start without rebuilding
	$(COMPOSE) up -d

stop: ## Stop containers (data preserved)
	$(COMPOSE) stop

down: ## Stop + remove containers (volumes kept)
	$(COMPOSE) down

restart: ## Restart all containers
	$(COMPOSE) restart

logs: ## Tail all logs
	$(COMPOSE) logs -f --tail=200

ps: ## Show container status
	$(COMPOSE) ps

shell-app: ## Open bash inside the Laravel app container
	$(COMPOSE) exec app bash

shell-mysql: ## Open a MySQL CLI session
	$(COMPOSE) exec mysql sh -c 'mysql -uroot -p$$MYSQL_ROOT_PASSWORD $$MYSQL_DATABASE'

migrate: ## Run pending migrations on a running stack
	$(COMPOSE) exec app php artisan migrate --force

seed: ## Run all seeders (idempotent)
	$(COMPOSE) exec app php artisan db:seed --force

fresh: ## DROP all data + rebuild schema + reseed (DESTRUCTIVE)
	$(COMPOSE) exec app php artisan migrate:fresh --seed --force
	$(COMPOSE) exec app touch /var/www/backend/storage/.seeded

cache: ## Rebuild prod caches (config/route/view)
	$(COMPOSE) exec app php artisan optimize

clear-cache: ## Clear all Laravel caches
	$(COMPOSE) exec app php artisan optimize:clear

nuke: ## DROP everything — containers AND volumes (DESTRUCTIVE)
	$(COMPOSE) down -v

pull: ## Pull latest base images
	$(COMPOSE) pull
