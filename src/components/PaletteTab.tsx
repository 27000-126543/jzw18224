import { useState, useRef, useCallback } from 'react'
import { useAppStore } from '../store/useAppStore'
import { hexToRgb, getContrastRatio } from '../utils/colorUtils'
import type { PaletteColor } from '../types'

interface Props {
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void
}

type ModalType = 'createPalette' | 'renamePalette' | 'addColor' | 'editColor' | null

export default function PaletteTab({ showToast }: Props) {
  const {
    palettes,
    activePaletteId,
    currentColor,
    setActivePalette,
    createPalette,
    deletePalette,
    updatePalette,
    addColorToPalette,
    addColorsToPalette,
    removeColorFromPalette,
    updateColorInPalette,
    reorderColorsInPalette,
    duplicateColorInPalette,
  } = useAppStore()

  const [modal, setModal] = useState<ModalType>(null)
  const [editingColorId, setEditingColorId] = useState<string | null>(null)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  const [newPaletteName, setNewPaletteName] = useState('')
  const [newPaletteDesc, setNewPaletteDesc] = useState('')
  const [newColorHex, setNewColorHex] = useState('')
  const [newColorName, setNewColorName] = useState('')
  const [newColorNote, setNewColorNote] = useState('')
  const [renameName, setRenameName] = useState('')

  const activePalette = palettes.find(p => p.id === activePaletteId)
  const activePaletteRef = useRef(activePalette)
  activePaletteRef.current = activePalette

  const textColorForBg = (bgHex: string) => {
    const contrastWhite = getContrastRatio(bgHex, '#FFFFFF')
    return contrastWhite >= 4.5 ? '#FFFFFF' : '#111111'
  }

  const openCreatePalette = () => {
    setNewPaletteName('')
    setNewPaletteDesc('')
    setModal('createPalette')
  }

  const openRenamePalette = () => {
    if (!activePalette) return
    setRenameName(activePalette.name)
    setModal('renamePalette')
  }

  const openAddColor = () => {
    setNewColorHex(currentColor?.hex || '#8B5CF6')
    setNewColorName('')
    setNewColorNote('')
    setModal('addColor')
  }

  const openEditColor = (colorId: string) => {
    const color = activePalette?.colors.find((c: PaletteColor) => c.id === colorId)
    if (!color) return
    setEditingColorId(colorId)
    setNewColorHex(color.hex)
    setNewColorName(color.name || '')
    setNewColorNote(color.note || '')
    setModal('editColor')
  }

  const handleCreatePalette = () => {
    if (!newPaletteName.trim()) {
      showToast('请输入调色板名称', 'error')
      return
    }
    createPalette(newPaletteName.trim(), newPaletteDesc.trim() || undefined)
    showToast('调色板创建成功', 'success')
    setModal(null)
  }

  const handleRenamePalette = () => {
    if (!activePalette || !renameName.trim()) return
    updatePalette(activePalette.id, { name: renameName.trim() })
    showToast('已更新调色板名称', 'success')
    setModal(null)
  }

  const handleAddColor = () => {
    if (!activePalette) return
    addColorToPalette(
      activePalette.id,
      newColorHex.startsWith('#') ? newColorHex : '#' + newColorHex,
      newColorName.trim() || undefined,
      newColorNote.trim() || undefined
    )
    showToast(`已添加颜色 ${newColorHex}`, 'success')
    setModal(null)
  }

  const handleEditColor = () => {
    if (!activePalette || !editingColorId) return
    updateColorInPalette(activePalette.id, editingColorId, {
      hex: newColorHex.startsWith('#') ? newColorHex : '#' + newColorHex,
      name: newColorName.trim() || undefined,
      note: newColorNote.trim() || undefined,
    })
    showToast('颜色信息已更新', 'success')
    setEditingColorId(null)
    setModal(null)
  }

  const handleDeletePalette = () => {
    if (!activePalette) return
    if (!confirm(`确定删除调色板「${activePalette.name}」吗？此操作不可撤销。`)) return
    deletePalette(activePalette.id)
    showToast('调色板已删除', 'info')
  }

  const copyColor = async (hex: string) => {
    await navigator.clipboard.writeText(hex)
    showToast(`已复制 ${hex}`, 'success')
  }

  const handleDragStart = (index: number) => {
    setDraggedIndex(index)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    setDragOverIndex(index)
  }

  const handleDragLeave = () => {
    setDragOverIndex(null)
  }

  const handleDrop = (toIndex: number) => {
    if (draggedIndex === null || !activePalette) return
    if (draggedIndex !== toIndex) {
      reorderColorsInPalette(activePalette.id, draggedIndex, toIndex)
    }
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  const addCurrentColor = () => {
    if (!activePalette || !currentColor) {
      showToast('请先选择一个调色板', 'error')
      return
    }
    addColorToPalette(activePalette.id, currentColor.hex)
    showToast(`已添加 ${currentColor.hex} 到「${activePalette.name}」`, 'success')
  }

  const handleDuplicate = (colorId: string) => {
    if (!activePalette) return
    duplicateColorInPalette(activePalette.id, colorId)
    showToast('已复制颜色', 'success')
  }

  const copyAllHex = () => {
    if (!activePalette || activePalette.colors.length === 0) return
    const hexes = activePalette.colors.map(c => c.hex).join('\n')
    navigator.clipboard.writeText(hexes)
    showToast(`已复制 ${activePalette.colors.length} 个颜色值`, 'success')
  }

  return (
    <div className="two-column">
      <aside className="sidebar">
        <div>
          <div className="sidebar-header mb-3">
            <h3 className="sidebar-title">🗂️ 我的调色板</h3>
            <button
              className="btn btn-primary btn-sm"
              onClick={openCreatePalette}
            >
              + 新建
            </button>
          </div>

          {palettes.length === 0 ? (
            <div className="empty-state" style={{ padding: '30px 12px' }}>
              <div className="empty-state-icon" style={{ fontSize: '32px' }}>📦</div>
              <p className="empty-state-text text-sm">暂无调色板</p>
              <p className="empty-state-sub text-xs">点击「新建」创建第一个</p>
            </div>
          ) : (
            <div className="palette-list">
              {palettes.map(p => (
                <div
                  key={p.id}
                  className={`palette-list-item ${activePaletteId === p.id ? 'active' : ''}`}
                  onClick={() => setActivePalette(p.id)}
                  title={p.description}
                >
                  <div className="flex items-center gap-2" style={{ flex: 1, minWidth: 0 }}>
                    <div className="palette-swatches">
                      {p.colors.slice(0, 4).map((c, i) => (
                        <div
                          key={i}
                          className="palette-swatch"
                          style={{ background: c.hex }}
                        />
                      ))}
                      {p.colors.length === 0 && (
                        <div
                          className="palette-swatch"
                          style={{ background: 'var(--bg-tertiary)' }}
                        />
                      )}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div
                        className="font-semibold text-sm"
                        style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                      >
                        {p.name}
                      </div>
                      <div className="text-xs text-muted">
                        {p.colors.length} 色 · {new Date(p.updatedAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {activePalette && (
          <div
            style={{
              marginTop: 'auto',
              padding: '12px',
              background: 'rgba(139, 92, 246, 0.1)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)',
            }}
          >
            <div className="text-xs text-muted mb-2">💡 快捷操作</div>
            <div className="flex flex-col gap-2">
              <button className="btn btn-secondary btn-sm w-full" onClick={addCurrentColor}>
                ➕ 添加当前色到调色板
              </button>
              <button className="btn btn-secondary btn-sm w-full" onClick={copyAllHex}>
                📋 复制全部 HEX
              </button>
            </div>
          </div>
        )}
      </aside>

      <div className="content-area">
        {!activePalette ? (
          <div className="empty-state" style={{ padding: '80px 24px' }}>
            <div className="empty-state-icon">🎨</div>
            <p className="empty-state-text">选择或创建一个调色板</p>
            <p className="empty-state-sub">从左侧选择调色板，或点击「新建」创建</p>
            <button
              className="btn btn-primary mt-4"
              onClick={openCreatePalette}
            >
              + 创建调色板
            </button>
          </div>
        ) : (
          <div>
            <div className="flex justify-between items-start mb-5">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="card-title mb-0" style={{ marginBottom: 0 }}>
                    <span className="card-title-icon">🎨</span>
                    {activePalette.name}
                  </h2>
                  <span className="badge">{activePalette.colors.length} 个颜色</span>
                </div>
                {activePalette.description && (
                  <p className="text-sm text-muted">{activePalette.description}</p>
                )}
                <p className="text-xs text-muted mt-1">
                  💡 提示：拖拽颜色卡片可调整顺序
                </p>
              </div>
              <div className="flex gap-2">
                <button className="btn btn-secondary btn-sm" onClick={openRenamePalette}>
                  ✏️ 编辑
                </button>
                <button className="btn btn-primary btn-sm" onClick={openAddColor}>
                  + 添加颜色
                </button>
                <button className="btn btn-danger btn-sm" onClick={handleDeletePalette}>
                  🗑️
                </button>
              </div>
            </div>

            {activePalette.colors.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">🌈</div>
                <p className="empty-state-text">调色板为空</p>
                <p className="empty-state-sub">
                  点击「添加颜色」添加颜色，或从取色器选色后添加
                </p>
                <button
                  className="btn btn-primary mt-4"
                  onClick={openAddColor}
                >
                  + 添加第一个颜色
                </button>
              </div>
            ) : (
              <div className="palette-colors-grid">
                {activePalette.colors.map((color: PaletteColor, index: number) => (
                  <div
                    key={color.id}
                    className="palette-color-card"
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragLeave={handleDragLeave}
                    onDrop={() => handleDrop(index)}
                    onDragEnd={handleDragEnd}
                    style={{
                      transform: draggedIndex === index ? 'scale(0.95) rotate(2deg)' : 'none',
                      opacity: draggedIndex === index ? 0.6 : 1,
                      boxShadow: dragOverIndex === index && draggedIndex !== index
                        ? '0 0 0 2px var(--accent-primary), var(--shadow-md)'
                        : undefined,
                      transition: 'all 0.15s ease',
                      cursor: draggedIndex !== null ? 'grabbing' : 'grab',
                    }}
                  >
                    <div
                      className="palette-color-preview"
                      style={{
                        background: color.hex,
                        color: textColorForBg(color.hex),
                      }}
                    >
                      <div className="palette-color-actions">
                        <button
                          className="icon-btn"
                          style={{ color: textColorForBg(color.hex) }}
                          onClick={() => handleDuplicate(color.id)}
                          title="复制颜色"
                        >
                          ⎘
                        </button>
                        <button
                          className="icon-btn"
                          style={{ color: textColorForBg(color.hex) }}
                          onClick={() => openEditColor(color.id)}
                          title="编辑"
                        >
                          ✏️
                        </button>
                        <button
                          className="icon-btn"
                          style={{ color: textColorForBg(color.hex) }}
                          onClick={() => {
                            removeColorFromPalette(activePalette.id, color.id)
                            showToast('已移除颜色', 'info')
                          }}
                          title="删除"
                        >
                          🗑️
                        </button>
                      </div>

                      <div
                        style={{
                          position: 'absolute',
                          bottom: '10px',
                          left: '12px',
                          fontSize: '11px',
                          fontFamily: 'var(--font-mono)',
                          opacity: 0.9,
                        }}
                      >
                        #{index + 1}
                      </div>
                    </div>

                    <div
                      className="palette-color-body"
                      onClick={() => copyColor(color.hex)}
                      style={{ cursor: 'pointer' }}
                    >
                      <div
                        className="palette-color-name"
                        onDoubleClick={() => openEditColor(color.id)}
                        title="双击编辑"
                      >
                        {color.name || '未命名颜色'}
                      </div>
                      <div className="palette-color-hex">{color.hex}</div>
                      {color.note && (
                        <div className="text-xs text-muted mt-2" style={{ lineHeight: 1.4 }}>
                          💡 {color.note}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {modal && (
        <div className="modal-overlay" onClick={() => {
          setModal(null)
          setEditingColorId(null)
        }}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                {modal === 'createPalette' && '📦 新建调色板'}
                {modal === 'renamePalette' && '✏️ 编辑调色板'}
                {modal === 'addColor' && '➕ 添加颜色'}
                {modal === 'editColor' && '✏️ 编辑颜色'}
              </h3>
              <button className="modal-close" onClick={() => {
                setModal(null)
                setEditingColorId(null)
              }}>×</button>
            </div>
            <div className="modal-body">
              {(modal === 'createPalette' || modal === 'renamePalette') && (
                <>
                  <div className="form-group">
                    <label className="form-label">名称</label>
                    <input
                      className="form-input"
                      placeholder="我的配色方案"
                      value={modal === 'createPalette' ? newPaletteName : renameName}
                      onChange={e => modal === 'createPalette'
                        ? setNewPaletteName(e.target.value)
                        : setRenameName(e.target.value)
                      }
                      autoFocus
                    />
                  </div>
                  {modal === 'createPalette' && (
                    <div className="form-group">
                      <label className="form-label">描述（可选）</label>
                      <textarea
                        className="form-input form-textarea"
                        placeholder="此调色板的用途说明..."
                        value={newPaletteDesc}
                        onChange={e => setNewPaletteDesc(e.target.value)}
                      />
                    </div>
                  )}
                  {modal === 'renamePalette' && activePalette && (
                    <div className="form-group">
                      <label className="form-label">描述（可选）</label>
                      <textarea
                        className="form-input form-textarea"
                        placeholder="此调色板的用途说明..."
                        value={activePalette.description || ''}
                        onChange={e => updatePalette(activePalette.id, { description: e.target.value })}
                      />
                    </div>
                  )}
                </>
              )}

              {(modal === 'addColor' || modal === 'editColor') && (
                <>
                  <div className="form-group">
                    <label className="form-label">颜色值 (HEX)</label>
                    <div className="color-input-row">
                      <input
                        type="color"
                        className="color-picker-input"
                        value={newColorHex.startsWith('#') ? newColorHex : '#' + newColorHex}
                        onChange={e => setNewColorHex(e.target.value)}
                      />
                      <input
                        className="form-input font-mono"
                        placeholder="#FFFFFF"
                        value={newColorHex}
                        onChange={e => setNewColorHex(e.target.value)}
                        style={{ textTransform: 'uppercase' }}
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">
                      颜色名称（可选）
                      <span className="text-xs text-muted" style={{ marginLeft: '8px' }}>
                        例如：主色 / Brand-500 / 背景色
                      </span>
                    </label>
                    <input
                      className="form-input"
                      placeholder="primary / brand-500 / 主背景色..."
                      value={newColorName}
                      onChange={e => setNewColorName(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">备注（可选）</label>
                    <textarea
                      className="form-input form-textarea"
                      placeholder="使用场景、搭配建议、来源说明等..."
                      value={newColorNote}
                      onChange={e => setNewColorNote(e.target.value)}
                    />
                  </div>
                </>
              )}
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setModal(null)
                  setEditingColorId(null)
                }}
              >
                取消
              </button>
              <button
                className="btn btn-primary"
                onClick={() => {
                  if (modal === 'createPalette') handleCreatePalette()
                  else if (modal === 'renamePalette') handleRenamePalette()
                  else if (modal === 'addColor') handleAddColor()
                  else if (modal === 'editColor') handleEditColor()
                }}
              >
                确定
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
