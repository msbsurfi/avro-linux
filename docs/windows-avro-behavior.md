# Windows Avro Keyboard Behavior & UX Specification

## 1. Overview

This document specifies the exact user experience, behavioral expectations, and architectural paradigms of the Windows Avro Keyboard (`mugli/Avro-Keyboard` by OmicronLab / Dr. Mehdi Hasan Khan) and details how the Linux implementation matches and exceeds these expectations while integrating cleanly into Linux desktop environments.

---

## 2. Windows Avro User Interface Concepts

### 2.1 The Floating TopBar
Avro Keyboard 5 for Windows shows a small floating toolbar, the TopBar (default skin 285×30 px). It is always on top, has no taskbar button, and docks to the top of the screen. Avro Linux re-creates it in `src/standalone/topbar.js` (`avro-topbar`) with the same layout, menus and behaviour, drawn with original artwork (the Windows skin contains Microsoft artwork, such as the Internet Explorer logo, so its images are not reused).

### 2.2 TopBar elements (left to right)
| Element | Windows tooltip / behaviour | Avro Linux |
| :--- | :--- | :--- |
| অ logo | "Drag to move TopBar. Click for menu." Press-and-drag moves the bar; click (any button) opens the main menu | Same |
| Mode button (বাংলা / English) | Any click toggles Bangla / English (F12) | Same; shows the shared mode of the IBus engine |
| ▼ strip under the mode button | "Select your Bangla keyboard layout." Opens the layout menu | Same; the tooltip also names the current layout |
| Layout Viewer (keyboard) | Left click opens the Layout Viewer; other buttons open the layout menu | Same: `avro-layout` for Avro's layouts, `gkbd-keyboard-display` for a system (XKB) layout |
| Avro Mouse | Opens the on-screen keyboard | Same (`avro-mouse`, opened once) |
| Tools (gear) | Tools menu | Same |
| Web | Web menu (Windows shows the IE logo) | Same menu, original globe icon |
| Help (?) | Help menu | Same |
| Power | Setting: show menu (Jump to system tray / Exit), minimize, or exit; right click always shows the menu | Same |

The bar background itself has no action, as on Windows.

### 2.3 Menus
Captions follow Avro Keyboard 5 (`Toggle keyboard mode`, `Dock to top`, `Jump to system tray`, `Select keyboard layout`, `Avro Mouse - Click 'n Type!`, `On the web`, `Options...`, `Help files`, `About Avro Keyboard...`, `Exit`; the Tools menu with `Avro Phonetic Options` and `Fixed Keyboard Layout Options`; the Web, Help, power and tray menus likewise). Windows-only items are left out: Spell checker, Unicode/ANSI output, Keyboard Layout Editor, Skin Designer and Check update. Linux adds Avro Pad and Avro Doctor to Tools and Help.

Keyboard layouts: as on Windows, the menu lists **Avro Phonetic (English to Bangla)** and the fixed layouts that Avro Keyboard ships, in its (alphabetical) order: **Avro Easy**, **Bornona**, **Munir Optima (uni)**, **National (Jatiya)** and **Probhat** (see section 2.5). Avro types all of them itself. The Bangla XKB layouts of the system follow in the submenu "System Bangla keyboard layouts"; choosing one switches IBus to that keyboard and applies the X keyboard layout, like the `ibus engine` command, unless IBus is set to use the system keyboard layout. "About current keyboard layout..." shows the credits stored in the layout file.

