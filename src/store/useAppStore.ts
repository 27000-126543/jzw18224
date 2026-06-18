import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { PickedColor, ColorPalette, PaletteColor, ExtractedPalette } from '../types'
import { generateId } from '../utils/colorUtils'

interface AppState {
  currentColor: PickedColor | null
  history: PickedColor[]
  palettes: ColorPalette[]
  activePaletteId: string | null
  exportFormat: 'css' | 'svg' | 'json'
  extractedPalettes: ExtractedPalette[]

  setCurrentColor: (color: PickedColor) => void
  addToHistory: (color: PickedColor) => void
  removeFromHistory: (timestamp: number) => void
  clearHistory: () => void

  createPalette: (name: string, description?: string) => ColorPalette
  deletePalette: (id: string) => void
  updatePalette: (id: string, updates: Partial<Pick<ColorPalette, 'name' | 'description'>>) => void
  setActivePalette: (id: string | null) => void
  addColorToPalette: (paletteId: string, hex: string, name?: string, note?: string, sourceImage?: string) => void
  addColorsToPalette: (paletteId: string, colors: { hex: string; name?: string; note?: string; sourceImage?: string }[]) => void
  removeColorFromPalette: (paletteId: string, colorId: string) => void
  updateColorInPalette: (paletteId: string, colorId: string, updates: Partial<PaletteColor>) => void
  reorderColorsInPalette: (paletteId: string, fromIndex: number, toIndex: number) => void
  duplicateColorInPalette: (paletteId: string, colorId: string) => void

  addExtractedPalette: (name: string, sourceImage: string, sourceImageName: string, colors: string[]) => ExtractedPalette
  removeExtractedPalette: (id: string) => void
  clearExtractedPalettes: () => void
  mergeExtractedToPalette: (extractedId: string, paletteId: string) => void

  setExportFormat: (format: 'css' | 'svg' | 'json') => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      currentColor: null,
      history: [],
      palettes: [],
      activePaletteId: null,
      exportFormat: 'css',
      extractedPalettes: [],

      setCurrentColor: (color) => {
        set({ currentColor: color })
      },

      addToHistory: (color) => {
        const newColor = { ...color, timestamp: color.timestamp || Date.now() }
        const { history } = get()
        const exists = history.some(c => c.hex === newColor.hex)
        if (exists) {
          set({
            history: [
              newColor,
              ...history.filter(c => c.hex !== newColor.hex),
            ].slice(0, 100),
          })
        } else {
          set({
            history: [newColor, ...history].slice(0, 100),
          })
        }
      },

      removeFromHistory: (timestamp) => {
        const { history } = get()
        set({ history: history.filter(c => c.timestamp !== timestamp) })
      },

      clearHistory: () => {
        set({ history: [] })
      },

      createPalette: (name, description) => {
        const now = Date.now()
        const palette: ColorPalette = {
          id: generateId(),
          name,
          description,
          colors: [],
          createdAt: now,
          updatedAt: now,
        }
        const { palettes } = get()
        set({
          palettes: [...palettes, palette],
          activePaletteId: palette.id,
        })
        return palette
      },

      deletePalette: (id) => {
        const { palettes, activePaletteId } = get()
        const newPalettes = palettes.filter(p => p.id !== id)
        set({
          palettes: newPalettes,
          activePaletteId: activePaletteId === id
            ? newPalettes[0]?.id || null
            : activePaletteId,
        })
      },

      updatePalette: (id, updates) => {
        const { palettes } = get()
        set({
          palettes: palettes.map(p =>
            p.id === id
              ? { ...p, ...updates, updatedAt: Date.now() }
              : p
          ),
        })
      },

      setActivePalette: (id) => {
        set({ activePaletteId: id })
      },

      addColorToPalette: (paletteId, hex, name, note, sourceImage) => {
        const { palettes } = get()
        const newColor: PaletteColor = {
          id: generateId(),
          hex,
          name,
          note,
          sourceImage,
          addedAt: Date.now(),
        }
        set({
          palettes: palettes.map(p =>
            p.id === paletteId
              ? {
                  ...p,
                  colors: [...p.colors, newColor],
                  updatedAt: Date.now(),
                }
              : p
          ),
        })
      },

