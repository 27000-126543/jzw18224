import { useState, useMemo } from 'react'
import { checkContrast, hexToRgb, getContrastRatio } from '../utils/colorUtils'
import { useAppStore } from '../store/useAppStore'

const PRESET_PAIRS = [
  { name: '深色背景 + 白字', fg: '#FFFFFF', bg: '#111827' },
  { name: '浅色背景 + 黑字', fg: '#111827', bg: '#FFFFFF' },
  { name: '品牌紫 + 白', fg: '#FFFFFF', bg: '#8B5CF6' },
  { name: '品牌蓝 + 白', fg: '#FFFFFF', bg: '#3B82F6' },
  { name: '警告黄 + 黑', fg: '#111827', bg: '#F59E0B' },
  { name: '成功绿 + 白', fg: '#FFFFFF', bg: '#10B981' },
]

function WcagBadge({ pass, label }: { pass: boolean; label: string }) {
  return (
    <div className="wcag-item">
      <div className="wcag-level">{label}</div>
      <div className={`wcag-status ${pass ? 'pass' : 'fail'}`}>
        {pass ? '✓ 通过' : '✗ 不通过'}
      </div>
    </div>
  )
}

export default function ContrastTab() {
  const { currentColor } = useAppStore()
  const [foreground, setForeground] = useState('#FFFFFF')
  const [background, setBackground] = useState('#1A1A2E')

  const swapColors = () => {
    setForeground(background)
    setBackground(foreground)
  }

  const setAsForeground = () => {
    if (currentColor) setForeground(currentColor.hex)
  }
  const setAsBackground = () => {
    if (currentColor) setBackground(currentColor.hex)
  }

  const result = useMemo(
    () => checkContrast(foreground, background),
    [foreground, background]
  )

  const textColorFor = (hex: string) => {
    const contrastWhite = getContrastRatio(hex, '#FFFFFF')
    return contrastWhite >= 4.5 ? '#FFFFFF' : '#111111'
  }

  return (
    <div>
      <div className="card">
        <h2 className="card-title">
          <span className="card-title-icon">📊</span>
          WCAG 无障碍对比度检查
        </h2>
        <p className="text-sm text-muted mb-4">
          根据 WCAG 2.1 标准，检查前景文字色与背景色之间的对比度是否达标。
          普通文本要求 4.5:1 (AA) / 7:1 (AAA)，大号文本要求 3:1 (AA) / 4.5:1 (AAA)。
        </p>

        <div className="grid-2 mb-5">
          <div className="form-group">
            <div className="flex justify-between items-center mb-2">
              <label className="form-label mb-0" style={{ fontSize: '14px', fontWeight: 600 }}>
                🔤 前景色 (文字)
              </label>
              {currentColor && (
                <button className="btn btn-secondary btn-sm" onClick={setAsForeground}>
                  使用当前色 {currentColor.hex}
                </button>
              )}
            </div>
            <div className="color-input-row">
              <input
                type="color"
                className="color-picker-input"
                value={foreground}
                onChange={e => setForeground(e.target.value.toUpperCase())}
              />
              <input
                className="form-input font-mono"
                value={foreground}
                onChange={e => {
                  let v = e.target.value
                  if (!v.startsWith('#')) v = '#' + v
                  setForeground(v.toUpperCase())
                }}
              />
              <div
                style={{
                  width: '100px',
                  height: '50px',
                  borderRadius: '10px',
                  background: foreground,
                  border: '1px solid var(--border-light)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: textColorFor(foreground),
                  fontSize: '14px',
                  fontWeight: 700,
                  fontFamily: 'var(--font-mono)',
                }}
              >
                Aa
              </div>
            </div>
          </div>

          <div className="form-group">
            <div className="flex justify-between items-center mb-2">
              <label className="form-label mb-0" style={{ fontSize: '14px', fontWeight: 600 }}>
                🖼️ 背景色
              </label>
              {currentColor && (
                <button className="btn btn-secondary btn-sm" onClick={setAsBackground}>
                  使用当前色 {currentColor.hex}
                </button>
              )}
            </div>
            <div className="color-input-row">
              <input
                type="color"
                className="color-picker-input"
                value={background}
                onChange={e => setBackground(e.target.value.toUpperCase())}
              />
              <input
                className="form-input font-mono"
                value={background}
                onChange={e => {
                  let v = e.target.value
                  if (!v.startsWith('#')) v = '#' + v
                  setBackground(v.toUpperCase())
                }}
              />
              <div
                style={{
                  width: '100px',
                  height: '50px',
                  borderRadius: '10px',
                  background: background,
                  border: '1px solid var(--border-light)',
                }}
              />
            </div>
          </div>
        </div>

        <div className="flex justify-center mb-5">
          <button
            className="btn btn-secondary"
            onClick={swapColors}
            title="交换前景和背景色"
          >
            ⇅ 交换颜色
          </button>
        </div>

        <div className="contrast-ratio">
          <div className="ratio-value">{result.ratio}:1</div>
          <div className="ratio-label">对比度比值</div>
        </div>

        <div className="contrast-preview">
          <div
            className="contrast-box"
            style={{ background, color: foreground }}
          >
            <div className="contrast-box-label" style={{ color: foreground, opacity: 0.7 }}>
              小号文本 · 14px Regular
            </div>
            <div className="contrast-box-text" style={{ fontSize: '14px', fontWeight: 400 }}>
              The quick brown fox jumps over the lazy dog
            </div>
          </div>
          <div
            className="contrast-box"
            style={{ background, color: foreground }}
          >
            <div className="contrast-box-label" style={{ color: foreground, opacity: 0.7 }}>
              大号文本 · 24px Bold
            </div>
            <div className="contrast-box-text" style={{ fontSize: '26px', fontWeight: 700 }}>
              敏捷的棕色狐狸
            </div>
          </div>
        </div>

        <div className="wcag-grid">
          <WcagBadge pass={result.normalText.AA} label="AA · 普通文本 (≥4.5:1)" />
          <WcagBadge pass={result.largeText.AA} label="AA · 大号文本 (≥3:1)" />
          <WcagBadge pass={result.normalText.AAA} label="AAA · 普通文本 (≥7:1)" />
          <WcagBadge pass={result.largeText.AAA} label="AAA · 大号文本 (≥4.5:1)" />
        </div>
      </div>

      <div className="card">
        <h2 className="card-title">
          <span className="card-title-icon">⚡</span>
          预设配色方案
        </h2>
        <p className="text-sm text-muted mb-4">快速试用常见的前景/背景配色组合</p>
        <div className="grid-3">
          {PRESET_PAIRS.map((pair, idx) => {
            const r = checkContrast(pair.fg, pair.bg)
            return (
              <div
                key={idx}
                style={{
                  background: 'var(--bg-secondary)',
                  borderRadius: 'var(--radius-md)',
                  padding: '14px',
                  border: '1px solid var(--border-light)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onClick={() => {
                  setForeground(pair.fg)
                  setBackground(pair.bg)
                }}
              >
                <div
                  style={{
                    background: pair.bg,
                    color: pair.fg,
                    padding: '16px',
                    borderRadius: '8px',
                    marginBottom: '10px',
                    textAlign: 'center',
                    fontWeight: 600,
                    fontSize: '13px',
                  }}
                >
                  {pair.name}
                </div>
                <div className="flex justify-between items-center">
                  <div className="text-xs font-mono text-muted">
                    {pair.fg} / {pair.bg}
                  </div>
                  <span className="badge" style={{
                    background: r.normalText.AA
                      ? 'rgba(16, 185, 129, 0.15)'
                      : 'rgba(239, 68, 68, 0.15)',
                    color: r.normalText.AA ? 'var(--success)' : 'var(--danger)',
                  }}>
                    {r.ratio}:1
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="card">
        <h2 className="card-title">
          <span className="card-title-icon">ℹ️</span>
          WCAG 标准说明
        </h2>
        <div className="grid-2" style={{ fontSize: '13px', lineHeight: 1.8 }}>
          <div style={{ background: 'var(--bg-secondary)', padding: '18px', borderRadius: 'var(--radius-md)' }}>
            <h4 className="font-semibold mb-3" style={{ color: 'var(--accent-secondary)' }}>
              AA 级别 (最低要求)
            </h4>
            <ul className="text-muted" style={{ listStyle: 'none' }}>
              <li>• <b className="text-primary">普通文本</b>: 对比度 ≥ <code className="font-mono">4.5:1</code></li>
              <li className="mt-2">• <b>大号文本</b> (≥18pt 或 ≥14pt粗体): 对比度 ≥ <code className="font-mono">3:1</code></li>
              <li className="mt-2">• 绝大多数网站和应用的合规标准</li>
            </ul>
          </div>
          <div style={{ background: 'var(--bg-secondary)', padding: '18px', borderRadius: 'var(--radius-md)' }}>
            <h4 className="font-semibold mb-3" style={{ color: 'var(--accent-secondary)' }}>
              AAA 级别 (增强标准)
            </h4>
            <ul className="text-muted" style={{ listStyle: 'none' }}>
              <li>• <b>普通文本</b>: 对比度 ≥ <code className="font-mono">7:1</code></li>
              <li className="mt-2">• <b>大号文本</b>: 对比度 ≥ <code className="font-mono">4.5:1</code></li>
              <li className="mt-2">• 面向视障用户的最高无障碍标准</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
