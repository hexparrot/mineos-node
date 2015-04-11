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

Using an apt-get based Linux distribution:

    apt-get install -y nodejs npm git
    git clone https://github.com/hexparrot/mineos-node.git
    cd mineos-node
    npm install --all
    nodejs webui

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


TODO
-------

* implement authentication model and web-ui login page
* implement server.config importing and configuration in the web-ui
* implement profiles or a replacement model for downloading jar files
* implement previous_versions: functionality to roll back or view particular files' previous state
* remove restore points from the web-ui, allow rotation of restore points
* save all user actions in web-ui to a file/database (log kept in working memory currently)
* macro often-repeated tasks from web-ui
* PHAR support
* identify java versions in web-ui, allow choice of utilized jvm
* more fully document functions

CURRENTLY WORKING
-------

The Angular.JS-based web user interface capable of:

* creating and deleting servers, 
* starting, restarting, killing and stopping servers 
* backup, archive, wait-for-stop-and-backup
* reading ingame console in real-time and submitting commands
* create cronjobs for the most common tasks
* modifying server.properties
* delete previous archives to free up space
* restore server from previous restore point
* see filesystem usage of live server files, archives, and restore points
