#!/usr/bin/env python3
"""
=============================================================================
avro-daemon — System-Wide Avro Phonetic Input Daemon (IBus-Free)
=============================================================================
Works like Windows Avro: intercepts keystrokes globally via XInput2 raw
events, converts phonetic Latin to Bengali Unicode, and injects Bengali
into the focused application using XTest.

The key insight:
  • RAW key events (XI_RawKeyPress) fire BEFORE the focused app sees them
  • We accumulate Latin chars in a shadow buffer WITHOUT blocking the app
    (the app types the Latin chars too)
  • On word-boundary, we:
      1. Synthesize BackSpace×N via XTest to erase the Latin chars
      2. Synthesize the Bengali Unicode chars via XTest
  This is EXACTLY how Windows Avro works.

Requirements: python3-xlib  (apt install python3-xlib)
SPDX-License-Identifier: MPL-2.0
Developer: MD Shifat Bin Siddique Urfi
=============================================================================
"""

import os, sys, json, socket, threading, time, signal, subprocess
from ctypes import cdll, c_uint, c_int, c_ulong, c_char_p, byref, POINTER

try:
    from Xlib import X, XK, Xatom, display as Xdisplay, error as Xerror
    from Xlib.ext import xinput, xtest
    XLIB_OK = True
except ImportError:
    XLIB_OK = False

# ─── Paths ───────────────────────────────────────────────────────────────────
RUNTIME_DIR = os.environ.get('XDG_RUNTIME_DIR', f'/run/user/{os.getuid()}')
os.makedirs(RUNTIME_DIR, exist_ok=True)
STATE_FILE  = os.path.join(RUNTIME_DIR, 'avro-daemon.state')
SOCKET_PATH = os.path.join(RUNTIME_DIR, 'avro-daemon.sock')
PID_FILE    = os.path.join(RUNTIME_DIR, 'avro-daemon.pid')
LOG_FILE    = os.path.join(RUNTIME_DIR, 'avro-daemon.log')

# ─── Avro phonetic call (via GJS subprocess) ─────────────────────────────────
_AVRO_LIB = '/usr/share/avro-linux/avro-core/phonetic'
_GJS_SCRIPT = f"""
imports.searchPath.unshift('{_AVRO_LIB}');
const Avro = imports.avrolib;
const input = ARGV[0] || '';
print(Avro.parse(input));
"""

def avro_parse(text):
    """Convert Latin phonetic text to Bengali via the JS Avro library."""
    if not text:
        return ''
    try:
        r = subprocess.run(
            ['gjs', '-e', _GJS_SCRIPT, '--', text],
            capture_output=True, text=True, timeout=3
        )
        out = r.stdout.strip()
        return out if out else text
    except Exception:
        return text

# ─── State ───────────────────────────────────────────────────────────────────
class State:
    def __init__(self):
        self.bangla = True
        self.buf    = ''   # accumulated Latin keystrokes (shadow of what app has)
        self.lock   = threading.Lock()
        self._load()

    def _load(self):
        try:
            d = json.load(open(STATE_FILE))
            self.bangla = bool(d.get('bangla', True))
        except Exception:
            pass

    def save(self):
        try:
            json.dump({'bangla': self.bangla}, open(STATE_FILE, 'w'))
        except Exception:
            pass

S = State()

# ─── XTest key injection ──────────────────────────────────────────────────────
def _xtest_key(disp, keysym, press=True):
    kc = disp.keysym_to_keycode(keysym)
    if kc:
        xtest.fake_input(disp, X.KeyPress if press else X.KeyRelease, kc)
        disp.flush()

def inject_backspaces(disp, n):
    bs = disp.keysym_to_keycode(XK.XK_BackSpace)
    for _ in range(n):
        xtest.fake_input(disp, X.KeyPress,   bs)
        xtest.fake_input(disp, X.KeyRelease, bs)
    disp.flush()

def inject_string(disp, text):
    """Inject Unicode string via XTest using UTF-8 key symbols."""
    for ch in text:
        cp = ord(ch)
        # X keysym for Unicode is 0x01000000 + codepoint
        ks = 0x01000000 + cp
        kc = disp.keysym_to_keycode(ks)
        if kc == 0:
            # Temporarily assign the keysym to a spare keycode
            kc = 0xff  # try keycode 255 as spare
            disp.change_keyboard_mapping(kc, [[ks]])
            disp.flush()
        xtest.fake_input(disp, X.KeyPress,   kc)
        xtest.fake_input(disp, X.KeyRelease, kc)
        disp.flush()

