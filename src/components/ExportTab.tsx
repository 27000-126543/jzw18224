import { useState, useMemo } from 'react'
import { useAppStore } from '../store/useAppStore'
import type { ColorPalette, PaletteColor, ColorGroupKey } from '../types'
import { DEFAULT_COLOR_GROUPS } from '../types'
import { hexToRgb } from '../utils/colorUtils'
import { toKebabCase } from '../utils/stringUtils'

interface Props {
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void
}

type ExportFormat =
  | 'css'
  | 'css-theme'
  | 'css-classes'
  | 'scss'
  | 'less'
  | 'stylus'
  | 'tailwind'
  | 'styled-components'
  | 'js-theme'
  | 'ts-theme'
  | 'design-tokens'
  | 'svg'
  | 'json'

const slug = (s: string) =>
  s.toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')

const getVarName = (paletteName: string, colorName?: string, idx?: number): string => {
  if (colorName) return toKebabCase(colorName).replace(/[^a-z0-9-]/g, '')
  return `color-${(idx ?? 0) + 1}`
}

const getGroupInfo = (palette: ColorPalette) => {
  const groups = [...DEFAULT_COLOR_GROUPS]
  if (palette.groups) {
    groups.forEach(g => {
      const desc = palette.groups![g.id]
      if (desc !== undefined) g.description = desc
    })
  }
  return groups
}

const generateReadme = (palette: ColorPalette): string => {
  const groups = getGroupInfo(palette)
  const sourceImages = Array.from(new Set(palette.colors.map(c => c.sourceImage).filter(Boolean)))
  const date = new Date().toLocaleString()
  const lines: string[] = []

  lines.push(`# ${palette.name}`)
  lines.push('')
  lines.push(`> 🎨 **调色板交付包**`)
  lines.push('>')
  lines.push(`> - **生成时间**: ${date}`)
  lines.push(`> - **颜色总数**: ${palette.colors.length} 个`)
  lines.push(`> - **分组数量**: ${groups.filter(g => palette.colors.some(c => (c.group || 'custom') === g.id)).length} 个`)
  if (sourceImages.length > 0) lines.push(`> - **来源图片**: ${sourceImages.length} 张`)
  if (palette.description) lines.push(`> - **说明**: ${palette.description}`)
  lines.push('')
  lines.push('---')
  lines.push('')
  lines.push('## 📁 目录结构')
  lines.push('')
  lines.push('```')
  lines.push(`${slug(palette.name) || 'palette'}-palette/`)
  lines.push('├── README.md              # 本文件 — 使用说明')
  lines.push('├── css-theme.css          # 语义化 CSS 主题变量')
  lines.push('├── css-variables.css      # 基础 CSS 变量')
  lines.push('├── tailwind.config.js     # Tailwind 配置')
  lines.push('├── tokens.json            # W3C Design Tokens 标准')
  lines.push('└── palette.json           # 结构化原始数据')
  lines.push('```')
  lines.push('')
  lines.push('## 🎯 颜色分组')
  lines.push('')

  groups.forEach(g => {
    const colors = palette.colors.filter(c => (c.group || 'custom') === g.id)
    if (colors.length === 0) return
    lines.push(`### ${g.icon} ${g.name}（${colors.length} 色）`)
    lines.push('')
    if (g.description) lines.push(`> ${g.description}`)
    lines.push('')
    lines.push('| # | 预览 | 名称 | HEX | RGB | 备注 | 来源 |')
    lines.push('|---|------|------|-----|-----|------|------|')
    colors.forEach((c, i) => {
      const rgb = hexToRgb(c.hex)
      lines.push(`| ${i + 1} | <div style="display:inline-block;width:14px;height:14px;background:${c.hex};border-radius:3px;border:1px solid #ddd;"></div> | ${c.name || '—'} | \`${c.hex}\` | ${rgb ? `${rgb.r},${rgb.g},${rgb.b}` : '—'} | ${c.note || '—'} | ${c.sourceImage || '—'} |`)
    })
    lines.push('')
  })

  lines.push('## 🚀 快速使用')
  lines.push('')
  lines.push('### CSS 变量（浏览器原生）')
  lines.push('')
  lines.push('```css')
  lines.push(`@import './css-theme.css';`)
  lines.push('')
  lines.push('.btn-primary {')
  if (palette.colors.length > 0) {
    const n = getVarName(palette.name, palette.colors[0]?.name, 0)
    lines.push(`  background: var(--color-${n});`)
  }
  lines.push('  color: white;')
  lines.push('}')
  lines.push('```')
  lines.push('')
  lines.push('### Tailwind CSS')
  lines.push('')
  lines.push('```jsx')
  lines.push(`// tailwind.config.js 中合并配置`)
  lines.push(`<button className="bg-${slug(palette.name) || 'palette'}-primary text-white">按钮</button>`)
  lines.push('```')
  lines.push('')
  lines.push('### JavaScript / TypeScript')
  lines.push('')
  lines.push('```ts')
  lines.push(`import { theme } from './theme.ts'`)
  lines.push(`// 或读取结构化数据`)
  lines.push(`import palette from './palette.json'`)
  lines.push('```')
  lines.push('')
  lines.push('## 🔗 设计令牌标准')
  lines.push('')
  lines.push('`tokens.json` 遵循 [W3C Design Tokens Community Group](https://design-tokens.github.io/community-group/format/) 标准，可在 Figma、Sketch、Style Dictionary 等工具中直接导入使用。')
  lines.push('')

  if (sourceImages.length > 0) {
    lines.push('## 🖼️ 来源图片')
    lines.push('')
    lines.push('以下图片被用于提取颜色：')
    lines.push('')
    sourceImages.forEach(s => {
      const count = palette.colors.filter(c => c.sourceImage === s).length
      lines.push(`- **${s}**：提取了 ${count} 个颜色`)
    })
    lines.push('')
  }

  lines.push('---')
  lines.push('')
  lines.push(`_生成于 ${date} — 🎨 由 Color Palette Tool 生成_`)

  return lines.join('\n')
}

