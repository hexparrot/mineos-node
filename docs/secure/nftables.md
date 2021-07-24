# Server Hardening with nftables

`nftables` is a powerful and precise firewall designed specifically to replace `iptables`. It is designed for greater human-readability and greater scaling. This document is to show how to configure `nftables` to conform to a default-deny access strategy: nothing goes through until expressly permitted. 

It is possible that your system simultaneously has `iptables` and `nftables` installed, in a suboptimal configuration known as `iptables-legacy`. Though these two firewall suites are remarkably similar in function and syntax, where possible, keep only one firewall and uninstall `iptables` for both ipv4 and ipv6.

If you are familiar with functional programming languages, the syntax of `nftables` may be familiar. These rules will be written as verbosely as possible to help aid learning the different syntax structure. The conventions of this document are liberal in the use of `{}` braces to accentuate lists, since braces are usually only required for multiple parameters.

Just like `iptables`, a packet will enter different chains, though there are no default tables and chains--the differences are drastic in terminology, but the general flow remains similar.

# Anatomy of a Rule

Though books may dedicate chapters to explaining the ways these rules work, the gist of understanding `nft` is understanding each `{}` is a parameter sent to just the function to its left. When all the components of a rule match, the `verdict` (e.g., accept, drop) is executed.

## CREATE OR REPURPOSE THE RULES FILE

Your installation of `nftables` will already include an example firewall at the conventional location `/etc/nftables.conf`. You can use this file as the basis for your ruleset, or you can create it manually.

```
# cat << EOF > /etc/nftables.conf
#!/usr/sbin/nft -f

flush ruleset

table inet pkt_filter {
    chain inbound {
        type filter hook input priority 0; policy drop;
        
        ct state { related, established } accept
        tcp dport { 22 } ct state { new } accept
    }
    chain outbound {
        type filter hook output priority 0; policy drop;
        
        ct state { related, established } accept
    }
}
EOF
```

Right from the start, set the default policy to `drop`--no packets should be allowed unless explicitly matched. The above rules will allow the bare minimum required to maintain an `ssh` connection during configuration.

This example defines a table `pkt_filter`, as well as chains `inbound` and `outbound`--all of which can be renamed as desired.

## ENABLE NFTABLES

Now, with a minimal firewall configuration, enable `nftables` and get it started:

```
# systemctl enable nftables
# systemctl start nftables
```

## RELOAD RULESET FROM SAVED FILE

After any changes to the configuration, you need to reload the ruleset. `nftables` will detect syntax errors upon reload and fail-safely without applying any changes: you can then make necessary corrections.

```
$ systemctl reload nftables
```

## LOG ALL UNIDENTIFIED TRAFFIC

Create logging rules first. Logged packets can help construct more specific, targeted rules. Take note of the `...` which signify these rules should be the last rules (bottom) of the stanza.

```
    chain inbound {
        ...
        # log all remaining packets
        ip protocol { tcp } counter log prefix "tcp.in.dropped: "
        ip protocol { udp } counter log prefix "udp.in.dropped: "
    }
    chain outbound {
        ...
        # log all remaining packets
        ip protocol { tcp } counter log prefix "tcp.out.dropped: "
        ip protocol { udp } counter log prefix "udp.out.dropped: "
    }
```

All the logged traffic goes to `/var/log/kern.log` and contains the prefix designated above.

# Letting through Services

## ALLOW DNS RESOLUTION

Many activies a server will perform will likely require DNS lookups. DNS operates on outbound UDP port 53.

```
    chain outbound {
        ...
        # allow dns resolution for the host
        udp dport { 53 } accept
        ...
    }
```

```
# ping minecraft.codeemo.com
ping: minecraft.codeemo.com: Temporary failure in name resolution

# vi /etc/nftables.conf
# systemctl reload nftables

# ping minecraft.codeemo.com
PING minecraft.codeemo.com (167.71.248.91) 56(84) bytes of data.
 [snip]
```

## ALLOW WGET AND CURL

If you need to download an online file, it's easy to get files via `HTTP` and `HTTPS`

```
    chain outbound {
        ...
        # initiate outbound connections http/https
        tcp dport { 80, 443 } accept
        ...
    }
```

## ALLOW ICMP (ping)

Let's let `ICMP` through, but also implement rate-limiting. Normal pings are about 1/second; anything hitting a threshold such as 4/second might not be friendly traffic.

