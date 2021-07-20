#!/bin/sh

wall "Issueing Stop command to all minecraft servers"
cd /var/games/minecraft/servers
sudo ls -l | awk '/d[rwx\-]+/ {print "sudo runuser -l", $3, "-c \"cd /usr/games/minecraft && ./mineos_console.js -s", $9, "stop\""}' | sh
sleep 15s