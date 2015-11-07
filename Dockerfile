FROM node:4-onbuild

VOLUME /var/games/minecraft
#arbitrarily assigned ports for 5 servers. change if you need to.
EXPOSE 8443 25565-25570


##update and accept all prompts
RUN apt-get update -y

##install documented packages and accept all prompts
RUN apt-get install -y npm git rdiff-backup screen openjdk-7-jre-headless rsync

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
