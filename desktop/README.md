# Desktop app

The playground (C, C++, Java, Python) wrapped in [Electron](https://www.electronjs.org/) so it works with no internet connection. Users should download it from the [Releases page](https://github.com/MAZHAR1807102/c-cpp-playground/releases/latest); this page is for building it.

## How it works

- `scripts/prepare-web.mjs` copies the website (`../index.html`, `../compiler.js`, `../runner.js`, `../python-runner.js`, `../guide.js`, `../guide-more.js`) into `web/` and replaces every CDN address with a local copy from `node_modules`: Clang (`@yowasp/clang`), the WASI shim, Pyodide (`pyodide`), the Java engine (`@live-codes/java-wasm`), CodeMirror 5 and the fonts. The build fails if anything would still be loaded from the internet.
- `main.js` serves `web/` from the private `app://` scheme (module workers and WebAssembly need a real origin), blocks all `http(s)` requests, and handles the menu, files, the unsaved-changes prompt and exam mode.
- `preload.js` gives the page `window.desktop`. The page shows New/Open/Save and listens for exam mode only when that exists, so the website is unaffected.
- Exam mode is stored in `settings.json` in the app's user-data folder, with the password hashed by scrypt.

## Commands

```sh
npm ci                 # once
npm start              # run the app from source
npm run dist:win       # Windows: dist/…-Windows-Setup.exe and …-Windows-Portable.exe
npm run dist:mac       # macOS (must run on a Mac): dist/…-Mac.dmg, universal (Apple Silicon + Intel)
npm run dist:linux     # Linux (run on Linux or WSL): dist/…-Linux-amd64.deb and …-Linux-x86_64.AppImage
```

To publish a release, raise `version` in `package.json`, commit, and push a tag: `git tag desktop-v1.0.1 && git push origin desktop-v1.0.1`. The workflow `.github/workflows/desktop.yml` builds both platforms and attaches the files to a GitHub release.

The apps are not signed with paid certificates: the Mac app gets an ad-hoc signature (`scripts/after-pack.cjs`), which Apple Silicon requires. Users confirm the app once on first launch (see the main README).
