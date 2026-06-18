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
  sourceImage?: string
}

export interface ExtractedPalette {
  id: string
  name: string
  sourceImage: string
  sourceImageName: string
  colors: string[]
  extractedAt: number
}

export interface DisplayInfo {
  id: number
  bounds: { x: number; y: number; width: number; height: number }
  scaleFactor: number
}

export interface InternalAPI {
  getScreenshot: (displayId: number) => Promise<string | null>
  getDisplayAtPoint: (x: number, y: number) => Promise<DisplayInfo>
  updateMagnifier: (
    screenX: number, screenY: number, displayId: number,
    hex: string, r: number, g: number, b: number
  ) => Promise<void>
  submitPick: (data: { r: number; g: number; b: number; hex: string; x: number; y: number }) => Promise<void>
  cancelPick: () => Promise<void>
  onPickerCancel: (callback: () => void) => void
}

export interface DialogAPI {
  openImage: () => Promise<string | null>
  readImageFile: (filePath: string) => Promise<string | null>
  saveFile: (params: {
    defaultName: string
    content: string
    filters: { name: string; extensions: string[] }[]
  }) => Promise<{ success: boolean; path?: string }>
}

export interface PickerAPI {
  start: () => Promise<{ success: boolean }>
  onColorPicked: (callback: (color: PickedColor) => void) => (() => void) | void
  removeColorPickedListener: () => void
  getFromScreen: (x: number, y: number) => Promise<PickedColor | null>
}

export interface WindowAPI {
  openExternal: (url: string) => void
}

export interface ElectronAPI {
  picker: PickerAPI
  dialog: DialogAPI
  window: WindowAPI
  internal: InternalAPI
}
