Avro Linux 1.3.1 is out (15 Oct 2026). This one is mostly bug fixes. Honestly 1.3.0 had more
problems than we would like to admit, so if you installed it, please update.

### Installing / updating

Grab `avro-linux_1.3.1-1_all.deb` from below, open a terminal where you saved it and run:

```bash
cd ~/Downloads
sudo apt install ./avro-linux_1.3.1-1_all.deb
```

Don't forget the `./` (apt needs it to know it is a file and not a package name). apt will also
pull in IBus, GJS etc if you don't have them already. Double-clicking the .deb works too if your
desktop has a package installer like GDebi or Discover, but on some desktops (XFCE for example)
it just opens an archive viewer, so the terminal way is safer.

After installing, log out and log back in once. You don't need to restart the whole PC. The
TopBar will show up and ask if you want Avro in your keyboard list.

Already on 1.3.0? Same command, it updates in place. It won't ask you anything about config
files this time.

### What got fixed

- Bijoy (ANSI) output was wrong for a lot of যুক্তবর্ণ words, you would get a random "&" stuck in
  the middle. Now it gives the same output as Avro Keyboard on Windows, so প্রোগ্রাম, স্কুল,
  শব্দ, আন্তর্জাতিক etc all come out right. Also if you click somewhere else in the middle of a
  word, that half-typed word stays in Bijoy instead of turning into Unicode.
- "Convert to Unicode" in the converter didn't do anything. It works now.
- `avro-setup` was crashing as soon as it opened. Fixed, and it won't restart your computer on
  its own anymore (sorry about that one). It also stopped taking over every .deb file you
  double-click.
- The installer was changing everyone's keyboard settings and restarting IBus. It doesn't touch
  your settings now, the TopBar just asks you once.
- The TopBar kept putting Avro back in your keyboard list every time you logged in, even after
  you removed it. It was also hiding the IBus icon. Both fixed. And "Start Avro TopBar when I
  log in" actually turns off now when you turn it off.
- Avro Doctor: Copy Report works, it doesn't complain anymore just because you are typing in
  English, and Bengali font names show properly instead of garbage. Auto-Fix also doesn't
  switch your keyboard behind your back anymore.
- Avro Pad zoom buttons work, and typing inside Avro Pad works with the Avro keyboard on.
- Avro Mouse: backspace after য় ড় ঢ় deletes the whole letter, not just the dot.
- If you use fcitx or some other input method, Avro won't try to override it at login.
- Small stuff: window names in the taskbar are right now, and a few warnings are gone.

### KDE Plasma on Wayland, please read

On KDE with Wayland, typing only works if **IBus Wayland** is selected in System Settings →
Keyboard → Virtual Keyboard. Avro never told you this before, so you would install it and then
nothing happens when you type. Now Avro Doctor checks it, and the TopBar (the first time it
runs), Avro Setup and Doctor's Auto-Fix can set it for you. Log out and in once after that. If
you already picked something else there, like fcitx, we leave it alone.

### What we tested

We went through the whole test list by hand on a real Debian 13 PC with KDE Plasma 6 on Wayland
(125% scaling): Firefox, Chrome, LibreOffice, VS Code, Konsole, KRunner and a Flatpak app. Also
Ubuntu 24.04 with XFCE, GNOME and KDE on X11. We haven't tried Ubuntu 26.04 or GNOME on Wayland on
a real machine yet. It should work, but if you try it, tell us how it went.

### Uninstall

```bash
sudo apt remove avro-linux
```

Your own dictionary and settings stay in `~/.config/avro`. Delete that folder if you want a
clean slate.

Found a bug? Please open an issue here: https://github.com/msbsurfi/avro-linux/issues
The Avro Doctor report (the Copy Report button) helps us a lot.

Thanks to everyone who tested and reported stuff!
