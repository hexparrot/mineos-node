# root-less MineOS Webui on Fedora 34

The MineOS user interface can be installed on Fedora systems using the `dnf` package manager.  This particular installation aims to be `rootless`--to run as an unprivileged user for all steps aside from installing general system dependencies.

This page is considered to be a work-in-progress, but the installation itself can be considered to be as production-worthy as any installation of the webui.

As written, these steps will install the webui with the following properties:

* The nodejs scripts will be installed to `$HOME/mineos-node`
* The user-data (servers, world config, etc.) will be in `$HOME/minecraft`
* The webui will be accessible at `https://[ip-address]:9443` in your browser
* It will run as `$USER`, and support ONE user
* It will support an unlimited amount of servers (bound by your hardware)

# Installation steps

The following steps much be executed as `root`.

## DEPENDENCIES

### SYSTEM-WIDE
```
# dnf groupinstall "Development tools"
# dnf install rsync screen rdiff-backup openssl
# chmod 777 /run/screen
```

All the following steps from here out should be executed as your normal, unprivileged user.

## DOWNLOAD JAVA
```
$ mkdir -p ~/.local/opt
$ wget https://download.java.net/java/GA/jdk17.0.2/dfd4a8d0985749f896bed50d7138ee7f/8/GPL/openjdk-17.0.2_linux-x64_bin.tar.gz
$ tar xf openjdk-17*
$ mv openjdk-17* ~/.local/opt/
$ JDK_PATH=$(realpath ~/.local/opt/jdk-17*/bin/java)
```

## DOWNLOAD WEBUI FILES
```
$ cd ~
$ git clone https://github.com/hexparrot/mineos-node
$ cd mineos-node
$ git config core.filemode false
$ chmod +x generate-sslcert.sh mineos_console.js webui.js
```

## EDIT MINEOS CONFIGURATION
```
$ mkdir -p ~/.local/etc
$ cp mineos.conf ~/.local/etc/mineos.conf
$ sed -i "s./var/games/minecraft.$HOME/minecraft.g" ~/.local/etc/mineos.conf
$ sed -i "s./etc/ssl/certs.$HOME/\.local/ssl/certs.g" ~/.local/etc/mineos.conf
$ sed -i 's.8443.9443.' ~/.local/etc/mineos.conf
```

### ACQUIRE NODEJS
```
$ cd ~
$ wget https://s3-us-west-2.amazonaws.com/nodesource-public-downloads/4.6.3/artifacts/bundles/nsolid-bundle-v4.6.3-linux-x64.tar.gz
$ cd nsolid*
$ ./install.sh
```
NodeJS (also now known as nsolid) will install to `$HOME/nsolid` by default.

## USE HTTPS FOR SECURE TRANSPORT
```
$ mkdir -p ~/.local/etc/ssl/certs
$ SSL_PATH=~/.local/etc/ssl/certs
$ CERTFILE=$SSL_PATH/mineos.pem CRTFILE=$SSL_PATH/mineos.crt KEYFILE=$SSL_PATH/mineos.key ./generate-sslcert.sh
```

## ADD PATHS TO .BASHRC
```
$ mkdir ~/.bashrc.d
$ echo "export PATH=\$PATH:$HOME/nsolid/nsolid-fermium/bin:$JDK_PATH" > ~/.bashrc.d/mineos
$ source ~/.bashrc.d/mineos
```

## BUILD NPM PACKAGES
```
$ cd ~/mineos-node
$ npm install
```

## DOWNLOAD PROOT
```
$ mkdir -p ~/.local/bin
$ cd ~/.local/bin
$ curl -LO https://proot.gitlab.io/proot/bin/proot
$ chmod +x proot
```
See documentation here: https://proot-me.github.io/

## SELECTING SERVICE INIT TYPE

Due to the unprivileged user being used to host this process, server init commands are more limited/require greater modification. This guide will leave it to the user whether to user `cron`, foreground processes, backgrounded webui, etc.

# Execution Steps

## PROOT, ROOT-FAKER

`proot` allows you to run the webui in a subprocess, specifically one where certain authentication files can be overlayed, allowing `root` paths to be manipulated as your non-`root` user.  In actuality, no such privilege execution occurs, but this fake-out allows use of `/etc/{passwd,group,shadow,mineos.conf}` where it otherwise would be restricted.
```
$ mkdir -p ~/.local/etc/
$ echo "$USER:x:$(id -u):$(id -g)::$HOME:/bin/bash" > ~/.local/etc/passwd
$ echo "$USER:x:$(id -g)" > ~/.local/etc/passwd
$ proot -b ~/.local/etc:/etc
$ read UIPW
$ echo "$USER:$UIPW" | chpasswd -c SHA512
$ exit
```

This `exit` should be leaving the `proot`, which is more akin to `screen` in it's behavior when run.

## USAGE

Let's finally use `proot` to start the webui process. This invocation will only overwrite four mineos-specific files which must be user-readable; all other files in `/etc` are now inherited.

```
$ proot -w ~/mineos-node -b ~/.local/etc/passwd:/etc/passwd -b ~/.local/etc/shadow:/etc/shadow -b ~/.local/etc/group:/etc/group -b ~/.local/etc/mineos.conf:/etc/mineos.conf
$ ./webui
```

Once the daemon is running, you can visit `https://[ipaddress]:9443` in your web browser and you will see a user and password prompt. Note port 9443 was an arbitrary choice from above, taking into account the increasing possibilities that normal port 8443 could be used by a superceding process, e.g., `root` or another user. Log in with your normal user and password.

## FIREWALLD

CentOS8 installs `firewalld` by default. Using a firewall is highly recommended, but note that system rules will prohibit connectivity to the webui without adding in targetted rules.

Firewalld is outside the scope of this specific page. It is recommended to properly implement firewall rules, but to address firewalls at a different time after confirming webui operability; you can stop the firewall until next reboot with:

`systemctl stop firewalld`

If you prefer `iptables` to `firewalld`, you can change the firewall selected with:

```
systemctl disable firewalld
dnf remove firewalld
```
