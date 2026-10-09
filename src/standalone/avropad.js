#!/usr/bin/env gjs
/*
    =============================================================================
    Avro Linux — Avro Pad (Standalone Bengali Text Editor)
    SPDX-License-Identifier: MPL-2.0
    Remastered by: MD Shifat Bin Siddique Urfi (DMC, K-79) and MD Mehedi Hasan (CSE 21, BUET)
    =============================================================================

    ARCHITECTURE NOTE — Preedit / Commit Model
    ─────────────────────────────────────────────
    We do NOT do inline TextBuffer mutation while the user is mid-word.
    Instead we follow the same model as the IBus engine:

      • Accumulate Latin keystrokes in `currentBuffer` (string).
      • Show live candidates in the CANDIDATE BAR only (never in the TextBuffer).
      • On a word separator (Space / Return / Tab / Punctuation) or on an
        explicit candidate selection (1..9), commit the chosen Bengali word
        to the TextBuffer and clear `currentBuffer`.
      • On Backspace with an active currentBuffer, pop the last Latin char and
        refresh the candidate bar.
      • On Escape, cancel composition and clear currentBuffer.

    This avoids every fragile delete-then-reinsert race condition and matches
    the well-tested IBus engine behaviour exactly.
    =============================================================================
*/

imports.gi.versions.Gtk = '3.0';
const Gtk = imports.gi.Gtk;
const Gdk = imports.gi.Gdk;
const GLib = imports.gi.GLib;
const Gio = imports.gi.Gio;
const Pango = imports.gi.Pango;

