REGISTRY_NAME := 
REPOSITORY_NAME := hexparrot/
TAG := :bmcclure

build:
	$(Q)docker build -t $(REGISTRY_NAME)$(REPOSITORY_NAME)mineos$(TAG) -f Dockerfile .