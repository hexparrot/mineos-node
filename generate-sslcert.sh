#!/bin/bash -e
# Generate SSL certificate
# Note: daemons using certificate need to be restarted for changes to take effect

fatal() {
    echo "fatal: $@" 1>&2
    exit 1
}

# Exit if openssl is not available
which openssl >/dev/null || fatal "openssl is not installed"

if [ $# -ne "0" ]; then
    HELP=y
fi

set ${O:="TurnKey Linux"}
set ${OU:="Software appliances"}

set ${DAYS:=3650}
set ${BITS:=1024}
set ${KEYPASS:=<blank>}           # workaround: no way of passing a blank pass
set ${CERTFILE:="/etc/ssl/certs/mineos.pem"}
set ${CRTFILE:="/etc/ssl/certs/mineos.crt"}
set ${KEYFILE:="/etc/ssl/certs/mineos.key"}

if [ $HELP ]; then
    echo "Generate SSL certificate"
    echo
    echo "# VARIABLE      EXPLANATION          [VALUE]"
    echo "  C             Country Code         $C"
    echo "  ST            State or province    $ST"
    echo "  L             Locality (city)      $L"
    echo "  O             Organization name    $O"
    echo "  OU            Organizational unit  $OU"
    echo "  CN            Common name          $CN"
    echo "  emailAddress  Email address        $emailAddress"
    echo
    echo "  DAYS          Duration in days     $DAYS"
    echo "  BITS          RSA bits to use      $BITS"
    echo "  KEYPASS       Key password         $KEYPASS"
    echo
    echo "  KEYFILE       Output file          $KEYFILE"
    echo "  CRTFILE       Output file          $CRTFILE"
    echo "  CERTFILE      Output file: KEY+CRT $CERTFILE"
    echo
    echo "# NOTES"
    echo "  Warning: only set password if you know what your doing"
    echo "  Display certificate: openssl x509 -text < $CERTFILE"
    exit 1
fi

TMPCRT=.tmpcrt.pem
TMPKEY=.tmpkey.pem

RDN="/"
[ "$C"  ] && RDN="${RDN}C=${C}/"
[ "$ST" ] && RDN="${RDN}ST=${ST}/"
[ "$L"  ] && RDN="${RDN}L=${L}/"
[ "$O"  ] && RDN="${RDN}O=${O}/"
[ "$OU" ] && RDN="${RDN}OU=${OU}/"
[ "$CN" ] && RDN="${RDN}CN=${CN}/"
[ "$emailAddress" ] && RDN="${RDN}emailAddress=${emailAddress}/"

# create key and password protected cert
openssl req -x509 \
    -newkey rsa:$BITS \
    -keyout $TMPKEY -out $TMPCRT \
    -passout pass:$KEYPASS \
    -days $DAYS \
    -multivalue-rdn -subj "$RDN"

# remove password protection from key if not set by user
if [ "$KEYPASS" == "<blank>" ]; then
    openssl rsa -passin pass:$KEYPASS < $TMPKEY > $KEYFILE
    cp $KEYFILE $CERTFILE
else
    cat $TMPKEY > $KEYFILE
    cp $KEYFILE $CERTFILE
fi

# create crt and add it to certfile (key + crt)
cp $TMPCRT $CRTFILE
cat $TMPCRT >> $CERTFILE

# set permissions
if grep -q ^certssl: /etc/group; then
    chgrp certssl $CRTFILE
    chgrp certssl $KEYFILE
    chgrp certssl $CERTFILE
    chmod 640 $KEYFILE
    chmod 640 $CRTFILE
    chmod 640 $CERTFILE
else
    chmod 600 $KEYFILE
    chmod 600 $CRTFILE
    chmod 600 $CERTFILE
fi

# cleanup
rm -f $TMPCRT $TMPKEY

