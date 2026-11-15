const { app, BrowserWindow, Menu, protocol, session, shell } = require('electron');
const { readFile } = require('node:fs/promises');
const path = require('node:path');

const scheme = 'chickenwing';
const startUrl = `${scheme}://app/`;
const assets = path.resolve(__dirname, '..');
const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.wasm': 'application/wasm',
  '.snap': 'application/json'
};

protocol.registerSchemesAsPrivileged([{
  scheme,
  privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true }
}]);

async function serveAsset(request) {
  const url = new URL(request.url);
  if (url.host !== 'app' || url.username || url.password || request.method !== 'GET') {
    return new Response(null, { status: 404 });
  }

  const pathname = url.pathname === '/' ? '/index.html' : url.pathname;
  // Restrict the protocol to bundled web assets. Reject escapes and Windows path separators.
  const assetPath = /^\/(?:index\.html|(?:src|public)\/(?:[\w.-]+\/)*[\w.-]+)$/.test(pathname);
  if (!assetPath || pathname.split('/').some(part => part.startsWith('.'))) {
    return new Response(null, { status: 404 });
  }

  try {
    const bytes = await readFile(path.join(assets, pathname.slice(1)));
    return new Response(bytes, { headers: {
      'Content-Type': contentTypes[path.extname(pathname)] || 'application/octet-stream',
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'no-cache'
    } });
  } catch (error) {
    const status = ['ENOENT', 'EISDIR', 'ENOTDIR'].includes(error.code) ? 404 : 500;
    return new Response(null, { status });
  }
}

function createWindow() {
  const window = new BrowserWindow({
    width: 1440,
    height: 930,
    minWidth: 420,
    minHeight: 520,
    backgroundColor: '#101213',
    webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: true }
  });

  window.webContents.on('will-frame-navigate', event => event.preventDefault());
  window.webContents.setWindowOpenHandler(({ url, disposition }) => {
    const target = new URL(url);
    if (disposition !== 'default' && ['https:', 'http:'].includes(target.protocol) && !target.username && !target.password) {
      shell.openExternal(target.href).catch(console.error);
    }
    return { action: 'deny' };
  });
  window.loadURL(startUrl).catch(console.error);
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    const window = BrowserWindow.getAllWindows()[0];
    if (!window) return createWindow();
    if (window.isMinimized()) window.restore();
    window.focus();
  });
  app.whenReady().then(() => {
    protocol.handle(scheme, serveAsset);
    const appSession = session.defaultSession;
    appSession.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
    appSession.setPermissionCheckHandler(() => false);
    appSession.webRequest.onBeforeRequest({ urls: ['https://*/*', 'http://*/*'] }, (_details, callback) => callback({ cancel: true }));

    Menu.setApplicationMenu(Menu.buildFromTemplate([
      ...(process.platform === 'darwin' ? [{ role: 'appMenu' }] : []),
      { label: 'Édition', submenu: [{ role: 'undo' }, { role: 'redo' }, { type: 'separator' }, { role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'selectAll' }] },
      { label: 'Affichage', submenu: [{ role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' }, { role: 'togglefullscreen' }] }
    ]));
    createWindow();
    app.on('activate', () => {
      if (!BrowserWindow.getAllWindows().length) createWindow();
    });
  });
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
}
