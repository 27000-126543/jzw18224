import { useState, useMemo } from 'react'
import { useAppStore } from '../store/useAppStore'
import type { ColorPalette, PaletteColor } from '../types'
import { hexToRgb } from '../utils/colorUtils'
import { toKebabCase } from '../utils/stringUtils'

interface Props {
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void
}

type ExportFormat = 'css' | 'css-classes' | 'scss' | 'less' | 'stylus' | 'tailwind' | 'svg' | 'json'

const slug = (s: string) =>
  s.toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')

const getVarName = (paletteName: string, colorName?: string, idx?: number): string => {
  if (colorName) return toKebabCase(colorName).replace(/[^a-z0-9-]/g, '')
  return `color-${(idx ?? 0) + 1}`
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

export default function ExportTab({ showToast }: Props) {
  const { palettes, activePaletteId, setActivePalette } = useAppStore()
  const [format, setFormat] = useState<ExportFormat>('css')
  const [cssPrefix, setCssPrefix] = useState('color')
  const [copied, setCopied] = useState(false)

  const activePalette = palettes.find(p => p.id === activePaletteId) || palettes[0]

  const exportContent = useMemo(() => {
    if (!activePalette) return '请先创建或选择一个调色板'

    switch (format) {
      case 'css': return generateCss(activePalette, cssPrefix)
      case 'css-classes': return generateCssClasses(activePalette, cssPrefix)
      case 'scss': return generateScss(activePalette)
      case 'less': return generateLess(activePalette)
      case 'stylus': return generateStylus(activePalette)
      case 'tailwind': return generateTailwind(activePalette)
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
      'css-classes': { name: 'CSS', extensions: ['css'] },
      scss: { name: 'SCSS', extensions: ['scss'] },
      less: { name: 'LESS', extensions: ['less'] },
      stylus: { name: 'Stylus', extensions: ['styl'] },
      tailwind: { name: 'JavaScript', extensions: ['js'] },
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

  const getFileName = (palette: ColorPalette, fmt: ExportFormat): string => {
    const name = slug(palette.name) || 'palette'
    const extMap: Record<ExportFormat, string> = {
      css: 'css',
      'css-classes': 'css',
      scss: 'scss',
      less: 'less',
      stylus: 'styl',
      tailwind: 'js',
      svg: 'svg',
      json: 'json',
    }
    return `${name}-${fmt}.${extMap[fmt]}`
  }

  const formatLabels: Record<ExportFormat, string> = {
    css: 'CSS Variables',
    'css-classes': 'CSS Classes',
    scss: 'SCSS',
    less: 'Less',
    stylus: 'Stylus',
    tailwind: 'Tailwind',
    svg: 'SVG',
    json: 'JSON',
  }

  const formatOptions: { id: ExportFormat; label: string; icon: string }[] = [
    { id: 'css', label: 'CSS 变量', icon: '🎨' },
    { id: 'css-classes', label: 'CSS 类', icon: '✨' },
    { id: 'scss', label: 'SCSS', icon: '💅' },
    { id: 'less', label: 'Less', icon: '�' },
    { id: 'stylus', label: 'Stylus', icon: '✒️' },
    { id: 'tailwind', label: 'Tailwind', icon: '🌊' },
    { id: 'svg', label: 'SVG 色板', icon: '🖼️' },
    { id: 'json', label: 'JSON', icon: '📄' },
  ]

  const formatDescription: Record<ExportFormat, string> = {
    css: '现代 CSS 自定义属性，适用于所有现代浏览器，通过 var() 引用',
    'css-classes': '开箱即用的 CSS 工具类，直接在 HTML 中使用 class 名称',
    scss: 'Sass/SCSS 变量和颜色 Map，支持 map-get() 函数访问',
    less: 'Less 预处理器变量，兼容 Less.js 构建环境',
    stylus: 'Stylus 变量语法，简洁的缩进式风格',
    tailwind: 'Tailwind CSS 配置片段，可直接合并到 tailwind.config.js',
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

          {(format === 'css' || format === 'css-classes') && (
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
