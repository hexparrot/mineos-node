FROM debian:jessie
MAINTAINER William Dizon <wdchromium@gmail.com>

#arbitrarily assigned ports for 5 servers. change if you need to.
EXPOSE 8443 25565

RUN useradd -ms /bin/bash mc
RUN echo 'mc:minecraft' | chpasswd

#add testing repository for OpenJDK8
RUN echo "deb http://http.debian.net/debian jessie-backports main" >> /etc/apt/sources.list

#update and accept all prompts
RUN apt-get update && apt-get install -y \
  build-essential \
  supervisor \
  rdiff-backup \
  screen \
  openjdk-8-jre-headless \
  rsync \
  git \
  curl \
  rlwrap

#install node from nodesource
RUN curl https://deb.nodesource.com/node_4.x/pool/main/n/nodejs/nodejs_4.3.1-1nodesource1~jessie1_amd64.deb > node.deb \
 && dpkg -i node.deb \
 && rm node.deb

#create mineos directories
RUN mkdir -p /var/games/minecraft \
  && mkdir -p /usr/games/minecraft

#download mineos and setup supervisor init
RUN cd /usr/games/minecraft \
  && git clone --depth=1 https://github.com/hexparrot/mineos-node.git . \
  && sh generate-sslcert.sh \
  && npm install \
  && chmod +x webui.js mineos_console.js service.js \
  && cp init/supervisor_conf /etc/supervisor/conf.d/mineos.conf

RUN apt-get clean \
  && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

VOLUME /var/games/minecraft
CMD ["/usr/bin/supervisord", "-n", "-c", "/etc/supervisor/supervisord.conf"]
