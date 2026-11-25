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

## Not supported

- C++ exceptions (`throw`, `try`): the bundled libc++ is built without exception support, so C++ is compiled with `-fno-exceptions`.
- Threads, sockets, and interactive input while the program is running.

Plain HTML, CSS and JavaScript; no build step. To run locally, serve the folder over HTTP (module workers do not load from `file://`), for example `npx http-server .`.

Made by Mazharul Islam.
