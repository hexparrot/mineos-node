FROM node:5
MAINTAINER William Dizon <wdchromium@gmail.com>

#arbitrarily assigned ports for 5 servers. change if you need to.
EXPOSE 8443 25565

RUN useradd -ms /bin/bash mc
RUN echo 'mc:minecraft' | chpasswd

#add testing repository for OpenJDK8
RUN echo "deb http://http.debian.net/debian jessie-backports main" >> /etc/apt/sources.list

#update and accept all prompts
RUN apt-get update && apt-get install -y \
  supervisor \
  rdiff-backup \
  screen \
  openjdk-8-jre-headless \
  rsync \
  git \
  && apt-get clean \
  && rm -rf /var/lib/apt/lists/*

RUN mkdir -p /var/games/minecraft \
  && mkdir -p /usr/games/minecraft

RUN cd /usr/games/minecraft \
  && git clone https://github.com/hexparrot/mineos-node.git . \
  && sh generate-sslcert.sh \
  && npm install \
  && chmod +x webui.js mineos_console.js service.js \
  && cp init/supervisor_conf /etc/supervisor/conf.d/mineos.conf \
  && sed -i -e 's/\/usr\/bin\/node/\/usr\/local\/bin\/node/' /etc/supervisor/conf.d/mineos.conf

VOLUME /var/games/minecraft
CMD ["/usr/bin/supervisord", "-n", "-c", "/etc/supervisor/supervisord.conf"]
