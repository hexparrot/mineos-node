# MineOS Webui on Archlinux

The MineOS user interface can be installed on CentOS systems using the `yum` package manager and either `init.d` or `supervisord`.

As written, these steps will install the webui with the following properties:

* The nodejs scripts will be installed to `/usr/games/minecraft`
* The user-data (servers, world config, etc.) will be in `/var/games/minecraft`
* The webui will be accessible at `https://[ip-address]:8443` in your browser
* It will run as `root`, and support an unlimited amount of users with one daemonized (background) process.
* It will support an unlimited amount of servers (bound by your hardware)

# Installation steps

The following steps much be executed as `root`.

## DEPENDENCIES

### ALMOST EVERYTHING
```
# pacman -Syu
# pacman -S --noconfirm git rsync rdiff-backup screen nodejs npm base-devel
```

### JAVA
The following steps install `openjdk16` into a neutral space (`/opt`) and then symlinks it to `/usr/bin/java`. Note, that so long as `root` has a `java` binary in its `$PATH`, any version you choose--and even different installation methods--are permissible. This particular openjdk binary is chosen because CentOS 8 does not yet have Java 16 available in its normal repos at time of writing.  

```
# wget https://github.com/AdoptOpenJDK/openjdk16-binaries/releases/download/jdk-16.0.1%2B9/OpenJDK16U-jre_x64_linux_hotspot_16.0.1_9.tar.gz -O openjdk-16-jre.tgz
# tar xf openjdk-16-jre.tgz
# mv jdk-16.0.* /opt/openjdk-16.0-jre
# ln -s /opt/openjdk-16.0-jre/bin/java /usr/bin/java
# rm openjdk-16-jre.tgz
```

## DOWNLOAD WEBUI FILES
```
# cd /usr/games
# git clone https://github.com/hexparrot/mineos-node minecraft
# cd minecraft
# git config core.filemode false
# chmod +x generate-sslcert.sh mineos_console.js webui.js
# cp mineos.conf /etc/mineos.conf
```

### BUILD NODE DEPENDENCIES
```
# cd /usr/games/minecraft
# npm install --unsafe-perm
```

## USE HTTPS FOR SECURE TRANSPORT
```
# cd /usr/games/minecraft
# ./generate-sslcert.sh
```

## SELECTING SERVICE INIT TYPE

Archlinux offers `systemd` by default, which you can use to have the webui start at boot. You may, alternatively, use `supervisord`--but be sure to only choose one.

### SYSTEMD
```
# cp /usr/games/minecraft/init/systemd_conf /etc/systemd/system/mineos.service
# systemctl enable mineos
```
Then, to manage the service:
```
# systemctl status mineos
# systemctl start mineos
# systemctl stop mineos
```

### SUPERVISORD
```
# pacman -S --noconfirm supervisord
# cp /usr/games/minecraft/init/supervisor_conf /etc/supervisor/conf.d/mineos.conf
# supervisorctl reload
```
Then, to manage the service:
```
# supervisorctl status mineos
# supervisorctl start mineos
# supervisorctl stop mineos
```

# Usage

Once the background daemon is running, you can visit `https://[ipaddress]:8443` in your web browser and you will see a user and password prompt. When creating minecraft and managing Minecraft servers, use an unprivileged user to log into the webui. Creating an unprivileged user (a user that is not `root`) can be accomplished with the `adduser username` command. The password you set during user creation will also be the password used for the web-ui.
