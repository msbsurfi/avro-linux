# AVRO LINUX — WINDOWS-LEVEL UNIVERSAL DESKTOP IMPLEMENTATION

You are now responsible for turning this project into a **full-featured Linux equivalent of Avro Keyboard for Windows**.

Do not interpret this as:

> “Make an IBus Avro phonetic engine and package it as a .deb.”

That is far too small.

The actual goal is:

> **Build a Linux Avro experience so complete, polished, integrated and reliable that a user who has used Avro Keyboard on Windows should feel that they are using the same Avro product after moving to Linux.**

The product must provide:

- Avro Phonetic
- live transliteration
- live preview/preedit
- word suggestions
- dictionary-based suggestions
- character-mode suggestions
- autocorrection
- user dictionary
- suggestion navigation
- remembered suggestion choices
- Bengali/English switching
- floating preview/suggestion UI
- Avro desktop Top Bar equivalent
- application/tray integration appropriate to Linux
- polished preferences
- correct desktop icon
- correct taskbar/dock identity
- correct application menu identity
- reliable input in GTK applications
- reliable input in Qt applications
- reliable input in Electron applications
- reliable input in browsers
- reliable input in LibreOffice
- reliable input in terminals where technically supported
- Wayland support
- X11 support
- GNOME support
- KDE Plasma support
- Xfce support
- Cinnamon support
- MATE support
- LXQt support
- Debian-family distribution compatibility
- proper `.deb`
- clean upgrades
- clean removal
- no telemetry
- no cloud dependency
- no collection of typed text

---

# 1. FIRST: UNDERSTAND WHAT WINDOWS AVRO ACTUALLY DOES

Before writing code, study the Windows Avro product carefully.

Use the official OmicronLab documentation and available source/reference material.

Do not reduce Windows Avro to “English letters become Bengali letters.”

The Windows product has several important user-facing concepts.

The official documentation describes:

- English-to-Bangla phonetic typing
- a floating preview window
- a Top Bar desktop interface
- a system tray interface
- suggestion modes
- dictionary mode
- character mode
- classic phonetic/no-suggestion mode
- Tab navigation through suggestions
- remembered choices
- autocorrection
- configurable phonetic behavior

The implementation must reproduce the **behavioral concepts**, not merely the underlying transliteration algorithm.

Reference:

https://www.omicronlab.com/avro-keyboard.html

https://www.omicronlab.com/docs.html

https://www.omicronlab.com/download/pdf/Bangla%20Typing%20with%20Avro%20Phonetic.pdf

---

# 2. DO NOT COPY WINDOWS CODE OR PROPRIETARY ASSETS

The Windows implementation is a behavioral/UX reference.

Do not copy proprietary Windows binaries, artwork, skins, or code unless their licensing explicitly permits it.

Use:

- Linux-native implementation
- open-source Avro components
- properly licensed resources
- original Linux UI implementation

Preserve all upstream licenses.

Inspect the license of every third-party component and asset.

---

# 3. PRIMARY LINUX REFERENCE

Study:

https://github.com/sarim/ibus-avro

This is the primary Linux implementation/reference.

Understand its:

- Avro core
- dictionary
- suggestion builder
- autocorrect
- IBus engine
- preedit
- candidate handling
- configuration
- preferences

Do not blindly preserve architectural weaknesses merely because the existing project has them.

Improve them where necessary.

---

# 4. THE FUNDAMENTAL ARCHITECTURAL RULE

Separate the product into these layers:

```text
                    AVRO LINUX
                         │
        ┌────────────────┼────────────────┐
        │                │                │
        ▼                ▼                ▼
   Desktop UI      Input Engine       Preferences
   Top Bar         Integration        Configuration
   Status UI       Layer
        │                │
        └────────────────┼────────────────┘
                         ▼
                  AVRO CORE ENGINE
                         │
          ┌──────────────┼──────────────┐
          ▼              ▼              ▼
      Phonetic       Dictionary      Autocorrect
          │              │              │
          └──────────────┼──────────────┘
                         ▼
                    Suggestions
```

The Avro core must NOT depend on GTK, Qt, GNOME, KDE or a particular desktop.

The input integration layer must be replaceable.

The UI must be replaceable.

This is critical for universal desktop support.

---

# 5. THE MOST IMPORTANT REQUIREMENT: INPUT MUST WORK WHEN AVRO IS SELECTED

The user expectation is:

> “I selected Avro as my IBus input method. Now Avro should work wherever I can normally type.”

Treat this as the primary compatibility requirement.

Do not say:

> “IBus is running, therefore it works.”

Actually test text entry.

---

# 6. IMPLEMENT MULTIPLE LINUX INPUT PATHS

Do not rely on a single mechanism.