/* ─── Search paths ──────────────────────────────────────────────────────── */
let baseDir = '/usr/share/avro-linux';
try {
    // The tree this file belongs to (source checkout or installed copy), also
    // when another program imports it: that program's location says nothing
    // about where Avro Pad's modules are.
    let m = new Error().stack.match(/(?:^|@|\()(?:file:\/\/)?([^\s:()@]+\.js):\d+/m);
    let scriptPath = m ? GLib.canonicalize_filename(m[1], GLib.get_current_dir())
                       : (imports.system.programPath || '.');
    let scriptDir = GLib.path_get_dirname(scriptPath);
    if (GLib.file_test(scriptDir + '/../avro-core/phonetic/avrolib.js', GLib.FileTest.EXISTS)) {
        baseDir = GLib.path_get_dirname(scriptDir);
    }
} catch (e) {}

// Modules next to the running program (source tree or installed copy)
for (let p of [
    baseDir + '/avro-core/phonetic',
    baseDir + '/avro-core/dictionary',
    baseDir + '/avro-core/autocorrect',
    baseDir + '/avro-core/suggestions',
    baseDir + '/standalone',
    baseDir + '/common',
]) {
    imports.searchPath.unshift(p);
}

/* ─── Core modules ──────────────────────────────────────────────────────── */
let Avro = null;
try { Avro = imports.avrolib; } catch (e) {}

let SuggestionBuilder = null;
try { SuggestionBuilder = imports.suggestionbuilder; } catch (e) {}

let BijoyConverter = null;
try { BijoyConverter = imports.bijoyconverter; } catch (e) {}

let LayoutViewer = null;
try { LayoutViewer = imports.layoutviewer; } catch (e) {}

// Shared modern theme (src/common/avrotheme.js)
let Theme = null;
(function loadTheme() {
    let dirs = ['/usr/share/avro-linux/common'];
    try {
        let m = new Error().stack.match(/(?:^|@|\()(?:file:\/\/)?([^\s:()@]+\.js):\d+/m);
        if (m) {
            let d = GLib.path_get_dirname(GLib.canonicalize_filename(m[1], GLib.get_current_dir()));
            dirs.unshift(d + '/../common', d + '/../src/common');
        }
    } catch (e) {}
    for (let d of dirs) {
        if (GLib.file_test(d + '/avrotheme.js', GLib.FileTest.EXISTS)) {
            imports.searchPath.unshift(d);
            try { Theme = imports.avrotheme; } catch (e) { printerr('Avro theme: ' + e); }
            break;
        }
    }
})();

/* ═══════════════════════════════════════════════════════════════════════════
   CSS — Avro Pad specifics (the common look comes from avrotheme.js)
   ═══════════════════════════════════════════════════════════════════════════ */
function buildPadCss(p) {
    return `
.avro-win .cand-label-list {
    font-size: 14px;
    font-family: 'Noto Sans Bengali', 'Kalpurush', 'SolaimanLipi', sans-serif;
}
.avro-win textview {
    font-family: 'Noto Sans Bengali', 'Kalpurush', 'Siyam Rupali', 'SolaimanLipi', sans-serif;
}
.avro-win textview text {
    caret-color: ${p.accent};
}
.avro-win button.avro-mode { min-width: 118px; }
`;
}

/* ═══════════════════════════════════════════════════════════════════════════
   runAvroPad()
   ═══════════════════════════════════════════════════════════════════════════ */
function runAvroPad(initialText) {
    // Only the first part of a program names it (the TopBar opens this too)
    if (!globalThis.__avroAppIdentity) {
        globalThis.__avroAppIdentity = true;
        try {
            GLib.set_prgname("avro-pad");
            GLib.set_application_name("Avro Pad");
        } catch (e) {}
    }

    /* Apply the shared theme plus Avro Pad specifics */
    let pal = Theme.apply();
    try {
        let padProvider = new Gtk.CssProvider();
        padProvider.load_from_data(buildPadCss(pal));
        Gtk.StyleContext.add_provider_for_screen(
            Gdk.Screen.get_default(),
            padProvider,
            Gtk.STYLE_PROVIDER_PRIORITY_USER
        );
    } catch (e) {}

    /* Main window */
    let window = new Gtk.Window({
        title: "Avro Pad — Bengali Text Editor",
        default_width: 980,
        default_height: 700,
        window_position: Gtk.WindowPosition.CENTER
    });
    window.set_icon_name("avro-pad");
    try { window.set_wmclass("avro-pad", "AvroPad"); } catch (e) {}
    try { Gtk.Window.set_default_icon_name("avro-pad"); } catch (e) {}
    Theme.styleWindow(window);
    window.set_size_request(640, 420);

    /* Suggestion builder */
    let sBuilder = null;
    if (SuggestionBuilder && SuggestionBuilder.SuggestionBuilder) {
        try { sBuilder = new SuggestionBuilder.SuggestionBuilder(); } catch (e) {}
    }

    /* State */
    let isBangla = true;
    let currentBuffer = "";      // Accumulated Latin keystrokes (not in TextBuffer)
    let candidates = [];
    let selectedIdx = 0;
    let fontSize = 18;

    /* ── Main vertical box ── */
    let mainBox = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 0 });

    /* ═══════════════════════════════════════════════════════════════════════
       TOOLBAR
       ═══════════════════════════════════════════════════════════════════════ */
    let header = Theme.headerBar({
        icon: "avro-pad",
        title: "Avro Pad",
        subtitle: "Bengali text editor"
    });
    window.set_titlebar(header);

    /* Mode toggle pill */
    let btnMode = new Gtk.Button({ valign: Gtk.Align.CENTER, margin_start: 14 });
    btnMode.get_style_context().add_class("avro-pill");
    btnMode.get_style_context().add_class("avro-mode");
    function updateModeBtn() {
        btnMode.get_style_context().remove_class("avro-on");
        btnMode.get_style_context().remove_class("avro-off");
        if (isBangla) {
            btnMode.set_label("বাংলা  ·  F12");
            btnMode.set_tooltip_text("Mode: বাংলা — Press F12 or click to switch to English");
            btnMode.get_style_context().add_class("avro-on");
        } else {
            btnMode.set_label("English  ·  F12");
            btnMode.set_tooltip_text("Mode: English — Press F12 or click to switch to বাংলা");
            btnMode.get_style_context().add_class("avro-off");
        }
    }
    updateModeBtn();
    btnMode.connect("clicked", () => {
        isBangla = !isBangla;
        cancelComposition();
        updateModeBtn();
        updateCandBar();
    });
    header.pack_start(btnMode);

    function headerSep() {
        let sep = new Gtk.Separator({ orientation: Gtk.Orientation.VERTICAL, margin_top: 14, margin_bottom: 14, margin_start: 4, margin_end: 4 });
        return sep;
    }

    /* Actions, packed right-to-left (the window buttons are already at the far right) */
    let btnAbout = Theme.iconButton("avro-about-symbolic", "About Avro Pad");
    let btnClear = Theme.iconButton("avro-clear-symbolic", "Clear document");
    let btnLayout = Theme.iconButton("avro-typing-symbolic", "Avro Phonetic Keyboard Layout Guide");
    let btnBijoy = Theme.iconButton("avro-convert-symbolic", "Open Unicode ↔ Bijoy (SutonnyMJ) Converter");
    let btnZoomIn = Theme.iconButton("avro-zoomin-symbolic", "Increase font size");
    let btnZoomOut = Theme.iconButton("avro-zoomout-symbolic", "Decrease font size");
    let btnCopy = Theme.iconButton("avro-copy-symbolic", "Copy entire document to clipboard");

    btnBijoy.connect("clicked", () => {
        if (BijoyConverter && BijoyConverter.runConverterDialog)
            BijoyConverter.runConverterDialog(window);
    });
    btnLayout.connect("clicked", () => {
        if (LayoutViewer && LayoutViewer.runLayoutViewerDialog)
            LayoutViewer.runLayoutViewerDialog(window);
    });
    btnAbout.connect("clicked", () => showAbout(window));

    header.pack_end(btnAbout);
    header.pack_end(btnClear);
    header.pack_end(headerSep());
    header.pack_end(btnLayout);
    header.pack_end(btnBijoy);
    header.pack_end(headerSep());
    header.pack_end(btnZoomIn);
    header.pack_end(btnZoomOut);
    header.pack_end(btnCopy);

    /* ═══════════════════════════════════════════════════════════════════════
       CANDIDATE / SUGGESTION BAR
       ═══════════════════════════════════════════════════════════════════════ */
    let candBarBox = new Gtk.Box({
        orientation: Gtk.Orientation.HORIZONTAL, spacing: 0, border_width: 0,
        margin_start: 16, margin_end: 16, margin_top: 14, margin_bottom: 10
    });
    candBarBox.get_style_context().add_class("avro-candbar");

    let candHdr = new Gtk.Label({ label: "SUGGESTIONS", xalign: 0 });
    candHdr.get_style_context().add_class("avro-cand-header");

    let candList = new Gtk.Label({ label: "", xalign: 0, use_markup: true });
    candList.get_style_context().add_class("cand-label-list");
    candList.set_ellipsize(3);  // PANGO_ELLIPSIZE_END

    let candHint = new Gtk.Label({ label: "[1-9] select   Space commit   Esc cancel", xalign: 1 });
    candHint.get_style_context().add_class("avro-cand-hint");

    candBarBox.pack_start(candHdr,  false, false, 4);
    candBarBox.pack_start(candList, true,  true,  12);
    candBarBox.pack_end  (candHint, false, false, 8);

    mainBox.pack_start(candBarBox, false, false, 0);

    /* ═══════════════════════════════════════════════════════════════════════
       TEXT EDITOR
       ═══════════════════════════════════════════════════════════════════════ */
    let scrolled = new Gtk.ScrolledWindow({
        shadow_type: Gtk.ShadowType.NONE,
        hexpand: true,
        vexpand: true,
        margin_start: 16, margin_end: 16, margin_bottom: 12
    });
    scrolled.get_style_context().add_class("avro-framed");
    // Avro Pad composes Bangla itself. GTK's simple input context keeps a
    // system input method (IBus with the Avro engine, for one) from taking
    // the keys first: with it, the suggestion bar, F12 and Enter would be
    // IBus' and the Pad's own composition would never see a key.
    let textView = new Gtk.TextView({
        wrap_mode: Gtk.WrapMode.WORD,
        left_margin:   22,
        right_margin:  22,
        top_margin:    20,
        bottom_margin: 20,
        im_module: "gtk-im-context-simple"
    });

    let textCss = new Gtk.CssProvider();
    function applyFontCss() {
        try {
            // GTK 3 lays the text out with the font of the textview node; a
            // font size on its "text" subnode is ignored
            textCss.load_from_data(
                "textview { font-size: " + fontSize + "pt; }"
            );
            textView.get_style_context().add_provider(textCss, Gtk.STYLE_PROVIDER_PRIORITY_USER);
        } catch (e) {}
    }
    applyFontCss();

    let textBuffer = textView.get_buffer();
    if (initialText) textBuffer.set_text(initialText, -1);

    /* TextTag for live inline preedit highlighting */
    let preeditTag = new Gtk.TextTag({
        name: "avro-preedit",
        underline: Pango.Underline.SINGLE,
        foreground: pal.preedit
    });
    textBuffer.get_tag_table().add(preeditTag);

    function updatePreeditText(word) {
        let m1 = textBuffer.get_mark("avro_preedit_start");
        let m2 = textBuffer.get_mark("avro_preedit_end");
        if (m1 && m2) {
            let s_iter = textBuffer.get_iter_at_mark(m1);
            let e_iter = textBuffer.get_iter_at_mark(m2);
            textBuffer.delete(s_iter, e_iter);
        }
        if (word && word.length > 0) {
            let insertMark = textBuffer.get_insert();
            let cur_iter = textBuffer.get_iter_at_mark(insertMark);
            let offset = cur_iter.get_offset();
            textBuffer.insert(cur_iter, word, -1);
            let s = textBuffer.get_iter_at_offset(offset);
            let e = textBuffer.get_iter_at_offset(offset + Array.from(word).length);
            if (!m1 || !m2) {
                textBuffer.create_mark("avro_preedit_start", s, true);
                textBuffer.create_mark("avro_preedit_end", e, false);
            } else {
                textBuffer.move_mark(m1, s);
                textBuffer.move_mark(m2, e);
            }
            textBuffer.apply_tag(preeditTag, s, e);
        } else if (m1 && m2) {
            textBuffer.delete_mark(m1);
            textBuffer.delete_mark(m2);
        }
    }

    function clearPreeditTagOnly() {
        let m1 = textBuffer.get_mark("avro_preedit_start");
        let m2 = textBuffer.get_mark("avro_preedit_end");
        if (m1 && m2) {
            let s = textBuffer.get_iter_at_mark(m1);
            let e = textBuffer.get_iter_at_mark(m2);
            textBuffer.remove_tag(preeditTag, s, e);
            textBuffer.delete_mark(m1);
            textBuffer.delete_mark(m2);
        }
    }

    function removePreeditChars() {
        let m1 = textBuffer.get_mark("avro_preedit_start");
        let m2 = textBuffer.get_mark("avro_preedit_end");
        if (m1 && m2) {
            let s = textBuffer.get_iter_at_mark(m1);
            let e = textBuffer.get_iter_at_mark(m2);
            textBuffer.delete(s, e);
            textBuffer.delete_mark(m1);
            textBuffer.delete_mark(m2);
        }
    }

    scrolled.add(textView);
    mainBox.pack_start(scrolled, true, true, 0);

    /* ═══════════════════════════════════════════════════════════════════════
       STATUS BAR
       ═══════════════════════════════════════════════════════════════════════ */
    let statusBox = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL, spacing: 0, border_width: 0 });
    statusBox.get_style_context().add_class("avro-statusbar");

    let statusLeft  = new Gtk.Label({ label: "Avro Pad • Remastered by MD Shifat Bin Siddique Urfi (DMC, K-79) & MD Mehedi Hasan (CSE 21, BUET)", xalign: 0 });
    let statusRight = new Gtk.Label({ label: "F12 = Toggle Bangla/English", xalign: 1 });
    statusLeft .get_style_context().add_class("status-left");
    statusRight.get_style_context().add_class("status-right");

    statusBox.pack_start(statusLeft,  true,  true,  8);
    statusBox.pack_end  (statusRight, false, false, 8);

    mainBox.pack_start(statusBox, false, false, 0);

    /* ═══════════════════════════════════════════════════════════════════════
       COMPOSITION ENGINE  (commit-on-separator model)
       ═══════════════════════════════════════════════════════════════════════ */

    /** Recompute candidates from currentBuffer and refresh the bar */
    function updateCandBar() {
        if (!currentBuffer || !isBangla) {
            candidates = [];
            selectedIdx = 0;
            if (!isBangla) {
                candList.set_markup("<i>English mode active — F12 to switch to Bangla</i>");
            } else {
                candList.set_markup(
                    "<span foreground='" + pal.faint + "'>Type phonetically, e.g.  ami  banglay  gan  gai</span>"
                );
            }
            updatePreeditText("");
            return;
        }

        /* Build candidate list */
        candidates = [];

        /* 1. Try SuggestionBuilder.suggest() */
        if (sBuilder && typeof sBuilder.suggest === 'function') {
            try {
                let res = sBuilder.suggest(currentBuffer);
                if (res && res.words && res.words.length > 0) {
                    candidates = res.words;
                    selectedIdx = (res.prevSelection >= 0 && res.prevSelection < res.words.length)
                                  ? res.prevSelection : 0;
                }
            } catch (e) {}
        }

        /* 2. Fallback: raw Avro.parse */
        if (candidates.length === 0 && Avro) {
            try {
                let raw = Avro.parse(currentBuffer);
                if (raw && raw.length > 0) candidates = [raw];
            } catch (e) {}
        }

        /* 3. Ultimate fallback: original Latin */
        if (candidates.length === 0) {
            candidates = [currentBuffer];
            selectedIdx = 0;
        }

        /* Render candidates with markup — use inline Pango attrs, NOT css class= */
        let parts = [];
        for (let i = 0; i < Math.min(candidates.length, 9); i++) {
            let num = (i + 1).toString();
            let word = candidates[i].replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
            if (i === selectedIdx) {
                parts.push('<span foreground="' + pal.accent + '" weight="bold">[ ' + num + '.  ' + word + ' ]</span>');
            } else {
                parts.push('<span foreground="' + pal.subtext + '">' + num + '.  ' + word + '</span>');
            }
        }
        candList.set_markup(parts.join('   '));

        /* Update live inline preedit text inside editor */
        let activeWord = (candidates.length > 0) ? candidates[selectedIdx] : "";
        updatePreeditText(activeWord);
    }

    /** Insert the committed Bengali word into TextBuffer and reset state */
    function commitWord(extra) {
        clearPreeditTagOnly();
        if (extra) {
            textBuffer.insert_at_cursor(extra, -1);
        }
        currentBuffer = "";
        candidates = [];
        selectedIdx = 0;
        updateCandBar();
    }

    /** Fully cancel composition without committing */
    function cancelComposition() {
        removePreeditChars();
        currentBuffer = "";
        candidates = [];
        selectedIdx = 0;
        updateCandBar();
    }

    /* ═══════════════════════════════════════════════════════════════════════
       KEY HANDLER
       ═══════════════════════════════════════════════════════════════════════ */
    textView.connect("key-press-event", (widget, event) => {
        let [, keyval] = event.get_keyval();
        let state = event.get_state()[1];

        /* ── F12: toggle Bangla / English ── */
        if (keyval === Gdk.KEY_F12) {
            isBangla = !isBangla;
            cancelComposition();
            updateModeBtn();
            updateCandBar();
            return true;    // consume the event
        }

        /* ── English mode: pass everything through ── */
        if (!isBangla) return false;

        /* ── Ctrl / Alt / Super combos: commit then pass through ── */
        let CTRL  = Gdk.ModifierType.CONTROL_MASK;
        let ALT   = Gdk.ModifierType.MOD1_MASK;
        let SUPER = Gdk.ModifierType.SUPER_MASK;
        if ((state & (CTRL | ALT | SUPER)) !== 0) {
            if (currentBuffer) cancelComposition();
            return false;
        }

        /* ── Escape: cancel composition ── */
        if (keyval === Gdk.KEY_Escape) {
            if (currentBuffer) {
                cancelComposition();
                return true;
            }
            return false;
        }

        /* ── Backspace: pop last Latin char ── */
        if (keyval === Gdk.KEY_BackSpace) {
            if (currentBuffer.length > 0) {
                currentBuffer = currentBuffer.slice(0, -1);
                if (currentBuffer.length === 0) {
                    cancelComposition();
                } else {
                    updateCandBar();
                }
                return true;    // consumed — do NOT let Gtk delete from TextBuffer
            }
            return false;       // let Gtk delete the previous char normally
        }

        /* ── Candidate selection 1-9 ── */
        if (currentBuffer && keyval >= Gdk.KEY_1 && keyval <= Gdk.KEY_9) {
            let idx = keyval - Gdk.KEY_1;
            if (idx < candidates.length) {
                selectedIdx = idx;
                updatePreeditText(candidates[selectedIdx]);
                commitWord(" ");
                return true;
            }
        }

        /* ── Arrow keys Up / Down: cycle suggestions if active ── */
        if (currentBuffer && candidates.length > 1) {
            if (keyval === Gdk.KEY_Down || keyval === Gdk.KEY_KP_Down) {
                selectedIdx = (selectedIdx + 1) % candidates.length;
                updateCandBar();
                return true;
            } else if (keyval === Gdk.KEY_Up || keyval === Gdk.KEY_KP_Up) {
                selectedIdx = (selectedIdx - 1 + candidates.length) % candidates.length;
                updateCandBar();
                return true;
            }
        }

        /* ── Space → commit + space ── */
        if (keyval === Gdk.KEY_space) {
            if (currentBuffer) {
                commitWord(" ");
                return true;
            }
            return false;   // let GTK insert the space normally
        }

        /* ── Return / Enter → commit + newline ── */
        if (keyval === Gdk.KEY_Return || keyval === Gdk.KEY_KP_Enter) {
            if (currentBuffer) {
                commitWord("\n");
                return true;
            }
            return false;
        }

        /* ── Tab → cycle suggestions ── */
        if (keyval === Gdk.KEY_Tab || keyval === Gdk.KEY_ISO_Left_Tab) {
            if (currentBuffer && candidates.length > 1) {
                let isShift = (state & Gdk.ModifierType.SHIFT_MASK) !== 0;
                if (isShift) {
                    selectedIdx = (selectedIdx - 1 + candidates.length) % candidates.length;
                } else {
                    selectedIdx = (selectedIdx + 1) % candidates.length;
                }
                updateCandBar();
                return true;
            } else if (currentBuffer) {
                commitWord("\t");
                return true;
            }
            return false;
        }

        /* ── Bengali Dari '।' on period key ── */
        if (keyval === Gdk.KEY_period) {
            if (currentBuffer) commitWord("");
            textBuffer.insert_at_cursor("।", -1);
            return true;
        }

        /* ── Navigation keys: commit without extra char ── */
        let navKeys = [
            Gdk.KEY_Left, Gdk.KEY_Right, Gdk.KEY_Up, Gdk.KEY_Down,
            Gdk.KEY_Home, Gdk.KEY_End, Gdk.KEY_Page_Up, Gdk.KEY_Page_Down,
            Gdk.KEY_Delete
        ];
        if (navKeys.indexOf(keyval) !== -1) {
            if (currentBuffer) cancelComposition();
            return false;
        }

        /* ── Printable phonetic Latin characters ── */
        let unicode = Gdk.keyval_to_unicode(keyval);
        if (unicode > 0) {
            let ch = String.fromCharCode(unicode);
            // Accept printable ASCII used in Avro phonetic; reject Bengali/non-ASCII
            if (/^[\x20-\x7E]$/.test(ch) && !/^[ ]$/.test(ch)) {
                currentBuffer += ch;
                updateCandBar();
                return true;    // consume — do NOT let Gtk insert the Latin char
            } else {
                /* Non-phonetic printable (e.g. emoji) → commit then pass through */
                if (currentBuffer) cancelComposition();
                return false;
            }
        }

        return false;
    });

    /* ═══════════════════════════════════════════════════════════════════════
       TOOLBAR BUTTON ACTIONS
       ═══════════════════════════════════════════════════════════════════════ */
    btnCopy.connect("clicked", () => {
        let start = textBuffer.get_start_iter();
        let end   = textBuffer.get_end_iter();
        let text  = textBuffer.get_text(start, end, false);
        let cb    = Gtk.Clipboard.get_default(Gdk.Display.get_default());
        cb.set_text(text, -1);
        statusLeft.set_text("✓ Text copied to clipboard!");
        GLib.timeout_add(GLib.PRIORITY_DEFAULT, 2500, () => {
            statusLeft.set_text("Avro Pad • Remastered by MD Shifat Bin Siddique Urfi (DMC, K-79) & MD Mehedi Hasan (CSE 21, BUET)");
            return GLib.SOURCE_REMOVE;
        });
    });

    btnZoomIn.connect("clicked", () => {
        if (fontSize < 48) { fontSize += 2; applyFontCss(); }
    });
    btnZoomOut.connect("clicked", () => {
        if (fontSize > 10) { fontSize -= 2; applyFontCss(); }
    });

    btnClear.connect("clicked", () => {
        textBuffer.set_text("", 0);
        cancelComposition();
    });

    /* ═══════════════════════════════════════════════════════════════════════
       WINDOW SETUP
       ═══════════════════════════════════════════════════════════════════════ */
    window.add(mainBox);
    window.connect("destroy", () => Gtk.main_quit());
    window.show_all();

    // Prime the candidate bar UI
    updateCandBar();

    Gtk.main();
    return window;
}

