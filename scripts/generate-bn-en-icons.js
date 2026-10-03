#!/usr/bin/env gjs
/*
    Generate Avro Linux BN and EN icons in SVG and PNG formats at all standard desktop resolutions.
    SPDX-License-Identifier: MPL-2.0
*/

imports.gi.versions.Gtk = '3.0';
const Cairo = imports.cairo;
const Pango = imports.gi.Pango;
const PangoCairo = imports.gi.PangoCairo;
const Gdk = imports.gi.Gdk;
const GLib = imports.gi.GLib;
const Gio = imports.gi.Gio;

const SIZES = [16, 22, 24, 32, 48, 64, 128, 256];

function roundedRect(cr, x, y, w, h, r) {
    cr.newSubPath();
    cr.arc(x + w - r, y + r, r, -Math.PI / 2, 0);
    cr.arc(x + w - r, y + h - r, r, 0, Math.PI / 2);
    cr.arc(x + r, y + h - r, r, Math.PI / 2, Math.PI);
    cr.arc(x + r, y + r, r, Math.PI, 3 * Math.PI / 2);
    cr.closePath();
}

function renderIconPng(targetPath, size, isBangla) {
    let surface = new Cairo.ImageSurface(Cairo.Format.ARGB32, size, size);
    let cr = new Cairo.Context(surface);
    let scale = size / 24.0;
    cr.scale(scale, scale);

    // Background gradient
    let g = new Cairo.LinearGradient(2, 2, 2, 22);
    if (isBangla) {
        g.addColorStopRGBA(0, 0.12, 0.53, 0.90, 1);
        g.addColorStopRGBA(0.4, 0.08, 0.40, 0.75, 1);
        g.addColorStopRGBA(1, 0.05, 0.28, 0.63, 1);
    } else {
        g.addColorStopRGBA(0, 0.27, 0.35, 0.39, 1);
        g.addColorStopRGBA(0.4, 0.22, 0.28, 0.31, 1);
        g.addColorStopRGBA(1, 0.13, 0.13, 0.13, 1);
    }

    let r = 4.5;
    roundedRect(cr, 1.5, 1.5, 21, 21, r);
    cr.setSource(g);
    cr.fillPreserve();

    // Border
    if (isBangla) {
        cr.setSourceRGBA(1.0, 0.88, 0.51, 0.9);
    } else {
        cr.setSourceRGBA(0.81, 0.85, 0.86, 0.9);
    }
    cr.setLineWidth(0.9);
    cr.stroke();

    // Top gloss
    let gl = new Cairo.LinearGradient(2, 2, 2, 12);
    gl.addColorStopRGBA(0, 1, 1, 1, 0.35);
    gl.addColorStopRGBA(1, 1, 1, 1, 0.0);
    roundedRect(cr, 2.0, 2.0, 20, 10, r - 0.5);
    cr.setSource(gl);
    cr.fill();

    // Main text layout
    let layoutMain = PangoCairo.create_layout(cr);
    let descMain = Pango.FontDescription.from_string("Noto Sans Bold");
    descMain.set_absolute_size(10.5 * Pango.SCALE);
    layoutMain.set_font_description(descMain);
    layoutMain.set_text(isBangla ? "BN" : "EN", -1);

    let [ink, log] = layoutMain.get_pixel_extents();
    let ox = 2 + (20 - log.width) / 2.0 - log.x;
    let oy = 2 + (20 - log.height) / 2.0 - log.y;

    // Drop shadow
    cr.setSourceRGBA(0, 0, 0, 0.65);
    cr.moveTo(ox + 0.7, oy + 0.7);
    PangoCairo.show_layout(cr, layoutMain);

    // Main text fill
    cr.setSourceRGBA(1, 1, 1, 1);
    cr.moveTo(ox, oy);
    PangoCairo.show_layout(cr, layoutMain);

    let dir = GLib.path_get_dirname(targetPath);
    GLib.mkdir_with_parents(dir, 0o755);

    let pixbuf = Gdk.pixbuf_get_from_surface(surface, 0, 0, size, size);
    pixbuf.savev(targetPath, "png", [], []);
}

function main() {
    let scriptDir = GLib.path_get_dirname(imports.system.programPath || '.');
    let baseDir = GLib.path_get_dirname(scriptDir);
    let dataIcons = baseDir + "/data/icons";

    for (let sz of SIZES) {
        let bnPath = dataIcons + "/" + sz + "x" + sz + "/avro-bn.png";
        let enPath = dataIcons + "/" + sz + "x" + sz + "/avro-en.png";
        renderIconPng(bnPath, sz, true);
        renderIconPng(enPath, sz, false);
        print("Rendered PNGs for " + sz + "x" + sz);
    }

    renderIconPng(dataIcons + "/avro-bn.png", 32, true);
    renderIconPng(dataIcons + "/avro-en.png", 32, false);
    print("All PNG icons rendered successfully!");
}

main();
