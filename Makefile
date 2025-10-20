# --------------------------------------
# 🐳 Makefile for building and pushing Docker images
# --------------------------------------

# === Variables ===
REGISTRY ?= vivien8
VERSION ?= $(shell git rev-parse --short HEAD)
LATEST_TAG ?= latest

# === Services ===
SERVICES = api producer consumer

# === Default target ===
all: build push

# === Build all images ===
build: $(SERVICES:%=build-%)

# === Push all images ===
push: $(SERVICES:%=push-%)

# === Build single service ===
build-%:
	@echo "🔨 Building $*..."
	docker build \
		-t $(REGISTRY)/$*-service:$(VERSION) \
		-t $(REGISTRY)/$*-service:$(LATEST_TAG) \
		-f ./services/$*/Dockerfile .
	@echo "✅ Built $(REGISTRY)/$*-service:$(VERSION)"

# === Push single service ===
push-%:
	@echo "📤 Pushing $*..."
	docker push $(REGISTRY)/$*-service:$(VERSION)
	docker push $(REGISTRY)/$*-service:$(LATEST_TAG)
	@echo "✅ Pushed $(REGISTRY)/$*-service:$(VERSION)"

# === Clean up ===
clean:
	@echo "🧹 Cleaning local images..."
	@for service in $(SERVICES); do \
		docker rmi -f $(REGISTRY)/$$service-service:$(VERSION) || true; \
	done
	@echo "✅ Cleaned up!"

# === Docker Hub login ===
login-dockerhub:
	@echo "🔐 Logging in to Docker Hub..."
	docker login -u $(REGISTRY)
	@echo "✅ Logged in as $(REGISTRY)"

# === Help ===
help:
	@echo "Available targets:"
	@echo "  make build            Build all Docker images"
	@echo "  make push             Push all Docker images"
	@echo "  make build-api        Build only API"
	@echo "  make push-producer    Push only Producer"
	@echo "  make login-dockerhub  Login to Docker Hub"
	@echo "  make clean            Remove local images"
