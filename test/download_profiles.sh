#!/bin/bash

mkdir -p /var/games/minecraft/profiles
wget --progress=bar --no-check-certificate -P /var/games/minecraft/profiles/1.7.9 https://s3.amazonaws.com/Minecraft.Download/versions/1.7.9/minecraft_server.1.7.9.jar
wget --progress=bar --no-check-certificate -P /var/games/minecraft/profiles/1.2.5 https://s3.amazonaws.com/Minecraft.Download/versions/1.2.5/minecraft_server.1.2.5.jar
wget --progress=bar --no-check-certificate -P /var/games/minecraft/profiles/Pocketmine-1.4.1 https://github.com/PocketMine/PocketMine-MP/releases/download/1.4.1/PocketMine-MP_1.4.1.phar
