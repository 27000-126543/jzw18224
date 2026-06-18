interface ToastProps {
  message: string
  type?: 'success' | 'error' | 'info'
}

export default function Toast({ message, type = 'info' }: ToastProps) {
  const icons = {
    success: '✅',
    error: '❌',
    info: 'ℹ️',
  }

  return (
    <div className={`toast ${type}`}>
      <span>{icons[type]}</span>
      <span>{message}</span>
    </div>
  )
}
