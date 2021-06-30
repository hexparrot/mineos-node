## iptables

`iptables` is a powerful and precise firewall; this document is to show how to configure `iptables` to conform to a default-deny access strategy: nothing goes through until expressly permitted. Such a setup is more time-consuming up front, but comes with great satisfaction of an iron-clad first-line-of-defense. From this point forward, this document will assume the host is live and accessible to the internet, and you are directly connected to the host via keyboard.

### Full lockdown

Turn off receiving of all foreign packets--`DENY` on all the default policies of `INPUT`, `FORWARD`, and `OUTPUT`.

```
# iptables -P INPUT DROP
# iptables -P FORWARD DROP
# iptables -P OUTPUT DROP
# iptables -F
```

### Log all unidentified traffic

Creating logging rules before any additional rules is a great way to audit what and where is already hitting your server. It'll create a _little bit_ of extra noise at the start, but the verbosity of these logs and the way it is positioned in the chain is invaluable to creating this hardened ruleset.

```
# iptables -A INPUT -p tcp -m tcp -j LOG --log-prefix "tcp.in.dropped "
# iptables -A INPUT -p udp -m udp -j LOG --log-prefix "udp.in.dropped "
# iptables -A OUTPUT -p udp -m udp -j LOG --log-prefix "udp.out.dropped "
# iptables -A OUTPUT -p tcp -m tcp -j LOG --log-prefix "tcp.out.dropped "
```

All the logged traffic goes to `/var/messages` and contains the prefix designated above:
```
INSERT COPY
```

### Define new chains
Let's use chains to help us make each packet do an extra check based on origin. Create a chain called 'FRIENDLY' which will signify IP origins that are trusted and 'MALICIOUS' for traffic we know to be bad, reducing the noise further for `/var/log/messages`.

```
# iptables -N FRIENDLY
# iptables -N MALICIOUS
# iptables -A FRIENDLY -s 10.137.0.0/24 -m comment --comment "[known-friendly network]" -j ACCEPT
```

Note that simply because a packet is from the correct subnet (in this case a `/24`), this does not mean it is trusted traffic; it states specifically that it will accept only local traffic inbound from our future-indicated ports. But even with this rule in place, no traffic is being pushed to the `FRIENDLY` chain yet, so no new traffic could get through.

To lock it down even further, you can instead of the above, only open up to a single machine with a `/32`.

`# iptables -A FRIENDLY -s 10.137.0.16/32 -m comment --comment "[i only trust one machine during this delicate period]" -j ACCEPT`

Next, create separate chains for signifying allowed inbound and outbound ports.

```
# iptables -N STDIN
# iptables -N STDOUT
# iptables -I INPUT 1 -j MALICIOUS
# iptables -I INPUT 2 -j STDIN
```
The expected flow for an inbound packet can therefore be, in its entirety:
```
INPUT -> MALICIOUS -> STDIN -> FRIENDLY -> ACCEPT
INPUT -> MALICIOUS -> STDIN -> FRIENDLY -> LOG -> DROP
INPUT -> MALICIOUS -> STDIN -> LOG -> DROP
```

### Let ssh through

`ssh` can be further secured with various configuration changes, but that is beyond the scope of this document. We can make rules that are permissive for the services we care about without exposing the host unnecessarily. There are arguments to having `ssh` host on a different port, but this document does not endorse security-by-obscurity, and purposefully hosts on `22` to improve logging organization.

`# iptables -A STDIN -p tcp -m comment --comment "sshd standard port" -m tcp --dport 22 -j FRIENDLY`


This allows in foreign TCP/IP packets tagged port 22 (ssh) from the respective friendly subnet, but outbound traffic to complete the negotiation die immediately with the expected flow for outbound being `OUTPUT -> STDOUT -> LOG -> DROP`.  Let through traffic that is `ESTABLISHED` or `RELATED` to existing whitelisted packets:

`# iptables -I OUTPUT 1 -m conntrack --ctstate RELATED,ESTABLISHED -j ACCEPT`

You should now be able to successfully initiate an `ssh` session from another machine. The rest of this document can now be completed remotely. Take a moment to review your iptables rules and get a feel for the path a packet might take, and how it would be subsequently logged.

