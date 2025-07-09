# Makefile for NovaDocs development

.PHONY: help setup dev build test lint clean docker-up docker-down migrate

# Colors for output
RED = \033[0;31m
GREEN = \033[0;32m
YELLOW = \033[1;33m
NC = \033[0m # No Color

help: ## Show this help message
	@echo "$(GREEN)NovaDocs Development Commands$(NC)"
	@echo ""
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  $(YELLOW)%-15s$(NC) %s\n", $$1, $$2}' $(MAKEFILE_LIST)

setup: ## Set up development environment
	@echo "$(GREEN)Setting up NovaDocs development environment...$(NC)"
	@if [ ! -f .env ]; then cp .env.example .env; echo "$(YELLOW)Created .env file from .env.example$(NC)"; fi
	@npm install
	@cd apps/frontend && npm install
	@cd apps/backend && poetry install
	@echo "$(GREEN)Setup complete!$(NC)"

dev: ## Start development servers
	@echo "$(GREEN)Starting development servers...$(NC)"
	@docker-compose -f infrastructure/docker/development/docker-compose.yml up -d
	@sleep 5
	@make migrate
	@npm run dev

build: ## Build all applications
	@echo "$(GREEN)Building applications...$(NC)"
	@cd apps/frontend && npm run build
	@cd apps/backend && poetry build

test: ## Run all tests
	@echo "$(GREEN)Running tests...$(NC)"
	@cd apps/frontend && npm run test
	@cd apps/backend && poetry run pytest

lint: ## Run linters
	@echo "$(GREEN)Running linters...$(NC)"
	@cd apps/frontend && npm run lint
	@cd apps/backend && poetry run flake8 src/ && poetry run black --check src/ && poetry run isort --check-only src/

clean: ## Clean build artifacts
	@echo "$(GREEN)Cleaning build artifacts...$(NC)"
	@rm -rf apps/frontend/.next
	@rm -rf apps/frontend/dist
	@rm -rf apps/backend/dist
	@rm -rf apps/backend/.pytest_cache
	@find . -name "*.pyc" -delete
	@find . -name "__pycache__" -delete

docker-up: ## Start development Docker containers
	@echo "$(GREEN)Starting Docker containers...$(NC)"
	@docker-compose -f infrastructure/docker/development/docker-compose.yml up -d
	@echo "$(GREEN)Containers started!$(NC)"
	@echo "$(YELLOW)PostgreSQL:$(NC) localhost:5432"
	@echo "$(YELLOW)Redis:$(NC) localhost:6379"
	@echo "$(YELLOW)MinIO:$(NC) localhost:9000"

docker-down: ## Stop development Docker containers
	@echo "$(GREEN)Stopping Docker containers...$(NC)"
	@docker-compose -f infrastructure/docker/development/docker-compose.yml down

migrate: ## Run database migrations
	@echo "$(GREEN)Running database migrations...$(NC)"
	@cd apps/backend && poetry run alembic upgrade head

seed: ## Seed database with sample data
	@echo "$(GREEN)Seeding database with sample data...$(NC)"
	@cd apps/backend && poetry run python scripts/seed_data.py

status: ## Show status of all services
	@echo "$(GREEN)Service Status:$(NC)"
	@docker-compose -f infrastructure/docker/development/docker-compose.yml ps

logs: ## View application logs
	@echo "$(GREEN)Viewing application logs...$(NC)"
	@docker-compose -f infrastructure/docker/development/docker-compose.yml logs -f

psql: ## Connect to PostgreSQL
	@docker-compose -f infrastructure/docker/development/docker-compose.yml exec postgres psql -U novadocs novadocs

redis-cli: ## Connect to Redis
	@docker-compose -f infrastructure/docker/development/docker-compose.yml exec redis redis-cli