### 2.4 Behaviour
* **Always on top, all workspaces, no taskbar entry**, re-asserted every second.
* **Never takes focus** (an improvement over Windows, where the bar is activated and Avro tracks the last application window instead): click the bar and keep typing.
* **Drag** by the logo only, with a **32 px magnetic snap** to the screen edges and the bar kept below any top panel.
* **Position**: default at the top, 250 px left of the right edge; as on Windows only the X position is remembered and the bar docks to the top at start-up. `Dock to top` puts it back.
* **Hover**: glassy blue frames fade in and out over 150 ms (red for the power button); pressed buttons show a dark frame; menus open at the button's bottom-left corner.
* **Transparency**: after 5 s without mouse activity or mode changes, the bar fades to the transparency level (default 80 of 255) in steps of 50; a mode change or the mouse makes it fully visible again. Needs a compositing window manager.
* **System tray**: the tray icon is shown only while the bar is hidden. Click toggles the mode; double-click restores the bar (mode unchanged); right click opens the tray menu. The icon and its tooltip show the mode.
* **Start-up**: one TopBar per session. Running `avro-topbar` again restores it. Commands: `toggle`, `bn`, `sys`, `minimize`, `restore` (bare or with `/`, `-` or `--`). The start-up mode can be Top Bar, tray icon or the last used one.
* **Start on login**: Avro Keyboard starts with Windows unless that is turned off. The TopBar adds itself to the programs that start on login (`~/.config/autostart/avro-topbar.desktop`) the first time it runs; afterwards only the user's choice counts (Preferences → TopBar), and an entry the desktop switched off (`Hidden=true`) counts as off.
* **First runs**: a balloon "Click here to start Bangla typing or Press F12" points at the mode button the first two times; "Avro Keyboard is running here." is shown the first two times the bar goes to the tray.
* **Options** (Preferences → TopBar): skin (Classic, Royal Blue, Flat Mint, Paper Light), transparency on/off and level, power button action, start-up mode, start when logging in.

### 2.5 Fixed keyboard layouts
The five fixed layouts of Avro Keyboard 5 are converted from its `.avrolayout` files (`scripts/import-avrolayout.py`, data in `src/avro-core/fixed/layoutdata.js`) and typed by the Avro engine, so they work wherever Avro Phonetic works, Wayland included, and **F12** switches Bangla / English with all of them. The typing rules are a port of `clsGenericLayoutModern.pas` and `clsGenericLayoutOld.pas` (`src/avro-core/fixed/fixedtyper.js`):

* **Modern Style Typing** (default): kars are typed after their consonant.
  * *Old Style Reph* (on): reph typed after a consonant (cluster, with its kar and chandrabindu) moves before it: ক + র্ = র্ক.
  * *Automatic Vowel Forming* (on): a kar typed where no consonant can take it (after Space, Enter, Tab, a vowel, a sign or punctuation) becomes the full vowel; hasanta + kar also types the full vowel; hasanta twice keeps a visible hasanta (ZWNJ).
  * *Automatically fix Chandrabindu position* (on): a kar typed after chandrabindu goes before it: ক + ঁ + া = কাঁ.
* **Old Style Typing** (type writer / Bijoy style): the e, i and oi kars are typed *before* the consonant and wait for it (also across a conjunct: ি + ক + ্ + ম = ক্মি); e-kar + a-kar = o-kar; reph after the consonant; য-ফলা and র-ফলা typed after a kar go before it.
* **Keys**: the main key block by physical key (whatever the X keyboard layout), Caps Lock shifts letter keys only, Right Alt (or Ctrl+Alt) types the AltGr characters, and the number pad types Bangla digits (*Enable Bangla in NumberPad*, on).
* **Linux specifics**: Windows types each character at once and corrects earlier ones with backspaces. Here the word being typed is the IBus preedit; the same rearrangements happen inside it and the word is committed at Space, Enter, Tab, keys outside the layout, focus and mode changes. Small Windows slips are fixed: the o-kar counts as a kar, "&" and "॥" count as punctuation, and Backspace first takes back a kar that waits for its consonant.
* **Layout Viewer** (`avro-layout`): draws the keyboard of the active layout with a *Normal View* (normal and Shift characters) and an *AltGr View*, *Show on Top* and *About layout...*, and follows layout changes.
* **Options**: Preferences → Keyboard Layouts, or Tools → Fixed Keyboard Layout Options in the TopBar, with the Avro Keyboard captions.

---

## 3. Dedicated Floating Candidate & Preview Window

### 3.1 The Preview Window
Avro Keyboard on Windows shows a small "Preview Window" next to the caret while you type. Avro Linux draws the same window from inside the IBus engine.