Implement and/or correctly integrate all appropriate mechanisms available on Linux.

The compatibility architecture should consider:

```text
                    Avro Core
                       │
                 Avro IME Engine
                       │
          ┌────────────┼─────────────┐
          │            │             │
         IBus          XIM        Toolkit bridges
          │            │             │
     ┌────┼────┐       │       ┌─────┴─────┐
     │    │    │       │       │           │
   GTK   Qt  Electron   X11    GTK         Qt
     │    │    │       │       │           │
     └────┴────┴───────┴───────┴───────────┘
                       │
                    Apps
```

Where Linux provides a standard input-method mechanism, use it.

Do NOT implement global keyboard hooks as the default solution.

Do NOT inject fake keypresses.

Do NOT use X11-only hacks to pretend to support Wayland.

---

# 7. GTK SUPPORT

Explicitly test GTK applications.

Avro must correctly handle:

- GtkTextView
- GtkEntry
- GTK dialogs
- GTK search boxes
- GTK file-name fields
- GTK web/application text fields

Test both older and newer GTK environments where practical.

Test:

- GNOME Text Editor
- gedit where available
- GTK-based file manager fields
- GTK-based settings applications

Test:

- preedit
- commit
- backspace
- delete
- cursor movement
- selection
- focus switching

---

# 8. QT SUPPORT

This is mandatory.

Test real Qt applications.

At minimum:

- KDE text editor
- KDE settings/search fields
- Qt dialogs
- Qt text fields
- LibreOffice where its toolkit/input path differs
- at least one Qt application under Plasma

Test:

- Wayland
- X11

Do not assume “IBus works in GTK” means “Qt works.”

---

# 9. ELECTRON SUPPORT

Test Electron applications.

At minimum:

- VS Code
- another Chromium/Electron text editor or application

Test:

- editor
- search
- command input
- dialogs
- text fields

Do not treat Electron as simply “Chrome.”

Investigate its actual Linux input-method behavior.

---

# 10. BROWSER SUPPORT

Test:

### Firefox

- address bar
- search box
- textarea
- contenteditable
- web applications

### Chromium

- address bar
- search box
- textarea
- contenteditable

### Google Chrome

Where available.

The following must work:

```text
ami banglay likhi
```

→

```text
আমি বাংলায় লিখি
```

inside ordinary web forms.

Test long continuous typing.

Test editing in the middle of a word.

---

# 11. LIBREOFFICE

LibreOffice is a mandatory compatibility target.

Test:

- Writer
- Calc
- dialogs
- text input
- editing
- cursor movement
- preedit/commit

Do not declare LibreOffice supported merely because Firefox works.

There are existing reports of IBus Avro behaving differently in LibreOffice/KDE environments. Investigate these classes of problems explicitly.

---

# 12. WAYLAND

Wayland is a first-class target.

Test:

- GNOME Wayland
- KDE Plasma Wayland
- other Wayland desktops where practical

Do not depend on:

- XGrabKey
- XTest
- global X11 hooks
- X11 window enumeration
- X11-only clipboard tricks

The input method must operate through the Linux input-method ecosystem.

If an application does not expose an input-method interface, do not fake compatibility.

Instead:

1. determine why
2. determine whether a standard compatibility path exists
3. implement the legitimate path
4. document the limitation if the application fundamentally prevents IME integration

Never claim universal compatibility without evidence.

---

# 13. X11

Support X11 properly.

Test:

- GNOME Xorg
- KDE X11
- Xfce
- Cinnamon
- MATE

Test:

- IBus
- XIM where necessary
- application-specific input behavior

Avoid X11-only assumptions in the core engine.

---

# 14. DESKTOP ENVIRONMENT COMPATIBILITY

Test:

### GNOME

- Wayland
- X11

### KDE Plasma

- Wayland
- X11

### Xfce

- X11

### Cinnamon

- X11

### MATE

- X11

### LXQt

- X11
- Wayland where available

### Budgie

Pay special attention to IBus panel/candidate behavior.

There is documented history of Budgie launching IBus in a way that prevents the IBus suggestion window from appearing. The solution must not simply assume that every desktop exposes the same IBus panel behavior.

The product must therefore own its own **Avro suggestion/preview UI** rather than relying blindly on an external desktop panel.

---

# 15. VERY IMPORTANT: BUILD OUR OWN AVRO SUGGESTION UI

Do NOT depend entirely on the desktop's IBus panel for the Avro user experience.

This is one of the biggest architectural requirements.

The existing Linux implementation has had situations where the Avro suggestion window is absent depending on how the desktop starts IBus.

Therefore:

## Build a dedicated Avro candidate/preview UI.

It should be controlled by the Avro engine.

It should display:

- current phonetic input
- resulting Bengali preview
- candidate suggestions
- selected candidate
- keyboard hints
- optional status information

