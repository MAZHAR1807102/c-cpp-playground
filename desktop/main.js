// Playground: the C/C++ playground as a desktop app (Electron main process).
// The web page, Clang (WebAssembly) and every library are bundled in ./web and served from the private
// app:// scheme, so the app never needs the internet. All http(s) requests are blocked.
const { app, BrowserWindow, Menu, dialog, ipcMain, protocol, shell, session, nativeTheme } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const crypto = require('node:crypto');

const WEB = path.join(__dirname, 'web');
const NAME = 'Playground';
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.wasm': 'application/wasm', '.tar': 'application/x-tar', '.woff2': 'font/woff2', '.woff': 'font/woff', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.zip': 'application/zip', '.whl': 'application/zip' };
const PAGES = { editor: 'index.html', algorithms: 'algorithms.html', stl: 'stl.html', notebook: 'notebook.html' };

// keep settings (exam mode, saved code) in a folder with a specific name: "Playground" alone could clash with
// another program's folder, and this is also where version 1.0.0 kept them
app.setPath('userData', path.join(app.getPath('appData'), 'C and C++ Playground'));

protocol.registerSchemesAsPrivileged([{ scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true } }]);
if (!app.requestSingleInstanceLock()) app.quit();

/* ---------- settings file (exam mode) ---------- */
const CONFIG = () => path.join(app.getPath('userData'), 'settings.json');
function readConfig() { try { return JSON.parse(fs.readFileSync(CONFIG(), 'utf8')); } catch (_) { return {}; } }
function writeConfig(c) { fs.mkdirSync(path.dirname(CONFIG()), { recursive: true }); fs.writeFileSync(CONFIG(), JSON.stringify(c, null, 2)); }
const hash = (pw, salt) => crypto.scryptSync(pw, salt, 32).toString('hex');
const examOn = () => !!readConfig().exam;

/* ---------- window and document state ---------- */
let win = null, doc = { dirty: false, path: null, name: 'Untitled' }, closing = false;
function setTitle() {
  if (!win) return;
  win.setTitle(`${doc.dirty ? '• ' : ''}${doc.name} — ${NAME}${examOn() ? ' (exam mode)' : ''}`);
  if (process.platform === 'darwin') { win.setDocumentEdited(doc.dirty); win.setRepresentedFilename(doc.path || ''); }
}
function askDiscard() {
  if (!doc.dirty) return true;
  const r = dialog.showMessageBoxSync(win, { type: 'warning', buttons: ['Discard changes', 'Cancel'], defaultId: 1, cancelId: 1, message: `${doc.name} has unsaved changes.`, detail: 'If you continue, the changes are lost.' });
  return r === 0;
}

function createWindow() {
  win = new BrowserWindow({
    width: 1400, height: 900, minWidth: 760, minHeight: 560, title: NAME, backgroundColor: nativeTheme.shouldUseDarkColors ? '#0e1318' : '#eef2f5', show: false,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, sandbox: true, nodeIntegration: false, devTools: !app.isPackaged, spellcheck: false }
  });
  win.once('ready-to-show', () => win.show());
  win.on('page-title-updated', e => e.preventDefault());   // the window title is set by setTitle(), not by the page
  win.loadURL('app://playground/index.html');
  // links never navigate the app window; outside exam mode they open in the normal browser
  win.webContents.on('will-navigate', (e, url) => { if (!url.startsWith('app://')) { e.preventDefault(); if (!examOn() && /^https?:/.test(url)) shell.openExternal(url); } });
  win.webContents.setWindowOpenHandler(({ url }) => { if (!examOn() && /^https?:/.test(url)) shell.openExternal(url); return { action: 'deny' }; });
  win.on('close', e => {
    if (closing || !doc.dirty) return;
    e.preventDefault();
    const r = dialog.showMessageBoxSync(win, { type: 'warning', buttons: ['Save', "Don't save", 'Cancel'], defaultId: 0, cancelId: 2, message: `Save the changes to ${doc.name}?`, detail: "If you don't save, your changes are lost." });
    if (r === 0) win.webContents.send('menu', 'saveThenClose');
    else if (r === 1) { closing = true; win.close(); }
  });
  win.on('closed', () => { win = null; });
  setTitle();
}

