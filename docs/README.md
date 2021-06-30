## MineOS

MineOS is an entire ecosystem of web applications, shell scripts, wikis, and support forums
designed to help Minecraft enthusiasts successfully host servers on *nix platforms.

### Why MineOS?

MineOS is all about learning to be an effective game host. Even better, a system administrator. No sacrifices are made--neither in security nor functionality--to provide users with a fun, educational, and effective hosting platform.

There have been numerous iterations of MineOS, all of which shared the same moniker.
For clarity, here are some of the ways the name is used:

### MineOS (the web user interface): Node.JS-based single-page application (SPA)

MineOS is a web-based server front-end to centralize and simplify Minecraft sysadmin tasks.

The single-page application leverages the event-triggering, asyncronous model of Node.JS and websockets.  This is the primary interface for admins to download Minecraft server jars, create and configure multiple servers, start/stop instances, and create backups and initiate restores.

It provides system health, disk and memory usage, and logging in real-time. The webui supports multiple, independent users, and uses standard Linux file permissions to keep data appropriately isolated. 

The webui has been tested on all major distributions and is confirmed to work on both Linux and BSD, x86_64 and ARM architectures.

### MineOS Turnkey (the Debian-based distribution)

MineOS Turnkey is the current flagship distribution of MineOS. Based on the proven Debian foundation, [Turnkey Linux](https://www.turnkeylinux.org/) is a perfect delivery system: a trimmed, yet infinitely extensible server platform. Respun with MineOS components pre-configured, MineOS Turnkey is the quickest way to get a _managed hosting platform_ up and running.

The [MineOS Turnkey ISO](https://my.syncplicity.com/share/ajsnpyhdoivvekm/mineos-node_buster-x64) is approximately 575MB and supports x86_64 architectures only. 

### MineOS appliance (the other ways)

Sysadmins familiar with Docker or unRAID also have easy deployment options:

- Docker via [Docker Hub](https://hub.docker.com/repository/docker/hexparrot/mineos)
- Docker via [manual build](https://github.com/hexparrot/mineos-node/blob/master/Dockerfile)
- Appliance in unRAID

### Adding the webui to an existing distro

- [Debian 10](install/debian_10.md)
- [CentOS 8](install/centos_8.md)
- [Ubuntu 20](install/ubuntu_20.md)
- [Archlinux](install/archlinux.md)
- [Alpine](install/alpine.md)
- [FreeBSD](install/freebsd.md)

## Wiki Landing Pages

- [Installation](install/index.md)
- [Securing](secure/index.md)

Developing and Contributing
------

I'd love to see contributions from the community! Whether you are most comfortable writing
HTML, CSS, or Javascript (either node or angular), feel free to reach out to me about
some of the design goals and we'll see where your efforts can best be used.

License
-------

See [LICENSE.md](../LICENSE.md) file.

Support
-------

Create an issue in github or start a post on the [MineOS support forums](https://discourse.codeemo.com).
