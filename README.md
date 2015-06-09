Node.JS MineOS
======

MineOS is a server front-end to ease managing Minecraft administrative tasks.
This iteration using Node.js aims to enhance previous MineOS scripts (Python-based),
by leveraging the event-triggering, asyncronous model of Node.JS and websockets.

This allows the front-end to provide system health, disk and memory usage, and logging in real-time.

The ultimate goal will be for this to work on all Linux and BSD distros, but so
far testing and development has only occurred on Debian-based Linux distributions.

Installation
------------

MineOS is distributed (right now) through github and downloads its dependencies with npm.

MineOS requires root-privileges, as the authentication relies on the underlying system's /etc/shadow.

Do not install this atop an existing MineOS system, since the installation location is the same /usr/games/minecraft. Using an apt-get based Linux distribution:

    apt-get update
    apt-get install -y nodejs nodejs-legacy npm git rdiff-backup screen openjdk-7-jre-headless
    mkdir -p /usr/games
    cd /usr/games
    git clone https://github.com/hexparrot/mineos-node.git minecraft
    cd minecraft
    chmod +x generate-sslcert.sh
    ./generate-sslcert.sh
    npm install --all
    
For hosts using 'upstart':

    cp /usr/games/minecraft/init/upstart_conf /etc/init/mineos.conf
    start mineos

For hosts using 'supervisor':

    cp /usr/games/minecraft/init/supervisor_conf /etc/supervisor/conf.d/mineos.conf
    supervisorctl reread
    supervisorctl update
    supervisorctl start mineos

For hosts using 'systemd':

    cp /usr/games/minecraft/init/systemd_conf /etc/systemd/system/mineos.service
    systemctl enable mineos
    systemctl start mineos

To use the webui as a background daemon:

    nodejs service.js [start|stop|restart|status]

To start the webui in the foreground:

    nodejs webui.js

Developing and Contributing
------

I'd love to get contributions from you! Whether you are most comfortable writing
HTML, CSS, or Javascript (either Nodejs or Angular), feel free to reach out to me about
some of my design goals and we'll see where your efforts can best be used.


License
-------

See [LICENSE.md](LICENSE.md) file.

Support
-------

Create an issue in github or start a post on the [MineOS support forums](http://discourse.codeemo.com).

CURRENTLY WORKING
-------

The Angular.JS-based web user interface capable of:

* creating and deleting servers, 
* starting, restarting, killing and stopping servers 
* backup, archive, wait-for-stop-and-backup
* reading ingame console in real-time and submitting commands
* create cronjobs for the most common tasks
* adding and modifying server.properties
* delete previous archives and restore poitns to free up space
* restore server from previous restore point
* see filesystem usage of live server files, archives, and restore points
* easy selection of server packs from FTB or Mojang official jars
* authentication via shadow passwords (/etc/shadow) of underlying Linux system
* logs all user actions to file
* cronjobs saved to portable format cron.config
* server can be daemonized to background
* upstart/supervisord restart process on unhandled exceptions

TODO
-------

* macro often-repeated tasks from web-ui
* more fully document functions

EVENTUALLY
-------

* implement previous_versions: functionality to roll back or view particular files' previous state
* command-line interface for scripting
* PHAR support
* identify java versions in web-ui, allow choice of utilized jvm