It must be positioned intelligently relative to the active text cursor/application when the environment exposes the required information.

---

# 16. WINDOWS-STYLE FLOATING PREVIEW

Windows Avro explicitly provides a floating preview window showing how English phonetic input is being converted into Bangla.

Implement a Linux equivalent.

Example:

User types:

```text
ami banglay
```

The floating UI should dynamically show something similar to:

```text
ami banglay
────────────
আমি বাংলায়
```

The exact visual design should be modernized, but the concept must remain.

The preview must:

- update while typing
- remain visually close to the text-entry context
- avoid stealing focus
- never become the active typing window
- disappear when committed/cancelled
- follow the active application
- work on Wayland where the compositor permits the required positioning
- gracefully fall back when exact cursor positioning is unavailable

Never allow the preview window to intercept keyboard input.

---

# 17. WORD SUGGESTIONS

This is NOT optional.

Suggestions are a core part of the Avro experience.

When a phonetic input has multiple possible interpretations, show candidates.

For example, if the user types an ambiguous phonetic sequence, the engine should be able to present candidate Bengali words.

Implement:

- dictionary mode
- character mode
- classic phonetic/no-suggestion mode
- candidate ranking
- candidate navigation
- remembered choice
- autocorrect

The Windows documentation explicitly describes dictionary mode, character mode, classic phonetic mode, Tab-based suggestion navigation, remembered choices and autocorrection.

---

# 18. SUGGESTION UI DESIGN

Design a polished candidate popup.

Example conceptual UI:

```text
┌──────────────────────────────────────────────┐
│ ami banglay                                  │
│                                              │
│ ① আমি     ② আমী     ③ আমিই     ④ ...       │
└──────────────────────────────────────────────┘
```

Or a more compact modern UI:

```text
       ┌─────────────────────────────┐
       │ ami                         │
       │                             │
       │  আমি   আমী   আমিই   ...    │
       └─────────────────────────────┘
```

The UI should:

- be unobtrusive
- have rounded modern styling
- support dark/light theme
- use proper Bengali font fallback
- have keyboard selection
- highlight the active candidate
- support mouse selection
- support Tab
- support arrow keys
- support Enter
- support Escape
- never steal focus

Do not copy Windows pixels exactly.

Recreate the same interaction quality with a native Linux design.

---

# 19. SUGGESTION KEYBOARD BEHAVIOR

Implement:

- Up/Down → candidate navigation
- Tab → next suggestion
- Shift+Tab → previous suggestion where practical
- Enter → commit selected suggestion
- Space → commit according to Avro semantics
- Escape → cancel suggestion/preedit
- number keys → candidate selection where appropriate
- mouse click → candidate selection

Make the behavior configurable if it conflicts with normal application semantics.

Never break ordinary keyboard behavior unnecessarily.

---

# 20. REMEMBER USER CHOICE

Implement Avro's concept of remembering choices among multiple hints.

For example, if the user repeatedly chooses one candidate for a particular phonetic pattern, allow the system to learn that choice locally.

This must be:

- local
- deterministic
- inspectable
- resettable
- optional

Do NOT use machine-learning cloud services.

Do NOT upload typing data.

---

# 21. AUTOCORRECTION

Implement a real local autocorrect system.

Provide:

- default autocorrect dictionary
- custom entries
- enable/disable
- import/export where appropriate
- reset
- preferences UI

Allow the user to access/edit the autocorrect dictionary from the Avro UI.

This mirrors the Windows Avro concept documented by OmicronLab.

---

# 22. TOP BAR — RECREATE THE AVRO EXPERIENCE

Windows Avro historically has a dedicated **Top Bar on Desktop** in addition to its system-tray interface.

Create a Linux-native equivalent.

Do NOT simply create a random always-on-top window.

The Top Bar should be a proper Avro desktop control surface.

It should provide:

- Avro logo
- Bengali/English state
- current input mode
- quick mode switch
- access to preferences
- dictionary/autocorrect access
- layout information where applicable
- about/help
- status

Example conceptual design:

```text
┌───────────────────────────────────────────────────────────┐
│  [Avro]   বাংলা   │  Avro Phonetic  │  ⚙  ⋮             │
└───────────────────────────────────────────────────────────┘
```

The visual language should feel like classic Avro while being modernized for Linux.

---

# 23. TOP BAR BEHAVIOR

The Top Bar must:

- never steal keyboard focus
- remain available while typing
- hide/show cleanly
- support transparency where appropriate
- support dark/light themes
- avoid covering application content unnecessarily
- remember position/state
- work across monitors
- behave correctly with HiDPI
- behave correctly when displays are added/removed
- behave correctly under Wayland
- behave correctly under X11

