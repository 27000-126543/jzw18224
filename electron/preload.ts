import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron'

export interface PickedColor {
  r: number
  g: number
  b: number
  hex: string
  x?: number
  y?: number
  timestamp?: number
  name?: string
}

export interface ColorPalette {
  id: string
  name: string
  description?: string
  colors: PaletteColor[]
  createdAt: number
  updatedAt: number
}

export interface PaletteColor {
  id: string
  hex: string
  name?: string
  note?: string
  addedAt: number
}

const internalAPI = {
  getScreenshot: (displayId: number): Promise<string | null> =>
    ipcRenderer.invoke('internal:getScreenshot', displayId),

  getDisplayAtPoint: (x: number, y: number): Promise<{
    id: number
    bounds: { x: number; y: number; width: number; height: number }
    scaleFactor: number
  }> => ipcRenderer.invoke('internal:getDisplayAtPoint', x, y),

  updateMagnifier: (
    screenX: number, screenY: number, displayId: number,
    hex: string, r: number, g: number, b: number
  ): Promise<void> =>
    ipcRenderer.invoke('internal:updateMagnifier', screenX, screenY, displayId, hex, r, g, b),

  submitPick: (data: { r: number; g: number; b: number; hex: string; x: number; y: number }): Promise<void> =>
    ipcRenderer.invoke('internal:submitPick', data),

  cancelPick: (): Promise<void> =>
    ipcRenderer.invoke('internal:cancelPick'),

  onPickerCancel: (callback: () => void) => {
    ipcRenderer.on('picker:canceled', () => callback())
  },
}

contextBridge.exposeInMainWorld('electronAPI', {
  picker: {
    start: (): Promise<{ success: boolean }> => ipcRenderer.invoke('picker:start'),
    onColorPicked: (callback: (color: PickedColor) => void) => {
      const handler = (_event: IpcRendererEvent, color: PickedColor) => callback(color)
      ipcRenderer.on('color:picked', handler)
      return () => ipcRenderer.removeListener('color:picked', handler)
    },
    removeColorPickedListener: () => {
      ipcRenderer.removeAllListeners('color:picked')
    },
    getFromScreen: (x: number, y: number): Promise<PickedColor | null> =>
      ipcRenderer.invoke('color:getFromScreen', { x, y }),
  },

  dialog: {
    openImage: (): Promise<string | null> => ipcRenderer.invoke('dialog:openImage'),
    openImages: (): Promise<string[]> => ipcRenderer.invoke('dialog:openImages'),
    readImageFile: (filePath: string): Promise<string | null> =>
      ipcRenderer.invoke('dialog:readImageFile', filePath),
    saveFile: (params: {
      defaultName: string
      content: string
      filters: { name: string; extensions: string[] }[]
    }): Promise<{ success: boolean; path?: string }> => ipcRenderer.invoke('dialog:saveFile', params),
  },

  window: {
    openExternal: (url: string) => ipcRenderer.send('window:openExternal', url),
  },

  internal: internalAPI,
})

declare global {
  interface Window {
    electronAPI: {
      picker: {
        start: () => Promise<{ success: boolean }>
        onColorPicked: (callback: (color: PickedColor) => void) => (() => void) | void
        removeColorPickedListener: () => void
        getFromScreen: (x: number, y: number) => Promise<PickedColor | null>
      }
      dialog: {
        openImage: () => Promise<string | null>
        readImageFile: (filePath: string) => Promise<string | null>
        saveFile: (params: {
          defaultName: string
          content: string
          filters: { name: string; extensions: string[] }[]
        }) => Promise<{ success: boolean; path?: string }>
      }
      window: {
        openExternal: (url: string) => void
      }
      internal: typeof internalAPI
    }
  }
}
