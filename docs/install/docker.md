# MineOS webui Docker appliance

The MineOS user interface can be installed as a `docker` container, allowing strong container-based isolation between instances.

This page is a work-in-progress and is considered to be ripe for improvement.

## PULL IMAGE FROM DOCKERHUB

This installation guide assumes you have installed docker on your server host; the steps vary too widely between distributions to cover it in this page.

```
# docker pull hexparrot/mineos
# docker image ls | grep mineos
hexparrot/mineos          latest       0c24f1172457   6 days ago     718MB
```

## CREATE A VOLUME

Create a docker volume to contain the /var/games/minecraft filetree, allowing the container's produced file to be handled more programmatically (and using Docker's conventions) rather than arbitrarily binding a host directory to the containers `/var/games/minecraft`.

```
# docker volume create mineos
# docker volume inspect mineos
[
    {
        "CreatedAt": "2021-06-24T10:07:11-07:00",
        "Driver": "local",
        "Labels": null,
        "Mountpoint": "/var/lib/docker/volumes/mineos/_data",
        "Name": "mineos",
        "Options": null,
        "Scope": "local"
    }
]
```

## BRING UP INSTANCE, ALWAYS-UP

Start the container, and let docker keep it restart it anytime it is down, unless deliberately stopped via command line.

```
# export MINEOS_UN=mc
# read -s MINEOS_PW
# export MINEOS_PW

# docker run -td \
--name=mineos \
-p 8443:8443 \
-p 25565:25565 \
-e MINEOS_UN \
-e MINEOS_PW \
-v mineos:/var/games/minecraft \
--restart=unless-stopped \
hexparrot/mineos:latest
```

## FILESYSTEM FOOTPRINT

### SEE VOLUME FILES

View the files as they exist on the host filesystem. `ls -l[ong] -n[umeric] /PATH/`

This demonstrates that all the files exist exactly how you'd expect within the container.

```
# ls -ln /var/lib/docker/volumes/mineos/_data/*
/var/lib/docker/volumes/mineos/_data/archive:
total 0
drwxrwxr-x. 2 1000 1000 6 Jun 24 10:11 117serv

/var/lib/docker/volumes/mineos/_data/backup:
total 0
drwxrwxr-x. 5 1000 1000 280 Jun 24 10:15 117serv

/var/lib/docker/volumes/mineos/_data/import:
total 0

/var/lib/docker/volumes/mineos/_data/profiles:
total 0
drwxrwxr-x. 2 0 0 39 Jun 24 09:54 1.17

/var/lib/docker/volumes/mineos/_data/servers:
total 4
drwxrwxr-x. 4 1000 1000  255 Jun 24 09:54 117serv
```

Take note of the `uid` (`1000`), which may also be listed as a username on the docker host, but has no meaning within the container. Any changes/additions to these files should be accompanied by `chown` to ensure consistency of ownership.


## Compare to files inside container

Enter the container to browse the MineOS files:

```
# docker exec -it mineos /bin/bash
root@8c45d1e4564b:# ls -ln /var/games/minecraft
total 0
drwxrwxr-x. 4 0 0 36 Jun 24 17:11 archive
drwxrwxr-x. 4 0 0 36 Jun 24 17:11 backup
drwxrwxrwx. 2 0 0  6 Jun 24 06:42 import
drwxr-xr-x. 2 0 0  6 Jun 24 17:07 java116
drwxrwxr-x. 5 0 0 44 Jun 26 23:14 profiles
drwxrwxr-x. 4 0 0 36 Jun 24 17:11 servers

```

Note the `uid` is zero (`0`) in the container (`root`-owned) and `1000` (or some other non-zero number) in the host.

## Conclusion

Docker handles all the hard stuff--including port forwarding--through the invocation command `docker run`. Docker instances only need be pulled and restarted to engage new updates from the upstream git repository. This makes for a very easy management of MineOS installations.

