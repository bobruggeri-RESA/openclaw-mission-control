'use client'

import { Component, ErrorInfo, ReactNode } from 'react'
import { AlertCircle, RefreshCw } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  title?: string
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback

      return (
        <div
          className="rounded-xl p-6 flex flex-col items-center gap-3 text-center"
          style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)' }}
        >
          <AlertCircle size={32} color="#F87171" />
          <div>
            <p className="font-semibold" style={{ color: '#F87171' }}>
              {this.props.title || 'Something went wrong'}
            </p>
            <p className="text-sm mt-1" style={{ color: '#94A3B8' }}>
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
          </div>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
            style={{ background: 'rgba(248,113,113,0.15)', color: '#F87171' }}
          >
            <RefreshCw size={14} />
            Try Again
          </button>
        </div>
      )
    }

    return this.props.children
  }
}

export function ErrorMessage({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div
      className="rounded-xl p-4 flex items-center gap-3"
      style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)' }}
    >
      <AlertCircle size={20} color="#F87171" className="flex-shrink-0" />
      <div className="flex-1">
        <p className="text-sm" style={{ color: '#F87171' }}>{message}</p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="text-sm px-3 py-1 rounded-lg transition-colors"
          style={{ background: 'rgba(248,113,113,0.15)', color: '#F87171' }}
        >
          Retry
        </button>
      )}
    </div>
  )
}
