# Avro Keyboard for Linux 1.3.1

Bug-fix release. Download **`avro-linux_1.3.1-1_all.deb`** below.

## Install

Open a terminal in the folder with the file (usually Downloads) and run:

```bash
cd ~/Downloads
sudo apt install ./avro-linux_1.3.1-1_all.deb
```

Keep the `./`. `apt` also installs what Avro needs (IBus, GJS, …). `sudo dpkg -i` works only
when all of that is installed already.

Double-clicking the file installs it only where a graphical package installer opens `.deb`
files (GDebi, or the software center of some Ubuntu / Kubuntu releases). On other desktops,
for example Xubuntu (XFCE), a double-click just opens the file in an archive viewer: use
the command above.

Then **log out and log in again** once (no need to restart the computer). The Avro TopBar
starts and asks once whether to add Avro to your keyboard list.

Updating from 1.3.0 works the same way.

## Fixed in 1.3.1

* **Bijoy (ANSI) output** is now the same as Avro Keyboard on Windows, also for words with
  যুক্তবর্ণ (প্রোগ্রাম, স্কুল, শব্দ, আন্তর্জাতিক …). No more "&" in the text, and a word that is
  still being typed stays Bijoy when you click somewhere else.
* **Unicode ↔ Bijoy converter:** "Convert to Unicode" works.
* **Avro Setup (`avro-setup`)** opens again. It installs only the Avro package you give it,
  never restarts your computer by itself, and no longer takes over the opening of every
  `.deb` file.
* **Installing no longer changes anyone's keyboard settings** or restarts IBus. Each user
  chooses to add Avro (the TopBar asks once).
* **TopBar:** no longer puts Avro back into your keyboard list at every login or hides the
  IBus panel. "Start Avro TopBar when I log in" can now really be turned off.
* **Avro Doctor:** "Copy Report" works, typing English is not shown as a problem, and
  Bengali font names display correctly. Auto-Fix no longer switches your keyboard.
* **Avro Pad:** zoom works, and its own typing works while the Avro IBus keyboard is on.
* **Avro Mouse:** Backspace after য় ড় ঢ় removes the whole letter.
* Input method settings are added at login only when no other input method (such as fcitx)
  is set up.
* Window names in the taskbar are correct, and some warnings are gone.

## Uninstall

```bash
sudo apt remove avro-linux
```

Your personal dictionary and settings stay in `~/.config/avro`.