Do not use abusive always-on-top behavior.

Respect the compositor.

If Wayland prevents arbitrary global positioning, implement the closest standards-compliant behavior and clearly document it.

---

# 24. SYSTEM TRAY / STATUS UI

Provide a Linux-native status interface where supported.

The status interface should provide:

- Avro icon
- current mode
- enable/disable
- preferences
- quick settings
- exit/restart engine where appropriate

Do not rely on deprecated tray APIs without compatibility consideration.

Support desktop environments that have no traditional tray.

The main product must never depend on a tray icon being present.

---

# 25. APPLICATION IDENTITY

This must be solved properly.

The Avro application must have one consistent identity across:

- `.desktop`
- AppStream
- GTK application ID
- window identity
- Wayland app identity
- X11 WM_CLASS where relevant
- icon name
- executable
- taskbar/dock

Prevent:

- duplicate taskbar icons
- generic icons
- missing icons
- incorrect icons
- two Avro entries
- preferences appearing as an unrelated application

Test GNOME Shell.

Test KDE task manager.

Test Xfce panel.

Test Cinnamon panel.

Test MATE panel.

---

# 26. ICON

Create a professional Avro Linux icon.

Requirements:

- SVG master
- correct icon theme installation
- scalable
- good at 16×16
- 24×24
- 32×32
- 48×48
- 64×64
- 128×128
- 256×256
- 512×512 where useful

It must look correct:

- in application launcher
- taskbar
- dock
- preferences
- notifications if used

No generic placeholder icon.

---

# 27. AVRO STATUS MUST BE OBVIOUS

The user should always be able to determine:

```text
English
```

versus:

```text
বাংলা
```

without guessing.

Use:

- icon/state
- text indicator where appropriate
- Top Bar
- status UI
- optional notification

Do not rely only on a tiny obscure system indicator.

---

# 28. AVRO PHONETIC ENGINE

Do not rewrite the Avro algorithm without reason.

Preserve established Avro behavior.

Build extensive regression tests.

Test:

- vowels
- consonants
- conjuncts
- ref
- ra-phala
- ya-phala
- hasanta
- nukta
- chandrabindu
- anusvara
- visarga
- punctuation
- numbers
- capitalization
- repeated characters
- word boundaries
- ambiguous sequences
- common Bangladeshi names
- medical terminology
- academic terminology
- internet terminology

---

# 29. PREEDIT MODEL

The preedit engine must be carefully designed.

Separate:

```text
raw phonetic input
```

from:

```text
current Bengali preview
```

from:

```text
committed Bengali text
```

Never confuse the three.

For example:

```text
Raw:
ami banglay

Preview:
আমি বাংলায়

Committed:
আমি বাংলায়
```

Editing the raw phonetic buffer must correctly update the preview.

---

# 30. MIDDLE-OF-WORD EDITING

This must work.

Test:

```text
আমি বাংলায় লিখি
```

Move the cursor into the middle.

Insert/delete characters.

The engine must not corrupt the Bengali sequence.

Test:

- left
- right
- backspace
- delete
- Home
- End
- selection
- replacement

Where the application provides surrounding text, use it carefully.

Where surrounding-text support is unavailable, degrade gracefully.

---

# 31. FOCUS TRANSITIONS

Test:

1. Start typing in Firefox.
2. Switch to VS Code.
3. Switch to LibreOffice.
4. Switch to terminal.
5. Switch back.

No stale preedit.

No duplicated text.

No lost input.

No candidate popup attached to the wrong application.

---

# 32. IBUS RESTART

Test:

```text
ibus restart
```

or equivalent supported restart procedure.

Verify:

- engine reconnects
- settings survive
- Avro remains registered
- no stale popup remains
- no crash

---

# 33. DESKTOP RESTART

After logout/login:

- IBus starts correctly
- Avro engine is available
- input source remains configured
- preferences remain
- user dictionary remains
- candidate system remains

---

# 34. CONFIGURATION

Use:

- GSettings where appropriate
- XDG configuration/data locations
- per-user configuration
- safe migrations

Support configuration version migrations.

If configuration is malformed:

- do not crash
- recover safely
- preserve a backup where appropriate
- report the problem through diagnostics

---

# 35. WINDOWS-LIKE PREFERENCES EXPERIENCE

The settings application should not look like an unfinished developer tool.

Build a polished UI with:

### General

- enable Avro
- default mode
- Bengali/English
- startup

### Avro Phonetic

- suggestion mode
- dictionary mode
- character mode
- classic phonetic mode
- Tab suggestion behavior
- remember choice
- punctuation behavior

### Suggestions

- candidate count
- candidate popup
- preview
- keyboard navigation

### Autocorrect

- enable
- dictionary editor
- import/export
- reset

### Dictionary

