import { app, BrowserWindow, ipcMain, screen, desktopCapturer, dialog, shell, nativeImage } from 'electron'
import * as path from 'path'
import * as fs from 'fs'

let mainWindow: BrowserWindow | null = null
let magnifierWindow: BrowserWindow | null = null
let pickerWindow: BrowserWindow | null = null
let isPicking = false

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 750,
    minWidth: 900,
    minHeight: 600,
    frame: true,
    backgroundColor: '#1a1a2e',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
    cleanupPicker()
  })
}

function cleanupPicker() {
  isPicking = false
  if (pickerWindow) {
    pickerWindow.close()
    pickerWindow = null
  }
  if (magnifierWindow) {
    magnifierWindow.close()
    magnifierWindow = null
  }
}

async function getScreenThumbnailDataUrl(displayId?: number): Promise<string | null> {
  try {
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: {
        width: 4096,
        height: 4096,
      },
    })
    if (sources.length === 0) return null

    let source = sources[0]
    if (displayId !== undefined) {
      const matched = sources.find(s => s.display_id === String(displayId))
      if (matched) source = matched
    }

    return source.thumbnail.toDataURL()
  } catch (e) {
    console.error('getScreenThumbnailDataUrl error:', e)
    return null
  }
}

async function getScreenshotForDisplay(display: Electron.Display): Promise<string | null> {
  try {
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: {
        width: Math.round(display.bounds.width * display.scaleFactor),
        height: Math.round(display.bounds.height * display.scaleFactor),
      },
    })
    const matched = sources.find(s => s.display_id === String(display.id))
    if (matched) return matched.thumbnail.toDataURL()
    if (sources[0]) return sources[0].thumbnail.toDataURL()
    return null
  } catch (e) {
    return null
  }
}

function createMagnifierWindow() {
  if (magnifierWindow) {
    magnifierWindow.close()
  }

  magnifierWindow = new BrowserWindow({
    width: 240,
    height: 270,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    movable: false,
    focusable: false,
    hasShadow: false,
    skipTaskbar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  const html = getMagnifierHtml()
  magnifierWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html))
  magnifierWindow.setIgnoreMouseEvents(true, { forward: true })
}

