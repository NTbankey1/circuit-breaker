.PHONY: help run test bench clean

help: ## Show this help
	@echo "Available targets:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-15s %s\n", $$1, $$2}'

run: ## Run HTTP example
	@echo "Starting circuit breaker demo..."
	@echo "Metrics will be available at: http://localhost:2112/metrics"
	go run cmd/http-example/main.go

test: ## Run tests
	go test -v -race -cover ./...

bench: ## Run benchmarks
	go test -bench=. -benchmem ./...

clean: ## Clean build artifacts
	go clean
	rm -f circuit-breaker

build: ## Build binary
	go build -o circuit-breaker cmd/http-example/main.go

metrics: ## View Prometheus metrics
	@echo "Opening metrics endpoint..."
	@curl -s http://localhost:2112/metrics | grep circuit_breaker

install: ## Install dependencies
	go mod download
	go mod tidy
