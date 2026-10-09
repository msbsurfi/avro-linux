#!/bin/sh
# Avro Linux — input method environment for sessions that have none
# SPDX-License-Identifier: MPL-2.0
#
# GTK, Qt and X11 programs reach IBus, and through it Avro, with these
# variables. They are set only when nothing has chosen an input method
# framework yet, so a choice made with im-config, by the desktop or by the
# user (fcitx, for one) always wins. GNOME and KDE Plasma on Wayland connect
# to IBus by themselves and get nothing.
if [ -z "${GTK_IM_MODULE:-}${QT_IM_MODULE:-}${XMODIFIERS:-}" ]; then
    case "${XDG_SESSION_TYPE:-}:${XDG_CURRENT_DESKTOP:-}" in
        wayland:*GNOME*|wayland:*KDE*) ;;
        *)
            _avro_im=""
            for _avro_rc in "${HOME:-}/.xinputrc" /etc/X11/xinit/xinputrc; do
                if [ -r "$_avro_rc" ]; then
                    _avro_im=$(sed -n 's/^[[:space:]]*run_im[[:space:]][[:space:]]*\([^[:space:]]*\).*/\1/p' "$_avro_rc" | head -n 1)
                    break
                fi
            done
            case "$_avro_im" in
                ""|ibus|default|auto)
                    export GTK_IM_MODULE=ibus QT_IM_MODULE=ibus XMODIFIERS=@im=ibus
                    ;;
            esac
            unset _avro_im _avro_rc
            ;;
    esac
fi
