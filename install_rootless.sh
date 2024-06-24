#!/bin/bash

# PROMPT FOR WEBUI USER PASSWORD
echo -n "Type in \`$USER\` password for webui: "
read -s UIPW

# DOWNLOAD JAVA
cd ~
mkdir -p ~/.local/opt
wget https://download.java.net/java/GA/jdk21/fd2272bbf8e04c3dbaee13770090416c/35/GPL/openjdk-21_linux-x64_bin.tar.gz
tar xf openjdk-21*
mv ~/jdk-21 ~/.local/opt/
JDK_PATH=$(realpath ~/.local/opt/jdk-21/bin)

# DOWNLOAD WEBUI FROM GITHUB
git clone https://github.com/hexparrot/mineos-node
cd mineos-node
git config core.filemode false
chmod +x generate-sslcert.sh mineos_console.js webui.js

# PLACE AND CONFIGURE MINEOS.CONF
mkdir -p ~/.local/etc/ssl/certs/
cp mineos.conf ~/.local/etc/mineos.conf
sed -i "s./var/games/minecraft.$HOME/minecraft.g" ~/.local/etc/mineos.conf
sed -i "s./etc/ssl/certs.$HOME/\.local/etc/ssl/certs.g" ~/.local/etc/mineos.conf

# GENERATE SSL CERTS
mkdir -p ~/.local/etc/ssl/certs
SSL_PATH=~/.local/etc/ssl/certs
CERTFILE=$SSL_PATH/mineos.pem CRTFILE=$SSL_PATH/mineos.crt KEYFILE=$SSL_PATH/mineos.key ./generate-sslcert.sh

# INSTALL NODEJS
cd ~
wget https://s3-us-west-2.amazonaws.com/nodesource-public-downloads/4.6.3/artifacts/bundles/nsolid-bundle-v4.6.3-linux-x64.tar.gz
tar -xf nsolid*
cd nsolid-bundle-v4.6.3-linux-x64
./install.sh

# SET ENVIRONMENT VARIABLES
mkdir -p ~/.bashrc.d
echo "export PATH=\$PATH:$HOME/nsolid/nsolid-fermium/bin:$JDK_PATH" > ~/.bashrc.d/mineos
source ~/.bashrc.d/mineos

# DOWNLOAD AND COMPILE NPM MODULES
cd ~/mineos-node
npm install

# DOWNLOAD PROOT
mkdir -p ~/.local/bin
cd ~/.local/bin
curl -LO https://proot.gitlab.io/proot/bin/proot
chmod +x proot

cd ~
proot -b ~/.local/etc:/etc <<- EOHC
echo "$USER:x:$(id -u):$(id -g)::$HOME:/bin/bash" > ~/.local/etc/passwd
echo "$USER:x:$(id -g)" > ~/.local/etc/group
echo "$USER:*:18902:0:99999:7:::" > ~/.local/etc/shadow
echo "$USER:$UIPW" | chpasswd -c SHA512
EOHC