```
    chain inbound {
        ...
        # icmp, rate limited
        icmp type { echo-request } limit rate 4/second accept
        icmpv6 type { echo-request } limit rate 4/second accept
        ...
    }
```

## ALLOW LOCAL LOOPBACK INTERFACE

```
    chain inbound {
        ...
        # accept localhost traffic
        iif lo accept
        ...
    }
```

## OPENING ADDITIONAL PORTS

To open up any given port, follow this template:

```
    chain inbound {
        ...
        # allow 8443 (mineos webui) through
		    tcp dport { 8443 } ct state { new } accept
        # match type (tcp) +
            # matching criteria
                  # values to match
                           # match type (connection tracking)
                              # match criteria
                                    # values to match
                                            # verdict
        # alternate way to make this rule
        # tcp dport 8443 ct state new accept 
        ...
    }
```

The match types are innumerable. See the [nftables wiki](https://wiki.nftables.org/wiki-nftables/index.php/Quick_reference-nftables_in_10_minutes#Matches) for more information.

# Understanding the Packet Flow

Let's look at the current rules so far. We use simple command `nft list ruleset` to see the firewall state, including counters--this is live, up to the second data.

```
# nft list ruleset
table inet pkt_filter {
  chain inbound {
    type filter hook input priority 0; policy drop;
    ct state { established, related } accept
    tcp dport { ssh } ct state { new } accept
    tcp dport { 8443 } ct state { new } accept
    icmp type { echo-request } limit rate 4/second accept
    icmpv6 type { echo-request } limit rate 4/second accept
    ip protocol { tcp } counter packets 0 bytes 0 log prefix "tcp.in.dropped: "
    ip protocol { udp } counter packets 0 bytes 0 log prefix "udp.in.dropped: "
  }

  chain outbound {
    type filter hook output priority 0; policy drop;
    ct state { established, related } accept
    tcp dport { http, https } accept
    udp dport { domain } accept
    ip protocol { tcp } counter packets 0 bytes 0 log prefix "tcp.out.dropped: "
    ip protocol { udp } counter packets 77 bytes 5852 log prefix "udp.out.dropped: "
  }
}
```

The counters of `nftables` are much less tabular, but still informative. You can watch live-updated traffic with `watch`:

`# watch nft list ruleset`

## READING THE LOGS

Our logging rules will produce lines that append to `/var/log/kern.log`:
```
Jun 30 06:06:13 mineos-tkldev kernel: [ 8486.974964] tcp.in.dropped IN=eth0 OUT= MAC=00:16:3e:5e:6c:00:fe:ff:ff:ff:ff:ff:08:00 SRC=10.137.0.14 DST=10.137.0.16 LEN=52 TOS=0x00 PREC=0x00 TTL=63 ID=758 DF PROTO=TCP SPT=56296 DPT=8443 WINDOW=64240 RES=0x00 SYN URGP=0
```

There are resources online to help you understand each of these logged segments, but in the meantime it will suffice to be able to identify these key/value pairs:

`... tcp.in.dropped IN=eth0 ... SRC=10.137.0.14 DEST=10.137.0.16 ... DPORT=8443 ...`

`tcp.in.dropped` tells us it's a TCP packet inbound to 8443.

## GET RID OF TRASH-PACKETS

Let's find some packets that just don't make sense to ever honor, and drop them immediately.
```
  chain inbound {
    ...
        # reject trash traffic
        ct state { invalid } drop
        tcp flags & (fin|syn|rst|ack) != syn ct state { new } drop
    ...
  }
```

## GREPPING LOGS FOR COMFORT

We can easily remove excessive noise and get to the interesting lines using `grep`.

```
# grep 'tcp.in.dropped' /var/log/kern.log    #all tcp packets that showed up at silent ports
# grep 'udp.in.dropped' /var/log/kern.log    #all udp packets that showed up at silent ports

# grep 'tcp.in' /var/log/kern.log            #shorthand to see all unexpected tcp traffic (untrusted origin, unused port)
# grep 'in.dropped' /var/log/kern.log        #shorthand to see unused port traffic
```

# Conclusion

`nftables` provides an immense amount of control of packet flow. Creating good rules from the outset will lower the effort required to maintain a secured system. There's much more `nftables` offers for the discerning sysadmin; check out the `nftables` [wiki](https://wiki.nftables.org/wiki-nftables/index.php/Main_Page) for more inspiration!
