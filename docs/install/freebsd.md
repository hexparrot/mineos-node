# MineOS Webui on FreeBSD

The MineOS user interface can be installed on FreeBSD systems using the `pkg` package manager and the `supervisord` init system.

As written, these steps will install the webui with the following properties:

* The nodejs scripts will be installed to `/usr/local/games/minecraft`
* The user-data (servers, world config, etc.) will be in `/var/games/minecraft`
* The webui will be accessible at `https://[ip-address]:8443` in your browser
* It will run as `root`, and support an unlimited amount of users with one daemonized (background) process.
* It will support an unlimited amount of servers (bound by your hardware)

# Installation steps

The following steps much be executed as `root`.

## DEPENDENCIES

### LINPROCFS

The MineOS web-ui requires a Linux-compatible /proc filesystem. To enable linprocfs on load, execute these commands:

```
# echo 'linprocfs_load="YES"' >> /boot/loader.conf
# kldload linprocfs
# mkdir -p /usr/compat/linux/proc
# mount -t linprocfs linprocfs /usr/compat/linux/proc
# echo 'linproc /usr/compat/linux/proc linprocfs rw 0 0' >> /etc/fstab
```

### ADDITIONAL DEPENDENCIES
```
# pkg install -y rdiff-backup rsync gmake screen git python sysutils/py-supervisor www/node www/npm
```

### JAVA

OpenJDK versions lag behind in getting released to FreeBSD, so an appropriately recent version for Minecraft 1.17 may not be available. Instead, Oracle's JDK will work:

```
# pkg install linux-oracle-jdk18
```

## DOWNLOAD WEBUI FILES
```
# mkdir -p /usr/local/games
# cd /usr/local/games
# git clone git://github.com/hexparrot/mineos-node minecraft
# cd minecraft
# chmod +x service.js mineos_console.js webui.js generate-sslcert.sh
# ./generate-sslcert.sh
# cp mineos.conf /etc/mineos.conf
```

### BUILD NODE DEPENDENCIES
```
# echo "CXX=c++ npm install userid" | sh
# echo "CXX=c++ npm install" | sh
```

## USE HTTPS FOR SECURE TRANSPORT
```
# cd /usr/games/minecraft
# ./generate-sslcert.sh
```

## SUPERVISORD

FreeBSD offers `rc.conf` for the init system.

```
# cat /usr/local/games/minecraft/init/supervisor_conf.bsd >> /usr/local/etc/supervisord.conf
# echo 'supervisord_enable="YES"' >> /etc/rc.conf
```
Then, to manage the service:
```
# supervisorctl status mineos
# supervisorctl start mineos
# supervisorctl stop mineos
```

Where possible, it is recommended that you reboot the server here, to ensure that `supervisord` starts up as expected, and starts up the MineOS webui along with it. This is different than other systems because usually no restart is necessary, but FreeBSD uses the `rc.conf` system to further require whitelisting of starting processes, which could only be tested on startup.

# Usage

Once the background daemon is running, you can visit `https://[ipaddress]:8443` in your web browser and you will see a user and password prompt. When creating minecraft and managing Minecraft servers, use an unprivileged user to log into the webui. Creating an unprivileged user (a user that is not `root`) can be accomplished with the `adduser username` command. The password you set during user creation will also be the password used for the web-ui.