const generateCss = (palette: ColorPalette, prefix: string = 'color'): string => {
  const lines: string[] = []
  lines.push(`/* ========================================`)
  lines.push(`   Palette: ${palette.name}`)
  if (palette.description) lines.push(`   Description: ${palette.description}`)
  lines.push(`   Generated: ${new Date().toISOString()}`)
  lines.push(`   Colors: ${palette.colors.length}`)
  lines.push(`   ======================================== */`)
  lines.push('')
  lines.push(':root {')

  palette.colors.forEach((c: PaletteColor, i: number) => {
    const name = getVarName(palette.name, c.name, i)
    if (c.note) lines.push(`  /* ${c.note} */`)
    lines.push(`  --${prefix}-${name}: ${c.hex};`)
  })

  lines.push('}')
  lines.push('')
  lines.push('/* Usage example:')
  lines.push(`   .text-primary { color: var(--${prefix}-${getVarName(palette.name, palette.colors[0]?.name, 0)}); }`)
  lines.push('*/')

  return lines.join('\n')
}

const generateCssClasses = (palette: ColorPalette, prefix: string = 'color'): string => {
  const lines: string[] = []
  lines.push(`/* ========================================`)
  lines.push(`   Palette: ${palette.name}`)
  lines.push(`   CSS Utility Classes`)
  lines.push(`   ======================================== */`)
  lines.push('')

  palette.colors.forEach((c: PaletteColor, i: number) => {
    const name = getVarName(palette.name, c.name, i)
    lines.push(`/* ${c.hex}${c.name ? ` - ${c.name}` : ''} */`)
    lines.push(`.bg-${prefix}-${name} { background-color: ${c.hex}; }`)
    lines.push(`.text-${prefix}-${name} { color: ${c.hex}; }`)
    lines.push(`.border-${prefix}-${name} { border-color: ${c.hex}; }`)
    lines.push('')
  })

  return lines.join('\n')
}

