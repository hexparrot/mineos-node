REGISTRY_NAME := 
REPOSITORY_NAME := hexparrot/
IMAGE_NAME := mineos
TAG := :latest
PLATFORMS := linux/amd64,linux/arm/v7,linux/arm64

.PHONY: getcommitid
all: build

getcommitid: 
	$(eval COMMITID = $(shell git log -1 --pretty=format:"%H"))

build: getcommitid
	@docker build -t $(REGISTRY_NAME)$(REPOSITORY_NAME)$(IMAGE_NAME):$(COMMITID) -f Dockerfile .
	@docker build -t $(REGISTRY_NAME)$(REPOSITORY_NAME)$(IMAGE_NAME)$(TAG) -f Dockerfile .

publish: build
	docker login
	docker push $(REGISTRY_NAME)$(REPOSITORY_NAME)$(IMAGE_NAME)$(TAG)
	docker push $(REGISTRY_NAME)$(REPOSITORY_NAME)$(IMAGE_NAME):$(COMMITID)
	docker logout

build-multiarch: getcommitid
        @docker buildx build --platform $(PLATFORMS) --tag $(REGISTRY_NAME)$(REPOSITORY_NAME)$(IMAGE_NAME):$(COMMITID) -f Dockerfile .
        @docker buildx build --platform $(PLATFORMS) --tag $(REGISTRY_NAME)$(REPOSITORY_NAME)$(IMAGE_NAME)$(TAG) -f Dockerfile .

publish-multiarch: build-multiarch
        docker login
        docker buildx build --push --platform $(PLATFORMS) --tag $(REGISTRY_NAME)$(REPOSITORY_NAME)$(IMAGE_NAME)$(TAG) -f Dockerfile .
        docker buildx build --push --platform $(PLATFORMS) --tag $(REGISTRY_NAME)$(REPOSITORY_NAME)$(IMAGE_NAME):$(COMMITID) -f Dockerfile .
        docker logout
