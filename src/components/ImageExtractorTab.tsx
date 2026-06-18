import { useState, useRef, useCallback } from 'react'
import { useAppStore } from '../store/useAppStore'
import { extractColorsFromImage, type ExtractedColor, generateAnalogous, generateComplementary, generateTriadic, generateMonochromatic } from '../utils/colorUtils'

interface Props {
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void
}

type SchemeType = 'analogous' | 'complementary' | 'triadic' | 'monochromatic'

export default function ImageExtractorTab({ showToast }: Props) {
  const { addToHistory, setCurrentColor, palettes, addColorToPalette, activePaletteId } = useAppStore()
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [extractedColors, setExtractedColors] = useState<ExtractedColor[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [colorCount, setColorCount] = useState(8)
  const [quality, setQuality] = useState(5)
  const [selectedColor, setSelectedColor] = useState<string | null>(null)
  const [schemeType, setSchemeType] = useState<SchemeType>('analogous')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [imageSize, setImageSize] = useState<string>('')

  const handleFileSelect = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      showToast('请选择图片文件', 'error')
      return
    }

    const url = URL.createObjectURL(file)
    const img = new Image()

    img.onload = () => {
      setImageUrl(url)
      setImageSize(`${img.width} × ${img.height}`)

      const maxWidth = 800
      const scale = Math.min(1, maxWidth / img.width)
      const w = Math.round(img.width * scale)
      const h = Math.round(img.height * scale)

      const canvas = canvasRef.current
      if (!canvas) return
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.drawImage(img, 0, 0, w, h)

      const imageData = ctx.getImageData(0, 0, w, h)
      const colors = extractColorsFromImage(imageData, colorCount, quality)
      setExtractedColors(colors)
      setSelectedColor(colors[0]?.hex || null)
      showToast(`成功提取 ${colors.length} 种主色调`, 'success')
    }

    img.src = url
  }, [colorCount, quality, showToast])

  const openFileDialog = async () => {
    const api = window.electronAPI
    if (api?.dialog) {
      const filePath = await api.dialog.openImage()
      if (filePath) {
        const dataUrl = await api.dialog.readImageFile(filePath)
        if (dataUrl) {
          const img = new Image()
          img.onload = () => {
            setImageUrl(dataUrl)
            setImageSize(`${img.width} × ${img.height}`)

            const maxWidth = 800
            const scale = Math.min(1, maxWidth / img.width)
            const w = Math.round(img.width * scale)
            const h = Math.round(img.height * scale)

            const canvas = canvasRef.current
            if (!canvas) return
            canvas.width = w
            canvas.height = h
            const ctx = canvas.getContext('2d')
            if (!ctx) return
            ctx.drawImage(img, 0, 0, w, h)

            const imageData = ctx.getImageData(0, 0, w, h)
            const colors = extractColorsFromImage(imageData, colorCount, quality)
            setExtractedColors(colors)
            setSelectedColor(colors[0]?.hex || null)
            showToast(`成功提取 ${colors.length} 种主色调`, 'success')
          }
          img.src = dataUrl
        }
      }
    } else {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = 'image/*'
      input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0]
        if (file) handleFileSelect(file)
      }
      input.click()
    }
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFileSelect(file)
  }, [handleFileSelect])

  const reExtract = () => {
    if (!imageUrl) return
    const img = new Image()
    img.onload = () => {
      const maxWidth = 800
      const scale = Math.min(1, maxWidth / img.width)
      const w = Math.round(img.width * scale)
      const h = Math.round(img.height * scale)

      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.drawImage(img, 0, 0, w, h)

      const imageData = ctx.getImageData(0, 0, w, h)
      const colors = extractColorsFromImage(imageData, colorCount, quality)
      setExtractedColors(colors)
      setSelectedColor(colors[0]?.hex || null)
      showToast(`重新提取了 ${colors.length} 种颜色`, 'success')
    }
    img.src = imageUrl
  }

  const schemeColors = (() => {
    if (!selectedColor) return []
    switch (schemeType) {
      case 'analogous': return generateAnalogous(selectedColor)
      case 'complementary': return generateComplementary(selectedColor)
      case 'triadic': return generateTriadic(selectedColor)
      case 'monochromatic': return generateMonochromatic(selectedColor)
      default: return []
    }
  })()

  const copyColor = async (hex: string) => {
    await navigator.clipboard.writeText(hex)
    showToast(`已复制 ${hex}`, 'success')
  }

  const useColor = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    setCurrentColor({ r, g, b, hex, timestamp: Date.now() })
    addToHistory({ r, g, b, hex, timestamp: Date.now() })
    showToast(`已应用颜色 ${hex}`, 'success')
  }

  const addAllToPalette = () => {
    if (!activePaletteId) {
      showToast('请先选择一个调色板', 'error')
      return
    }
    const palette = palettes.find(p => p.id === activePaletteId)
    if (!palette) return
    extractedColors.forEach(c => {
      addColorToPalette(palette.id, c.hex)
    })
    showToast(`已将 ${extractedColors.length} 种颜色添加到「${palette.name}」`, 'success')
  }

  return (
    <div>
      <div className="card">
        <h2 className="card-title">
          <span className="card-title-icon">🖼️</span>
          图片主色调提取
        </h2>

        {!imageUrl ? (
          <div
            className={`image-dropzone ${isDragging ? 'dragover' : ''}`}
            onClick={openFileDialog}
            onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
          >
            <div className="dropzone-icon">📤</div>
            <p className="dropzone-text font-semibold">点击选择图片或拖放到此处</p>
            <p className="dropzone-sub">支持 PNG, JPG, GIF, BMP, WebP 格式</p>
          </div>
        ) : (
          <div>
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-4">
                <button className="btn btn-secondary btn-sm" onClick={openFileDialog}>
                  📁 更换图片
                </button>
                <span className="text-sm text-muted font-mono">{imageSize}</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <label className="text-sm text-muted">颜色数:</label>
                  <select
                    className="form-input"
                    style={{ width: '80px', padding: '6px 10px' }}
                    value={colorCount}
                    onChange={e => setColorCount(Number(e.target.value))}
                  >
                    {[4, 6, 8, 10, 12, 16].map(n => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm text-muted">精度:</label>
                  <select
                    className="form-input"
                    style={{ width: '90px', padding: '6px 10px' }}
                    value={quality}
                    onChange={e => setQuality(Number(e.target.value))}
                  >
                    <option value={1}>最高</option>
                    <option value={5}>高</option>
                    <option value={10}>中</option>
                    <option value={20}>快</option>
                  </select>
                </div>
                <button className="btn btn-primary btn-sm" onClick={reExtract}>
                  🔄 重新提取
                </button>
              </div>
            </div>

            <div className="grid-2">
              <div style={{
                background: 'var(--bg-secondary)',
                borderRadius: 'var(--radius-md)',
                padding: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                minHeight: '300px',
              }}>
                <img
                  src={imageUrl}
                  alt="Preview"
                  style={{
                    maxWidth: '100%',
                    maxHeight: '400px',
                    borderRadius: 'var(--radius-sm)',
                    objectFit: 'contain',
                  }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-semibold text-sm" style={{ color: 'var(--text-secondary)' }}>
                      🎯 提取的主色调
                    </h3>
                    {extractedColors.length > 0 && activePaletteId && (
                      <button className="btn btn-secondary btn-sm" onClick={addAllToPalette}>
                        ➕ 全部加入调色板
                      </button>
                    )}
                  </div>
                  <div className="extracted-colors" style={{ marginTop: 0 }}>
                    {extractedColors.map(c => (
                      <div
                        key={c.hex}
                        className={`extracted-color-item ${selectedColor === c.hex ? 'ring-2' : ''}`}
                        style={selectedColor === c.hex ? {
                          boxShadow: '0 0 0 2px var(--accent-primary)',
                        } : {}}
                      >
                        <div
                          className="extracted-color-preview"
                          style={{ background: c.hex, cursor: 'pointer' }}
                          onClick={() => setSelectedColor(c.hex)}
                        />
                        <div className="extracted-color-info">
                          <div
                            className="extracted-color-hex cursor-pointer"
                            onClick={() => copyColor(c.hex)}
                          >
                            {c.hex}
                          </div>
                          <div className="extracted-color-percent">{c.percentage}%</div>
                          <div className="flex gap-1 mt-2">
                            <button
                              className="icon-btn"
                              style={{ width: '24px', height: '24px', fontSize: '11px' }}
                              onClick={() => copyColor(c.hex)}
                              title="复制"
                            >
                              📋
                            </button>
                            <button
                              className="icon-btn"
                              style={{ width: '24px', height: '24px', fontSize: '11px' }}
                              onClick={() => useColor(c.hex)}
                              title="应用"
                            >
                              ✨
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {selectedColor && (
                  <div style={{
                    background: 'var(--bg-secondary)',
                    borderRadius: 'var(--radius-md)',
                    padding: '16px',
                  }}>
                    <div className="flex items-center gap-3 mb-3">
                      <div
                        style={{
                          width: '48px',
                          height: '48px',
                          borderRadius: '10px',
                          background: selectedColor,
                          border: '2px solid rgba(255,255,255,0.1)',
                        }}
                      />
                      <div>
                        <div className="font-semibold">{selectedColor}</div>
                        <div className="text-xs text-muted">
                          选择一种配色方案
                        </div>
                      </div>
                    </div>

                    <div className="scheme-types" style={{ margin: '0 0 12px 0' }}>
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
                    </div>

                    <div className="scheme-colors">
                      {schemeColors.map((hex, idx) => (
                        <div
                          key={idx}
                          className="scheme-color"
                          style={{ background: hex }}
                          onClick={() => copyColor(hex)}
                        >
                          <div className="scheme-color-tooltip">{hex}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <canvas ref={canvasRef} style={{ display: 'none' }} />
      </div>
    </div>
  )
}
