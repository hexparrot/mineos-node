mineos-node
===========

This is the node.js implementation of mineos minecraft management scripts. In using node.js, these scripts operate asynchronously and are event-driven, which means real-time updating of data.

Current state of scripts:

Most of the implemented backend is functional all well-tested, which is to say it operates cleanly with most of the core functionality of its Python counterpart. The scripts are still far from production-ready, however, since at least the following is absent:

1) shadow password logins (hardcoded uid/gid)
2) no "profiles" mechanism
3) a web-ui
4) YAML support (as new server.profile format) and editing custom server config files

The following is implemented and working:

1) create, delete servers
2) backup, archive, restore
3) start, stop, kill
4) send commands to screen instance, server status ping
5) procfs polling
6) tracking of server addition and deletion for real-time updating in web-ui, as well as server logs
