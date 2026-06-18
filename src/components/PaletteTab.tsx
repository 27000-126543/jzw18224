import { useState, useMemo, useRef, useCallback } from 'react'
import { useAppStore } from '../store/useAppStore'
import { getContrastRatio } from '../utils/colorUtils'
import type { PaletteColor } from '../types'

interface Props {
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void
}

type ViewMode = 'grid' | 'list'
type GroupBy = 'none' | 'source' | 'name'

type ModalType =
  | 'createPalette'
  | 'renamePalette'
  | 'addColor'
  | 'editColor'
  | 'moveColors'
  | null

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
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [groupBy, setGroupBy] = useState<GroupBy>('none')

  const [newPaletteName, setNewPaletteName] = useState('')
  const [newPaletteDesc, setNewPaletteDesc] = useState('')
  const [newColorHex, setNewColorHex] = useState('')
  const [newColorName, setNewColorName] = useState('')
  const [newColorNote, setNewColorNote] = useState('')
  const [renameName, setRenameName] = useState('')
  const [moveTargetPaletteId, setMoveTargetPaletteId] = useState<string | null>(null)

  const activePalette = palettes.find(p => p.id === activePaletteId)
  const activePaletteRef = useRef(activePalette)
  activePaletteRef.current = activePalette

  const textColorForBg = (bgHex: string) => {
    const contrastWhite = getContrastRatio(bgHex, '#FFFFFF')
    return contrastWhite >= 4.5 ? '#FFFFFF' : '#111111'
  }

  const filteredColors = useMemo(() => {
    if (!activePalette) return []
    if (!searchQuery.trim()) return activePalette.colors
    const q = searchQuery.toLowerCase()
    return activePalette.colors.filter(
      (c: PaletteColor) =>
        c.hex.toLowerCase().includes(q) ||
        c.name?.toLowerCase().includes(q) ||
        c.note?.toLowerCase().includes(q) ||
        c.sourceImage?.toLowerCase().includes(q)
    )
  }, [activePalette, searchQuery])

  const groupedColors = useMemo(() => {
    if (groupBy === 'none') return { '全部': filteredColors }

    const groups: Record<string, PaletteColor[]> = {}

    if (groupBy === 'source') {
      filteredColors.forEach((c: PaletteColor) => {
        const key = c.sourceImage || '手动添加'
        if (!groups[key]) groups[key] = []
        groups[key].push(c)
      })
    } else if (groupBy === 'name') {
      filteredColors.forEach((c: PaletteColor) => {
        const key = c.name ? (c.name[0]?.toUpperCase() || '#') : '未命名'
        if (!groups[key]) groups[key] = []
        groups[key].push(c)
      })
    }

    return groups
  }, [filteredColors, groupBy])

  const allSelected = useMemo(() => {
    if (filteredColors.length === 0) return false
    return filteredColors.every((c: PaletteColor) => selectedIds.has(c.id))
  }, [filteredColors, selectedIds])

  const toggleSelectAll = () => {
    if (!activePalette) return
    if (allSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredColors.map((c: PaletteColor) => c.id)))
    }
  }

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds)
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
    }
    setSelectedIds(next)
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

  const openMoveColors = () => {
    if (selectedIds.size === 0) return
    setMoveTargetPaletteId(
      palettes.find(p => p.id !== activePaletteId)?.id || null
    )
    setModal('moveColors')
  }

  const handleCreatePalette = () => {
    if (!newPaletteName.trim()) {
      showToast('请输入调色板名称', 'error')
      return
    }
    const newPalette = createPalette(newPaletteName.trim(), newPaletteDesc.trim() || undefined)
    setActivePalette(newPalette.id)
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
    const hex = newColorHex.startsWith('#') ? newColorHex : '#' + newColorHex
    addColorToPalette(
      activePalette.id,
      hex,
      newColorName.trim() || undefined,
      newColorNote.trim() || undefined
    )
    showToast(`已添加颜色 ${hex}`, 'success')
    setModal(null)
  }

  const handleEditColor = () => {
    if (!activePalette || !editingColorId) return
    const hex = newColorHex.startsWith('#') ? newColorHex : '#' + newColorHex
    updateColorInPalette(activePalette.id, editingColorId, {
      hex,
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
    setSelectedIds(new Set())
    showToast('调色板已删除', 'info')
  }

  const handleDeleteSelected = () => {
    if (!activePalette || selectedIds.size === 0) return
    if (!confirm(`确定删除选中的 ${selectedIds.size} 个颜色吗？`)) return
    selectedIds.forEach(id => removeColorFromPalette(activePalette.id, id))
    setSelectedIds(new Set())
    showToast(`已删除 ${selectedIds.size} 个颜色`, 'info')
  }

  const handleDuplicateSelected = () => {
    if (!activePalette || selectedIds.size === 0) return
    selectedIds.forEach(id => duplicateColorInPalette(activePalette.id, id))
    showToast(`已复制 ${selectedIds.size} 个颜色`, 'success')
  }

  const handleMoveSelected = () => {
    if (!activePalette || !moveTargetPaletteId || selectedIds.size === 0) return

    const colorsToMove = activePalette.colors.filter((c: PaletteColor) => selectedIds.has(c.id))
    const colorsToAdd = colorsToMove.map((c: PaletteColor) => ({
      hex: c.hex,
      name: c.name,
      note: c.note,
      sourceImage: c.sourceImage,
    }))

    addColorsToPalette(moveTargetPaletteId, colorsToAdd)
    selectedIds.forEach(id => removeColorFromPalette(activePalette.id, id))
    setSelectedIds(new Set())
    showToast(`已移动 ${colorsToMove.length} 个颜色`, 'success')
    setModal(null)
  }

  const copyColor = async (hex: string) => {
    await navigator.clipboard.writeText(hex)
    showToast(`已复制 ${hex}`, 'success')
  }

  const copySelectedHex = () => {
    if (selectedIds.size === 0 || !activePalette) return
    const hexes = activePalette.colors
      .filter((c: PaletteColor) => selectedIds.has(c.id))
      .map((c: PaletteColor) => c.hex)
      .join('\n')
    navigator.clipboard.writeText(hexes)
    showToast(`已复制 ${selectedIds.size} 个颜色值`, 'success')
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
    if (draggedIndex === null || !activePalette || groupBy !== 'none') return
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
    const hexes = activePalette.colors.map((c: PaletteColor) => c.hex).join('\n')
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
                  onClick={() => {
                    setActivePalette(p.id)
                    setSelectedIds(new Set())
                    setSearchQuery('')
                  }}
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
            <div className="flex justify-between items-start mb-4" style={{ flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="card-title mb-0" style={{ marginBottom: 0 }}>
                    <span className="card-title-icon">🎨</span>
                    {activePalette.name}
                  </h2>
                  <span className="badge">{activePalette.colors.length} 个颜色</span>
                  {searchQuery && (
                    <span className="badge" style={{ background: 'var(--accent-secondary)', color: 'var(--accent-primary)' }}>
                      筛选: {filteredColors.length} 个结果
                    </span>
                  )}
                  {selectedIds.size > 0 && (
                    <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#10B981' }}>
                      已选 {selectedIds.size} 个
                    </span>
                  )}
                </div>
                {activePalette.description && (
                  <p className="text-sm text-muted">{activePalette.description}</p>
                )}
              </div>
              <div className="flex gap-2 flex-wrap">
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

            <div
              className="flex items-center gap-3 mb-4"
              style={{
                padding: '12px 16px',
                background: 'var(--bg-secondary)',
                borderRadius: 'var(--radius-md)',
                flexWrap: 'wrap',
              }}
            >
              <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
                <input
                  className="form-input"
                  placeholder="🔍 搜索颜色（名称、备注、来源、HEX）..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-muted">分组:</span>
                <select
                  className="form-input"
                  style={{ width: '100px', padding: '6px 10px', fontSize: '12px' }}
                  value={groupBy}
                  onChange={e => setGroupBy(e.target.value as GroupBy)}
                >
                  <option value="none">不分组</option>
                  <option value="source">按来源</option>
                  <option value="name">按名称首字母</option>
                </select>
              </div>

              <div className="flex items-center gap-1">
                <button
                  className={`icon-btn ${viewMode === 'grid' ? 'text-accent' : ''}`}
                  onClick={() => setViewMode('grid')}
                  title="网格视图"
                >
                  ▦
                </button>
                <button
                  className={`icon-btn ${viewMode === 'list' ? 'text-accent' : ''}`}
                  onClick={() => setViewMode('list')}
                  title="列表视图"
                >
                  ☰
                </button>
              </div>

              <div className="flex items-center gap-2 ml-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleSelectAll}
                  />
                  <span className="text-xs text-muted">全选</span>
                </label>
              </div>
            </div>

            {selectedIds.size > 0 && (
              <div
                className="flex items-center gap-2 mb-4 p-3"
                style={{
                  background: 'rgba(16, 185, 129, 0.1)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  borderRadius: 'var(--radius-md)',
                }}
              >
                <span className="text-sm font-medium" style={{ color: '#10B981' }}>
                  ✅ 已选中 {selectedIds.size} 个颜色
                </span>
                <div className="flex gap-2 ml-auto">
                  <button className="btn btn-secondary btn-sm" onClick={copySelectedHex}>
                    📋 复制 HEX
                  </button>
                  <button className="btn btn-secondary btn-sm" onClick={handleDuplicateSelected}>
                    ⎘ 复制
                  </button>
                  {palettes.length > 1 && (
                    <button className="btn btn-secondary btn-sm" onClick={openMoveColors}>
                      ➡️ 移动到
                    </button>
                  )}
                  <button className="btn btn-danger btn-sm" onClick={handleDeleteSelected}>
                    🗑️ 删除
                  </button>
                </div>
              </div>
            )}

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
            ) : filteredColors.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">🔍</div>
                <p className="empty-state-text">没有匹配的颜色</p>
                <p className="empty-state-sub">试试其他搜索关键词</p>
                <button
                  className="btn btn-secondary mt-4"
                  onClick={() => setSearchQuery('')}
                >
                  清除搜索
                </button>
              </div>
            ) : (
              Object.entries(groupedColors).map(([groupName, colors]) => (
                <div key={groupName} className="mb-5">
                  {groupBy !== 'none' && (
                    <div className="flex items-center gap-2 mb-3">
                      <h3
                        className="font-semibold text-sm"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        📁 {groupName}
                      </h3>
                      <span className="text-xs text-muted">({colors.length})</span>
                      <div style={{ flex: 1, height: '1px', background: 'var(--border-light)' }} />
                    </div>
                  )}

                  {viewMode === 'grid' ? (
                    <div className="palette-colors-grid">
                      {colors.map((color, index) => {
                        const actualIndex = groupBy === 'none' ? index : -1
                        return (
                          <div
                            key={color.id}
                            className="palette-color-card"
                            draggable={groupBy === 'none'}
                            onDragStart={() => handleDragStart(actualIndex)}
                            onDragOver={(e) => handleDragOver(e, actualIndex)}
                            onDragLeave={handleDragLeave}
                            onDrop={() => handleDrop(actualIndex)}
                            onDragEnd={handleDragEnd}
                            style={{
                              transform: draggedIndex === actualIndex ? 'scale(0.95) rotate(2deg)' : 'none',
                              opacity: draggedIndex === actualIndex ? 0.6 : 1,
                              boxShadow: dragOverIndex === actualIndex && draggedIndex !== actualIndex
                                ? '0 0 0 2px var(--accent-primary), var(--shadow-md)'
                                : selectedIds.has(color.id)
                                  ? '0 0 0 2px var(--accent-primary)'
                                  : undefined,
                              transition: 'all 0.15s ease',
                              cursor: groupBy === 'none' && draggedIndex !== null ? 'grabbing' : 'grab',
                              border: selectedIds.has(color.id) ? '2px solid var(--accent-primary)' : undefined,
                            }}
                          >
                            <div
                              style={{
                                position: 'absolute',
                                top: '8px',
                                left: '8px',
                                zIndex: 10,
                              }}
                              onClick={e => { e.stopPropagation(); toggleSelect(color.id) }}
                            >
                              <input
                                type="checkbox"
                                checked={selectedIds.has(color.id)}
                                onChange={() => toggleSelect(color.id)}
                                style={{
                                  width: '16px',
                                  height: '16px',
                                  cursor: 'pointer',
                                  accentColor: 'var(--accent-primary)',
                                }}
                              />
                            </div>

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
                                #{groupBy === 'none' ? index + 1 : activePalette.colors.findIndex((c: PaletteColor) => c.id === color.id) + 1}
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
                              {color.sourceImage && (
                                <div
                                  className="text-xs mt-2"
                                  style={{
                                    color: 'var(--accent-secondary)',
                                    fontSize: '10px',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                  }}
                                  title={`来源: ${color.sourceImage}`}
                                >
                                  📷 {color.sourceImage}
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid var(--border-light)' }}>
                            <th style={{ width: '40px', padding: '10px 12px' }}></th>
                            <th style={{ width: '40px', padding: '10px 12px' }}></th>
                            <th
                              style={{
                                textAlign: 'left',
                                padding: '10px 12px',
                                fontSize: '12px',
                                color: 'var(--text-muted)',
                              }}
                            >
                              名称
                            </th>
                            <th
                              style={{
                                textAlign: 'left',
                                padding: '10px 12px',
                                fontSize: '12px',
                                color: 'var(--text-muted)',
                              }}
                            >
                              HEX
                            </th>
                            <th
                              style={{
                                textAlign: 'left',
                                padding: '10px 12px',
                                fontSize: '12px',
                                color: 'var(--text-muted)',
                              }}
                            >
                              备注
                            </th>
                            <th
                              style={{
                                textAlign: 'left',
                                padding: '10px 12px',
                                fontSize: '12px',
                                color: 'var(--text-muted)',
                              }}
                            >
                              来源
                            </th>
                            <th
                              style={{
                                textAlign: 'right',
                                padding: '10px 12px',
                                fontSize: '12px',
                                color: 'var(--text-muted)',
                              }}
                            >
                              操作
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {colors.map((color: PaletteColor, idx: number) => (
                            <tr
                              key={color.id}
                              style={{
                                borderBottom: '1px solid var(--border-light)',
                                cursor: 'pointer',
                                background: selectedIds.has(color.id)
                                  ? 'rgba(139, 92, 246, 0.08)'
                                  : undefined,
                              }}
                              onClick={() => copyColor(color.hex)}
                            >
                              <td style={{ padding: '10px 12px' }}>
                                <input
                                  type="checkbox"
                                  checked={selectedIds.has(color.id)}
                                  onChange={e => { e.stopPropagation(); toggleSelect(color.id) }}
                                  onClick={e => e.stopPropagation()}
                                  style={{
                                    width: '14px',
                                    height: '14px',
                                    accentColor: 'var(--accent-primary)',
                                  }}
                                />
                              </td>
                              <td style={{ padding: '10px 12px' }}>
                                <div
                                  style={{
                                    width: '28px',
                                    height: '28px',
                                    borderRadius: '6px',
                                    background: color.hex,
                                    border: '1px solid var(--border-light)',
                                  }}
                                />
                              </td>
                              <td style={{ padding: '10px 12px', fontSize: '13px', fontWeight: 500 }}>
                                {color.name || '—'}
                              </td>
                              <td style={{ padding: '10px 12px' }}>
                                <code className="font-mono" style={{ fontSize: '12px' }}>{color.hex}</code>
                              </td>
                              <td
                                style={{
                                  padding: '10px 12px',
                                  fontSize: '12px',
                                  color: 'var(--text-muted)',
                                  maxWidth: '250px',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {color.note || '—'}
                              </td>
                              <td
                                style={{
                                  padding: '10px 12px',
                                  fontSize: '11px',
                                  color: 'var(--accent-secondary)',
                                  maxWidth: '150px',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {color.sourceImage || '—'}
                              </td>
                              <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                                <div className="flex gap-1" style={{ justifyContent: 'flex-end' }} onClick={e => e.stopPropagation()}>
                                  <button
                                    className="icon-btn"
                                    style={{ width: '24px', height: '24px', fontSize: '11px' }}
                                    onClick={() => handleDuplicate(color.id)}
                                    title="复制"
                                  >
                                    ⎘
                                  </button>
                                  <button
                                    className="icon-btn"
                                    style={{ width: '24px', height: '24px', fontSize: '11px' }}
                                    onClick={() => openEditColor(color.id)}
                                    title="编辑"
                                  >
                                    ✏️
                                  </button>
                                  <button
                                    className="icon-btn"
                                    style={{ width: '24px', height: '24px', fontSize: '11px' }}
                                    onClick={() => {
                                      removeColorFromPalette(activePalette.id, color.id)
                                      showToast('已移除颜色', 'info')
                                    }}
                                    title="删除"
                                  >
                                    🗑️
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

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
                  {modal === 'moveColors' && '➡️ 移动颜色'}
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

                {modal === 'moveColors' && (
                  <>
                    <div className="form-group">
                      <label className="form-label">
                        移动 {selectedIds.size} 个颜色到：
                      </label>
                      <select
                        className="form-input"
                        value={moveTargetPaletteId || ''}
                        onChange={e => setMoveTargetPaletteId(e.target.value)}
                      >
                        {palettes
                          .filter(p => p.id !== activePaletteId)
                          .map(p => (
                            <option key={p.id} value={p.id}>
                              {p.name} ({p.colors.length} 色)
                            </option>
                          ))}
                      </select>
                    </div>
                    <p className="text-xs text-muted">
                      移动后颜色会从当前调色板删除，添加到目标调色板。
                    </p>
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
                    else if (modal === 'moveColors') handleMoveSelected()
                  }}
                  disabled={modal === 'moveColors' && !moveTargetPaletteId}
                >
                  确定
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
