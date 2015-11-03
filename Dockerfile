FROM node:4.2

VOLUME /var/games/minecraft
EXPOSE 8443 25565-25570

RUN apt-get update -y
RUN apt-get install -y npm git rdiff-backup screen openjdk-7-jre-headless
RUN mkdir -p /usr/games && cd /usr/games && git clone https://github.com/mjeries/mineos-node.git minecraft
RUN cd /usr/games/minecraft && chmod +x generate-sslcert.sh; sync && ./generate-sslcert.sh
RUN cd /usr/games/minecraft && npm install