```
# iptables --list --line-numbers
Chain INPUT (policy DROP)
num  target     prot opt source               destination         
1    MALICIOUS  all  --  anywhere             anywhere            
2    STDIN      all  --  anywhere             anywhere            
3    LOG        tcp  --  anywhere             anywhere             tcp LOG level warning prefix "tcp.in.dropped "
4    LOG        udp  --  anywhere             anywhere             udp LOG level warning prefix "udp.in.dropped "

Chain FORWARD (policy DROP)
num  target     prot opt source               destination         

Chain OUTPUT (policy DROP)
num  target     prot opt source               destination         
1    ACCEPT     all  --  anywhere             anywhere             ctstate RELATED,ESTABLISHED
2    LOG        udp  --  anywhere             anywhere             udp LOG level warning prefix "udp.out.dropped "
3    LOG        tcp  --  anywhere             anywhere             tcp LOG level warning prefix "tcp.out.dropped "

Chain FRIENDLY (1 references)
num  target     prot opt source               destination         
1    ACCEPT     all  --  10.137.0.14          anywhere             /* [i trust one machine only] */

Chain MALICIOUS (1 references)
num  target     prot opt source               destination         

Chain STDIN (1 references)
num  target     prot opt source               destination         
1    FRIENDLY   tcp  --  anywhere             anywhere             /* sshd standard port */ tcp dpt:ssh

Chain STDOUT (0 references)
num  target     prot opt source               destination         
```
### DNS resolution

Many activies a server will perform will likely require DNS lookups. DNS operates on outbound UDP port 53, and since the only packets that would be put on the `STDOUT` chain would have to be from itself, we can `ACCEPT`, directly.

```
# ping minecraft.codeemo.com
ping: minecraft.codeemo.com: Temporary failure in name resolution
# iptables -I OUTPUT 2 -j STDOUT
# iptables -A STDOUT -p udp -m udp --dport 53 -j ACCEPT
# iptables -I INPUT 2 -m conntrack --ctstate RELATED,ESTABLISHED -j ACCEPT
# ping minecraft.codeemo.com
PING codeemo.com (167.71.248.91) 56(84) bytes of data.
 [snip]
```

Having DNS figured out means other common utilities for downloading applications will now be possible, easily.

### wget and curl

If you need to download an online file, it's easy to get files via `HTTP` and `HTTPS`

```
# iptables -A STDOUT -p tcp -m tcp --dport 80 -m comment --comment "allow outbound http" -j ACCEPT
# iptables -A STDOUT -p tcp -m tcp --dport 443 -m comment --comment "allow outbound https" -j ACCEPT
```

### ICMP (ping)

Let's let `ICMP` through. For now, friendly-inbound only, and any outgoing.

```
# iptables -A STDIN -p icmp -j FRIENDLY
# iptables -A STDOUT -p icmp -j ACCEPT
```

### local loopback interface

`# iptables -A STDOUT -o lo -m comment --comment "Permit loopback traffic" -j ACCEPT`

### New logging

There's now a newly-emerging logging opportunity, now that there are inbound services listening (22). We can further classify our logged packets by identifying packets that are 1) received by the host on a listening port and 2) not in any trusted subnets.

```
# iptables -A FRIENDLY -p udp -m udp -j LOG --log-prefix "udp.in.foreigner "
# iptables -A FRIENDLY -p tcp -m tcp -j LOG --log-prefix "tcp.in.foreigner "
# iptables -A FRIENDLY -j DROP
```

## Understanding the packet flow

While it seems like sending packets on ever-increasing paths, the information we seek most from a hardened host is now easier to distill than ever.

