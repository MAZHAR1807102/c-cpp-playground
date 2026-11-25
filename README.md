# C/C++ Playground

Write C or C++ in the browser and see the output beside the editor. There is no compile button: a moment after you stop typing, the program is compiled and run again, and the output updates.

**Live site:** https://mazhar1807102.github.io/c-cpp-playground/

## How it works

- The compiler is Clang/LLVM 22 compiled to WebAssembly ([YoWASP](https://yowasp.org/) build, loaded from jsDelivr). The first visit downloads about 100 MB; later visits use the browser cache.
- Your program is compiled to WebAssembly (WASI) and run in a Web Worker by [browser_wasi_shim](https://github.com/bjorn3/browser_wasi_shim). Nothing is sent to a server.
- `compiler.js` keeps Clang loaded in one worker. `runner.js` runs each program in a fresh worker, so a run that takes longer than 5 seconds can be stopped.

## Supported

- C (C89 to C23) and C++ (C++11 to C++23), `-O0` to `-O2`, warnings with `-Wall -Wextra`.
- `#include <bits/stdc++.h>` in C++. libc++ has no such header, so `compiler.js` supplies one that includes every standard header that compiles here (all but `<csetjmp>` and `<csignal>`), guarded by `__cplusplus` for each standard.
- Standard input from the Input box (read all at once; end-of-file after that).
- Compile errors and warnings are listed with clickable line numbers and highlighted in the editor.
- **Suggestions** (on by default, untick to turn off): while you type, a list offers keywords, library names (with the header they come from), names from your own code, `#include` headers and preprocessor directives (<kbd>Ctrl</kbd>+<kbd>Space</kbd> opens it any time). Each error gets a plain-English hint under the line, and a button that applies the fix when there is an obvious one: Clang's own fix-its (missing `;`, `==` for `=`, wrong `%` code), a missing `#include`, `std::`, or a misspelled keyword such as `retrun` → `return`.

## Header guide

Below the editor, a searchable guide lists the common headers (10 for C, 19 for C++): what each is for, its main functions with their syntax and meaning, and a runnable example that **Load into editor** opens in the editor. It follows the C/C++ switch. The data is in `guide.js`.

## Desktop app (offline, with exam mode)

For computers with no internet, such as an exam hall, the playground is also a desktop app called **Playground** for **Windows** and **macOS** (Apple Silicon and Intel). Clang, the editor, fonts, examples and the header guide are all inside it, and it never uses the network. **Download it from the [Releases page](https://github.com/MAZHAR1807102/c-cpp-playground/releases/latest).**

- **Windows:** `…-Windows-Setup.exe` installs it; `…-Windows-Portable.exe` runs without installing (for example from a USB stick). The first time, Windows may show "Windows protected your PC": click **More info → Run anyway**.
- **Mac:** open the `.dmg` and drag the app to Applications. The first time, macOS blocks it: open **System Settings → Privacy & Security** and click **Open Anyway**. If it says the app "is damaged", run `xattr -cr /Applications/Playground.app` once in Terminal.
- **Files:** New, Open… and Save (Ctrl/Cmd + N, O, S) work with `.c` and `.cpp` files. Closing with unsaved changes asks first.
- **Exam mode:** **Exam → Start exam mode…** and choose a password. Suggestions, error hints, the examples and the header guide are turned off, links are blocked and an "Exam mode" badge is shown. It stays on after the app restarts until **Exam → End exam mode…** with the same password. (The password is stored hashed in the app's settings file; it stops students from switching the aids back on in the app, but it is not protection against someone who edits files on the computer.)

The app's source is in [`desktop/`](desktop/). Pushing a tag such as `desktop-v1.0.1` makes GitHub Actions build both versions and publish them as a release.

## Not supported

- C++ exceptions (`throw`, `try`): the bundled libc++ is built without exception support, so C++ is compiled with `-fno-exceptions`.
- Threads, sockets, and interactive input while the program is running.

Plain HTML, CSS and JavaScript; no build step. To run locally, serve the folder over HTTP (module workers do not load from `file://`), for example `npx http-server .`.

Made by Mazharul Islam.