- user words
- add
- remove
- import/export

### Interface

- Top Bar
- floating preview
- status indicator
- theme
- position
- transparency where appropriate

### Shortcuts

- toggle input
- show/hide UI
- other configurable shortcuts

### Diagnostics

- IBus status
- engine status
- desktop
- session type
- Wayland/X11
- toolkit environment
- version

Never display raw typed text in diagnostics.

---

# 36. “IBUS MODE = AVRO” MUST BE THE CENTRAL TEST

The most important integration scenario is:

```text
System input method:
    IBus

Selected engine:
    Avro Phonetic
```

Then the user opens:

- GTK application
- Qt application
- Firefox
- Chromium
- Electron
- LibreOffice
- terminal

and types Bengali.

Do not require the user to separately launch some hidden Avro daemon for normal operation unless absolutely necessary.

The IBus engine must be the authoritative input engine.

The UI daemon may exist separately, but the typing engine must remain reliable independently.

---

# 37. DO NOT CONFUSE UI DAEMON WITH INPUT ENGINE

Architect:

```text
avro-engine
     │
     ├── always reliable
     │
     └── IBus integration

avro-ui
     │
     ├── Top Bar
     ├── preview
     ├── candidates
     └── preferences
```

If the UI crashes:

> typing should continue.

If the candidate popup crashes:

> typing should continue.

If preferences crash:

> typing should continue.

If the IBus engine crashes:

> it must restart/recover cleanly.

---

# 38. CANDIDATE POPUP MUST NOT CONTROL INPUT

The popup is presentation.

The engine is authority.

Never allow:

```text
candidate popup owns keyboard
```

Instead:

```text
IBus engine receives event
       ↓
Avro core processes event
       ↓
candidate state generated
       ↓
UI notified
       ↓
user selects candidate
       ↓
engine commits text
```

This prevents UI crashes from destroying input state.

---

# 39. WAYLAND POPUP DESIGN

Wayland imposes restrictions that X11 does not.

Do not attempt to circumvent the compositor.

Use appropriate Wayland/GTK mechanisms for transient/candidate/preedit surfaces.

If exact cursor coordinates are unavailable:

- use the application-provided candidate location if available
- use the compositor/input-method protocol where appropriate
- otherwise provide a sensible fallback position

The fallback must still be usable.

Do not break typing because perfect popup positioning is impossible.

---

# 40. X11 POPUP DESIGN

On X11:

- correctly identify active application
- position popup near cursor when possible
- handle multi-monitor
- handle scaling
- handle window movement
- avoid stealing focus
- avoid appearing behind the application

---

# 41. MULTI-MONITOR

Test:

- one monitor
- two monitors
- different DPI
- different scaling
- monitor added/removed
- application moved between monitors

Preview/candidate UI must follow the correct display.

---

# 42. HI-DPI

Test:

- 100%
- 125%
- 150%
- 200%

Icons, popup and Top Bar must remain sharp.

Do not hard-code pixel dimensions assuming 96 DPI.

---

# 43. THEME

Support:

- light
- dark
- system theme

The UI must remain readable.

The candidate popup must remain readable.

Bengali fonts must render correctly.

---

# 44. FONT HANDLING

Do not bundle random copyrighted fonts.

Use system fonts.

Provide sensible Bengali font fallback.

Detect missing Bengali glyph support where possible.

The software must not depend on a proprietary Windows font.

---

# 45. PERFORMANCE

Typing must feel instantaneous.

Target:

- negligible per-keystroke latency
- no visible lag
- no UI freezes
- no blocking dictionary operations
- no network requests

Benchmark:

- normal typing
- rapid typing
- long words
- long paragraphs
- suggestion generation
- dictionary lookup

---

# 46. NO INTERNET DEPENDENCY

Avro typing must work completely offline.

Internet must NOT be required for:

- phonetic conversion
- dictionary
- suggestions
- autocorrect
- candidate selection

---

# 47. NO TELEMETRY

Absolutely no:

- keystroke analytics
- raw text collection
- cloud suggestions
- remote logging
- tracking

The product should be trustworthy for:

- passwords
- medical records
- banking
- private documents
- academic work

---

# 48. UNIVERSAL DEBIAN PACKAGING

The `.deb` must be designed for broad Debian-family compatibility.

Do not compile against unnecessarily new APIs when an older supported baseline can be used.

Separate:

- runtime dependencies
- optional dependencies
- build dependencies

Use Debian package metadata correctly.

Avoid unnecessary version pinning.

If different distributions package the same dependency under different names, document it rather than assuming one package name is universal.

---

# 49. DISTRIBUTION TARGETS

At minimum investigate:

- Debian Stable
- Debian Testing
- Ubuntu LTS
- Linux Mint
- Ubuntu-based distributions

