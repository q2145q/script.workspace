export default function WorkspaceLoading() {
  return (
    <div className="flex h-screen animate-pulse bg-background">
      {/* Sidebar skeleton */}
      <div className="w-64 border-r border-border bg-card p-4 space-y-4">
        <div className="h-6 w-32 rounded bg-muted" />
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-4 rounded bg-muted" style={{ width: `${70 + Math.random() * 30}%` }} />
          ))}
        </div>
      </div>

      {/* Editor skeleton */}
      <div className="flex-1 p-8 space-y-4">
        <div className="mx-auto max-w-2xl space-y-3">
          <div className="h-6 w-2/3 rounded bg-muted" />
          <div className="h-4 w-full rounded bg-muted" />
          <div className="h-4 w-5/6 rounded bg-muted" />
          <div className="h-4 w-4/5 rounded bg-muted" />
          <div className="h-6 w-1/2 rounded bg-muted mt-6" />
          <div className="h-4 w-full rounded bg-muted" />
          <div className="h-4 w-3/4 rounded bg-muted" />
        </div>
      </div>
    </div>
  );
}
