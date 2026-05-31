function SkeletonBlock({ className = "", style, width, height, rounded = "sm" }) {
  const radius =
    rounded === "pill" ? "var(--radius-pill)" : rounded === "md" ? "var(--radius-md)" : "var(--radius-sm)";
  return (
    <div
      className={`skeleton-block ${className}`.trim()}
      style={{ width, height, borderRadius: radius, ...style }}
      aria-hidden="true"
    />
  );
}

function SkeletonTable({ columns, rows = 5, colWidths }) {
  return (
    <div className="card skeleton-table-wrap" aria-busy="true" aria-label="Loading">
      <div className="skeleton-table-head">
        {Array.from({ length: columns }).map((_, i) => (
          <SkeletonBlock key={i} height={12} width={colWidths?.[i] || "70%"} />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, row) => (
        <div key={row} className="skeleton-table-row">
          {Array.from({ length: columns }).map((__, col) => (
            <SkeletonBlock
              key={col}
              height={14}
              width={colWidths?.[col] || (col === 0 ? "85%" : "60%")}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function AnalyticsStatsSkeleton({ cards = 4 }) {
  return (
    <div className="stats-grid skeleton-stats-grid" aria-busy="true" aria-label="Loading analytics">
      {Array.from({ length: cards }).map((_, i) => (
        <div key={i} className="stat-card skeleton-stat-card">
          <SkeletonBlock height={10} width="55%" />
          <SkeletonBlock height={32} width="40%" style={{ marginTop: 4 }} />
          <SkeletonBlock height={10} width="70%" style={{ marginTop: "auto" }} />
        </div>
      ))}
    </div>
  );
}

export function AccessTabSkeleton() {
  return (
    <div className="skeleton-tab" aria-busy="true" aria-label="Loading access">
      <div className="filter-bar skeleton-filter-bar">
        <SkeletonBlock height={38} width={140} rounded="md" />
        <SkeletonBlock height={38} width={160} rounded="md" />
        <SkeletonBlock height={32} width={88} rounded="md" />
      </div>
      <SkeletonTable
        columns={6}
        rows={6}
        colWidths={["70%", "80%", "55%", "50%", "40%", "35%"]}
      />
    </div>
  );
}

export function HolidaysTabSkeleton() {
  return (
    <div className="skeleton-tab" aria-busy="true" aria-label="Loading holidays">
      <div className="weekend-work-panel">
        <div className="card weekend-work-form skeleton-holiday-form">
          <SkeletonBlock height={18} width="45%" style={{ marginBottom: 20 }} />
          <SkeletonBlock height={12} width="20%" style={{ marginBottom: 8 }} />
          <SkeletonBlock height={40} width="100%" rounded="md" style={{ marginBottom: 16 }} />
          <SkeletonBlock height={12} width="30%" style={{ marginBottom: 8 }} />
          <SkeletonBlock height={40} width="100%" rounded="md" style={{ marginBottom: 20 }} />
          <SkeletonBlock height={40} width={120} rounded="md" />
        </div>

        <div className="card weekend-work-stats skeleton-holiday-list">
          <div className="skeleton-holiday-list-header">
            <SkeletonBlock height={18} width="40%" />
            <SkeletonBlock height={32} width={88} rounded="md" />
          </div>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="skeleton-holiday-row">
              <div className="skeleton-holiday-row-text">
                <SkeletonBlock height={14} width="55%" />
                <SkeletonBlock height={10} width="30%" style={{ marginTop: 8 }} />
              </div>
              <SkeletonBlock height={32} width={72} rounded="md" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function LeavesTabSkeleton() {
  return (
    <div className="card skeleton-table-card" aria-busy="true" aria-label="Loading leaves">
      <div className="filter-bar skeleton-filter-bar" style={{ padding: "12px 16px", marginBottom: 0 }}>
        <SkeletonBlock height={38} width={120} rounded="md" />
        <SkeletonBlock height={14} width={80} />
        <SkeletonBlock height={32} width={88} rounded="md" />
      </div>
      <div className="skeleton-table-wrap skeleton-table-inset">
        <div className="skeleton-table-head skeleton-table-head-6">
          {["75%", "45%", "45%", "60%", "40%", "35%"].map((w, i) => (
            <SkeletonBlock key={i} height={12} width={w} />
          ))}
        </div>
        {Array.from({ length: 5 }).map((_, row) => (
          <div key={row} className="skeleton-table-row skeleton-table-row-6">
            {["80%", "50%", "50%", "70%", "35%", "55%"].map((w, col) => (
              <SkeletonBlock key={col} height={14} width={w} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