Key behaviors:
* **Zero Focus Grab**: an X11 override-redirect popup (`Gtk.WindowType.POPUP`), never managed or focused by the window manager.
* **Visual Presentation** (classic theme):
  - Title bar with the Avro logo, "Preview Window" and a pin button.
  - A light-yellow row with the English (roman) text typed so far, in bold (e.g. `ami`).
  - The Bangla suggestions below, one per row; the selected word is highlighted in blue and is also shown inline in the editor.
* **Placement**: just below the caret, flipped above it near the bottom of the screen, always kept on the monitor that holds the caret.
* **Mouse**: clicking a suggestion inserts it; dragging the title bar moves the window and pins it there; the pin button toggles between "pinned" and "follow the caret". The pinned position is remembered.
* **Themes**: classic (Windows look) and dark.
* **Fallback**: on GNOME Wayland the desktop's IBus candidate panel shows the typed text above a vertical list instead.
* Nothing is shown in password fields: Avro passes keys through there.

---

## 4. Phonetic Composition & Candidate Selection

### 4.1 Suggestion Modes
1. **Dictionary Mode (Default)**:
   - Full dictionary search with suffix expansion and Damerau-Levenshtein distance sorting.
   - Offers real-time suggestions and autocorrect substitutions.
2. **Character Mode**:
   - Matches phonetic sequences against single words and prefix fragments without extensive dictionary heuristics.
3. **Classic / Pure Phonetic Mode**:
   - Zero popup suggestions. Direct transliteration as you type. Immediate conversion committed on word boundary.

### 4.2 Candidate Navigation Keys
* `Tab`: Advances selection to the next candidate word (`index + 1`). Wraps around.
* `Shift + Tab`: Moves selection to the previous candidate word (`index - 1`).
* `Up / Down Arrow`: Moves the selection while the suggestion list is on screen; otherwise commits the word and moves the caret.
* `Left / Right Arrow`: Moves the selection only in a horizontal desktop panel list; otherwise commits the word and moves the caret, as on Windows.
* `Number Keys 1 to 9`: While the suggestion list is on screen, instantly commits the candidate at index `N-1`.
* `Space`: Commits the currently selected candidate followed by a space.
* `Enter / Return`: Commits the currently selected candidate. If `switch-newline` is enabled, the application then also receives the Enter key (new line, form submit).
* `Tab` with a single suggestion, `Home`, `End`, `Delete`, `Page Up/Down` and other non-text keys: commit the word, then reach the application.
* `F12` / mode switch / switching keyboards: keep the word being typed, then switch.
* `Period (.)`: Commits the currently selected candidate followed by the Bengali Dari (`।`).
* `Escape`: Cancels composition, dismisses candidate preview, and resets the input buffer.
* `Backspace`: Removes the last typed Latin character from the buffer and recomputes suggestions in real time. If the buffer is empty, deletes the preceding character in the editor.

---

## 5. Remembered User Selections

When a user frequently chooses an alternative candidate for an ambiguous phonetic sequence (e.g. choosing `আমী` instead of `আমি`), Avro records this preference in local user configuration (`~/.config/avro/candidate-selections.json`). On subsequent input of that phonetic sequence, the remembered word is automatically promoted to the primary `#1` position.

---

## 6. Autocorrection & User Dictionary

1. **Autocorrection**:
   - Automatically substitutes common typing mistakes or contractions with correct Bengali forms (e.g. `:)` -> `:)`, `kintu` -> `কিন্তু`).
   - Supports user-defined autocorrect pairs via the Preferences UI.
2. **User Dictionary**:
   - Allows users to add specialized terms, regional dialect words, slang, or proper nouns into their personal dictionary (`~/.config/avro/user-words.json`).
   - Personal words are indexed in search and given high priority in candidate ranking.
   - Supports export and import for seamless backup and synchronization.

---

## 7. Privacy & Offline Guarantees

* **Zero Network Requests**: The entire phonetic parser, dictionary database, suffix engine, and user configuration run 100% locally.
* **No Telemetry**: No usage metrics, crash pings, or anonymous statistics are ever collected or transmitted.
* **No Keystroke Logging**: Diagnostics output strictly contains software version, environment variables, and daemon status — never user input.
