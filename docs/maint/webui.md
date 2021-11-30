# Webui Maintenance and Troubleshooting

This document is organized into two major sections: for general upkeep, and then secondly, to diagnose and solve problems with the webui.

## Maintaining your MineOS webui

### UPDATING THE WEBUI

When installing from Docker or unRAID, updates are accomplished through their respective utilities, e.g., `docker pull` or the unRAID UI. For FreeBSD, follow the instructions on the [FreeBSD installation page](../install/freebsd.md). For all other deployments, follow these steps:

```
# cd /usr/games/minecraft
# git fetch
# git pull origin master
# npm install --unsafe-perm
```

Be sure to look out for any errors produced to the screen from `npm install`--unfixed errors with modules (e.g., `posix` or `userid`) will leave the webui in an unusable state.

Finally, *restart the webui process*.  This differs on installation-to-installation, but can be accomplished in the following ways, listed in descending preferential order:

1) `# supervisorctl restart mineos`   # used on MineOS Turnkey, and all install-on-distro deployments
2) `# service mineos restart`         # used by `systemd`
3) reboot the server

### RESET THE WEBUI

Resetting the webui is different than updating--but is also not frequently needed. If you are manually changing any of the source code, or simply want to carpet-bomb to the repo to its base state, follow these steps: 

```
# cd /usr/games/minecraft
# git fetch
# git reset --hard origin/master
# git checkout master
# rm -rf ./node_modules
# npm install --unsafe-perm
```

Once again, be sure to restart the wbui process to ensure that all the reset scripts and node modules are active and loaded.

## Troubleshooting the webui

### THE WEBUI SHOWS TEMPLATE TEXT

In cases where there are any node module installation failures, the webui may show templating text, e.g., `SERVER_OVERVIEW`, `CURRENTLY_SELECTED_SERVER`, and the like. Though the positioning may be correct, it is also not showing any of the servers, load averages, or even the logged-in username.

These problems are always preceeded by error output in `npm install`.

#### Permission Denied - spawn ENOENT

This issue is caused by the omission of `--unsafe-perm`.

```
# npm install

> posix@4.1.2 install /usr/games/minecraft/node_modules/posix
> node-gyp rebuild

sh: 1: node-gyp: Permission denied
npm ERR! file sh
npm ERR! code ELIFECYCLE
npm ERR! errno ENOENT
npm ERR! syscall spawn
npm ERR! posix@4.1.2 install: `node-gyp rebuild`
npm ERR! spawn ENOENT
npm ERR! 
npm ERR! Failed at the posix@4.1.2 install script.
npm ERR! This is probably not a problem with npm. There is likely additional logging output above.
```

#### make failed with exit code

This issue is caused by a `node` installation that is unsupported--that is, the version of node invoked is not compatible with some of the `npm` dependencies and critical packages did not build.

```
# npm install posix --unsafe-perm
posix@4.1.1 install /usr/games/minecraft/node_modules/posix
node-gyp rebuild

make: Entering directory ‘/usr/games/minecraft/node_modules/posix/build’
CXX(target) Release/obj.target/posix/src/posix.o
In file included from …/node_modules/nan/nan.h:190,
from …/src/posix.cc:1:
…/node_modules/nan/nan_maybe_43_inl.h: In function ‘Nan::Maybe Nan::ForceSet(v8::Localv8::Object, v8::Localv8::Value, v8::Localv8::Value, v8::PropertyAttribute)’:
…/node_modules/nan/nan_maybe_43_inl.h:88:15: error: ‘class v8::Object’ has no member named ‘ForceSet’
return obj->ForceSet(GetCurrentContext(), key, value, attribs);

[snip]

gyp ERR! build error
gyp ERR! stack Error: make failed with exit code: 2
gyp ERR! stack at ChildProcess.onExit (/usr/lib/node_modules/npm/node_modules/node-gyp/lib/build.js:258:23)
gyp ERR! stack at ChildProcess.emit (events.js:182:13)
gyp ERR! stack at Process.ChildProcess._handle.onexit (internal/child_process.js:235:12)
gyp ERR! System Linux 4.16.8-1-ARCH
gyp ERR! command “/usr/bin/node” “/usr/lib/node_modules/npm/node_modules/node-gyp/bin/node-gyp.js” “rebuild”
gyp ERR! cwd /usr/games/minecraft/node_modules/posix
gyp ERR! node -v v4.0.0
gyp ERR! node-gyp -v v3.6.2
gyp ERR! not ok
npm ERR! code ELIFECYCLE
npm ERR! errno 1
npm ERR! posix@4.1.1 install: node-gyp rebuild
npm ERR! Exit status 1
npm ERR!
npm ERR! Failed at the posix@4.1.1 install script.
npm ERR! This is probably not a problem with npm. There is likely additional logging output above.

npm ERR! A complete log of this run can be found in:
npm ERR! /root/.npm/_logs/2018-05-11T03_17_31_779Z-debug.log
```

In this case, identify your version of node (`node -v`); either remove and install a more recent version, or change the init file to point to your preferred binary.

```
# which node
/usr/bin/node
# node -v
v8.17.0
```

In the event you have multiple versions of node present, you will want to update the init files in your `/etc/` filetree.

```
# cat /etc/supervisor/conf.d/mineos.conf 
[program:mineos]
command=/usr/bin/node webui.js
...
```