def commit(disp):
    """Commit current buffer: send backspaces then Bengali."""
    with S.lock:
        buf    = S.buf
        S.buf  = ''
    if not buf:
        return
    bengali = avro_parse(buf)
    n = len(buf)
    if n > 0:
        inject_backspaces(disp, n)
    if bengali:
        inject_string(disp, bengali)

def cancel(disp):
    """Cancel composition — erase what was typed."""
    with S.lock:
        buf   = S.buf
        S.buf = ''
    if buf:
        inject_backspaces(disp, len(buf))

def commit_then(disp, extra_ks):
    """Commit Bengali then inject an extra keysym (e.g. space)."""
    commit(disp)
    if extra_ks:
        kc = disp.keysym_to_keycode(extra_ks)
        xtest.fake_input(disp, X.KeyPress,   kc)
        xtest.fake_input(disp, X.KeyRelease, kc)
        disp.flush()

# ─── Key dispatch ─────────────────────────────────────────────────────────────
# Keysyms that are word-boundary separators
SEPARATORS = {
    XK.XK_space:    XK.XK_space,
    XK.XK_Return:   XK.XK_Return,
    XK.XK_KP_Enter: XK.XK_Return,
    XK.XK_Tab:      XK.XK_Tab,
}

CANCEL_KS = {
    XK.XK_Escape, XK.XK_Left, XK.XK_Right, XK.XK_Up, XK.XK_Down,
    XK.XK_Home, XK.XK_End, XK.XK_Page_Up, XK.XK_Page_Down, XK.XK_Delete,
}

MOD_KS = {
    XK.XK_Shift_L, XK.XK_Shift_R, XK.XK_Control_L, XK.XK_Control_R,
    XK.XK_Alt_L, XK.XK_Alt_R, XK.XK_Super_L, XK.XK_Super_R,
    XK.XK_Caps_Lock, XK.XK_Num_Lock,
}

# Modifier mask bits
CTRL_MASK  = X.ControlMask
ALT_MASK   = X.Mod1Mask
SUPER_MASK = X.Mod4Mask

def dispatch(disp, keysym, mods, raw_keycode):
    """
    Called for every key press. Returns True if we consumed the event
    (so the caller knows to suppress), False if passthrough.

    NOTE: With RAW events we cannot suppress the key — the key already
    went to the app. Instead we use the shadow-buffer + backspace approach.
    """
    ctrl  = bool(mods & CTRL_MASK)
    alt   = bool(mods & ALT_MASK)
    super_= bool(mods & SUPER_MASK)
    shift = bool(mods & X.ShiftMask)

    # F12 → toggle mode
    if keysym == XK.XK_F12:
        with S.lock:
            S.bangla = not S.bangla
        S.save()
        if not S.bangla:
            cancel(disp)
        log(f'Mode: {"Bangla" if S.bangla else "English"}')
        return

    if not S.bangla:
        return

    # Ctrl/Alt/Super combos → don't interfere, clear buffer
    if ctrl or alt or super_:
        with S.lock:
            S.buf = ''
        return

    # Modifier-only keys
    if keysym in MOD_KS:
        return

    # BackSpace → pop from shadow buffer
    if keysym == XK.XK_BackSpace:
        with S.lock:
            if S.buf:
                S.buf = S.buf[:-1]
                # The backspace already went to the app, which deleted one char.
                # Our buffer is now in sync.
        return

    # Escape / navigation → cancel composition
    if keysym == XK.XK_Escape or keysym in CANCEL_KS:
        cancel(disp)
        return

    # Separator → commit (erase Latin, insert Bengali, then separator)
    if keysym in SEPARATORS:
        commit_then(disp, SEPARATORS[keysym])
        return

    # Period → commit then insert Bengali Dari '।'
    if keysym == XK.XK_period:
        commit(disp)
        # Erase the '.' the app received
        inject_backspaces(disp, 1)
        inject_string(disp, '।')
        return

    # Number 1-9 while composing → commit (daemon uses first candidate only)
    if S.buf and XK.XK_1 <= keysym <= XK.XK_9:
        commit_then(disp, XK.XK_space)
        return

    # Printable ASCII → append to shadow buffer
    try:
        ch = chr(keysym)
        if '\x20' <= ch <= '\x7e' and ch != ' ':
            with S.lock:
                S.buf += ch
            return
    except (ValueError, OverflowError):
        pass

    # Other keys → pass through, clear buffer
    with S.lock:
        S.buf = ''

