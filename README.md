Node.JS MineOS
======

MineOS is a server front-end to ease managing Minecraft administrative tasks.
This iteration using Node.js aims to enhance previous MineOS scripts (Python-based),
by leveraging the event-triggering, asyncronous model of Node.JS and websockets.

This allows the front-end to provide system health, disk and memory usage, and logging in real-time.

The ultimate goal will be for this to work on all Linux and BSD distros, but so
far testing and development has only occurred on Linux.

Installation
------------

MineOS is distributed (right now) through github and downloads its dependencies with npm.
In the future, MineOS will be it's own NPM project which should facilitate even easier installation.

MineOS requires root-privileges, as the authentication relies on the underlying system's /etc/shadow.

Using an apt-get based Linux distribution:

    sudo apt-get install -y nodejs nodejs-legacy npm git rdiff-backup screen openjdk-7-jre-headless
    git clone https://github.com/hexparrot/mineos-node.git
    cd mineos-node
    chmod +x generate-sslcert.sh
    sudo ./generate-sslcert.sh
    npm install --all
    sudo nodejs webui.js

This installs--then runs--the webui in the foreground. service.js is a background daemon,
but in the early development and deployments of this new webui, it is likely more valuable
to have the errors immediately accessible.

Developing and Contributing
------

I'd love to get contributions from you! Whether you are most comfortable writing
HTML, CSS, or Javascript (either Node or Angular), feel free to reach out to me about
some of my design goals and we'll see where your efforts can best be used.


License
-------

See [LICENSE.md](LICENSE.md) file.

Support
-------

Create an issue in github or start a post on the [http://discourse.codeemo.com/](MineOS support forums).

CURRENTLY WORKING
-------

The Angular.JS-based web user interface capable of:

* creating and deleting servers, 
* starting, restarting, killing and stopping servers 
* backup, archive, wait-for-stop-and-backup
* reading ingame console in real-time and submitting commands
* create cronjobs for the most common tasks
* modifying server.properties
* delete previous archives and restore poitns to free up space
* restore server from previous restore point
* see filesystem usage of live server files, archives, and restore points
* easy selection of server packs from FTB or Mojang official jars
* authentication via shadow passwords (/etc/shadow) of underlying Linux system
* logs all user actions to file
* cronjobs saved to portable format cron.config
* server can be daemonized to background

TODO
-------

* macro often-repeated tasks from web-ui
* auto-restart on unhandled exceptions
* more fully document functions

EVENTUALLY
-------

* implement previous_versions: functionality to roll back or view particular files' previous state
* command-line interface for scripting
* PHAR support
* identify java versions in web-ui, allow choice of utilized jvm
