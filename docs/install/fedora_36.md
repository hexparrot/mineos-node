# MineOS Webui on Fedora 36

The MineOS user interface can be installed on Fedora systems using the `dnf` package manager and either `init.d` or `supervisord`.

As written, these steps will install the webui with the following properties:

* The nodejs scripts will be installed to `/usr/games/minecraft`
* The user-data (servers, world config, etc.) will be in `/var/games/minecraft`
* The webui will be accessible at `https://[ip-address]:8443` in your browser
* It will run as `root`, and support an unlimited amount of users with one daemonized (background) process.
* It will support an unlimited amount of servers (bound by your hardware)

# Installation steps

The following steps much be executed as `root`.

## DEPENDENCIES

### NODE.JS 16.x

Node will be installed through the normal system packages via `dnf`.
```
# dnf -y install nodejs
```
### JAVA

The following steps install `openjdk` via system packages. It is permissible/configurable to use other java instances, versions, and deployments. This particular openjdk binary is chosen because Fedora 36 provides a modern Java for modern Minecraft.

```
# dnf install java-latest-openjdk
```

### ADDITIONAL DEPENDENCIES
```
# dnf -y install git wget openssl openssl-devel gcc-c++ make rsync screen rdiff-backup curl
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

Fedora 36 offers `systemd` by default, which you can use to have the webui start at boot. You may, alternatively, use `supervisord`--but be sure to only choose one.

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
# dnf install -y supervisord
# cp /usr/games/minecraft/init/supervisor_conf /etc/supervisor/conf.d/mineos.conf
# supervisorctl reload
```
Then, to manage the service:
```
# supervisorctl status mineos
# supervisorctl start mineos
# supervisorctl stop mineos
```

## USAGE

Once the background daemon is running, you can visit `https://[ipaddress]:8443` in your web browser and you will see a user and password prompt. When creating minecraft and managing Minecraft servers, use an unprivileged user to log into the webui. Creating an unprivileged user (a user that is not `root`) can be accomplished with the `adduser username` command. The password you set during user creation will also be the password used for the web-ui.

## IPTABLES

Fedora 36 installs `iptables` by default. Using a firewall is highly recommended, but note that system rules will prohibit connectivity to the webui without adding in targetted rules.

iptables is outside the scope of this specific page. It is recommended to properly implement firewall rules, but to address firewalls at a different time after confirming webui operability.

