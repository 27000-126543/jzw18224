import { useState, useRef, useCallback, useMemo } from 'react'
import { useAppStore } from '../store/useAppStore'
import { extractColorsFromImage, type ExtractedColor, generateAnalogous, generateComplementary, generateTriadic, generateMonochromatic } from '../utils/colorUtils'
import type { ExtractedPalette } from '../types'

interface Props {
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void
}

type SchemeType = 'analogous' | 'complementary' | 'triadic' | 'monochromatic'

export default function ImageExtractorTab({ showToast }: Props) {
  const {
    addToHistory,
    setCurrentColor,
    palettes,
    activePaletteId,
    addColorsToPalette,
    addExtractedPalette,
    extractedPalettes,
    removeExtractedPalette,
    clearExtractedPalettes,
    mergeExtractedToPalette,
    setActivePalette,
  } = useAppStore()

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [colorCount, setColorCount] = useState(8)
  const [quality, setQuality] = useState(5)
  const [selectedColor, setSelectedColor] = useState<string | null>(null)
  const [schemeType, setSchemeType] = useState<SchemeType>('analogous')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [selectedPaletteTarget, setSelectedPaletteTarget] = useState<string | null>(null)

  const selectedItem = useMemo(() => {
    return extractedPalettes.find(p => p.id === selectedId) || null
  }, [extractedPalettes, selectedId])

  const selectedExtractedColors: ExtractedColor[] = useMemo(() => {
    if (!selectedItem) return []
    return selectedItem.colors.map((hex, i) => ({
      hex,
      percentage: Math.max(5, 100 - i * 10),
      count: 0,
    }))
  }, [selectedItem])

  const doExtractForFile = useCallback(async (filePath: string, isDataUrl: boolean = false): Promise<ExtractedPalette | null> => {
    return new Promise((resolve) => {
      const img = new Image()
      img.onload = () => {
        const maxWidth = 800
        const scale = Math.min(1, maxWidth / img.width)
        const w = Math.round(img.width * scale)
        const h = Math.round(img.height * scale)

        const canvas = canvasRef.current
        if (!canvas) { resolve(null); return }
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')
        if (!ctx) { resolve(null); return }
        ctx.drawImage(img, 0, 0, w, h)

        const imageData = ctx.getImageData(0, 0, w, h)
        const colors = extractColorsFromImage(imageData, colorCount, quality)
        const hexColors = colors.map(c => c.hex)

        const name = isDataUrl
          ? filePath.split('/').pop() || 'image'
          : filePath.split(/[/\\]/).pop() || 'image'

        const extracted = addExtractedPalette(
          name.replace(/\.[^/.]+$/, ''),
          img.src,
          name,
          hexColors
        )
        resolve(extracted)
      }
      img.onerror = () => resolve(null)
      img.src = isDataUrl ? filePath : filePath
    })
  }, [colorCount, quality, addExtractedPalette])

  const handleFilesSelect = useCallback(async (files: FileList) => {
    const imageFiles = Array.from(files).filter(f => f.type.startsWith('image/'))
    if (imageFiles.length === 0) {
      showToast('请选择图片文件', 'error')
      return
    }

    setIsProcessing(true)
    let count = 0

    for (const file of imageFiles) {
      const url = URL.createObjectURL(file)
      await doExtractForFile(url, true)
      count++
    }

    setIsProcessing(false)
    showToast(`成功提取 ${count} 张图片的主色调`, 'success')

    if (extractedPalettes.length > 0) {
      setSelectedId(extractedPalettes[0].id)
      setSelectedColor(extractedPalettes[0].colors[0] || null)
    }
  }, [doExtractForFile, showToast, extractedPalettes])

  const openFileDialog = async () => {
    const api = window.electronAPI
    if (api?.dialog?.openImages) {
      const filePaths = await api.dialog.openImages()
      if (filePaths && filePaths.length > 0) {
        setIsProcessing(true)
        let count = 0
        for (const filePath of filePaths) {
          const dataUrl = await api.dialog.readImageFile(filePath)
          if (dataUrl) {
            await doExtractForFile(dataUrl, true)
            count++
          }
        }
        setIsProcessing(false)
        showToast(`成功提取 ${count} 张图片的主色调`, 'success')

        setTimeout(() => {
          const latest = useAppStore.getState().extractedPalettes[0]
          if (latest) {
            setSelectedId(latest.id)
            setSelectedColor(latest.colors[0] || null)
          }
        }, 50)
      }
    } else {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = 'image/*'
      input.multiple = true
      input.onchange = (e) => {
        const files = (e.target as HTMLInputElement).files
        if (files && files.length > 0) {
          handleFilesSelect(files)
        }
      }
      input.click()
    }
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const files = e.dataTransfer.files
    if (files.length > 0) {
      handleFilesSelect(files)
    }
  }, [handleFilesSelect])

  const loadItem = (item: ExtractedPalette) => {
    setSelectedId(item.id)
    setSelectedColor(item.colors[0] || null)
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

  const addAllToPalette = (itemId?: string) => {
    const id = itemId || selectedId
    if (!id) {
      showToast('请先选择一张提取结果', 'error')
      return
    }
    if (!activePaletteId) {
      showToast('请先选择一个调色板', 'error')
      return
    }
    const item = extractedPalettes.find(e => e.id === id)
    const palette = palettes.find(p => p.id === activePaletteId)
    if (!item || !palette) return

    const colors = item.colors.map((hex, i) => ({
      hex,
      name: `主色 ${i + 1}`,
      note: `提取自 ${item.sourceImageName}`,
      sourceImage: item.sourceImageName,
    }))
    addColorsToPalette(activePaletteId, colors)
    showToast(`已将 ${item.colors.length} 种颜色添加到「${palette.name}」`, 'success')
  }

  const addAllSelectedToPalette = () => {
    if (!activePaletteId) {
      showToast('请先选择一个调色板', 'error')
      return
    }
    if (extractedPalettes.length === 0) return

    const palette = palettes.find(p => p.id === activePaletteId)
    if (!palette) return

    let totalCount = 0
    extractedPalettes.forEach(item => {
      const colors = item.colors.map((hex, i) => ({
        hex,
        name: `${item.name} 主色 ${i + 1}`,
        note: `提取自 ${item.sourceImageName}`,
        sourceImage: item.sourceImageName,
      }))
      addColorsToPalette(activePaletteId, colors)
      totalCount += colors.length
    })

    showToast(`已将全部 ${totalCount} 种颜色添加到「${palette.name}」`, 'success')
  }

  const copyAllHex = (itemId?: string) => {
    const id = itemId || selectedId
    if (!id) return
    const item = extractedPalettes.find(e => e.id === id)
    if (!item) return
    const hexes = item.colors.join('\n')
    navigator.clipboard.writeText(hexes)
    showToast(`已复制 ${item.colors.length} 个颜色值`, 'success')
  }

  const handleDeleteItem = (id: string) => {
    removeExtractedPalette(id)
    if (selectedId === id) {
      const remaining = extractedPalettes.filter(p => p.id !== id)
      setSelectedId(remaining[0]?.id || null)
      setSelectedColor(remaining[0]?.colors[0] || null)
    }
  }

  const handleClearAll = () => {
    if (!confirm('确定清空所有提取记录吗？')) return
    clearExtractedPalettes()
    setSelectedId(null)
    setSelectedColor(null)
    showToast('已清空提取记录', 'info')
  }

  return (
    <div className="two-column">
      <aside className="sidebar">
        <div>
          <div className="sidebar-header mb-3">
            <h3 className="sidebar-title">📚 提取记录</h3>
            <span className="badge" style={{ fontSize: '11px' }}>
              {extractedPalettes.length} 张
            </span>
          </div>

          {extractedPalettes.length === 0 ? (
            <div className="empty-state" style={{ padding: '30px 12px' }}>
              <div className="empty-state-icon" style={{ fontSize: '32px' }}>🖼️</div>
              <p className="empty-state-text text-sm">暂无提取记录</p>
              <p className="empty-state-sub text-xs">导入图片后会自动保存</p>
            </div>
          ) : (
            <div className="palette-list" style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {extractedPalettes.map(item => (
                <div
                  key={item.id}
                  className={`palette-list-item ${selectedId === item.id ? 'active' : ''}`}
                  onClick={() => loadItem(item)}
                >
                  <div className="flex items-center gap-2" style={{ flex: 1, minWidth: 0 }}>
                    <div className="palette-swatches">
                      {item.colors.slice(0, 4).map((hex, i) => (
                        <div
                          key={i}
                          className="palette-swatch"
                          style={{ background: hex }}
                        />
                      ))}
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div
                        className="font-semibold text-sm"
                        style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                      >
                        {item.name}
                      </div>
                      <div className="text-xs text-muted">
                        {item.colors.length} 色 · {new Date(item.extractedAt).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                    <button
                      className="icon-btn"
                      style={{ width: '22px', height: '22px', fontSize: '10px' }}
                      onClick={() => addAllToPalette(item.id)}
                      title="添加到调色板"
                    >
                      ➕
                    </button>
                    <button
                      className="icon-btn"
                      style={{ width: '22px', height: '22px', fontSize: '10px' }}
                      onClick={() => copyAllHex(item.id)}
                      title="复制全部"
                    >
                      📋
                    </button>
                    <button
                      className="icon-btn"
                      style={{ width: '22px', height: '22px', fontSize: '10px' }}
                      onClick={() => handleDeleteItem(item.id)}
                      title="删除"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {extractedPalettes.length > 0 && activePaletteId && (
          <div
            style={{
              marginTop: 'auto',
              padding: '12px',
              background: 'rgba(139, 92, 246, 0.1)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)',
            }}
          >
            <div className="text-xs text-muted mb-2">💡 批量操作</div>
            <div className="flex flex-col gap-2">
              <button
                className="btn btn-primary btn-sm w-full"
                onClick={addAllSelectedToPalette}
              >
                📥 全部导入到调色板
              </button>
              <button
                className="btn btn-secondary btn-sm w-full"
                onClick={handleClearAll}
              >
                🗑️ 清空记录
              </button>
            </div>
          </div>
        )}
      </aside>

      <div className="content-area">
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h2 className="card-title" style={{ marginBottom: 0 }}>
              <span className="card-title-icon">🖼️</span>
              图片主色调提取
            </h2>
            <div className="flex gap-2">
              <button className="btn btn-primary" onClick={openFileDialog}>
                📁 导入图片（支持多选）
              </button>
            </div>
          </div>

          <div className="flex items-center gap-4 mb-4" style={{ flexWrap: 'wrap' }}>
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
            {activePaletteId && (
              <div className="flex items-center gap-2 ml-auto">
                <label className="text-sm text-muted">目标调色板:</label>
                <select
                  className="form-input"
                  style={{ minWidth: '160px', padding: '6px 10px' }}
                  value={activePaletteId || ''}
                  onChange={e => setActivePalette(e.target.value)}
                >
                  {palettes.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.colors.length} 色)
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {!selectedItem ? (
            <div
              className={`image-dropzone ${isDragging ? 'dragover' : ''}`}
              onClick={openFileDialog}
              onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
            >
              {isProcessing ? (
                <>
                  <div className="dropzone-icon">⏳</div>
                  <p className="dropzone-text font-semibold">正在提取中...</p>
                  <p className="dropzone-sub">请稍候，正在处理图片</p>
                </>
              ) : (
                <>
                  <div className="dropzone-icon">📤</div>
                  <p className="dropzone-text font-semibold">点击选择图片或拖放到此处</p>
                  <p className="dropzone-sub">支持 PNG, JPG, GIF, BMP, WebP 格式，可同时导入多张</p>
                </>
              )}
            </div>
          ) : (
            <div>
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
                  position: 'relative',
                }}>
                  <img
                    src={selectedItem.sourceImage}
                    alt={selectedItem.name}
                    style={{
                      maxWidth: '100%',
                      maxHeight: '400px',
                      borderRadius: 'var(--radius-sm)',
                      objectFit: 'contain',
                    }}
                  />
                  <div
                    className="text-xs"
                    style={{
                      position: 'absolute',
                      bottom: '12px',
                      left: '12px',
                      background: 'rgba(0,0,0,0.6)',
                      color: 'white',
                      padding: '4px 8px',
                      borderRadius: '4px',
                    }}
                  >
                    📄 {selectedItem.sourceImageName}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="font-semibold text-sm" style={{ color: 'var(--text-secondary)' }}>
                        🎯 提取的主色调
                      </h3>
                      <div className="flex gap-1">
                        <button
                          className="btn btn-secondary btn-sm"
                          style={{ fontSize: '11px', padding: '4px 8px' }}
                          onClick={() => copyAllHex()}
                        >
                          📋 复制全部
                        </button>
                        {activePaletteId && (
                          <button
                            className="btn btn-primary btn-sm"
                            style={{ fontSize: '11px', padding: '4px 8px' }}
                            onClick={() => addAllToPalette()}
                          >
                            ➕ 加入调色板
                          </button>
                        )}
                      </div>
                    </div>
                    <div
                      className="extracted-colors"
                      style={{ marginTop: 0, maxHeight: '220px', overflowY: 'auto' }}
                    >
                      {selectedExtractedColors.map(c => (
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
    </div>
  )
}
