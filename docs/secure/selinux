# Security-Enhanced Linux (SELinux)

SELinux is not for the faint-of-heart, but it is an opportunity to capitalize on every possible defense against bad actors, malware, or... simply buggy code. Mandatory Access Control (SELinux) + Discretionary Access Control (linux perms) together is the true test of patience. This will install a draft set of rules to lock down MineOS' necessary system permissions. Be sure you understand the implications of adding new permission systems to a production or a development system.

This walkthrough is currently in development; *use at your own risk*.

The following walkthrough is written for Debian, but equivalent packages exist for all distros.

## Install Package Dependencies

```
# apt install selinux-basics selinux-policy-default selinux-policy-src selinux-policydoc auditd locate
```

## SELinux, Engage

```
# selinux-activate
# reboot
```

## Locate the Development Suite

```
# locate selinux/deve/Makefile
/usr/share/selinux/devel/Makefile
```

## Compile the SELinux Policy

```
# ls
mineos.fc  mineos.if  mineos.te
# make -f /usr/share/selinux/devel/Makefile mineos.pp
Compiling default mineos module
/usr/bin/checkmodule:  loading policy configuration from tmp/mineos.tmp
/usr/bin/checkmodule:  policy configuration loaded
/usr/bin/checkmodule:  writing binary representation (version 17) to tmp/mineos.mod
Creating default mineos.pp policy package
rm tmp/mineos.mod.fc tmp/mineos.mod
# semodule -i mineos.pp
libsemanage.add_user: user system_u not in password file
# 
```
## Restore Contexts to Applicable Files

The new rules now live in the kernel only apply to files with their respective types. We use `restorecon` to relabel files per our file context/file system map: `mineos.fc`

```
# restorecon -R /
```

## Review the New Contexts

```
# ls -laZ
total 448
drwxr-xr-x.   9 root root system_u:object_r:mineos_t:s0            4096 Jul  1 04:05 ./
drwxr-xr-x.   4 root root system_u:object_r:usr_t:s0               4096 Jun 25 07:06 ../
drwxr-xr-x.   8 root root system_u:object_r:mineos_t:s0            4096 Jul  1 04:07 .git/
-rw-r--r--.   1 root root system_u:object_r:mineos_t:s0             483 Jun 16 14:21 .gitattributes
-rw-r--r--.   1 root root system_u:object_r:mineos_t:s0             513 Jun 16 14:21 .gitignore
-rw-r--r--.   1 root root system_u:object_r:mineos_t:s0            1659 Jun 27 02:15 Dockerfile
-rw-r--r--.   1 root root system_u:object_r:mineos_t:s0           35147 Jun 16 14:21 LICENSE.md
-rw-r--r--.   1 root root system_u:object_r:mineos_t:s0             578 Jun 16 14:21 Makefile
...
-rw-r--r--.   1 root root system_u:object_r:mineos_exec_t:s0       1073 Jun 24 20:03 update_webui.sh
-rwxr-xr-x.   1 root root system_u:object_r:mineos_exec_t:s0       8946 Jun 27 02:15 webui.js*
```

## Understand the New Contexts

Look at `mineos.te` to see SELinux Type Enforcement rules. You can then see every permission offered to every type of file MineOS touches. Perfect control.

## SELinux Macro Ideas

If you're interested in developing SELinux rules, the following aliases may be useful to add to `/root/.bashrc`:

```
alias lz='ls -alFZ'   # focuses on displaying contexts of files
alias pz='ps -auxZ'   # focuses on displaying contexts of processes

# these reduce the amount of typing repetitive commands in succession.
# visit a directory you're testing and choose whether you want enforcement
# on or off. In all cases, restores contexts to now match the values
# recently updated by "semodule -i mineos.pp"
alias seon='setenforce 0; restorecon -R .;setenforce 1'
alias seoff='setenforce 0; restorecon -R .'
# while in the MineOS SELinux file directory, build the module and load it into memory 
alias mm='make -f /usr/share/selinux/devel/Makefile mineos.pp && semodule -i mineos.pp'
```
