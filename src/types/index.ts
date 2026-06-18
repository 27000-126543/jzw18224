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

export type ColorGroupKey = 'brand' | 'semantic' | 'neutral' | 'gray' | 'custom'

export interface ColorGroup {
  id: ColorGroupKey
  name: string
  description: string
  icon: string
}

export const DEFAULT_COLOR_GROUPS: ColorGroup[] = [
  { id: 'brand', name: '品牌色', description: '', icon: '🎨' },
  { id: 'semantic', name: '语义色', description: '成功、警告、错误、信息等功能色', icon: '✨' },
  { id: 'neutral', name: '中性色', description: '主文字、次要文字等文本色', icon: '📝' },
  { id: 'gray', name: '灰阶色', description: '背景、边框、分割线等灰阶', icon: '🌫️' },
  { id: 'custom', name: '未分组', description: '暂未归类的颜色', icon: '📦' },
]

export function getDefaultColorGroups(): ColorGroup[] {
  return DEFAULT_COLOR_GROUPS.map(g => ({ ...g }))
}

export interface ColorPalette {
  id: string
  name: string
  description?: string
  colors: PaletteColor[]
  createdAt: number
  updatedAt: number
  groups?: {
    brand?: string
    semantic?: string
    neutral?: string
    gray?: string
    custom?: string
  }
}

export interface PaletteColor {
  id: string
  hex: string
  name?: string
  note?: string
  addedAt: number
  sourceImage?: string
  group?: ColorGroupKey
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
  openImages: () => Promise<string[]>
  readImageFile: (filePath: string) => Promise<string | null>
  saveFile: (params: {
    defaultName: string
    content: string
    filters: { name: string; extensions: string[] }[]
  }) => Promise<{ success: boolean; path?: string }>
  chooseDirectory: (suggestedName?: string) => Promise<string | null>
  writeFile: (filePath: string, content: string) => Promise<{
    success: boolean
    path?: string
    error?: string
  }>
  joinPath: (...parts: string[]) => Promise<string>
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
