#!/bin/bash
# Reset MineOS git repository to current master

LOG="/var/log/mineos.log"

if [[ $EUID -ne 0 ]]; then
   echo "reset_scripts.sh must be run as root" 1>&2 | tee -a $LOG
   exit 1
fi

ECHO_LOG_N () {
    echo -en "$1" | tee -a $LOG
}

ECHO_LOG () {
    echo -e "$1" | tee -a $LOG
}

ECHO_LOG_N "Script execution started on: "
date | tee -a $LOG

ECHO_LOG_N "Updating mineos-node repository..."
git fetch >> $LOG
if [ $? -eq 0 ]; then ECHO_LOG "OK"; else ECHO_LOG "FAILED" && exit 1; fi

ECHO_LOG_N "Checking out master branch..."
git checkout master >> $LOG
if [ $? -eq 0 ]; then ECHO_LOG "OK"; else ECHO_LOG "FAILED" && exit 1; fi

ECHO_LOG_N "Resetting directory to official contents..."
git reset --hard origin/master >> $LOG
if [ $? -eq 0 ]; then ECHO_LOG "OK"; else ECHO_LOG "FAILED" && exit 1; fi

ECHO_LOG_N "Deleting npm module dependencies and rebuilding..."
rm -rf node_modules && npm install --no-spin --unsafe-perm >> $LOG
if [ $? -eq 0 ]; then ECHO_LOG "OK"; else ECHO_LOG "FAILED" && exit 1; fi

ECHO_LOG_N "Setting node javascript files to executable..."
chmod +x mineos_console.js webui.js update_webui.sh reset_webui.sh >> $LOG
if [ $? -eq 0 ]; then ECHO_LOG "OK"; else ECHO_LOG "FAILED" && exit 1; fi

ECHO_LOG_N "Script execution ended on: "
date | tee -a $LOG
