FROM node:4-onbuild

VOLUME /var/games/minecraft
#arbitrarily assigned ports for 5 servers. change if you need to.
EXPOSE 8443 25565-25570


##i want jdk8, so enable debian testing
RUN echo "deb http://httpredir.debian.org/debian/ testing main" >> /etc/apt/sources.list

##update and accept all prompts
RUN apt-get update -y && apt-get install -y \
  git \
  rdiff-backup \
  screen \
  openjdk-8-jre-headless \
  rsync \
  && apt-get clean \
  && rm -rf /var/lib/apt/lists/*

##clone the repo
RUN mkdir -p /usr/games; \
	cd /usr/games; \
	git clone https://github.com/mjeries/mineos-node.git minecraft

##generate a cert. sync before generating to avoid an error
RUN cd /usr/games/minecraft; \
	chmod +x generate-sslcert.sh; \
	sync; \
	./generate-sslcert.sh

##install deps
RUN cd /usr/games/minecraft; \
	npm install

RUN useradd mc; \
	echo "mc:admin" | chpasswd

ENTRYPOINT ["node","webui.js"]