function getMagnifierHtml(): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html, body {
          width: 100%; height: 100%;
          background: transparent; overflow: hidden;
          font-family: -apple-system, 'Segoe UI', sans-serif;
        }
        .wrap {
          width: 240px; height: 270px;
          display: flex; flex-direction: column; align-items: center;
          padding: 8px;
        }
        .mag-box {
          width: 224px; height: 224px;
          border-radius: 50%;
          border: 3px solid #fff;
          box-shadow: 0 4px 20px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(255,255,255,0.2);
          overflow: hidden;
          position: relative;
          background: #000;
        }
        canvas {
          position: absolute; top: 0; left: 0;
          image-rendering: pixelated;
          image-rendering: -moz-crisp-edges;
          image-rendering: crisp-edges;
        }
        .cross {
          position: absolute;
          top: 50%; left: 50%;
          transform: translate(-50%, -50%);
          width: 22px; height: 22px;
          pointer-events: none;
        }
        .cross::before, .cross::after {
          content: ''; position: absolute;
          background: #ff2d55;
          box-shadow: 0 0 2px rgba(0,0,0,0.9);
        }
        .cross::before {
          width: 2px; height: 100%; left: 50%;
          transform: translateX(-50%);
        }
        .cross::after {
          width: 100%; height: 2px; top: 50%;
          transform: translateY(-50%);
        }
        .info-row {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-top: 6px;
          gap: 2px;
        }
        .hex {
          background: rgba(0,0,0,0.9);
          color: #fff;
          padding: 4px 10px;
          border-radius: 5px;
          font-family: 'Consolas', monospace;
          font-size: 12px;
          font-weight: 700;
          border: 1px solid rgba(255,255,255,0.15);
          letter-spacing: 0.5px;
        }
      </style>
    </head>
    <body>
      <div class="wrap">
        <div class="mag-box">
          <canvas id="c" width="224" height="224"></canvas>
          <div class="cross"></div>
        </div>
        <div class="info-row">
          <div class="hex" id="hex">#------</div>
        </div>
      </div>
    </body>
    </html>
  `
}

function getPickerHtml(): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html, body {
          width: 100vw; height: 100vh;
          cursor: crosshair;
          background: transparent;
          overflow: hidden;
          font-family: -apple-system, 'Segoe UI', sans-serif;
          user-select: none;
        }
        .hud {
          position: fixed;
          top: 24px;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(20, 20, 40, 0.95);
          backdrop-filter: blur(12px);
          padding: 14px 28px;
          border-radius: 14px;
          color: #fff;
          font-size: 14px;
          border: 1px solid rgba(255,255,255,0.1);
          box-shadow: 0 10px 40px rgba(0,0,0,0.4);
          z-index: 1000;
          pointer-events: none;
        }
        .hud kbd {
          background: rgba(139, 92, 246, 0.25);
          color: #c4b5fd;
          padding: 2px 8px;
          border-radius: 4px;
          font-family: 'Consolas', monospace;
          font-size: 12px;
          font-weight: 600;
          margin: 0 4px;
          border: 1px solid rgba(139, 92, 246, 0.3);
        }
        .coord {
          position: fixed;
          bottom: 24px;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(0,0,0,0.8);
          backdrop-filter: blur(8px);
          color: #fff;
          padding: 8px 18px;
          border-radius: 10px;
          font-family: 'Consolas', monospace;
          font-size: 12px;
          border: 1px solid rgba(255,255,255,0.08);
          z-index: 1000;
          pointer-events: none;
          display: flex;
          gap: 16px;
          align-items: center;
        }
        .coord .dot {
          width: 10px; height: 10px;
          border-radius: 50%;
          border: 1px solid rgba(255,255,255,0.3);
        }
      </style>
    </head>
    <body>
      <div class="hud">🖱️ 点击任意位置拾取颜色 | 按 <kbd>ESC</kbd> 取消 | 移动鼠标实时预览</div>
      <div class="coord">
        <div class="dot" id="dot" style="background:#000"></div>
        <span id="coord-txt">X: 0, Y: 0</span>
        <span id="rgb-txt" style="opacity:0.7">rgb(0,0,0)</span>
      </div>
      <script>
        (function() {
          const dot = document.getElementById('dot');
          const coordTxt = document.getElementById('coord-txt');
          const rgbTxt = document.getElementById('rgb-txt');

          let cachedScreenshot = null;
          let cachedDisplayId = null;
          let lastCacheTime = 0;
          let processing = false;
          let lastMouseMove = 0;

          async function getScreenshot(displayId) {
            const now = Date.now();
            if (cachedScreenshot && cachedDisplayId === displayId && (now - lastCacheTime) < 500) {
              return cachedScreenshot;
            }
            if (processing) return cachedScreenshot;
            processing = true;
            try {
              const data = await window.electronAPI.internal.getScreenshot(displayId);
              cachedScreenshot = data;
              cachedDisplayId = displayId;
              lastCacheTime = now;
              return data;
            } finally {
              processing = false;
            }
          }

          function getPixelFromDataUrl(dataUrl, x, y, displayScale) {
            return new Promise((resolve) => {
              const img = new Image();
              img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                const px = Math.round(x * displayScale);
                const py = Math.round(y * displayScale);
                try {
                  const d = ctx.getImageData(px, py, 1, 1).data;
                  resolve({ r: d[0], g: d[1], b: d[2] });
                } catch(e) {
                  resolve(null);
                }
              };
              img.onerror = () => resolve(null);
              img.src = dataUrl;
            });
          }

          async function updateInfo(e) {
            const now = Date.now();
            if (now - lastMouseMove < 16) return;
            lastMouseMove = now;

            const sx = e.screenX;
            const sy = e.screenY;
            coordTxt.textContent = 'X: ' + sx + ', Y: ' + sy;

            const info = await window.electronAPI.internal.getDisplayAtPoint(sx, sy);
            if (!info) return;

            const relX = sx - info.bounds.x;
            const relY = sy - info.bounds.y;
            const shot = await getScreenshot(info.id);
            if (!shot) return;

            const pixel = await getPixelFromDataUrl(shot, relX, relY, info.scaleFactor);
            if (!pixel) return;

            const { r, g, b } = pixel;
            const hex = '#' + [r,g,b].map(v => v.toString(16).padStart(2,'0')).join('').toUpperCase();
            dot.style.background = hex;
            rgbTxt.textContent = 'rgb(' + r + ',' + g + ',' + b + ')';

            await window.electronAPI.internal.updateMagnifier(sx, sy, info.id, hex, r, g, b);
          }

          let lastClickTime = 0;

          document.addEventListener('mousemove', (e) => {
            updateInfo(e);
          });

          document.addEventListener('click', async (e) => {
            const now = Date.now();
            if (now - lastClickTime < 200) return;
            lastClickTime = now;

            const sx = e.screenX;
            const sy = e.screenY;
            const info = await window.electronAPI.internal.getDisplayAtPoint(sx, sy);
            if (!info) return;

            const relX = sx - info.bounds.x;
            const relY = sy - info.bounds.y;
            const shot = await getScreenshot(info.id);
            if (!shot) return;

            const pixel = await getPixelFromDataUrl(shot, relX, relY, info.scaleFactor);
            if (!pixel) return;

            const { r, g, b } = pixel;
            const hex = '#' + [r,g,b].map(v => v.toString(16).padStart(2,'0')).join('').toUpperCase();

            await window.electronAPI.internal.submitPick({ r, g, b, hex, x: sx, y: sy });
          });

          document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
              window.electronAPI.internal.cancelPick();
            }
          });

          window.electronAPI.internal.onPickerCancel(() => {});
        })();
      </script>
    </body>
    </html>
  `
}

