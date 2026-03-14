'use client'

interface SkeletonProps {
  className?: string
  width?: string
  height?: string
}

export function Skeleton({ className = '', width, height }: SkeletonProps) {
  return (
    <div
      className={`skeleton ${className}`}
      style={{ width, height: height || '1rem' }}
    />
  )
}

export function CardSkeleton() {
  return (
    <div className="card">
      <div className="flex items-center gap-3 mb-4">
        <Skeleton width="40px" height="40px" className="rounded-full" />
        <div className="flex-1">
          <Skeleton width="60%" height="1rem" className="mb-2" />
          <Skeleton width="40%" height="0.75rem" />
        </div>
      </div>
      <Skeleton width="100%" height="0.75rem" className="mb-2" />
      <Skeleton width="80%" height="0.75rem" className="mb-2" />
      <Skeleton width="60%" height="0.75rem" />
    </div>
  )
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 p-3 rounded-lg" style={{ background: 'var(--bg-card)' }}>
          <Skeleton width="120px" />
          <Skeleton width="200px" />
          <Skeleton width="80px" />
          <Skeleton width="100px" />
        </div>
      ))}
    </div>
  )
}

export function PageSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-4 mb-6">
        <Skeleton width="200px" height="2rem" />
        <Skeleton width="100px" height="1.5rem" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
      <TableSkeleton rows={8} />
    </div>
  )
}
