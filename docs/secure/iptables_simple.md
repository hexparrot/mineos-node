# Securing servers with iptables (simplified)

`iptables` is a powerful and precise firewall; this document is to show how to configure `iptables` to conform to a default-deny access strategy: nothing goes through until expressly permitted. This is a substantially simplified version of [iptables-hardened](iptables_hardened.md); it will do exactly the job it needs to to keep your host secure, but will lack certain features that may be of marginal interest to the sysadmin, such as logging and complex chains.

# Green Field Firewall

Depending on the circumstances, it may not always be possible to be at a keyboard and monitor of the host you are administering. It is key to never apply a rule you're not able to roll-back due to disconnecting yourself. This is what makes default-deny so especially fortuitous! Once set up properly, your only task is opening the _minimum_ ports available to get a service appropriate connectivity--you shouldn't have to spend time chasing holes in the firewall.

On the assumption one must set up a server strictly remotely, and relying on SSH as the exclusive out-of-band management, we need to defensively write rules--we need to write rules to transition to default-deny without getting disconnected. In the following segment, be sure to modify the subnet to your own network.

## CREATE A NEW RULES FILE

```
# cat << EOF > ~/iptables
*filter
:INPUT DROP
:FORWARD DROP
:OUTPUT DROP

-A INPUT -p tcp -m tcp -s 10.137.0.0/24 --dport 22 -j ACCEPT
-A OUTPUT -m conntrack --ctstate RELATED,ESTABLISHED -j ACCEPT

COMMIT
```

This rule means nothing goes through except inbound port 22 from a friendly subnet, and any related traffic to sustain this connection.

## IPTABLES-APPLY

