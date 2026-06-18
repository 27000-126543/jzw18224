import { useState, useEffect } from 'react'
import ColorPickerTab from './components/ColorPickerTab'
import PaletteTab from './components/PaletteTab'
import ImageExtractorTab from './components/ImageExtractorTab'
import ContrastTab from './components/ContrastTab'
import ExportTab from './components/ExportTab'
import { useAppStore } from './store/useAppStore'
import type { PickedColor } from './types'
import Toast from './components/Toast'

type TabId = 'picker' | 'palettes' | 'image' | 'contrast' | 'export'

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'picker', label: '取色器', icon: '🎯' },
  { id: 'palettes', label: '调色板', icon: '🎨' },
  { id: 'image', label: '图片取色', icon: '🖼️' },
  { id: 'contrast', label: '对比度', icon: '📊' },
  { id: 'export', label: '导出', icon: '📤' },
]

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>('picker')
  const { addToHistory, setCurrentColor } = useAppStore()
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)

  useEffect(() => {
    const api = window.electronAPI
    if (!api) return

    const cleanup = api.picker.onColorPicked((color: PickedColor) => {
      const fullColor = {
        ...color,
        timestamp: Date.now(),
      }
      setCurrentColor(fullColor)
      addToHistory(fullColor)
      showToast(`已拾取颜色 ${color.hex}`, 'success')
    })

    return () => {
      if (typeof cleanup === 'function') cleanup()
      api.picker.removeColorPickedListener()
    }
  }, [addToHistory, setCurrentColor])

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 2500)
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="app-logo">
          <div className="logo-icon">🎨</div>
          <div>
            <div className="logo-text">ColorPicker Pro</div>
            <div className="logo-subtitle">专业取色与调色板管理工具</div>
          </div>
        </div>

        <nav className="tab-nav">
          {TABS.map(tab => (
            <button
              key={tab.id}
              className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="text-xs text-muted" style={{ fontFamily: 'var(--font-mono)' }}>
          v1.0.0
        </div>
      </header>

      <main className="app-main">
        <div className="tab-content">
          {activeTab === 'picker' && <ColorPickerTab showToast={showToast} />}
          {activeTab === 'palettes' && <PaletteTab showToast={showToast} />}
          {activeTab === 'image' && <ImageExtractorTab showToast={showToast} />}
          {activeTab === 'contrast' && <ContrastTab />}
          {activeTab === 'export' && <ExportTab showToast={showToast} />}
        </div>
      </main>

      <footer className="app-footer">
        <span>设计师 & 前端开发者的得力助手 💜</span>
        <span>按 ESC 取消取色 | 点击即可拾取屏幕任意像素</span>
      </footer>

      {toast && <Toast message={toast.message} type={toast.type} />}
    </div>
  )
}