async function startColorPicker() {
  if (isPicking) return
  isPicking = true

  createMagnifierWindow()

  pickerWindow = new BrowserWindow({
    fullscreen: true,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    hasShadow: false,
    focusable: true,
    resizable: false,
    movable: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  pickerWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(getPickerHtml()))

  magnifierWindow?.show()

  pickerWindow.on('closed', () => {
    cleanupPicker()
  })
}

ipcMain.handle('picker:start', () => {
  startColorPicker()
  return { success: true }
})

ipcMain.handle('internal:getScreenshot', async (_e, displayId: number) => {
  const displays = screen.getAllDisplays()
  let display = displays.find(d => d.id === displayId) || screen.getPrimaryDisplay()
  return await getScreenshotForDisplay(display)
})

ipcMain.handle('internal:getDisplayAtPoint', async (_e, x: number, y: number) => {
  const display = screen.getDisplayNearestPoint({ x, y })
  return {
    id: display.id,
    bounds: display.bounds,
    scaleFactor: display.scaleFactor,
  }
})

ipcMain.handle('internal:updateMagnifier', async (
  _e,
  screenX: number,
  screenY: number,
  displayId: number,
  hex: string,
  r: number,
  g: number,
  b: number
) => {
  if (!magnifierWindow) return

  const display = screen.getDisplayNearestPoint({ x: screenX, y: screenY })
  const displayBounds = display.bounds

  const relX = screenX - displayBounds.x
  const relY = screenY - displayBounds.y

  let finalX = screenX + 28
  let finalY = screenY + 28

  const wa = display.workArea
  if (finalX + 240 > wa.x + wa.width) finalX = screenX - 268
  if (finalY + 270 > wa.y + wa.height) finalY = screenY - 298

  try {
    magnifierWindow.setPosition(finalX, finalY)
  } catch {}

  const magSizePx = 7
  const drawSize = 224
  const scale = display.scaleFactor

  const sx = Math.max(0, (relX * scale) - (magSizePx * scale / 2))
  const sy = Math.max(0, (relY * scale) - (magSizePx * scale / 2))
  const ssize = magSizePx * scale

  try {
    const shot = await getScreenshotForDisplay(display)
    if (shot && magnifierWindow) {
      const escapedShot = shot.replace(/'/g, "\\'")
      magnifierWindow.webContents.executeJavaScript(`
        (function() {
          const canvas = document.getElementById('c');
          const ctx = canvas.getContext('2d');
          const hexEl = document.getElementById('hex');
          hexEl.textContent = '${hex}';
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = function() {
            ctx.imageSmoothingEnabled = false;
            ctx.clearRect(0, 0, 224, 224);
            ctx.drawImage(img, ${sx}, ${sy}, ${ssize}, ${ssize}, 0, 0, 224, 224);
          };
          img.src = '${escapedShot}';
        })();
      `).catch(() => {})
    }
  } catch {}
})

ipcMain.handle('internal:submitPick', async (_e, data: { r: number; g: number; b: number; hex: string; x: number; y: number }) => {
  cleanupPicker()
  if (mainWindow) {
    mainWindow.webContents.send('color:picked', { ...data, timestamp: Date.now() })
    mainWindow.focus()
  }
})

ipcMain.handle('internal:cancelPick', async () => {
  cleanupPicker()
})

ipcMain.handle('dialog:openImage', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [
      { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp'] },
    ],
  })
  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0]
  }
  return null
})

ipcMain.handle('dialog:openImages', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp'] },
    ],
  })
  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths
  }
  return []
})

ipcMain.handle('dialog:readImageFile', async (_e, filePath: string) => {
  try {
    const buf = fs.readFileSync(filePath)
    const img = nativeImage.createFromBuffer(buf)
    return img.toDataURL()
  } catch (e) {
    console.error('readImageFile error:', e)
    return null
  }
})

ipcMain.handle('dialog:saveFile', async (_e, params: {
  defaultName: string
  content: string
  filters: { name: string; extensions: string[] }[]
}) => {
  const result = await dialog.showSaveDialog({
    defaultPath: params.defaultName,
    filters: params.filters,
  })
  if (!result.canceled && result.filePath) {
    fs.writeFileSync(result.filePath, params.content, 'utf-8')
    return { success: true, path: result.filePath }
  }
  return { success: false }
})

ipcMain.on('window:openExternal', (_e, url) => {
  shell.openExternal(url)
})

app.whenReady().then(() => {
  createMainWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
