import { useState, useMemo, useCallback } from 'react'
import { useAppStore } from '../store/useAppStore'
import {
  getAllFormats,
  formatRgbString,
  formatHslString,
  formatHsbString,
  formatHsvString,
  formatCmykString,
  formatRgbaString,
  formatHexString,
  formatHex8String,
  generateComplementary,
  generateAnalogous,
  generateTriadic,
  generateMonochromatic,
  generateShades,
  hslToRgb,
  rgbToHex,
  hsbToRgb,
  hexToRgb,
  isValidHex,
} from '../utils/colorUtils'

interface Props {
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void
}

type SchemeType = 'complementary' | 'analogous' | 'triadic' | 'monochromatic' | 'shades'

interface ColorFormatItem {
  id: string
  label: string
  value: string
  copyValue: string
  hint?: string
}

export default function ColorPickerTab({ showToast }: Props) {
  const { currentColor, history, removeFromHistory, clearHistory, addToHistory, setCurrentColor } = useAppStore()
  const [copiedFormat, setCopiedFormat] = useState<string | null>(null)
  const [schemeType, setSchemeType] = useState<SchemeType>('analogous')
  const [manualHex, setManualHex] = useState('')

  const color = currentColor?.hex || '#8B5CF6'

  const formats = useMemo(() => getAllFormats(color), [color])

  const schemeColors = useMemo(() => {
    switch (schemeType) {
      case 'complementary':
        return generateComplementary(color)
      case 'analogous':
        return generateAnalogous(color)
      case 'triadic':
        return generateTriadic(color)
      case 'monochromatic':
        return generateMonochromatic(color)
      case 'shades':
        return generateShades(color)
      default:
        return []
    }
  }, [color, schemeType])

  const colorFormats = useMemo((): ColorFormatItem[] => {
    const hex = formatHexString(formats.hex)
    const hexLower = formatHexString(formats.hex, true, false)
    const hexNoHash = formatHexString(formats.hex, false)
    const rgb = formatRgbString(formats.rgb)
    const hsl = formatHslString(formats.hsl)
    const hsb = formatHsbString(formats.hsb)
    const hsv = formatHsvString(formats.hsb)
    const cmyk = formatCmykString(formats.cmyk)
    const rgba = formatRgbaString(formats.rgba)
    const hex8 = formatHex8String(formats.hex, 1)

    const rgbCss = `color: ${rgb};`
    const hexCss = `color: ${hex};`

    return [
      { id: 'hex', label: 'HEX', value: hex, copyValue: hex, hint: '6位大写，带 #' },
      { id: 'hex-lower', label: 'HEX (小写)', value: hexLower, copyValue: hexLower, hint: '6位小写，带 #' },
      { id: 'hex-nohash', label: 'HEX (无 #)', value: hexNoHash, copyValue: hexNoHash, hint: '6位，无井号' },
      { id: 'hex8', label: 'HEX8 (含Alpha)', value: hex8, copyValue: hex8, hint: '8位含透明度' },
      { id: 'rgb', label: 'RGB', value: rgb, copyValue: rgb, hint: 'CSS rgb() 格式' },
      { id: 'rgba', label: 'RGBA', value: rgba, copyValue: rgba, hint: 'CSS rgba() 格式' },
      { id: 'hsl', label: 'HSL', value: hsl, copyValue: hsl, hint: 'CSS hsl() 格式' },
      { id: 'hsb', label: 'HSB', value: hsb, copyValue: hsb, hint: '色相/饱和度/明度' },
      { id: 'hsv', label: 'HSV', value: hsv, copyValue: hsv, hint: '同 HSB，另一命名' },
      { id: 'cmyk', label: 'CMYK', value: cmyk, copyValue: cmyk, hint: '印刷四色模式' },
      { id: 'rgb-values', label: 'RGB 数值', value: `${formats.rgb.r}, ${formats.rgb.g}, ${formats.rgb.b}`, copyValue: `${formats.rgb.r}, ${formats.rgb.g}, ${formats.rgb.b}`, hint: '纯数字，逗号分隔' },
      { id: 'css-color', label: 'CSS 声明', value: hexCss, copyValue: hexCss, hint: '直接粘贴到样式表' },
    ]
  }, [formats])

  const handleStartPicker = async () => {
    try {
      const api = window.electronAPI
      if (api) {
        await api.picker.start()
      } else {
        showToast('此功能需在 Electron 环境中运行', 'error')
      }
    } catch {
      showToast('无法启动取色器', 'error')
    }
  }

  const copyToClipboard = useCallback(async (text: string, format: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedFormat(format)
      showToast(`已复制 ${format}`, 'success')
      setTimeout(() => setCopiedFormat(null), 1500)
    } catch {
      showToast('复制失败', 'error')
    }
  }, [showToast])

  const handleSchemeColorClick = (hex: string) => {
    const rgb = hexToRgb(hex)
    const newColor = {
      r: rgb.r,
      g: rgb.g,
      b: rgb.b,
      hex,
      timestamp: Date.now(),
    }
    setCurrentColor(newColor)
    addToHistory(newColor)
    showToast(`已选择 ${hex}`, 'success')
  }

  const applyManualColor = () => {
    if (!isValidHex(manualHex)) {
      showToast('无效的 HEX 颜色值', 'error')
      return
    }
    const rgb = hexToRgb(manualHex.startsWith('#') ? manualHex : '#' + manualHex)
    const newColor = {
      r: rgb.r,
      g: rgb.g,
      b: rgb.b,
      hex: rgbToHex(rgb.r, rgb.g, rgb.b),
      timestamp: Date.now(),
    }
    setCurrentColor(newColor)
    addToHistory(newColor)
    showToast(`已应用颜色 ${newColor.hex}`, 'success')
    setManualHex('')
  }

  const handleHistoryClick = (c: typeof history[0]) => {
    setCurrentColor(c)
    showToast(`已恢复颜色 ${c.hex}`, 'info')
  }

  return (
    <div>
      <div className="grid-2">
        <div className="card">
          <h2 className="card-title">
            <span className="card-title-icon">🎯</span>
            屏幕取色器
          </h2>

          <div style={{ display: 'flex', gap: '24px', alignItems: 'center', marginBottom: '24px' }}>
            <div
              className="color-preview-large"
              style={{ background: color, boxShadow: `0 0 40px ${color}40` }}
            />

            <div style={{ flex: 1 }}>
              <button
                className="btn btn-primary btn-lg w-full mb-3"
                onClick={handleStartPicker}
              >
                <span>🖱️</span>
                开始屏幕取色
              </button>
              <div className="text-xs text-muted mb-3">
                {currentColor?.x !== undefined && currentColor?.y !== undefined && (
                  <span className="font-mono">
                    📍 坐标: ({currentColor.x}, {currentColor.y})
                  </span>
                )}
              </div>

              <div className="section-divider" />

              <div className="color-input-row mb-3">
                <input
                  type="color"
                  className="color-picker-input"
                  value={color}
                  onChange={(e) => {
                    const rgb = hexToRgb(e.target.value)
                    setCurrentColor({ r: rgb.r, g: rgb.g, b: rgb.b, hex: e.target.value, timestamp: Date.now() })
                  }}
                />
                <div style={{ flex: 1 }}>
                  <label className="form-label">手动输入 HEX</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      className="form-input font-mono"
                      placeholder="#FF0000"
                      value={manualHex}
                      onChange={(e) => setManualHex(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && applyManualColor()}
                      style={{ textTransform: 'uppercase' }}
                    />
                    <button className="btn btn-secondary" onClick={applyManualColor}>
                      应用
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <h3 className="font-semibold mb-3" style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            🎨 颜色格式转换 · 共 {colorFormats.length} 种
          </h3>

          <div className="color-formats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
            {colorFormats.map(item => (
              <div
                key={item.id}
                className="color-format-item"
                onClick={() => copyToClipboard(item.copyValue, item.label)}
                style={{ cursor: 'pointer' }}
                title={item.hint}
              >
                <div className="format-label">
                  {item.label}
                  {item.hint && <span style={{ marginLeft: '6px', fontWeight: 400, opacity: 0.6 }}>· {item.hint}</span>}
                </div>
                <div className="format-value">
                  <span className="font-mono" style={{ fontSize: '12px' }}>{item.value}</span>
                  <button
                    className={`copy-btn ${copiedFormat === item.label ? 'copied' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation()
                      copyToClipboard(item.copyValue, item.label)
                    }}
                  >
                    {copiedFormat === item.label ? '✓' : '复制'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="card">
            <h2 className="card-title">
              <span className="card-title-icon">🌈</span>
              配色方案生成
            </h2>

            <div className="scheme-types">
              <button
                className={`scheme-type-btn ${schemeType === 'analogous' ? 'active' : ''}`}
                onClick={() => setSchemeType('analogous')}
              >
                邻近色
              </button>
              <button
                className={`scheme-type-btn ${schemeType === 'complementary' ? 'active' : ''}`}
                onClick={() => setSchemeType('complementary')}
              >
                互补色
              </button>
              <button
                className={`scheme-type-btn ${schemeType === 'triadic' ? 'active' : ''}`}
                onClick={() => setSchemeType('triadic')}
              >
                三角色
              </button>
              <button
                className={`scheme-type-btn ${schemeType === 'monochromatic' ? 'active' : ''}`}
                onClick={() => setSchemeType('monochromatic')}
              >
                同色系
              </button>
              <button
                className={`scheme-type-btn ${schemeType === 'shades' ? 'active' : ''}`}
                onClick={() => setSchemeType('shades')}
              >
                明度梯级
              </button>
            </div>

            <div className="scheme-colors">
              {schemeColors.map((hex, idx) => (
                <div
                  key={idx}
                  className="scheme-color"
                  style={{ background: hex }}
                  onClick={() => handleSchemeColorClick(hex)}
                  title={`点击选择 ${hex}`}
                >
                  <div className="scheme-color-tooltip">{hex}</div>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted mt-3">点击任意色块可快速应用该颜色</p>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="flex justify-between items-center mb-4">
          <h2 className="card-title mb-0" style={{ marginBottom: 0 }}>
            <span className="card-title-icon">📜</span>
            历史记录
            <span className="badge">{history.length}</span>
          </h2>
          {history.length > 0 && (
            <button className="btn btn-danger btn-sm" onClick={() => {
              clearHistory()
              showToast('已清空历史记录', 'info')
            }}>
              🗑️ 清空全部
            </button>
          )}
        </div>

        {history.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🎨</div>
            <p className="empty-state-text">暂无取色历史</p>
            <p className="empty-state-sub">点击「开始屏幕取色」按钮拾取你的第一个颜色</p>
          </div>
        ) : (
          <div className="history-grid">
            {history.map((c) => (
              <div
                key={c.timestamp}
                className="history-item"
                onClick={() => handleHistoryClick(c)}
              >
                <button
                  className="history-delete"
                  onClick={(e) => {
                    e.stopPropagation()
                    removeFromHistory(c.timestamp!)
                  }}
                >
                  ×
                </button>
                <div
                  className="history-color"
                  style={{ background: c.hex }}
                />
                <div className="history-hex">{c.hex}</div>
                <div className="history-time">
                  {c.timestamp ? new Date(c.timestamp).toLocaleTimeString() : ''}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
