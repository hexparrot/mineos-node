# Cryptographic Keys

A long-held is the belief that `root` should never be allowed to login directly, but should instead come from elevation from an unprivileged user. Nowadays, there are enough methods to allow `root` login without increasing your attack surface, thanks to cryptographic keys.

The most common keys are `RSA` keys, but others exist which are readily accepted by modern `sshd` daemons.

# Generate a New Key

The following command generates a `ed25519` key, similar to, but more modern (and recommended) than `RSA`.  You can generate an `RSA` key instead by simply replacing `ed25519` with `rsa`.

```
$ ssh-keygen -t ed25519 -C "for root@mineos" -f ~/.ssh/mineos
Generating public/private ed25519 key pair.
Enter passphrase (empty for no passphrase): 
Enter same passphrase again: 
Your identification has been saved in /home/user/.ssh/mineos
Your public key has been saved in /home/user/.ssh/mineos.pub
The key fingerprint is:
SHA256:Maq2bflTz+vmKCRHcDcFM2o0IoXw41UnrYZSU4ZEju8 for root@mineos
...
$
```
In this example `-f ~/.ssh/mineos` is the filename of the private key to be generated. If this is omitted, it will default to `~/.ssh/id_ed25519`; this is often preferred, as it obviates the need to specify the `-i` identity file on subsequent steps.

## CONFIGURE THE HOST

It is very possible your default installation of `sshd` already is allowing this kind of direct `root` login.  We can verify on the destination server:

```
# grep -b2 -n "Root" /etc/ssh/sshd_config 
30-753-
31-754-#LoginGraceTime 2m
32:773:#PermitRootLogin prohibit-password
33-808-#StrictModes yes
34-825-#MaxAuthTries 6
--
78-2113-# PasswordAuthentication.  Depending on your PAM configuration,
79-2177-# PAM authentication via ChallengeResponseAuthentication may bypass
80:2245:# the setting of "PermitRootLogin without-password".
81-2298-# If you just want the PAM account and session checks to run without
82-2367-# PAM authentication, then enable this but set PasswordAuthentication
--
137-3538-Banner /root/.ssh/banner
138-3563-Match user *
139:3576:PermitRootLogin prohibit-password
```

Line 32 shows `#PermitRootLogin`, which is actually a comment and therefore has no effect. A standard convention of configuration files, however, is to indicate the default value if unspecified (as a comment would do)--this means that plaintext passwords are already prohibited for `root` login, but cryptographic keys are OK.

Line 139 actually shows that for a user match of the user `root` connecting to this host, explicitly disallow plaintext passwords for `root` login.  Either of these `prohibit-password`s will work for this case, but the latter takes precedence.

Restart the `sshd` daemon according to your distribution. Depending on your install, it could be `service sshd restart` or `systemctl restart sshd` (or others).

## TEST THE NEW KEY

Back on your client machine, connect to your SSH host with the key:

```
$ ssh-copy-id -i ~/.ssh/mineos root@10.137.0.12
/usr/bin/ssh-copy-id: INFO: Source of key(s) to be installed: "/home/user/.ssh/mineos.pub"
/usr/bin/ssh-copy-id: INFO: attempting to log in with the new key(s), to filter out any that are already installed
/usr/bin/ssh-copy-id: INFO: 1 key(s) remain to be installed -- if you are prompted now it is to install the new keys
root@10.137.0.12's password: 
Received disconnect from 10.137.0.12 port 22:2: Too many authentication failures
Disconnected from 10.137.0.12 port 22
```

Note, it is asking for `root`'s password, not your chosen passphrase. This is because while the identify file is being passed through, the `ssh` host is not aware of this key. Normally, we rectify this with `ssh-copy-id`. However, `root` doesn't have a password, so it's a catch-22 of how to get passwordless access without ever setting a password.

## COPY OVER THE PUBLIC KEY

Remember the design of a private key/public key system: only the private key is delicate--the public key is just that, freely sharable. In fact, any user that tries to misuse your public key is really only _providing you access_ rather than _stealing your access_.