# ─── XInput2 raw event loop ───────────────────────────────────────────────────
def run_monitor():
    disp = Xdisplay.Display()
    root = disp.screen().root

    ext = disp.query_extension('XInputExtension')
    if not ext or not ext.present:
        log('ERROR: XInput2 not available')
        sys.exit(1)

    # Select XI_RawKeyPress on the root window
    root.xinput_select_events([
        (xinput.AllDevices,
         (1 << xinput.RawKeyPress))
    ])
    disp.sync()

    log(f'Monitoring all key events on display {disp.get_display_name()}')

    while True:
        try:
            ev = disp.next_event()
        except Exception as e:
            log(f'Event read error: {e}')
            time.sleep(0.05)
            continue

        if ev.type != X.GenericEvent:
            continue

        try:
            data = ev.data
            # XI_RawKeyPress evtype = 13
            if not hasattr(data, 'evtype') or data.evtype != 13:
                continue

            keycode = data.detail
            # Get modifier state
            mods = 0
            if hasattr(data, 'mods'):
                mods = data.mods.effective_mods

            shift = bool(mods & X.ShiftMask)
            keysym = disp.keycode_to_keysym(keycode, 1 if shift else 0)

            dispatch(disp, keysym, mods, keycode)

        except Exception as e:
            log(f'Dispatch error: {e}')

# ─── IPC socket ───────────────────────────────────────────────────────────────
def run_socket():
    try: os.unlink(SOCKET_PATH)
    except: pass
    srv = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
    srv.bind(SOCKET_PATH)
    srv.listen(5)
    os.chmod(SOCKET_PATH, 0o666)
    while True:
        try:
            conn, _ = srv.accept()
            raw = conn.recv(256).decode().strip()
            if raw == 'GET':
                resp = json.dumps({'bangla': S.bangla, 'buf_len': len(S.buf)})
            elif raw == 'ON':
                with S.lock: S.bangla = True
                S.save(); resp = 'OK'
            elif raw == 'OFF':
                with S.lock: S.bangla = False
                S.save(); resp = 'OK'
            elif raw == 'TOGGLE':
                with S.lock: S.bangla = not S.bangla
                S.save()
                resp = json.dumps({'bangla': S.bangla})
            else:
                resp = 'UNKNOWN'
            conn.sendall(resp.encode())
            conn.close()
        except Exception as e:
            log(f'Socket err: {e}')

# ─── Logging ─────────────────────────────────────────────────────────────────
_logf = None
def log(msg):
    global _logf
    line = f'[avro-daemon] {msg}'
    print(line, flush=True)
    try:
        if _logf is None:
            _logf = open(LOG_FILE, 'a')
        _logf.write(line + '\n')
        _logf.flush()
    except Exception:
        pass

# ─── Main ─────────────────────────────────────────────────────────────────────
def cleanup(sig=None, frame=None):
    for f in [PID_FILE, SOCKET_PATH]:
        try: os.unlink(f)
        except: pass
    sys.exit(0)

def main():
    if not XLIB_OK:
        print('ERROR: python3-xlib required. Run: sudo apt install python3-xlib')
        sys.exit(1)

    # Single-instance guard
    try:
        with open(PID_FILE) as pf:
            old = int(pf.read().strip())
        # Check if that PID is still avro-daemon
        try:
            os.kill(old, 0)
            print(f'avro-daemon already running (PID {old}). Exiting.')
            sys.exit(0)
        except ProcessLookupError:
            pass
    except Exception:
        pass

    with open(PID_FILE, 'w') as pf:
        pf.write(str(os.getpid()))

    signal.signal(signal.SIGTERM, cleanup)
    signal.signal(signal.SIGINT,  cleanup)

    log(f'Starting (PID {os.getpid()})')
    log(f'Initial mode: {"Bangla" if S.bangla else "English"}')

    threading.Thread(target=run_socket, daemon=True).start()
    run_monitor()

if __name__ == '__main__':
    main()
