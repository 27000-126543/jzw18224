import { useState, useMemo } from 'react'
import { useAppStore } from '../store/useAppStore'
import type { ColorPalette, PaletteColor } from '../types'
import { toKebabCase } from '../utils/stringUtils'

interface Props {
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void
}

type ExportFormat = 'css' | 'scss' | 'svg' | 'json' | 'tailwind'

const slug = (s: string) =>
  s.toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')

const generateCss = (palette: ColorPalette, prefix: string = 'color'): string => {
  const varName = (name?: string, hex?: string, idx?: number) => {
    if (name) return toKebabCase(name)
    return `${slug(palette.name)}-${idx ?? 0}`
  }

  const lines: string[] = []
  lines.push(`/* ========================================`)
  lines.push(`   Palette: ${palette.name}`)
  lines.push(`   Generated: ${new Date().toISOString()}`)
  lines.push(`   Colors: ${palette.colors.length}`)
  lines.push(`   ======================================== */`)
  lines.push('')
  lines.push(':root {')

  palette.colors.forEach((c: PaletteColor, i: number) => {
    const name = varName(c.name, c.hex, i)
    lines.push(`  --${prefix}-${name}: ${c.hex};`)
    if (c.note) lines.push(`  /* ${c.note} */`)
  })

  lines.push('}')
  lines.push('')
  lines.push('/* Usage example:')
  lines.push(`   .text-primary { color: var(--${prefix}-${varName(palette.colors[0]?.name, palette.colors[0]?.hex, 0)}); }`)
  lines.push('*/')

  return lines.join('\n')
}

const generateScss = (palette: ColorPalette): string => {
  const varName = (name?: string, idx?: number) => {
    if (name) return toKebabCase(name)
    return `${slug(palette.name)}-${idx ?? 0}`
  }

  const lines: string[] = []
  lines.push(`// ========================================`)
  lines.push(`// Palette: ${palette.name}`)
  lines.push(`// Generated: ${new Date().toISOString()}`)
  lines.push(`// ========================================`)
  lines.push('')

  palette.colors.forEach((c: PaletteColor, i: number) => {
    const name = varName(c.name, i)
    lines.push(`$${name}: ${c.hex};${c.note ? ` // ${c.note}` : ''}`)
  })

  lines.push('')
  lines.push(`$${slug(palette.name)}-map: (`)
  palette.colors.forEach((c: PaletteColor, i: number) => {
    const name = varName(c.name, i)
    lines.push(`  '${name}': $${name}${i < palette.colors.length - 1 ? ',' : ''}`)
  })
  lines.push(');')

  return lines.join('\n')
}

const generateSvg = (palette: ColorPalette): string => {
  const swatchW = 200
  const swatchH = 120
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
    colors: palette.colors.map((c: PaletteColor, i: number) => ({
      name: c.name || `color-${i + 1}`,
      hex: c.hex,
      rgb: {
        r: parseInt(c.hex.slice(1, 3), 16),
        g: parseInt(c.hex.slice(3, 5), 16),
        b: parseInt(c.hex.slice(5, 7), 16),
      },
      note: c.note || null,
    })),
  }
  return JSON.stringify(data, null, 2)
}

const generateTailwind = (palette: ColorPalette): string => {
  const name = (n?: string, i?: number) => {
    if (n) return toKebabCase(n).replace(/[^a-z0-9-]/g, '')
    return `color-${i! + 1}`
  }

  const lines: string[] = []
  lines.push(`// tailwind.config.js snippet for: ${palette.name}`)
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
  lines.push(`// Usage: bg-${slug(palette.name)}-${name(palette.colors[0]?.name, 0)}`)

  return lines.join('\n')
}