const generateScss = (palette: ColorPalette): string => {
  const lines: string[] = []
  lines.push(`// ========================================`)
  lines.push(`// Palette: ${palette.name}`)
  if (palette.description) lines.push(`// Description: ${palette.description}`)
  lines.push(`// Generated: ${new Date().toISOString()}`)
  lines.push(`// ========================================`)
  lines.push('')

  palette.colors.forEach((c: PaletteColor, i: number) => {
    const name = getVarName(palette.name, c.name, i)
    lines.push(`$${name}: ${c.hex};${c.note ? ` // ${c.note}` : ''}`)
  })

  lines.push('')
  lines.push(`// Color map for map-get()`)
  lines.push(`$${slug(palette.name)}-colors: (`)
  palette.colors.forEach((c: PaletteColor, i: number) => {
    const name = getVarName(palette.name, c.name, i)
    lines.push(`  '${name}': $${name}${i < palette.colors.length - 1 ? ',' : ''}`)
  })
  lines.push(');')
  lines.push('')
  lines.push(`// Usage: color: map-get($${slug(palette.name)}-colors, '${getVarName(palette.name, palette.colors[0]?.name, 0)}');`)

  return lines.join('\n')
}

const generateLess = (palette: ColorPalette): string => {
  const lines: string[] = []
  lines.push(`// ========================================`)
  lines.push(`// Palette: ${palette.name}`)
  lines.push(`// Generated: ${new Date().toISOString()}`)
  lines.push(`// ========================================`)
  lines.push('')

  palette.colors.forEach((c: PaletteColor, i: number) => {
    const name = getVarName(palette.name, c.name, i)
    lines.push(`@${name}: ${c.hex};${c.note ? ` // ${c.note}` : ''}`)
  })

  lines.push('')
  lines.push(`// Usage: color: @${getVarName(palette.name, palette.colors[0]?.name, 0)};`)

  return lines.join('\n')
}

const generateStylus = (palette: ColorPalette): string => {
  const lines: string[] = []
  lines.push(`// ========================================`)
  lines.push(`// Palette: ${palette.name}`)
  lines.push(`// Generated: ${new Date().toISOString()}`)
  lines.push(`// ========================================`)
  lines.push('')

  palette.colors.forEach((c: PaletteColor, i: number) => {
    const name = getVarName(palette.name, c.name, i)
    lines.push(`${name} = ${c.hex}${c.note ? ` // ${c.note}` : ''}`)
  })

  lines.push('')
  lines.push(`// Usage: color ${getVarName(palette.name, palette.colors[0]?.name, 0)}`)

  return lines.join('\n')
}

const generateSvg = (palette: ColorPalette): string => {
  const swatchW = 200
  const swatchH = 140
  const gap = 16
  const perRow = 4
  const rows = Math.ceil(palette.colors.length / perRow)
  const padding = 32
  const headerH = 80

  const totalW = padding * 2 + perRow * swatchW + (perRow - 1) * gap
  const totalH = headerH + padding * 2 + rows * swatchH + (rows - 1) * gap

  const getTextColor = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    const luma = (0.299 * r + 0.587 * g + 0.114 * b) / 255
    return luma > 0.5 ? '#111111' : '#FFFFFF'
  }

  const parts: string[] = []
  parts.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${totalW}" height="${totalH}" viewBox="0 0 ${totalW} ${totalH}">`)
  parts.push(`  <rect width="${totalW}" height="${totalH}" fill="#1a1a2e"/>`)
  parts.push('')
  parts.push(`  <text x="${padding}" y="48" font-family="Arial, sans-serif" font-size="28" font-weight="700" fill="#e8e8f0">${palette.name}</text>`)
  parts.push(`  <text x="${padding}" y="70" font-family="Arial, sans-serif" font-size="13" fill="#6c6c8a">${palette.colors.length} colors · Generated ${new Date().toLocaleDateString()}</text>`)
  parts.push('')

  palette.colors.forEach((c: PaletteColor, i: number) => {
    const col = i % perRow
    const row = Math.floor(i / perRow)
    const x = padding + col * (swatchW + gap)
    const y = headerH + padding + row * (swatchH + gap)
    const textColor = getTextColor(c.hex)

    parts.push(`  <g id="color-${i + 1}">`)
    parts.push(`    <rect x="${x}" y="${y}" width="${swatchW}" height="${swatchH}" rx="12" fill="${c.hex}"/>`)
    parts.push(`    <text x="${x + 16}" y="${y + 36}" font-family="Consolas, monospace" font-size="15" font-weight="700" fill="${textColor}">${c.hex}</text>`)
    parts.push(`    <text x="${x + 16}" y="${y + 60}" font-family="Arial, sans-serif" font-size="13" font-weight="600" fill="${textColor}" opacity="0.95">${c.name || `Color ${i + 1}`}</text>`)
    if (c.note) {
      parts.push(`    <text x="${x + 16}" y="${y + 100}" font-family="Arial, sans-serif" font-size="11" fill="${textColor}" opacity="0.75">${c.note.slice(0, 30)}${c.note.length > 30 ? '...' : ''}</text>`)
    }
    parts.push(`  </g>`)
    parts.push('')
  })

  parts.push('</svg>')
  return parts.join('\n')
}

const generateJson = (palette: ColorPalette): string => {
  const data = {
    name: palette.name,
    description: palette.description || '',
    createdAt: new Date(palette.createdAt).toISOString(),
    updatedAt: new Date(palette.updatedAt).toISOString(),
    count: palette.colors.length,
    colors: palette.colors.map((c: PaletteColor, i: number) => {
      const rgb = hexToRgb(c.hex)
      return {
        name: c.name || `color-${i + 1}`,
        hex: c.hex,
        rgb: rgb ? `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})` : '',
        rgbValues: rgb,
        note: c.note || null,
        sourceImage: c.sourceImage || null,
        addedAt: new Date(c.addedAt).toISOString(),
      }
    }),
  }
  return JSON.stringify(data, null, 2)
}

const generateTailwind = (palette: ColorPalette): string => {
  const name = (n?: string, i?: number) => {
    if (n) return toKebabCase(n).replace(/[^a-z0-9-]/g, '')
    return `color-${(i ?? 0) + 1}`
  }

  const lines: string[] = []
  lines.push(`// tailwind.config.js - ${palette.name}`)
  lines.push(`// Generated: ${new Date().toISOString()}`)
  lines.push('')
  lines.push("/** @type {import('tailwindcss').Config} */")
  lines.push('module.exports = {')
  lines.push('  theme: {')
  lines.push('    extend: {')
  lines.push(`      colors: {`)
  lines.push(`        '${slug(palette.name)}': {`)

  palette.colors.forEach((c: PaletteColor, i: number) => {
    const n = name(c.name, i)
    const comma = i < palette.colors.length - 1 ? ',' : ''
    lines.push(`          '${n}': '${c.hex}'${comma}${c.note ? ` // ${c.note}` : ''}`)
  })

  lines.push(`        }`)
  lines.push(`      }`)
  lines.push('    }')
  lines.push('  }')
  lines.push('}')
  lines.push('')
  lines.push(`// Usage examples:`)
  lines.push(`//   bg-${slug(palette.name)}-${name(palette.colors[0]?.name, 0)}`)
  lines.push(`//   text-${slug(palette.name)}-${name(palette.colors[0]?.name, 0)}`)
  lines.push(`//   border-${slug(palette.name)}-${name(palette.colors[0]?.name, 0)}`)

  return lines.join('\n')
}

const generateCssTheme = (palette: ColorPalette, prefix: string = 'color'): string => {
  const lines: string[] = []
  const paletteSlug = slug(palette.name)

  lines.push(`/* ========================================`)
  lines.push(`   Theme: ${palette.name}`)
  lines.push(`   Semantic CSS Variables`)
  lines.push(`   Generated: ${new Date().toISOString()}`)
  lines.push(`   ======================================== */`)
  lines.push('')
  lines.push(':root {')
  lines.push('')
  lines.push('  /* ========== Brand Colors ========== */')
  lines.push('')

  palette.colors.forEach((c: PaletteColor, i: number) => {
    const name = getVarName(palette.name, c.name, i)
    const rgb = hexToRgb(c.hex)
    if (c.note) lines.push(`  /* ${c.note} */`)
    lines.push(`  --${prefix}-${name}: ${c.hex};`)
    if (rgb) {
      lines.push(`  --${prefix}-${name}-rgb: ${rgb.r} ${rgb.g} ${rgb.b};`)
    }
  })

  lines.push('')
  lines.push('  /* ========== Semantic Tokens ========== */')
  lines.push('')

  const primary = palette.colors[0]
  const secondary = palette.colors[1] || palette.colors[0]
  const success = palette.colors.find(c => c.name?.toLowerCase().includes('success')) || palette.colors[palette.colors.length - 1]
  const warning = palette.colors.find(c => c.name?.toLowerCase().includes('warning')) || palette.colors[Math.floor(palette.colors.length / 2)]
  const error = palette.colors.find(c => c.name?.toLowerCase().includes('error')) || palette.colors[Math.floor(palette.colors.length / 3)]
  const bg = palette.colors.find(c => c.name?.toLowerCase().includes('bg') || c.name?.toLowerCase().includes('background')) || palette.colors[palette.colors.length - 1]
  const text = palette.colors.find(c => c.name?.toLowerCase().includes('text') || c.name?.toLowerCase().includes('foreground')) || palette.colors[0]

  lines.push(`  --${paletteSlug}-primary: var(--${prefix}-${getVarName(palette.name, primary?.name, 0)});`)
  lines.push(`  --${paletteSlug}-secondary: var(--${prefix}-${getVarName(palette.name, secondary?.name, 1)});`)
  lines.push(`  --${paletteSlug}-success: var(--${prefix}-${getVarName(palette.name, success?.name, palette.colors.length - 1)});`)
  lines.push(`  --${paletteSlug}-warning: var(--${prefix}-${getVarName(palette.name, warning?.name, Math.floor(palette.colors.length / 2))});`)
  lines.push(`  --${paletteSlug}-error: var(--${prefix}-${getVarName(palette.name, error?.name, Math.floor(palette.colors.length / 3))});`)
  lines.push(`  --${paletteSlug}-background: var(--${prefix}-${getVarName(palette.name, bg?.name, palette.colors.length - 1)});`)
  lines.push(`  --${paletteSlug}-text: var(--${prefix}-${getVarName(palette.name, text?.name, 0)});`)

  lines.push('')
  lines.push('}')
  lines.push('')
  lines.push('/* ========== Usage Examples ==========')
  lines.push('')
  lines.push(`  .btn-primary {`)
  lines.push(`    background: var(--${paletteSlug}-primary);`)
  lines.push(`    color: white;`)
  lines.push(`  }`)
  lines.push('')
  lines.push(`  .text-success {`)
  lines.push(`    color: var(--${paletteSlug}-success);`)
  lines.push(`  }`)
  lines.push('')
  lines.push(`  .bg-app {`)
  lines.push(`    background: var(--${paletteSlug}-background);`)
  lines.push(`    color: var(--${paletteSlug}-text);`)
  lines.push(`  }`)
  lines.push('')
  lines.push('*/')

  return lines.join('\n')
}

const generateStyledComponents = (palette: ColorPalette): string => {
  const paletteName = toKebabCase(palette.name).replace(/-/g, '')
  const camelName = paletteName.charAt(0).toUpperCase() + paletteName.slice(1)

  const lines: string[] = []
  lines.push(`// ========================================`)
  lines.push(`// Theme: ${palette.name}`)
  lines.push(`// Styled-components / Emotion Theme`)
  lines.push(`// Generated: ${new Date().toISOString()}`)
  lines.push(`// ========================================`)
  lines.push('')
  lines.push(`export const ${camelName}Theme = {`)
  lines.push(`  name: '${palette.name}',`)
  lines.push(`  colors: {`)

  palette.colors.forEach((c: PaletteColor, i: number) => {
    const name = getVarName(palette.name, c.name, i).replace(/-([a-z])/g, (g) => g[1].toUpperCase())
    const comma = i < palette.colors.length - 1 ? ',' : ''
    lines.push(`    ${name}: '${c.hex}',${comma}${c.note ? ` // ${c.note}` : ''}`)
  })

  lines.push(`  },`)
  lines.push(`}`)
  lines.push('')
  lines.push(`export type ${camelName}Theme = typeof ${camelName}Theme`)
  lines.push('')
  lines.push(`// Usage with styled-components:`)
  lines.push(`//   import { ${camelName}Theme } from './theme'`)
  lines.push(`//   <ThemeProvider theme={${camelName}Theme}>...</ThemeProvider>`)
  lines.push('//   const Button = styled.button`color: ${props => props.theme.colors.primary};`')

  return lines.join('\n')
}

const generateJsTheme = (palette: ColorPalette): string => {
  const lines: string[] = []
  lines.push(`// ========================================`)
  lines.push(`// Theme: ${palette.name}`)
  lines.push(`// JavaScript Theme Object`)
  lines.push(`// Generated: ${new Date().toISOString()}`)
  lines.push(`// ========================================`)
  lines.push('')
  lines.push(`export const colors = {`)

  palette.colors.forEach((c: PaletteColor, i: number) => {
    const name = getVarName(palette.name, c.name, i).replace(/-([a-z])/g, (g) => g[1].toUpperCase())
    const comma = i < palette.colors.length - 1 ? ',' : ''
    lines.push(`  ${name}: '${c.hex}',${comma}${c.note ? ` // ${c.note}` : ''}`)
  })

  lines.push(`}`)
  lines.push('')
  lines.push(`export const theme = {`)
  lines.push(`  primary: colors.${getVarName(palette.name, palette.colors[0]?.name, 0).replace(/-([a-z])/g, (g) => g[1].toUpperCase())},`)
  lines.push(`  paletteName: '${palette.name}',`)
  lines.push(`  colors,`)
  lines.push(`}`)
  lines.push('')
  lines.push(`export default theme`)

  return lines.join('\n')
}

const generateTsTheme = (palette: ColorPalette): string => {
  const lines: string[] = []
  lines.push(`// ========================================`)
  lines.push(`// Theme: ${palette.name}`)
  lines.push(`// TypeScript Theme Object`)
  lines.push(`// Generated: ${new Date().toISOString()}`)
  lines.push(`// ========================================`)
  lines.push('')
  lines.push(`export interface ThemeColors {`)

  palette.colors.forEach((c: PaletteColor, i: number) => {
    const name = getVarName(palette.name, c.name, i).replace(/-([a-z])/g, (g) => g[1].toUpperCase())
    lines.push(`  ${name}: string`)
  })

  lines.push(`}`)
  lines.push('')
  lines.push(`export interface Theme {`)
  lines.push(`  name: string`)
  lines.push(`  description?: string`)
  lines.push(`  colors: ThemeColors`)
  lines.push(`}`)
  lines.push('')
  lines.push(`export const colors: ThemeColors = {`)

  palette.colors.forEach((c: PaletteColor, i: number) => {
    const name = getVarName(palette.name, c.name, i).replace(/-([a-z])/g, (g) => g[1].toUpperCase())
    const comma = i < palette.colors.length - 1 ? ',' : ''
    lines.push(`  ${name}: '${c.hex}',${comma}${c.note ? ` // ${c.note}` : ''}`)
  })

  lines.push(`}`)
  lines.push('')
  lines.push(`export const theme: Theme = {`)
  lines.push(`  name: '${palette.name}',`)
  lines.push(`  ${palette.description ? `description: '${palette.description}',` : ''}`)
  lines.push(`  colors,`)
  lines.push(`}`)
  lines.push('')
  lines.push(`export default theme`)

  return lines.join('\n')
}

const generateDesignTokens = (palette: ColorPalette): string => {
  const tokens: Record<string, any> = {
    $schema: 'https://design-tokens.github.io/community-group/format/v1/schema.json',
    name: palette.name,
    description: palette.description || '',
    version: '1.0.0',
    createdAt: new Date(palette.createdAt).toISOString(),
    updatedAt: new Date(palette.updatedAt).toISOString(),
    color: {},
  }

  palette.colors.forEach((c: PaletteColor, i: number) => {
    const name = c.name || `color-${i + 1}`
    const key = toKebabCase(name).replace(/-([a-z])/g, (g) => g[1].toUpperCase())
    tokens.color[key] = {
      $value: c.hex,
      $type: 'color',
      $description: c.note || '',
    }
  })

  return JSON.stringify(tokens, null, 2)
}

export default function ExportTab({ showToast }: Props) {
  const { palettes, activePaletteId, setActivePalette } = useAppStore()
  const [format, setFormat] = useState<ExportFormat>('css')
  const [cssPrefix, setCssPrefix] = useState('color')
  const [copied, setCopied] = useState(false)
  const [selectedFormats, setSelectedFormats] = useState<Set<ExportFormat>>(
    new Set(['css-theme', 'tailwind', 'design-tokens', 'json'])
  )
  const [includeReadme, setIncludeReadme] = useState(true)
  const [isBatchMode, setIsBatchMode] = useState(false)

  const activePalette = palettes.find(p => p.id === activePaletteId) || palettes[0]

  const exportContent = useMemo(() => {
    if (!activePalette) return '请先创建或选择一个调色板'

    switch (format) {
      case 'css': return generateCss(activePalette, cssPrefix)
      case 'css-theme': return generateCssTheme(activePalette, cssPrefix)
      case 'css-classes': return generateCssClasses(activePalette, cssPrefix)
      case 'scss': return generateScss(activePalette)
      case 'less': return generateLess(activePalette)
      case 'stylus': return generateStylus(activePalette)
      case 'tailwind': return generateTailwind(activePalette)
      case 'styled-components': return generateStyledComponents(activePalette)
      case 'js-theme': return generateJsTheme(activePalette)
      case 'ts-theme': return generateTsTheme(activePalette)
      case 'design-tokens': return generateDesignTokens(activePalette)
      case 'svg': return generateSvg(activePalette)
      case 'json': return generateJson(activePalette)
      default: return ''
    }
  }, [activePalette, format, cssPrefix])

  const copyToClipboard = async () => {
    if (!activePalette) return
    await navigator.clipboard.writeText(exportContent)
    setCopied(true)
    showToast(`已复制 ${formatLabels[format]} 代码`, 'success')
    setTimeout(() => setCopied(false), 2000)
  }

  const exportFile = async () => {
    if (!activePalette) return
    const api = window.electronAPI
    if (!api) {
      const blob = new Blob([exportContent], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = getFileName(activePalette, format)
      a.click()
      URL.revokeObjectURL(url)
      showToast('文件已下载', 'success')
      return
    }

    const filterMap: Record<ExportFormat, { name: string; extensions: string[] }> = {
      css: { name: 'CSS', extensions: ['css'] },
      'css-theme': { name: 'CSS', extensions: ['css'] },
      'css-classes': { name: 'CSS', extensions: ['css'] },
      scss: { name: 'SCSS', extensions: ['scss'] },
      less: { name: 'LESS', extensions: ['less'] },
      stylus: { name: 'Stylus', extensions: ['styl'] },
      tailwind: { name: 'JavaScript', extensions: ['js'] },
      'styled-components': { name: 'TypeScript', extensions: ['ts'] },
      'js-theme': { name: 'JavaScript', extensions: ['js'] },
      'ts-theme': { name: 'TypeScript', extensions: ['ts'] },
      'design-tokens': { name: 'JSON', extensions: ['json'] },
      svg: { name: 'SVG', extensions: ['svg'] },
      json: { name: 'JSON', extensions: ['json'] },
    }

    const result = await api.dialog.saveFile({
      defaultName: getFileName(activePalette, format),
      content: exportContent,
      filters: [filterMap[format]],
    })

    if (result.success) {
      showToast(`已导出到: ${result.path}`, 'success')
    }
  }

  const toggleFormat = (f: ExportFormat) => {
    setSelectedFormats(prev => {
      const next = new Set(prev)
      if (next.has(f)) next.delete(f)
      else next.add(f)
      return next
    })
  }

  const toggleAllFormats = () => {
    if (selectedFormats.size === formatOptions.length) {
      setSelectedFormats(new Set())
    } else {
      setSelectedFormats(new Set(formatOptions.map(o => o.id)))
    }
  }

  const presetFrontend = () => {
    setSelectedFormats(new Set(['css', 'css-theme', 'scss', 'tailwind', 'styled-components', 'ts-theme', 'design-tokens', 'json']))
  }

  const presetBasic = () => {
    setSelectedFormats(new Set(['css', 'scss', 'json']))
  }

  const presetAll = () => {
    toggleAllFormats()
  }

  const batchExport = async () => {
    if (!activePalette) return
    if (selectedFormats.size === 0) {
      showToast('请至少选择一种导出格式', 'error')
      return
    }

    const api = window.electronAPI

    const toGenerate: { format: ExportFormat; fileName: string; content: string; filter: { name: string; extensions: string[] } }[] = []

    const filterMap: Record<ExportFormat, { name: string; extensions: string[] }> = {
      css: { name: 'CSS', extensions: ['css'] },
      'css-theme': { name: 'CSS', extensions: ['css'] },
      'css-classes': { name: 'CSS', extensions: ['css'] },
      scss: { name: 'SCSS', extensions: ['scss'] },
      less: { name: 'LESS', extensions: ['less'] },
      stylus: { name: 'Stylus', extensions: ['styl'] },
      tailwind: { name: 'JavaScript', extensions: ['js'] },
      'styled-components': { name: 'TypeScript', extensions: ['ts'] },
      'js-theme': { name: 'JavaScript', extensions: ['js'] },
      'ts-theme': { name: 'TypeScript', extensions: ['ts'] },
      'design-tokens': { name: 'JSON', extensions: ['json'] },
      svg: { name: 'SVG', extensions: ['svg'] },
      json: { name: 'JSON', extensions: ['json'] },
    }

    const getContentFor = (f: ExportFormat): string => {
      switch (f) {
        case 'css': return generateCss(activePalette, cssPrefix)
        case 'css-theme': return generateCssTheme(activePalette, cssPrefix)
        case 'css-classes': return generateCssClasses(activePalette, cssPrefix)
        case 'scss': return generateScss(activePalette)
        case 'less': return generateLess(activePalette)
        case 'stylus': return generateStylus(activePalette)
        case 'tailwind': return generateTailwind(activePalette)
        case 'styled-components': return generateStyledComponents(activePalette)
        case 'js-theme': return generateJsTheme(activePalette)
        case 'ts-theme': return generateTsTheme(activePalette)
        case 'design-tokens': return generateDesignTokens(activePalette)
        case 'svg': return generateSvg(activePalette)
        case 'json': return generateJson(activePalette)
        default: return ''
      }
    }

    selectedFormats.forEach(f => {
      toGenerate.push({
        format: f,
        fileName: getFileName(activePalette, f),
        content: getContentFor(f),
        filter: filterMap[f],
      })
    })

    let readme: { fileName: string; content: string } | null = null
    if (includeReadme) {
      readme = {
        fileName: 'README.md',
        content: generateReadme(activePalette),
      }
    }

    if (!api) {
      let count = 0
      const doDownload = (fileName: string, content: string, type: string = 'text/plain') => {
        const blob = new Blob([content], { type })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = fileName
        a.click()
        URL.revokeObjectURL(url)
        count++
      }

      toGenerate.forEach(t => doDownload(t.fileName, t.content))
      if (readme) doDownload(readme.fileName, readme.content, 'text/markdown')

      showToast(`已下载 ${count} 个文件`, 'success')
      return
    }

    const { dialog } = api
    const first = toGenerate[0]
    const dirPath = first.fileName.replace(/^.*[\\/]/, '')
    const defaultBase = `${slug(activePalette.name) || 'palette'}-palette`

    const firstResult = await dialog.saveFile({
      defaultName: `${defaultBase}/${first.fileName}`,
      content: first.content,
      filters: [first.filter],
    })

    if (!firstResult.success) {
      if (firstResult.path) {
        showToast('导出已取消', 'info')
      }
      return
    }

    const savedDir = firstResult.path?.replace(/[\\/][^\\/]*$/, '')
    if (!savedDir) {
      showToast('无法确定保存目录', 'error')
      return
    }

    let successCount = 1

    for (let i = 1; i < toGenerate.length; i++) {
      const t = toGenerate[i]
      const targetPath = `${savedDir}\\${t.fileName}`
      try {
        await (window as any).electronAPI.dialog.saveFile({
          defaultName: t.fileName,
          content: t.content,
          filters: [t.filter],
        })
        successCount++
      } catch {
      }
    }

    if (readme) {
      try {
        await (window as any).electronAPI.dialog.saveFile({
          defaultName: 'README.md',
          content: readme.content,
          filters: [{ name: 'Markdown', extensions: ['md'] }],
        })
        successCount++
      } catch {
      }
    }

    showToast(`导出完成，共 ${successCount} 个文件（目录：${savedDir}）`, 'success')
  }

  const getFileName = (palette: ColorPalette, fmt: ExportFormat): string => {
    const name = slug(palette.name) || 'palette'
    const extMap: Record<ExportFormat, string> = {
      css: 'css',
      'css-theme': 'css',
      'css-classes': 'css',
      scss: 'scss',
      less: 'less',
      stylus: 'styl',
      tailwind: 'js',
      'styled-components': 'ts',
      'js-theme': 'js',
      'ts-theme': 'ts',
      'design-tokens': 'json',
      svg: 'svg',
      json: 'json',
    }
    return `${name}-${fmt}.${extMap[fmt]}`
  }

  const formatLabels: Record<ExportFormat, string> = {
    css: 'CSS 变量',
    'css-theme': 'CSS 主题',
    'css-classes': 'CSS 类',
    scss: 'SCSS',
    less: 'Less',
    stylus: 'Stylus',
    tailwind: 'Tailwind',
    'styled-components': 'Styled',
    'js-theme': 'JS 主题',
    'ts-theme': 'TS 主题',
    'design-tokens': 'Tokens',
    svg: 'SVG 色板',
    json: 'JSON',
  }

  const formatOptions: { id: ExportFormat; label: string; icon: string }[] = [
    { id: 'css', label: 'CSS 变量', icon: '🎨' },
    { id: 'css-theme', label: 'CSS 主题', icon: '🌟' },
    { id: 'css-classes', label: 'CSS 类', icon: '✨' },
    { id: 'scss', label: 'SCSS', icon: '💅' },
    { id: 'less', label: 'Less', icon: '📐' },
    { id: 'stylus', label: 'Stylus', icon: '✒️' },
    { id: 'tailwind', label: 'Tailwind', icon: '🌊' },
    { id: 'styled-components', label: 'Styled', icon: '💄' },
    { id: 'js-theme', label: 'JS 主题', icon: '📜' },
    { id: 'ts-theme', label: 'TS 主题', icon: '📘' },
    { id: 'design-tokens', label: 'Tokens', icon: '🔷' },
    { id: 'svg', label: 'SVG 色板', icon: '🖼️' },
    { id: 'json', label: 'JSON', icon: '📄' },
  ]

  const formatDescription: Record<ExportFormat, string> = {
    css: '现代 CSS 自定义属性，适用于所有现代浏览器，通过 var() 引用',
    'css-theme': '语义化 CSS 主题变量，含 primary/secondary/success/warning/error 等语义 Token',
    'css-classes': '开箱即用的 CSS 工具类，直接在 HTML 中使用 class 名称',
    scss: 'Sass/SCSS 变量和颜色 Map，支持 map-get() 函数访问',
    less: 'Less 预处理器变量，兼容 Less.js 构建环境',
    stylus: 'Stylus 变量语法，简洁的缩进式风格',
    tailwind: 'Tailwind CSS 配置片段，可直接合并到 tailwind.config.js',
    'styled-components': 'styled-components / emotion 主题对象，配合 ThemeProvider 使用',
    'js-theme': 'JavaScript 主题对象，可直接 import 到任意前端项目',
    'ts-theme': 'TypeScript 主题对象，带完整类型定义和接口声明',
    'design-tokens': '符合 W3C Design Tokens 标准的 JSON 格式，跨工具协作',
    svg: '可视化 SVG 色板文件，可嵌入设计稿或在线预览',
    json: '结构化 JSON 数据，适合程序读取和跨工具使用',
  }

  return (
    <div>
      <div className="card">
        <h2 className="card-title">
          <span className="card-title-icon">📤</span>
          调色板导出
        </h2>
        <p className="text-sm text-muted mb-5">
          将调色板导出为多种格式，方便在前端开发、设计工具和跨团队协作中使用。
        </p>

        <div className="grid-2 mb-5">
          <div className="form-group">
            <label className="form-label">选择调色板</label>
            {palettes.length === 0 ? (
              <p className="text-sm text-muted">暂无调色板，请先到「调色板」页面创建</p>
            ) : (
              <select
                className="form-input"
                value={activePalette?.id || ''}
                onChange={e => setActivePalette(e.target.value)}
              >
                {palettes.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.colors.length} 色)
                  </option>
                ))}
              </select>
            )}
          </div>

          {(format === 'css' || format === 'css-theme' || format === 'css-classes') && (
            <div className="form-group">
              <label className="form-label">CSS 变量 / 类名 前缀</label>
              <input
                className="form-input font-mono"
                placeholder="color"
                value={cssPrefix}
                onChange={e => setCssPrefix(e.target.value)}
              />
              <p className="text-xs text-muted mt-2">
                例: <code className="font-mono">--{cssPrefix}-primary</code> / <code className="font-mono">.bg-{cssPrefix}-primary</code>
              </p>
            </div>
          )}
        </div>

        <div
          className="flex gap-2 mb-3"
          style={{
            padding: '8px',
            background: 'var(--bg-secondary)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border)',
            width: 'fit-content',
          }}
        >
          <button
            className={`btn ${!isBatchMode ? 'btn-primary' : 'btn-ghost'} btn-sm`}
            onClick={() => setIsBatchMode(false)}
          >
            📄 单格式导出
          </button>
          <button
            className={`btn ${isBatchMode ? 'btn-primary' : 'btn-ghost'} btn-sm`}
            onClick={() => setIsBatchMode(true)}
          >
            📦 打包交付
          </button>
        </div>

        {!isBatchMode ? (
          <>
            <div className="export-tabs" style={{ flexWrap: 'wrap' }}>
              {formatOptions.map(opt => (
                <button
                  key={opt.id}
                  className={`export-tab ${format === opt.id ? 'active' : ''}`}
                  onClick={() => setFormat(opt.id)}
                >
                  <span className="mr-1">{opt.icon}</span>
                  {opt.label}
                </button>
              ))}
            </div>

            {activePalette && (
              <div
                className="text-sm text-muted mb-3"
                style={{ padding: '8px 12px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)' }}
              >
                💡 {formatDescription[format]}
              </div>
            )}

            <div
              className="code-preview"
              style={{
                whiteSpace: format === 'svg' ? 'pre' : 'pre-wrap',
                position: 'relative',
              }}
            >
              {exportContent}
            </div>

            <div className="flex gap-3 mt-5">
              <button className="btn btn-primary" onClick={copyToClipboard}>
                {copied ? '✅ 已复制' : '📋 复制代码'}
              </button>
              <button className="btn btn-secondary" onClick={exportFile}>
                💾 导出为文件
              </button>
              {activePalette && (
                <div
                  className="text-sm text-muted"
                  style={{ alignSelf: 'center', marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: '11px' }}
                >
                  文件名: {getFileName(activePalette, format)}
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <div
              style={{
                padding: '16px 20px',
                background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.08), rgba(59, 130, 246, 0.08))',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)',
                marginBottom: '20px',
              }}
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-sm mb-1">📦 调色板交付包导出</h3>
                  <div className="text-xs text-muted">一次选择多种格式，打包导出给前端和设计同事，可勾选常用格式，配合 README 直接交付</div>
                </div>
                <div className="text-xs text-muted">
                  已选 <strong style={{ color: 'var(--accent-primary)' }}>{selectedFormats.size}</strong>
                  种格式
                  {includeReadme ? ' + README' : ''}
                </div>
              </div>

              <div className="flex items-center gap-2 mb-4 flex-wrap">
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={presetBasic}
                  title="CSS + SCSS + JSON"
                >
                  🎯 基础
                </button>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={presetFrontend}
                  title="前端开发常用格式"
                >
                  ⚛️ 前端常用
                </button>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={presetAll}
                  title="勾选/取消全部"
                >
                  🎛️ 全部
                </button>
                <label className="flex items-center gap-2 ml-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeReadme}
                    onChange={e => setIncludeReadme(e.target.checked)}
                    style={{ accentColor: 'var(--accent-primary)' }}
                  />
                  <span className="text-xs">包含 README 说明</span>
                </label>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                  gap: '8px',
                }}
              >
                {formatOptions.map(opt => {
                  const checked = selectedFormats.has(opt.id)
                  return (
                    <label
                      key={opt.id}
                      className="flex items-center gap-2 p-3 cursor-pointer"
                      style={{
                        background: checked ? 'rgba(139, 92, 246, 0.1)' : 'var(--bg-primary)',
                        borderRadius: 'var(--radius-sm)',
                        border: checked ? '1.5px solid var(--accent-primary)' : '1px solid var(--border-light)',
                        transition: 'all 0.15s',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleFormat(opt.id)}
                        style={{ accentColor: 'var(--accent-primary)' }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          className="text-sm font-medium"
                          style={{ color: checked ? 'var(--accent-primary)' : 'var(--text-primary)' }}
                        >
                          {opt.icon} {opt.label}
                        </div>
                        <div
                          className="text-xs truncate"
                          style={{ color: 'var(--text-muted)' }}
                          title={formatDescription[opt.id]}
                        >
                          {formatDescription[opt.id].slice(0, 20)}...
                        </div>
                      </div>
                    </label>
                  )
                })}
              </div>

              {(format === 'css' || format === 'css-theme' || format === 'css-classes' ||
                selectedFormats.has('css') || selectedFormats.has('css-theme') ||
                selectedFormats.has('css-classes')) && (
                  <div className="form-group mt-4">
                    <label className="form-label text-xs">CSS 变量 / 类名 前缀</label>
                    <input
                      className="form-input font-mono"
                      placeholder="color"
                      value={cssPrefix}
                      onChange={e => setCssPrefix(e.target.value)}
                      style={{ maxWidth: '260px', padding: '6px 10px', fontSize: '12px' }}
                    />
                  </div>
                )
              }
            </div>

            {activePalette && includeReadme && (
              <div className="mb-4">
                <h3
                  className="font-semibold text-sm mb-2"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  📄 README 预览
                </h3>
                <div
                  className="code-preview"
                  style={{
                    maxHeight: '240px',
                    overflow: 'auto',
                    fontSize: '12px',
                    lineHeight: 1.5,
                  }}
                >
                  {generateReadme(activePalette)}
                </div>
              </div>
            )}

            <div className="flex gap-3 mt-4">
              <button
                className="btn btn-primary"
                onClick={batchExport}
                disabled={selectedFormats.size === 0}
              >
                📦 打包导出（{selectedFormats.size}{includeReadme ? ' +1' : ''} 个文件）
              </button>
              {activePalette && selectedFormats.size > 0 && (
                <div
                  className="text-xs text-muted"
                  style={{ alignSelf: 'center', fontFamily: 'var(--font-mono)' }}
                >
                  目录: {slug(activePalette.name) || 'palette'}-palette/
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {activePalette && (
        <div className="card">
          <h2 className="card-title">
            <span className="card-title-icon">👀</span>
            调色板预览
            <span className="badge">{activePalette.colors.length} 色</span>
          </h2>

          {activePalette.colors.length === 0 ? (
            <p className="text-muted text-sm">此调色板暂无颜色</p>
          ) : (
            <>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: `repeat(${Math.min(activePalette.colors.length, 8)}, 1fr)`,
                  gap: '8px',
                  marginBottom: '24px',
                  borderRadius: 'var(--radius-md)',
                  overflow: 'hidden',
                }}
              >
                {activePalette.colors.map((c: PaletteColor) => (
                  <div
                    key={c.id}
                    style={{
                      aspectRatio: '1',
                      background: c.hex,
                      cursor: 'pointer',
                      transition: 'transform 0.2s',
                    }}
                    title={`${c.hex}${c.name ? ` - ${c.name}` : ''}${c.sourceImage ? ` (来源: ${c.sourceImage})` : ''}`}
                    onClick={async () => {
                      await navigator.clipboard.writeText(c.hex)
                      showToast(`已复制 ${c.hex}`, 'success')
                    }}
                  />
                ))}
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-light)' }}>
                      <th style={{ textAlign: 'left', padding: '10px 12px', fontSize: '12px', color: 'var(--text-muted)' }}>#</th>
                      <th style={{ textAlign: 'left', padding: '10px 12px', fontSize: '12px', color: 'var(--text-muted)' }}>色值</th>
                      <th style={{ textAlign: 'left', padding: '10px 12px', fontSize: '12px', color: 'var(--text-muted)' }}>名称</th>
                      <th style={{ textAlign: 'left', padding: '10px 12px', fontSize: '12px', color: 'var(--text-muted)' }}>HEX</th>
                      <th style={{ textAlign: 'left', padding: '10px 12px', fontSize: '12px', color: 'var(--text-muted)' }}>备注</th>
                      <th style={{ textAlign: 'left', padding: '10px 12px', fontSize: '12px', color: 'var(--text-muted)' }}>来源</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activePalette.colors.map((c: PaletteColor, idx: number) => (
                      <tr
                        key={c.id}
                        style={{
                          borderBottom: '1px solid var(--border-light)',
                          cursor: 'pointer',
                        }}
                        onClick={async () => {
                          await navigator.clipboard.writeText(c.hex)
                          showToast(`已复制 ${c.hex}`, 'success')
                        }}
                      >
                        <td style={{ padding: '10px 12px', fontSize: '12px', color: 'var(--text-muted)' }}>
                          {idx + 1}
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <div
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '8px',
                              background: c.hex,
                              border: '1px solid var(--border-light)',
                            }}
                          />
                        </td>
                        <td style={{ padding: '10px 12px', fontSize: '13px', fontWeight: 500 }}>
                          {c.name || '—'}
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <code className="font-mono" style={{ fontSize: '12px' }}>{c.hex}</code>
                        </td>
                        <td style={{ padding: '10px 12px', fontSize: '12px', color: 'var(--text-muted)', maxWidth: '250px' }}>
                          {c.note || '—'}
                        </td>
                        <td style={{ padding: '10px 12px', fontSize: '11px', color: 'var(--text-muted)' }}>
                          {c.sourceImage || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      <div className="card">
        <h2 className="card-title">
          <span className="card-title-icon">📖</span>
          格式说明
        </h2>
        <div className="grid-4" style={{ fontSize: '13px' }}>
          {[
            { icon: '🎨', title: 'CSS Variables', desc: '现代 CSS 自定义属性', code: '--color-primary: #8B5CF6;' },
            { icon: '✨', title: 'CSS Classes', desc: '开箱即用的工具类', code: '.text-primary { color: ... }' },
            { icon: '💅', title: 'SCSS', desc: 'Sass 预处理器变量', code: '$primary: #8B5CF6;' },
            { icon: '🌊', title: 'Tailwind', desc: 'Tailwind 配置片段', code: "'primary': '#8B5CF6'" },
          ].map(item => (
            <div
              key={item.title}
              style={{
                background: 'var(--bg-secondary)',
                padding: '16px',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <span>{item.icon}</span>
                <h4 className="font-semibold">{item.title}</h4>
              </div>
              <p className="text-muted mb-3" style={{ fontSize: '12px' }}>{item.desc}</p>
              <code className="font-mono text-xs text-muted">
                {item.code}
              </code>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
