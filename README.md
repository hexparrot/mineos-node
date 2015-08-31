Node.JS MineOS
======

MineOS is a server front-end to ease managing Minecraft administrative tasks.
This iteration using Node.js aims to enhance previous MineOS scripts (Python-based),
by leveraging the event-triggering, asyncronous model of Node.JS and websockets.

This allows the front-end to provide system health, disk and memory usage, and logging in real-time.

This has been tested on Debian, Ubuntu, ArchLinux, and FreeBSD and should work on all variants, Linux or BSD.

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
    /bin/bash generate-sslcert.sh
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

    node service.js [start|stop|restart|status]

To start the webui in the foreground:

    node webui.js
    
Things to watch out for
------

On FreeBSD, you will need to mount a Linux-compatible /proc filesystem, i.e., linprocfs,
at /usr/compat/linux/proc in order for the web-ui to work.

On ArchLinux and OSX, installing the npm package "uname" fails.  The webui can operate
without this module, however, so it is possible to continue despite this issue.

Mineos-node requires rsync 3.1.x or later, 3.0.x does not have the ability to chown
on copy, which is essential for profiles. Depending on your distribution, you may need
to build it from source.

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
* authentication via shadow passwords (/etc/shadow) of underlying Linux system
* logs all user actions to file
* cronjobs saved to portable format cron.config
* server can be daemonized to background
* upstart/supervisord restart process on unhandled exceptions
* easy selection of server packs from FTB or Mojang official jars
* PHAR support for Pocketmine servers
* Support for BungeeCord servers
* command-line interface for scripting

TODO
-------

* macro often-repeated tasks from web-ui
* more fully document functions

EVENTUALLY
-------

* implement previous_versions: functionality to roll back or view particular files' previous state
* identify java versions in web-ui, allow choice of utilized jvm
