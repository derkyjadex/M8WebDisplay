#!/bin/bash

tshark -r $1 -T fields -e usb.capdata -Y '(((usb.src == "32.16.3") && (usb.darwin.request_type == 1)) && (usb.endpoint_address.direction == 1)) && (frame.len > 32)' \
 | tr '\n' ':' \
 | sed $'s/:c0/\\\n/g' \
 | sed 's/:db:dc/:c0/g' \
 | sed 's/:db:dd/:db/g' \
 | tr -d ':'
