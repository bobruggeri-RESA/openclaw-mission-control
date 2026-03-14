import { TopBar } from '@/components/layout/TopBar'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <TopBar />
      <main className="p-6 max-w-screen-2xl mx-auto animate-fade-in">
        {children}
      </main>
    </div>
  )
}
