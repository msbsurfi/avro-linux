# Windows Avro Keyboard Behavior & UX Specification

## 1. Overview

This document specifies the exact user experience, behavioral expectations, and architectural paradigms of the Windows Avro Keyboard (`mugli/Avro-Keyboard` by OmicronLab / Dr. Mehdi Hasan Khan) and details how the Linux implementation matches and exceeds these expectations while integrating cleanly into Linux desktop environments.

---

## 2. Windows Avro User Interface Concepts

### 2.1 The Floating TopBar
On Windows, Avro Keyboard does not hide itself exclusively inside the system tray; it presents a prominent, elegant floating toolbar docked at the top-center of the screen.

Key characteristics:
1. **Always-On-Top & Sticky**: The TopBar stays visible above all maximized and tiled application windows across all virtual desktops.
2. **Non-Focus-Stealing**: Clicking controls on the TopBar (such as toggling between বাংলা and English, or choosing a layout) never steals keyboard focus from the active text document or editor. The user can click a button on the bar and immediately continue typing.
3. **Draggable & Dockable**: The bar can be dragged freely to any screen edge or arbitrary position, and snaps back to top-center when pinned.
4. **Collapsible / Mini-Mode**: A toggle button allows the user to collapse the full toolbar into an ultra-compact mode containing only the logo and mode toggle.

### 2.2 TopBar Component Breakdown
* **Avro Logo Button ("অ Avro")**: Opens the master menu:
  - Layout Selection submenu
  - Avro Pad (dedicated Bengali text editor)
  - Unicode to Bijoy Converter
  - Keyboard Layout Viewer
  - Skin / Theme selector
  - Preferences
  - Avro Doctor (diagnostic health check)
  - About Avro (developer & contributor credits)
  - Exit
* **Mode Toggle Button**:
  - Displays `বাংলা  [F12]` with vibrant green/emerald styling when Bengali mode is active.
  - Displays `English  [F12]` with cool slate/navy styling when English mode is active.
  - Globally bound to `F12` key.
* **Layout Selector Button**:
  - Displays active layout name (`Phonetic ▼`).
  - Allows 1-click switching between Avro Phonetic, Avro Easy, Bornona, National (Jatiya), and Probhat.
* **Quick Tools**:
  - 📝 Avro Pad
  - 🔄 Unicode ↔ Bijoy Converter
  - ⌨ Keyboard Layout Viewer
  - ⚙ Preferences
  - 🩺 Avro Doctor
* **Window Controls**:
  - 📌 Pin to top-center / Unpin to float
  - ▲ / ▼ Collapse / Expand
  - ✕ Close TopBar

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