/* ── About dialog ── */
function showAbout(parent) {
    let dialog = new Gtk.AboutDialog({
        transient_for: parent,
        modal: true,
        program_name: "Avro Pad (Remastered Edition)",
        version: (() => { try { return imports.evars.get_version(); } catch (e) { return ""; } })(),
        comments: "A full-featured standalone Bengali text editor with live\nAvro Phonetic composition.\n\nRemastered for Linux by MD Shifat Bin Siddique Urfi (DMC, K-79) and MD Mehedi Hasan (CSE 21, BUET).",
        website: "https://github.com/msbsurfi/avro-linux",
        authors: [
            "Remastered by: MD Shifat Bin Siddique Urfi (DMC, K-79)",
            "and MD Mehedi Hasan (CSE 21, BUET)",
            "Dr. Mehdi Hasan Khan — Avro Keyboard / OmicronLab",
            "Sarim Khan — ibus-avro",
            "Rifat Nabi — jsAvroPhonetic"
        ],
        license_type: Gtk.License.MPL_2_0,
        logo_icon_name: "avro-pad"
    });
    try { Theme.styleWindow(dialog); } catch (e) {}
    dialog.run();
    dialog.destroy();
}

/* ═══════════════════════════════════════════════════════════════════════════
   Standalone entrypoint
   ═══════════════════════════════════════════════════════════════════════════ */
let _isMain = false;
try {
    if (typeof ARGV !== 'undefined') {
        for (let a of ARGV) {
            if (a === '--standalone' || a.indexOf('avropad.js') !== -1) {
                _isMain = true;
                break;
            }
        }
    }
} catch (e) {}

if (_isMain) {
    Gtk.init(null);
    runAvroPad(null);
}
