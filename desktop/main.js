const { app, BrowserWindow, shell } = require('electron');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const API = 'http://localhost:3000/api/health';
let server = null;

/* 後端沒在跑時，由電腦版自己啟動 focusnest/server（用 Electron 內建的 Node，不需要另外裝 Node）。
   打包後的 exe 在 desktop/out/FocusNest-win32-x64/，後端在 ../../../server */
function serverDir(){
  return app.isPackaged ? path.resolve(path.dirname(process.execPath), '../../../server') : path.resolve(__dirname, '../server');
}
async function healthy(){ try{ return (await fetch(API, { signal: AbortSignal.timeout(1500) })).ok; }catch(e){ return false; } }
async function ensureServer(){
  if(await healthy()) return;
  const dir = serverDir(), entry = path.join(dir, 'index.js');
  if(!fs.existsSync(entry)) return; // 找不到後端就用離線模式
  server = spawn(process.execPath, [entry], { cwd: dir, env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' }, stdio: 'ignore', windowsHide: true });
  for(let i = 0; i < 20 && !(await healthy()); i++) await new Promise(r => setTimeout(r, 500));
}

function createWindow(){
  const win = new BrowserWindow({
    width: 1100, height: 820, minWidth: 420, minHeight: 640,
    title: '專注小窩', backgroundColor: '#F5EFE4', autoHideMenuBar: true
  });
  win.loadFile(path.join(__dirname, 'app', 'index.html'));
  // 外部連結用系統瀏覽器開
  win.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' }; });
}

app.whenReady().then(ensureServer).then(createWindow);
app.on('window-all-closed', () => app.quit());
app.on('quit', () => { if(server) server.kill(); });