With this in mind, let's copy the public key to the new host, somehow, then ultimately put the key in the correct location: `/root/.ssh/authorized_keys`.

```
$ ssh-copy-id -i ~/.ssh/mineos mc@10.137.0.12
/usr/bin/ssh-copy-id: INFO: Source of key(s) to be installed: "/home/user/.ssh/mineos.pub"
/usr/bin/ssh-copy-id: INFO: attempting to log in with the new key(s), to filter out any that are already installed
/usr/bin/ssh-copy-id: INFO: 1 key(s) remain to be installed -- if you are prompted now it is to install the new keys
mc@10.137.0.12's password: 

Number of key(s) added: 1

Now try logging into the machine, with:   "ssh 'mc@10.137.0.12'"
and check to make sure that only the key(s) you wanted were added.
```
And now test it with the command:

```
$ ssh -i ~/.ssh/mineos.pub mc@10.137.0.12
@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
@         WARNING: UNPROTECTED PRIVATE KEY FILE!          @
@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
Permissions 0644 for '/home/user/.ssh/mineos.pub' are too open.
It is required that your private key files are NOT accessible by others.
This private key will be ignored.
Load key "/home/user/.ssh/mineos.pub": bad permissions
mc@10.137.0.12's password: 
```

## CORRECT KEY PERMISSIONS

Set the private and public key to read-only and access is granted. Remember, passphrases are separate from the user's password--if you did not use a passphrase in the previous step, the login will be automatic.

```
$ chmod 400 ~/.ssh/mineos*
$ ssh -i ~/.ssh/mineos mc@10.137.0.12
Enter passphrase for key '/home/user/.ssh/mineos': 
Welcome to Mineos-tkldev, TurnKey GNU/Linux 14.0 / TurnKey 9.13 Stretch

Linux mineos-tkldev 4.9.0-16-amd64 #1 SMP Debian 4.9.272-1 (2021-06-21) x86_64
Last login: Fri Jul  2 19:34:59 2021 from 10.137.0.14

mc@mineos-tkldev ~$ cat .ssh/authorized_keys 
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIEymEwH4hVASNVwxOhmDZF2dmhZPY/kfv8NV5X+rt/p1 for root@mineos
mc@mineos-tkldev ~$ ll .ssh/authorized_keys 
-rw-------. 1 mc mc 97 Jul  2 19:35 .ssh/authorized_keys
```

## EXTEND CRYPTO KEY TO ROOT LOGIN

Because in the previous step we are able to confirm that there is only one `authorized_key`, and it matches the key we just generated, we can take a shortcut. On a more mature system, you will need to manually move the authorized key from `/home/mc/.ssh/authorized_keys` to `/root/.ssh/authorized_keys`.

Switch to `root` on the destination machine:

`# rsync -av --chown=root:root /home/mc/.ssh /root/`

The reason this is a shortcut is it fully duplicates all authorized users for `mc` to `root`. Any *and all* keys that would permit `mc` access would now do the same for `root`. If this does not match your intended userset, edit `/root/.ssh/authorized_keys` to remove spurious entries.

## VERIFY AUTHORIZED_KEYS PERMISSIONS

`/.ssh` should be `700` and `authorized_keys` should be `400` or `600`.

```
# ll .ssh/ 
total 12
drwx------.  2 root root 4096 Jul  2 19:35 ./
drwx------. 10 root root 4096 Jul  2 20:00 ../
-rw-------.  1 root root   97 Jul  2 19:35 authorized_keys
```

## VERIFY OPERATION

```
$ ssh -i ~/.ssh/mineos root@10.137.0.12
Enter passphrase for key '/home/user/.ssh/mineos': 
Welcome to Mineos-tkldev, TurnKey GNU/Linux 14.0 / TurnKey 9.13 Stretch

Last login: Fri Jul  2 20:01:30 2021 from 10.137.0.14
root@mineos-tkldev ~# 
```

It is attractive to omit the passphrase for truly instant, passwordless login. Establish your own threat model and decide what is best for your system and needs.