/* ---------- menu ---------- */
function buildMenu() {
  const send = a => () => {
    if (!win) return;
    // the STL and Algorithms pages have no files or exam dialog: those actions open the code editor first
    if (/\/(stl|algorithms)\.html/.test(win.webContents.getURL()) && a !== 'run') {
      if (go('editor')) win.webContents.once('did-finish-load', () => win && win.webContents.send('menu', a));
      return;
    }
    win.webContents.send('menu', a);
  };
  const mac = process.platform === 'darwin', exam = examOn();
  const template = [
    ...(mac ? [{ label: app.name, submenu: [{ role: 'about' }, { type: 'separator' }, { role: 'hide' }, { role: 'hideOthers' }, { role: 'unhide' }, { type: 'separator' }, { role: 'quit' }] }] : []),
    { label: 'File', submenu: [
      { label: 'New', accelerator: 'CmdOrCtrl+N', click: send('new') },
      { label: 'Open…', accelerator: 'CmdOrCtrl+O', click: send('open') },
      { type: 'separator' },
      { label: 'Save', accelerator: 'CmdOrCtrl+S', click: send('save') },
      { label: 'Save As…', accelerator: 'CmdOrCtrl+Shift+S', click: send('saveAs') },
      { type: 'separator' },
      mac ? { role: 'close' } : { role: 'quit', label: 'Exit' }
    ] },
    { label: 'Edit', submenu: [{ role: 'undo' }, { role: 'redo' }, { type: 'separator' }, { role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'selectAll' }] },
    { label: 'Run', submenu: [{ label: 'Run now / run cell', accelerator: 'CmdOrCtrl+Enter', click: send('run') }] },
    { label: 'Guide', submenu: [{ label: 'Guide & help', accelerator: 'F1', click: send('guide') }] },
    { label: 'View', submenu: [{ label: 'Code editor', accelerator: 'CmdOrCtrl+1', click: () => go('editor') }, { label: 'Algorithm animations', accelerator: 'CmdOrCtrl+2', click: () => go('algorithms') }, { label: 'C++ STL guide', accelerator: 'CmdOrCtrl+3', click: () => go('stl') }, { label: 'Notebook (Python, data science)', accelerator: 'CmdOrCtrl+4', click: () => go('notebook') }, { type: 'separator' }, { role: 'zoomIn', accelerator: 'CmdOrCtrl+=' }, { role: 'zoomOut' }, { role: 'resetZoom' }, { type: 'separator' }, { role: 'togglefullscreen' }, ...(app.isPackaged ? [] : [{ role: 'toggleDevTools' }])] },
    { label: 'Exam', submenu: [
      { label: 'Start exam mode…', enabled: !exam, click: send('examOn') },
      { label: 'End exam mode…', enabled: exam, click: send('examOff') }
    ] },
    ...(mac ? [] : [{ label: 'Help', submenu: [{ label: `About ${NAME}`, click: () => dialog.showMessageBox(win, { message: NAME, detail: `Version ${app.getVersion()}\nWrite C, C++, Java and Python and see the output as you type, or use the Python notebook with numpy, pandas, scikit-learn and matplotlib. Works offline: every compiler and library runs inside the app.\n\nMade by Mazharul Islam.` }) }] }])
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

/* ---------- messages from the page ---------- */
const FILTERS = [{ name: 'Source files', extensions: ['c', 'cpp', 'cc', 'cxx', 'h', 'hpp', 'java', 'py'] }, { name: 'All files', extensions: ['*'] }];
const NB_FILTERS = [{ name: 'Jupyter notebooks', extensions: ['ipynb'] }, { name: 'All files', extensions: ['*'] }];
// switch between the code editor and the notebook (asks first if there are unsaved changes)
function go(page) {
  if (!win || !PAGES[page] || !askDiscard()) return false;
  doc = { dirty: false, path: null, name: 'Untitled' }; setTitle();
  win.loadURL('app://playground/' + PAGES[page]);
  return true;
}
ipcMain.on('go', (_, page) => go(page));
ipcMain.on('doc-state', (_, s) => { doc = { dirty: !!s.dirty, path: s.path || null, name: String(s.name || 'Untitled') }; setTitle(); });
ipcMain.handle('discard-ok', () => askDiscard());
ipcMain.handle('open-file', async (_, o) => {
  if (!askDiscard()) return null;
  const nb = !!(o && o.kind === 'notebook');
  const r = await dialog.showOpenDialog(win, { properties: ['openFile'], filters: nb ? NB_FILTERS : FILTERS });
  if (r.canceled || !r.filePaths.length) return null;
  const p = r.filePaths[0];
  if (fs.statSync(p).size > (nb ? 100 : 2) * 1024 * 1024) { dialog.showErrorBox('File too large', nb ? 'This notebook is larger than 100 MB.' : 'This file is larger than 2 MB, so it is probably not a source file.'); return null; }
  return { path: p, content: fs.readFileSync(p, 'utf8') };
});
ipcMain.handle('save-file', async (_, { path: p, content, suggested, kind }) => {
  if (!p) {
    const r = await dialog.showSaveDialog(win, { defaultPath: path.join(app.getPath('documents'), suggested || 'main.cpp'), filters: kind === 'notebook' ? NB_FILTERS : FILTERS });
    if (r.canceled || !r.filePath) return null;
    p = r.filePath;
  }
  try { fs.writeFileSync(p, content, 'utf8'); return p; }
  catch (e) { dialog.showErrorBox('Could not save', String(e.message || e)); return null; }
});
ipcMain.on('close-now', () => { closing = true; if (win) win.close(); });
ipcMain.handle('exam-state', () => examOn());
ipcMain.handle('exam-enable', (_, pw) => {
  if (typeof pw !== 'string' || pw.length < 4) return false;
  const salt = crypto.randomBytes(16).toString('hex');
  writeConfig({ ...readConfig(), exam: { salt, hash: hash(pw, salt) } });
  examChanged(true);
  return true;
});
ipcMain.handle('exam-disable', (_, pw) => {
  const c = readConfig();
  if (!c.exam) return true;
  if (typeof pw !== 'string' || hash(pw, c.exam.salt) !== c.exam.hash) return false;
  delete c.exam; writeConfig(c);
  examChanged(false);
  return true;
});
function examChanged(on) { buildMenu(); setTitle(); if (win) win.webContents.send('exam', on); }

/* ---------- start ---------- */
app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
app.whenReady().then(() => {
  protocol.handle('app', async req => {
    const rel = decodeURIComponent(new URL(req.url).pathname).replace(/^\/+/, '');
    // a folder address (sims/bubble-sort/) means the index.html inside it
    const file = path.normalize(path.join(WEB, !rel || rel.endsWith('/') ? rel + 'index.html' : rel));
    if (!file.startsWith(WEB + path.sep)) return new Response('Forbidden', { status: 403 });
    try {
      const data = await fs.promises.readFile(file);
      // cross-origin isolation lets the notebook stop a running cell without restarting Python (SharedArrayBuffer)
      return new Response(data, { headers: { 'content-type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream', 'content-length': String(data.length), 'cross-origin-opener-policy': 'same-origin', 'cross-origin-embedder-policy': 'require-corp', 'cross-origin-resource-policy': 'same-origin' } });
    } catch (_) { return new Response('Not found', { status: 404 }); }
  });
  // the app is fully offline: refuse anything that would go to the network
  session.defaultSession.webRequest.onBeforeRequest({ urls: ['http://*/*', 'https://*/*', 'ws://*/*', 'wss://*/*'] }, (d, cb) => {
    if (process.env.PLAYGROUND_LOG_BLOCKED) console.log('blocked', d.url);
    cb({ cancel: true });
  });
  session.defaultSession.setPermissionRequestHandler((_, __, cb) => cb(false));
  buildMenu();
  createWindow();
});
app.on('window-all-closed', () => app.quit());
