This is the github repository for MineOS Minecraft hosting and management scripts using NODE.JS.

This is currently a work-in-progress and is not production-ready (or probably even testing-ready).

Current state of scripts:
========

Most of the implemented backend is functional all well-tested, which is to say it operates cleanly with most of the core functionality of its Python counterpart. The scripts are still far from production-ready, however, since at least the following is absent:

- shadow password logins (hardcoded uid/gid)
- no "profiles" mechanism
- YAML support (as new server.profile format) and editing custom server config files

The following is implemented and working:

- create, delete servers
- backup, archive, restore
- start, stop, kill
- send commands to screen instance, server status ping
- procfs polling
- tracking of server addition and deletion for real-time updating in web-ui, as well as server logs
- a knockout.js based web-ui, which can do all of the above functions except: restore from archive, backup from increment