```
# iptables -vnL
Chain INPUT (policy DROP 8 packets, 416 bytes)
 pkts bytes target     prot opt in     out     source               destination         
 2478  137K MALICIOUS  all  --  *      *       0.0.0.0/0            0.0.0.0/0           
 1134 61912 ACCEPT     all  --  *      *       0.0.0.0/0            0.0.0.0/0            ctstate RELATED,ESTABLISHED
 1341 75108 STDIN      all  --  *      *       0.0.0.0/0            0.0.0.0/0           
  663 36552 LOG        tcp  --  *      *       0.0.0.0/0            0.0.0.0/0            tcp LOG flags 0 level 4 prefix "tcp.in.dropped "
   15  1603 LOG        udp  --  *      *       0.0.0.0/0            0.0.0.0/0            udp LOG flags 0 level 4 prefix "udp.in.dropped "

Chain FORWARD (policy DROP 0 packets, 0 bytes)
 pkts bytes target     prot opt in     out     source               destination         

Chain OUTPUT (policy DROP 1 packets, 40 bytes)
 pkts bytes target     prot opt in     out     source               destination         
 1672  180K ACCEPT     all  --  *      *       0.0.0.0/0            0.0.0.0/0            ctstate RELATED,ESTABLISHED
   56  3854 STDOUT     all  --  *      *       0.0.0.0/0            0.0.0.0/0           
  155 11160 LOG        udp  --  *      *       0.0.0.0/0            0.0.0.0/0            udp LOG flags 0 level 4 prefix "udp.out.dropped "
    5   200 LOG        tcp  --  *      *       0.0.0.0/0            0.0.0.0/0            tcp LOG flags 0 level 4 prefix "tcp.out.dropped "

Chain FRIENDLY (1 references)
 pkts bytes target     prot opt in     out     source               destination         
 1098 61649 ACCEPT     all  --  *      *       10.137.0.14          0.0.0.0/0            /* [i trust one machine only] */
    0     0 LOG        udp  --  *      *       0.0.0.0/0            0.0.0.0/0            udp LOG flags 0 level 4 prefix "udp.in.foreigner "
    0     0 LOG        tcp  --  *      *       0.0.0.0/0            0.0.0.0/0            tcp LOG flags 0 level 4 prefix "tcp.in.foreigner "
    5   420 DROP       all  --  *      *       0.0.0.0/0            0.0.0.0/0           

Chain MALICIOUS (1 references)
 pkts bytes target     prot opt in     out     source               destination         

Chain STDIN (1 references)
 pkts bytes target     prot opt in     out     source               destination         
 1098 61649 FRIENDLY   tcp  --  *      *       0.0.0.0/0            0.0.0.0/0            /* sshd standard port */ tcp dpt:22

Chain STDOUT (1 references)
 pkts bytes target     prot opt in     out     source               destination         
   32  2090 ACCEPT     udp  --  *      *       0.0.0.0/0            0.0.0.0/0            udp dpt:53
    2   168 ACCEPT     icmp --  *      *       0.0.0.0/0            0.0.0.0/0           
    0     0 ACCEPT     all  --  *      lo      0.0.0.0/0            0.0.0.0/0            /* Permit loopback traffic */

```
Based on the prefixes produced to `/var/log/messages`, we can easily decipher the lines at a glance:

```
Jun 30 06:06:13 mineos-tkldev kernel: [ 8486.974964] tcp.in.dropped IN=eth0 OUT= MAC=00:16:3e:5e:6c:00:fe:ff:ff:ff:ff:ff:08:00 SRC=10.137.0.14 DST=10.137.0.16 LEN=52 TOS=0x00 PREC=0x00 TTL=63 ID=758 DF PROTO=TCP SPT=56296 DPT=8443 WINDOW=64240 RES=0x00 SYN URGP=0
```
You can grep for hits easily:

```
# grep 'tcp.in.dropped' /var/log/messages | tail
# grep 'udp.in.dropped' /var/log/messages | tail
# grep 'tcp.in.foreign' /var/log/messages | tail
```

From above, remember `tcp.in.foreign` signifies any packets received on a listening port, but not from an accepted subnet. Later, these packets can be rerouted (if desired), to an external [opencanary](https://github.com/thinkst/opencanary) or a local hosted docker.

### Get rid of trash-packets

Let's find some packets that just don't make sense to ever honor, and drop them immediately.
```
# iptables -A MALICIOUS -m conntrack --ctstate INVALID -j DROP
# iptables -A MALICIOUS -p tcp -m tcp --tcp-flags FIN,SYN FIN,SYN -m comment --comment "[malicious packet patterns]" -j DROP
# iptables -A MALICIOUS -p tcp -m tcp --tcp-flags SYN,RST SYN,RST -m comment --comment "[malicious packet patterns]" -j DROP
```