Where practical investigate:

- Pop!_OS
- elementary
- KDE Neon
- Raspberry Pi/Debian ARM64

Do not claim support simply because installation succeeds.

Typing must actually work.

---

# 50. TEST THE ACTUAL DESKTOP

Do not test only in a terminal.

Use VMs/containers where appropriate, but for GUI/input testing use actual desktop sessions.

Create a compatibility test plan for:

```text
Debian + GNOME + Wayland
Debian + KDE + Wayland
Debian + KDE + X11
Debian + Xfce
Ubuntu + GNOME + Wayland
Ubuntu + GNOME + X11
Linux Mint + Cinnamon
MATE
LXQt
```

Prioritize realistic supported combinations.

---

# 51. TEST APPLICATION MATRIX

Create:

```text
GTK
Qt
X11 native
Wayland native
Firefox
Chromium
Chrome
VS Code
Electron
LibreOffice
Terminal
```

For every application record:

```text
Preedit:       PASS/FAIL
Commit:        PASS/FAIL
Suggestions:   PASS/FAIL
Backspace:     PASS/FAIL
Cursor:        PASS/FAIL
Focus switch:  PASS/FAIL
```

---

# 52. NEVER FAKE A PASS

This is mandatory.

Never write:

```text
KDE tested: PASS
```

unless it was actually tested.

Never infer:

> Firefox works, therefore all Electron apps work.

Never infer:

> GTK works, therefore Qt works.

Never infer:

> X11 works, therefore Wayland works.

Every compatibility claim requires evidence.

---

# 53. BUILD A DIAGNOSTIC TOOL

Provide:

```text
avro-linux-doctor
```

or equivalent.

It should inspect:

- distro
- kernel
- desktop
- session type
- Wayland/X11
- IBus version
- IBus daemon state
- Avro engine registration
- current input method
- locale
- GTK environment
- Qt environment
- installed dependencies
- GSettings
- desktop file
- icon availability

It must NOT collect typed content.

Provide:

```text
Avro Linux Diagnostics
----------------------
Distribution: Debian
Desktop: KDE Plasma
Session: Wayland
IBus: Running
Avro Engine: Registered
Current Engine: Avro Phonetic
GTK: Available
Qt: Available
Configuration: OK
```

---

# 54. PROVIDE A SELF-TEST

Create a diagnostic/test window.

The user can click:

> Test Bengali typing

and receive an instruction:

```text
Type:

ami banglay likhte pari
```

Expected:

```text
আমি বাংলায় লিখতে পারি
```

Then test:

- preedit
- suggestion
- commit
- editing

This must be optional and must not record typed text.

---

# 55. TROUBLESHOOTING MUST BE ACTIONABLE

If Avro does not work:

do not simply display:

> IBus error.

Tell the user what is wrong.

For example:

```text
IBus is not running.

Recommended action:
Start IBus and log out/in if required.
```

or:

```text
Avro is installed but not registered.

Recommended action:
Refresh IBus component registry.
```

or:

```text
Avro is registered but not selected.

Current engine:
English (US)

Select:
Avro Phonetic
```

---

# 56. RECOVER AUTOMATICALLY WHERE SAFE

The application may automatically repair:

- stale engine registration
- missing generated metadata
- invalid user configuration
- temporary UI state

But do not silently modify unrelated system configuration.

Never overwrite user data without permission.

---

# 57. TOP BAR AND POPUP SHOULD FEEL LIKE ONE PRODUCT

The visual language must be consistent:

- same icon
- same typography
- same colors
- same spacing
- same terminology
- same settings
- same state indicator

The user should recognize:

```text
Top Bar
Candidate Popup
Preferences
Tray/Status
```

as components of one application.

---

# 58. DO NOT MAKE IT LOOK LIKE “A RANDOM GTK APP”

The application should have its own polished Avro identity.

Use:

- refined spacing
- modern cards
- restrained colors
- proper Bengali typography
- consistent iconography
- subtle borders/shadows where supported
- clean settings navigation

Do not over-design it.

The target is:

> professional desktop software.

---

# 59. ACCESSIBILITY

Support:

- keyboard navigation
- screen readers where possible
- accessible labels
- focus states
- scalable fonts
- high contrast where supported

---

# 60. TEST LANGUAGE EDGE CASES

Test:

```text
আমি
বাংলা
বাংলায়
বাংলাদেশ
শিক্ষা
প্রযুক্তি
স্বাধীনতা
চিকিৎসা
বিশ্ববিদ্যালয়
প্রশ্ন
ব্যবস্থা
স্বাস্থ্য
```

and difficult phonetic inputs.

Include medical/academic Bangla terminology because these are realistic user workloads.

---

# 61. TEST LONG TEXT

Test:

