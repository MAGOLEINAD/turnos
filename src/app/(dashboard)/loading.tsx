export default function DashboardLoading() {
  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="w-64 border-r bg-white p-6">
        <div className="mb-6 h-7 w-40 animate-pulse rounded bg-muted" />
        <div className="mb-8 h-5 w-28 animate-pulse rounded bg-muted" />
        <div className="space-y-3">
          <div className="h-9 w-full animate-pulse rounded bg-muted" />
          <div className="h-9 w-full animate-pulse rounded bg-muted" />
          <div className="h-9 w-full animate-pulse rounded bg-muted" />
        </div>
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="h-16 border-b bg-white px-6">
          <div className="flex h-full items-center justify-between">
            <div className="h-6 w-32 animate-pulse rounded bg-muted" />
            <div className="h-9 w-40 animate-pulse rounded bg-muted" />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-gray-50 p-6">
          <div className="mb-6 h-10 w-64 animate-pulse rounded bg-muted" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="h-36 animate-pulse rounded-lg bg-muted" />
            <div className="h-36 animate-pulse rounded-lg bg-muted" />
            <div className="h-36 animate-pulse rounded-lg bg-muted" />
          </div>
        </main>
      </div>
    </div>
  )
}
