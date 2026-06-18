import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { PickedColor, ColorPalette, PaletteColor } from '../types'
import { generateId } from '../utils/colorUtils'

interface AppState {
  currentColor: PickedColor | null
  history: PickedColor[]
  palettes: ColorPalette[]
  activePaletteId: string | null
  exportFormat: 'css' | 'svg' | 'json'

  setCurrentColor: (color: PickedColor) => void
  addToHistory: (color: PickedColor) => void
  removeFromHistory: (timestamp: number) => void
  clearHistory: () => void

  createPalette: (name: string, description?: string) => ColorPalette
  deletePalette: (id: string) => void
  updatePalette: (id: string, updates: Partial<Pick<ColorPalette, 'name' | 'description'>>) => void
  setActivePalette: (id: string | null) => void
  addColorToPalette: (paletteId: string, hex: string, name?: string, note?: string) => void
  removeColorFromPalette: (paletteId: string, colorId: string) => void
  updateColorInPalette: (paletteId: string, colorId: string, updates: Partial<PaletteColor>) => void

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

      addColorToPalette: (paletteId, hex, name, note) => {
        const { palettes } = get()
        const newColor: PaletteColor = {
          id: generateId(),
          hex,
          name,
          note,
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
      }),
    }
  )
)
