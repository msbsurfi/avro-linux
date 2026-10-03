#!/bin/sh
# Avro Linux — Session Input Method Environment Variables
# SPDX-License-Identifier: MPL-2.0
# Sets IBus environment variables so all GTK, Qt, and X11 applications can type Bengali

if [ -z "$GTK_IM_MODULE" ] || [ "$GTK_IM_MODULE" != "ibus" ]; then
    export GTK_IM_MODULE=ibus
fi

if [ -z "$QT_IM_MODULE" ] || [ "$QT_IM_MODULE" != "ibus" ]; then
    export QT_IM_MODULE=ibus
fi

if [ -z "$XMODIFIERS" ] || [ "$XMODIFIERS" != "@im=ibus" ]; then
    export XMODIFIERS="@im=ibus"
fi