      addColorsToPalette: (paletteId, colors) => {
        const { palettes } = get()
        const now = Date.now()
        const newColors: PaletteColor[] = colors.map(c => ({
          id: generateId(),
          hex: c.hex,
          name: c.name,
          note: c.note,
          sourceImage: c.sourceImage,
          addedAt: now,
        }))
        set({
          palettes: palettes.map(p =>
            p.id === paletteId
              ? {
                  ...p,
                  colors: [...p.colors, ...newColors],
                  updatedAt: now,
                }
              : p
          ),
        })
      },

      removeColorFromPalette: (paletteId, colorId) => {
        const { palettes } = get()
        set({
          palettes: palettes.map(p =>
            p.id === paletteId
              ? {
                  ...p,
                  colors: p.colors.filter(c => c.id !== colorId),
                  updatedAt: Date.now(),
                }
              : p
          ),
        })
      },

      updateColorInPalette: (paletteId, colorId, updates) => {
        const { palettes } = get()
        set({
          palettes: palettes.map(p =>
            p.id === paletteId
              ? {
                  ...p,
                  colors: p.colors.map(c =>
                    c.id === colorId ? { ...c, ...updates } : c
                  ),
                  updatedAt: Date.now(),
                }
              : p
          ),
        })
      },

      reorderColorsInPalette: (paletteId, fromIndex, toIndex) => {
        const { palettes } = get()
        set({
          palettes: palettes.map(p => {
            if (p.id !== paletteId) return p
            const newColors = [...p.colors]
            const [removed] = newColors.splice(fromIndex, 1)
            newColors.splice(toIndex, 0, removed)
            return { ...p, colors: newColors, updatedAt: Date.now() }
          }),
        })
      },

      duplicateColorInPalette: (paletteId, colorId) => {
        const { palettes } = get()
        const palette = palettes.find(p => p.id === paletteId)
        if (!palette) return
        const color = palette.colors.find(c => c.id === colorId)
        if (!color) return

        const newColor: PaletteColor = {
          ...color,
          id: generateId(),
          name: color.name ? `${color.name} (副本)` : undefined,
          addedAt: Date.now(),
        }

        set({
          palettes: palettes.map(p => {
            if (p.id !== paletteId) return p
            const idx = p.colors.findIndex(c => c.id === colorId)
            const newColors = [...p.colors]
            newColors.splice(idx + 1, 0, newColor)
            return { ...p, colors: newColors, updatedAt: Date.now() }
          }),
        })
      },

      addExtractedPalette: (name, sourceImage, sourceImageName, colors) => {
        const { extractedPalettes } = get()
        const extracted: ExtractedPalette = {
          id: generateId(),
          name,
          sourceImage,
          sourceImageName,
          colors,
          extractedAt: Date.now(),
        }
        set({
          extractedPalettes: [extracted, ...extractedPalettes].slice(0, 20),
        })
        return extracted
      },

      removeExtractedPalette: (id) => {
        const { extractedPalettes } = get()
        set({
          extractedPalettes: extractedPalettes.filter(e => e.id !== id),
        })
      },

      clearExtractedPalettes: () => {
        set({ extractedPalettes: [] })
      },

      mergeExtractedToPalette: (extractedId, paletteId) => {
        const { extractedPalettes } = get()
        const extracted = extractedPalettes.find(e => e.id === extractedId)
        if (!extracted) return

        const colors = extracted.colors.map((hex, i) => ({
          hex,
          name: `主色 ${i + 1}`,
          note: `提取自 ${extracted.sourceImageName}`,
          sourceImage: extracted.sourceImageName,
        }))

        const { addColorsToPalette } = get() as AppState
        addColorsToPalette(paletteId, colors)
      },

      setExportFormat: (format) => {
        set({ exportFormat: format })
      },
    }),
    {
      name: 'color-picker-pro-storage',
      partialize: (state) => ({
        history: state.history,
        palettes: state.palettes,
        activePaletteId: state.activePaletteId,
        exportFormat: state.exportFormat,
        extractedPalettes: state.extractedPalettes,
      }),
    }
  )
)
