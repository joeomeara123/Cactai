'use client'

import { useEffect, useState } from 'react'
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

interface ToastProps {
  message: string
  type: ToastType
  onClose: () => void
  duration?: number | undefined
}

const toastConfig = {
  success: {
    icon: CheckCircle,
    className: 'bg-green-900 border-green-700 text-green-100',
  },
  error: {
    icon: XCircle,
    className: 'bg-red-900 border-red-700 text-red-100',
  },
  warning: {
    icon: AlertCircle,
    className: 'bg-yellow-900 border-yellow-700 text-yellow-100',
  },
  info: {
    icon: Info,
    className: 'bg-blue-900 border-blue-700 text-blue-100',
  },
}

export function Toast({ message, type, onClose, duration = 5000 }: ToastProps) {
  const [isVisible, setIsVisible] = useState(true)
  const config = toastConfig[type]
  const IconComponent = config.icon

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false)
      setTimeout(onClose, 300) // Wait for fade out animation
    }, duration)

    return () => clearTimeout(timer)
  }, [duration, onClose])

  return (
    <div
      className={`
        fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg
        transition-all duration-300 max-w-md
        ${config.className}
        ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}
      `}
    >
      <IconComponent className="h-5 w-5 flex-shrink-0" />
      <p className="text-sm font-medium flex-1">{message}</p>
      <button
        onClick={() => {
          setIsVisible(false)
          setTimeout(onClose, 300)
        }}
        className="p-1 hover:bg-white/10 rounded transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

// Toast manager hook
export function useToast() {
  const [toasts, setToasts] = useState<Array<{ id: string } & ToastProps>>([])

  const showToast = (message: string, type: ToastType = 'info', duration?: number | undefined) => {
    const id = crypto.randomUUID()
    const toast = {
      id,
      message,
      type,
      duration,
      onClose: () => removeToast(id),
    }
    setToasts((prev) => [...prev, toast])
  }

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }

  const ToastContainer = () => (
    <div className="fixed top-0 right-0 z-50 p-4 space-y-2">
      {toasts.map((toast) => (
        <Toast key={toast.id} {...toast} />
      ))}
    </div>
  )

  return {
    showToast,
    ToastContainer,
  }
}