export default function ExportTab({ showToast }: Props) {
  const { palettes, activePaletteId, setActivePalette } = useAppStore()
  const [format, setFormat] = useState<ExportFormat>('css')
  const [cssPrefix, setCssPrefix] = useState('color')

  const activePalette = palettes.find(p => p.id === activePaletteId) || palettes[0]

  const exportContent = useMemo(() => {
    if (!activePalette) return '请先创建或选择一个调色板'

    switch (format) {
      case 'css': return generateCss(activePalette, cssPrefix)
      case 'scss': return generateScss(activePalette)
      case 'svg': return generateSvg(activePalette)
      case 'json': return generateJson(activePalette)
      case 'tailwind': return generateTailwind(activePalette)
      default: return ''
    }
  }, [activePalette, format, cssPrefix])

  const copyToClipboard = async () => {
    if (!activePalette) return
    await navigator.clipboard.writeText(exportContent)
    showToast(`已复制 ${format.toUpperCase()} 代码`, 'success')
  }

  const exportFile = async () => {
    if (!activePalette) return
    const api = window.electronAPI
    if (!api) return

    const extMap: Record<ExportFormat, string> = {
      css: 'css',
      scss: 'scss',
      svg: 'svg',
      json: 'json',
      tailwind: 'js',
    }

    const filterMap: Record<ExportFormat, { name: string; extensions: string[] }> = {
      css: { name: 'CSS', extensions: ['css'] },
      scss: { name: 'SCSS', extensions: ['scss'] },
      svg: { name: 'SVG', extensions: ['svg'] },
      json: { name: 'JSON', extensions: ['json'] },
      tailwind: { name: 'JavaScript', extensions: ['js'] },
    }

    const name = slug(activePalette.name) || 'palette'
    const result = await api.dialog.saveFile({
      defaultName: `${name}.${extMap[format]}`,
      content: exportContent,
      filters: [filterMap[format]],
    })

    if (result.success) {
      showToast(`已导出到: ${result.path}`, 'success')
    }
  }

  const formatOptions: { id: ExportFormat; label: string; icon: string }[] = [
    { id: 'css', label: 'CSS Variables', icon: '🎨' },
    { id: 'scss', label: 'SCSS Variables', icon: '💅' },
    { id: 'tailwind', label: 'Tailwind Config', icon: '🌊' },
    { id: 'svg', label: 'SVG Swatches', icon: '🖼️' },
    { id: 'json', label: 'JSON Data', icon: '📄' },
  ]

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

          {format === 'css' && (
            <div className="form-group">
              <label className="form-label">CSS 变量前缀</label>
              <input
                className="form-input font-mono"
                placeholder="color"
                value={cssPrefix}
                onChange={e => setCssPrefix(e.target.value)}
              />
              <p className="text-xs text-muted mt-2">
                例: <code className="font-mono">--{cssPrefix}-primary</code>
              </p>
            </div>
          )}
        </div>

        <div className="export-tabs">
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

        <div className="code-preview" style={{ whiteSpace: format === 'svg' ? 'pre' : 'pre-wrap' }}>
          {exportContent}
        </div>

        <div className="flex gap-3 mt-5">
          <button className="btn btn-primary" onClick={copyToClipboard}>
            📋 复制代码
          </button>
          <button className="btn btn-secondary" onClick={exportFile}>
            💾 导出为文件
          </button>
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
                    title={`${c.hex}${c.name ? ` - ${c.name}` : ''}`}
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
                      <th style={{ textAlign: 'left', padding: '10px 12px', fontSize: '12px', color: 'var(--text-muted)' }}>色值</th>
                      <th style={{ textAlign: 'left', padding: '10px 12px', fontSize: '12px', color: 'var(--text-muted)' }}>名称</th>
                      <th style={{ textAlign: 'left', padding: '10px 12px', fontSize: '12px', color: 'var(--text-muted)' }}>HEX</th>
                      <th style={{ textAlign: 'left', padding: '10px 12px', fontSize: '12px', color: 'var(--text-muted)' }}>备注</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activePalette.colors.map((c: PaletteColor) => (
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
                        <td style={{ padding: '10px 12px', fontSize: '12px', color: 'var(--text-muted)', maxWidth: '300px' }}>
                          {c.note || '—'}
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
        <div className="grid-3" style={{ fontSize: '13px' }}>
          <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: 'var(--radius-md)' }}>
            <h4 className="font-semibold mb-2">🎨 CSS Variables</h4>
            <p className="text-muted mb-3">现代 CSS 自定义属性，适用于所有现代浏览器。</p>
            <code className="font-mono text-xs text-muted">
              --color-primary: #8B5CF6;
            </code>
          </div>
          <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: 'var(--radius-md)' }}>
            <h4 className="font-semibold mb-2">💅 SCSS Variables</h4>
            <p className="text-muted mb-3">Sass/SCSS 预处理器变量，包含 map 数据结构。</p>
            <code className="font-mono text-xs text-muted">
              $primary: #8B5CF6;
            </code>
          </div>
          <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: 'var(--radius-md)' }}>
            <h4 className="font-semibold mb-2">🖼️ SVG Swatches</h4>
            <p className="text-muted mb-3">可视化色板文件，可嵌入设计稿或在线查看。</p>
            <code className="font-mono text-xs text-muted">
              矢量图形格式
            </code>
          </div>
        </div>
      </div>
    </div>
  )
}