If available, check if your distro offers [iptables-apply](https://www.man7.org/linux/man-pages/man8/iptables-apply.8.html). This tool allows you to apply a new rulesfile which will undo itself if the rules prove to break connectivity.

`# iptables-apply -t 30 ~/iptables`

The onscreen rules will then guide you to start a _new_ `ssh` session within 30 seconds, because only a new session will definitively prove the rules file is working as expected. If your new session connects, continue with `iptables-apply` on the original terminal. Confirming you can create the new session will commit the new rules rules to memory.

## IPTABLES-RESTORE

In the absence of `iptables-apply`, you can redirect your rules to `iptables-restore`. If you have to rely on this method, create a backup of your current-working rules:

```
# iptables-save > ~/iptables.safe
# iptables-restore < ~/iptables; sleep 30; iptables-restore < ~/iptables.safe
```

Following the same philosophy, once you execute the compound statement below--if the rules break your connectivity--there will be a 30 second delay and then a revert to the original rules. If connectivity remains, you can `CTRL-C` to break out of the sleep, avoiding the iptables.safe restoration.


## REVIEW THE RULES

```
# iptables -vnL  
Chain INPUT (policy DROP 31 packets, 1848 bytes)
 pkts bytes target     prot opt in     out     source               destination         
  678 42849 ACCEPT     tcp  --  *      *       10.137.0.0/24        0.0.0.0/0            tcp dpt:22

Chain FORWARD (policy DROP 0 packets, 0 bytes)
 pkts bytes target     prot opt in     out     source               destination         

Chain OUTPUT (policy DROP 3 packets, 214 bytes)
 pkts bytes target     prot opt in     out     source               destination         
  400 46066 ACCEPT     all  --  *      *       0.0.0.0/0            0.0.0.0/0            ctstate RELATED,ESTABLISHED

# iptables-save > ~/iptables.safe
```

Finally, save your new rules with the `iptables-save > ~/iptables.safe` command.

# Let Through Traffic

## ALLOW DNS RESOLUTION

Many activies a server will perform will likely require DNS lookups. DNS operates on outbound UDP port 53.

```
# ping minecraft.codeemo.com
ping: minecraft.codeemo.com: Temporary failure in name resolution

# iptables -A OUTPUT -p udp -m udp --dport 53 -j ACCEPT
# iptables -I INPUT 1 -m conntrack --ctstate RELATED,ESTABLISHED -j ACCEPT

# ping minecraft.codeemo.com
PING minecraft.codeemo.com (167.71.248.91) 56(84) bytes of data.
 [snip]
```

Having DNS figured out means other common utilities for downloading applications will now be possible, easily.

## ALLOW WGET AND CURL

If you need to download an online file, it's easy to get files via `HTTP` and `HTTPS`

```
# iptables -A OUTPUT -p tcp -m tcp --dport 80 -m comment --comment "allow outbound http" -j ACCEPT
# iptables -A OUTPUT -p tcp -m tcp --dport 443 -m comment --comment "allow outbound https" -j ACCEPT
```

## ALLOW ICMP (ping)

Let's let `ICMP` through. For now, friendly-inbound only, and any outgoing.

```
# iptables -A INPUT -p icmp -j ACCEPT
# iptables -A OUTPUT -p icmp -j ACCEPT
```

## ALLOW LOCAL LOOPBACK INTERFACE

`# iptables -A OUTPUT -o lo -m comment --comment "Permit loopback traffic" -j ACCEPT`

# Understanding the Packet Flow

Let's look at the current rules so far. We use the parameters "-vnL" which gives us [v]erbose, [n]umeric ports, [L]ist rules. This also gives us packet/byte counters.

```
# iptables -vnL
Chain INPUT (policy DROP 2 packets, 104 bytes)
 pkts bytes target     prot opt in     out     source               destination         
  110  7468 ACCEPT     all  --  *      *       0.0.0.0/0            0.0.0.0/0            ctstate RELATED,ESTABLISHED
 3239  206K ACCEPT     tcp  --  *      *       10.137.0.0/24        0.0.0.0/0            tcp dpt:22
    0     0 ACCEPT     icmp --  *      *       0.0.0.0/0            0.0.0.0/0           

Chain FORWARD (policy DROP 0 packets, 0 bytes)
 pkts bytes target     prot opt in     out     source               destination         

Chain OUTPUT (policy DROP 0 packets, 0 bytes)
 pkts bytes target     prot opt in     out     source               destination         
 1886  196K ACCEPT     all  --  *      *       0.0.0.0/0            0.0.0.0/0            ctstate RELATED,ESTABLISHED
    0     0 ACCEPT     udp  --  *      *       0.0.0.0/0            0.0.0.0/0            udp dpt:53
    0     0 ACCEPT     tcp  --  *      *       0.0.0.0/0            0.0.0.0/0            tcp dpt:80 /* allow outbound http */
    0     0 ACCEPT     tcp  --  *      *       0.0.0.0/0            0.0.0.0/0            tcp dpt:443 /* allow outbound https */
    0     0 ACCEPT     icmp --  *      *       0.0.0.0/0            0.0.0.0/0           
    0     0 ACCEPT     all  --  *      lo      0.0.0.0/0            0.0.0.0/0            /* Permit loopback traffic */
```

## WATCHING THE TRAFFIC

`# watch -n .5 iptables -vnL`

You can open a new terminal session that provides a real-time view of packets hitting your server. If you are trying to let a new service though, you'll see the packet show up first on the `INPUT` chain. Follow where the numbers increment to see where the packet ends up--trace the packet flow to the expected rule (and not incrementing DROP).

If you want to remove a rule, do so with `--line-numbers`:
```
# iptables --line-numbers --list
Chain INPUT (policy DROP)
num  target     prot opt source               destination         
1    ACCEPT     all  --  anywhere             anywhere             ctstate RELATED,ESTABLISHED
2    ACCEPT     tcp  --  10.137.0.0/24        anywhere             tcp dpt:ssh
3    ACCEPT     icmp --  anywhere             anywhere            

Chain FORWARD (policy DROP)
num  target     prot opt source               destination         

Chain OUTPUT (policy DROP)
num  target     prot opt source               destination         
1    ACCEPT     all  --  anywhere             anywhere             ctstate RELATED,ESTABLISHED
2    ACCEPT     udp  --  anywhere             anywhere             udp dpt:domain
3    ACCEPT     tcp  --  anywhere             anywhere             tcp dpt:http /* allow outbound http */
4    ACCEPT     tcp  --  anywhere             anywhere             tcp dpt:https /* allow outbound https */
5    ACCEPT     icmp --  anywhere             anywhere            
6    ACCEPT     all  --  anywhere             anywhere             /* Permit loopback traffic */

```
You can delete a rule with the syntax: `iptables -D [POLICY] [RULENO]`, for example `iptables -D OUTPUT 5` to remove the ICMP rule.

## DESIGNING NEW RULES TO ALLOW TRAFFIC

Writing a rule to allow inbound 8443 traffic through is simple; the reverse traffic is already handled with the `OUTPUT` rule `RELATED/ESTABLISHED`.

`iptables -A INPUT -p tcp -m tcp --dport 8443 -m comment --comment "mineos webui" -j ACCEPT`

## GET RID OF TRASH-PACKETS

Let's find some packets that just don't make sense to ever honor, and drop them immediately.
```
# iptables -I INPUT 2 -m conntrack --ctstate INVALID -j DROP
# iptables -I INPUT 2 -p tcp -m tcp --tcp-flags FIN,SYN FIN,SYN -m comment --comment "[malicious packet patterns]" -j DROP
# iptables -I INPUT 2 -p tcp -m tcp --tcp-flags SYN,RST SYN,RST -m comment --comment "[malicious packet patterns]" -j DROP
```
# Save and Restore your Work

```
# iptables-save > ~/iptables.v4
# iptables-restore < ~/iptables.v4
```

Different distributions apply iptables in different ways, some use `iptables-persistent`, some put `iptables-restore` in `/etc/rc.local`, some expect the rules at `/etc/sysconfig/iptables`. Check your distribution manual for further details.

# Conclusion

`iptables` provides an immense amount of control of packet flow. Creating good rules from the outset will lower the effort required to maintain a secured system. Be safe!