- one sentence
- paragraph
- page
- large document

Ensure:

- no memory leak
- no progressive slowdown
- no candidate popup degradation
- no dictionary degradation

---

# 62. TEST RAPID TYPING

Use fast automated/manual input where practical.

Test:

- rapid key presses
- rapid word boundaries
- rapid candidate selection
- rapid mode switching

No dropped characters.

---

# 63. TEST SUGGESTION PERFORMANCE

Measure:

```text
keypress
   ↓
phonetic conversion
   ↓
candidate generation
   ↓
popup update
```

Candidate generation must not visibly lag behind normal typing.

Use caching/indexing where necessary.

---

# 64. TEST CRASH RECOVERY

Kill:

- UI
- popup
- IBus engine

individually.

Then verify recovery.

A crash in the candidate UI must not kill the engine.

---

# 65. PACKAGE TEST

Perform:

```bash
make clean
make
make test
make package
```

Then install the actual generated `.deb`.

Do not test only the source tree.

Test the installed package.

---

# 66. CLEAN MACHINE TEST

This is mandatory.

Use a clean VM for at least one representative environment.

Install only the required baseline packages.

Install the `.deb`.

Then verify:

1. application appears
2. icon appears
3. preferences launch
4. IBus detects Avro
5. Avro can be selected
6. Firefox works
7. GTK app works
8. Qt app works
9. LibreOffice works
10. suggestions appear
11. preview appears
12. switching works
13. restart works
14. logout/login works
15. uninstall works

---

# 67. UPGRADE TEST

Install version A.

Configure:

- preferences
- user dictionary
- autocorrect
- suggestion settings

Then upgrade to version B.

Verify everything survives correctly.

---

# 68. UNINSTALL TEST

Test:

```bash
sudo apt remove avro-linux
```

and:

```bash
sudo apt purge avro-linux
```

Verify:

- package cleanly removed
- no broken dependencies
- no stale engine registration
- no broken desktop entry
- no broken IBus configuration

Handle user configuration according to documented Linux conventions.

---

# 69. DO NOT BREAK EXISTING INPUT METHODS

Avro must coexist with:

- English
- other Bengali input methods
- other IBus engines
- XKB layouts

Do not hijack all keyboard input.

Do not permanently modify unrelated input sources.

---

# 70. INPUT SOURCE EXPERIENCE

When the user selects:

```text
IBus → Avro Phonetic
```

Avro must immediately become the active Bengali input method.

If a distro requires additional configuration, the application should detect that and provide clear instructions or an appropriate supported integration.

Do not expect users to manually edit obscure files.

---

# 71. GNOME INTEGRATION

Integrate with modern GNOME input-source architecture.

Do not assume the old IBus tray icon exists.

The application must work even if GNOME hides/disables traditional IBus panels.

The Avro candidate experience must not disappear merely because the desktop does not display an IBus panel.

---

# 72. KDE INTEGRATION

Treat Plasma as a first-class environment.

Test:

- Wayland
- X11
- Qt
- GTK applications under KDE

Do not assume GNOME behavior applies to KDE.

---

# 73. XFCE/CINNAMON/MATE/LXQT

Do not treat these as afterthoughts.

Especially test:

- IBus daemon startup
- panel integration
- candidate popup
- input-source switching

Document environment-specific limitations.

---

# 74. UNIVERSAL UI FALLBACK

If the desktop does not provide:

- panel
- tray
- shell integration
- cursor geometry

Avro must still provide usable alternatives through:

- application UI
- floating preview
- candidate popup fallback
- keyboard controls

No core functionality should depend on a specific shell.

---

# 75. CORE ENGINE MUST BE DESKTOP-AGNOSTIC

Never put code like:

```javascript
if (GNOME) {
   ...
}
```

throughout the core.

Instead:

```text
platform abstraction
        ↓
GNOME adapter
KDE adapter
X11 adapter
Wayland adapter
generic adapter
```

Use capability detection rather than desktop-name assumptions.

---

# 76. CAPABILITY DETECTION

Detect capabilities such as:

- cursor rectangle available
- Wayland
- X11
- GTK integration
- Qt integration
- tray available
- desktop shell integration
- IBus panel available

Then select the best available implementation.

Do not make behavior dependent solely on:

```text
XDG_CURRENT_DESKTOP
```

because desktop environment reporting is historically inconsistent.

---

# 77. LICENSE / ATTRIBUTION

Preserve:

- MPL-2.0 requirements
- Avro attribution
- Rifat Nabi attribution
- dictionary attribution
- other third-party licenses

Provide:

```text
THIRD-PARTY-NOTICES
```

and appropriate license files.

Do not redistribute assets of uncertain origin.

---

# 78. PRIVACY

Add a clear privacy statement:

> Avro Linux processes typing locally. It does not transmit typed text to a remote server and does not require an internet connection for Bengali typing.

Ensure the implementation actually matches this statement.

---

# 79. CI

CI must check:

- core tests
- phonetic regression
- syntax
- lint
- package build
- Debian package validation
- desktop-file validation
- AppStream validation
- GSettings validation
- license checks

Where possible add VM/container desktop integration testing.

---

# 80. DEVELOPMENT PHASES

Execute all phases autonomously.

## Phase 0

Research Windows Avro UX and Linux IBus limitations.

Produce:

```text
docs/windows-avro-behavior.md
docs/linux-input-architecture.md
docs/compatibility-matrix.md
docs/desktop-integration.md
```

## Phase 1

Refactor architecture.

## Phase 2

Harden Avro core.

## Phase 3

Harden IBus engine.

## Phase 4

Implement candidate/suggestion system.

## Phase 5

Implement floating preview.

## Phase 6

Implement Avro Top Bar.

## Phase 7

Implement preferences.

## Phase 8

Implement desktop/application identity.

## Phase 9

Implement Debian packaging.

## Phase 10

Test GTK/Qt/Electron/browser/LibreOffice.

## Phase 11

Test GNOME/KDE/Xfce/Cinnamon/MATE/LXQt.

## Phase 12

Test Wayland/X11.

## Phase 13

Fix compatibility bugs.

## Phase 14

Clean-machine testing.

## Phase 15

Final release hardening.

---

# 81. WORK AUTONOMOUSLY

Do not stop after each phase asking:

> “Should I continue?”

Continue automatically.

Only ask the human when encountering:

- licensing uncertainty
- major architecture conflict
- destructive operation
- privacy/security decision
- genuinely ambiguous product requirement

Routine engineering decisions are yours.

---

# 82. PROGRESS REPORTS

After each major phase, briefly report:

```text
Phase:
Completed:
Tests:
Failures:
Fixed:
Remaining:
Next:
```

Do not dump unnecessary logs.

---

# 83. BUG PRIORITY

Prioritize:

### P0

- cannot type
- crashes IBus
- corrupts text
- breaks desktop input

### P1

- suggestions broken
- preview broken
- GTK/Qt compatibility broken
- Wayland compatibility broken
- KDE/GNOME compatibility broken

### P2

- visual bugs
- taskbar icon issues
- preferences bugs

### P3

- cosmetic improvements

Never polish the UI while fundamental input reliability is broken.

---

# 84. FINAL ACCEPTANCE CRITERIA

The project is NOT complete merely because:

```text
avro-linux.deb
```

exists.

It is complete only when:

### CORE

- Avro phonetic works
- regression corpus passes
- dictionary works
- suggestions work
- autocorrect works

### INPUT

- IBus engine works
- preedit works
- commit works
- editing works
- focus transitions work
- restart recovery works

### UI

- floating preview works
- candidate popup works
- Top Bar works
- preferences work
- status interface works

### DESKTOP

- GNOME works
- KDE works
- Xfce works
- Cinnamon works
- MATE works
- LXQt works where applicable

### DISPLAY

- Wayland tested
- X11 tested

### APPLICATIONS

- GTK tested
- Qt tested
- Firefox tested
- Chromium tested
- Electron tested
- VS Code tested
- LibreOffice tested
- terminal tested

### PACKAGE

- `.deb` builds
- clean installation works
- upgrade works
- removal works
- reinstall works

### IDENTITY

- application icon correct
- taskbar icon correct
- dock icon correct
- launcher icon correct
- no duplicate application identity

### PRIVACY

- no telemetry
- no raw typing logs
- no cloud dependency

### LICENSE

- all third-party components documented
- licensing obligations satisfied

---

# 85. FINAL RELEASE STANDARD

The final question is NOT:

> “Does IBus Avro technically work?”

The final question is:

> **“If a person who has used Avro Keyboard on Windows installs this on Linux, will they recognize the Avro experience immediately, can they see the phonetic preview and suggestions, and can they type Bengali naturally in their real applications without fighting the operating system?”**

That is the standard.

Build toward that standard.

Do not lower the standard simply because Linux desktop integration is complicated.

When Linux imposes a genuine technical limitation, solve it using the correct Linux protocol or provide the best standards-compliant fallback. Do not use hacks that compromise Wayland, security, stability or other applications.

Do not claim something works until it has actually been tested.

Start by inspecting the current repository and `docs/DEVELOPER_SPEC.md`.

Then research the Windows Avro behavior.

Then audit the current Linux implementation.

Then begin implementation.

Continue autonomously through all phases.

The final deliverable must be a **production-quality, polished, universal Avro Linux desktop application and a tested Debian package**, not merely an IBus engine.