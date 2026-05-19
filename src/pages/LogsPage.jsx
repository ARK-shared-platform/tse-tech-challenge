import { useState, useEffect } from 'react'

export default function LogsPage() {
  const [errorId, setErrorId] = useState('')
  const [entries, setEntries] = useState(null)
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState('recent') // 'recent' | 'search'

  useEffect(() => {
    loadRecent()
  }, [])

  async function loadRecent() {
    setLoading(true)
    setMode('recent')
    try {
      const res = await fetch('/api/logs/recent')
      const data = await res.json()
      setEntries(data.entries || [])
    } catch {
      setEntries([])
    } finally {
      setLoading(false)
    }
  }

  async function handleSearch(e) {
    e.preventDefault()
    if (!errorId.trim()) return

    setLoading(true)
    setMode('search')
    try {
      const res = await fetch('/api/logs/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ errorId: errorId.trim() })
      })
      const data = await res.json()
      setEntries(data.entries || [])
    } catch {
      setEntries([])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page">
      <div className="card">
        <div className="card-header">
          <h1 className="page-title">Log search</h1>
          <p className="page-subtitle">Browse recent errors or search by error UUID.</p>
        </div>

        <form onSubmit={handleSearch} className="search-form">
          <input
            type="text"
            className="form-input search-input"
            value={errorId}
            onChange={e => setErrorId(e.target.value)}
            placeholder="Search by error UUID..."
            spellCheck={false}
            autoComplete="off"
          />
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading && mode === 'search' ? 'Searching...' : 'Search'}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={loadRecent}
            disabled={loading}
          >
            Recent errors
          </button>
        </form>

        {entries !== null && (
          <div className="log-results">
            {entries.length === 0 ? (
              <p className="empty-state">No log entries found.</p>
            ) : (
              <>
                <p className="result-count" style={{ marginBottom: '12px', fontSize: '13px', color: 'var(--text-2)' }}>
                  {mode === 'recent' ? `${entries.length} recent error${entries.length !== 1 ? 's' : ''}` : `${entries.length} result${entries.length !== 1 ? 's' : ''}`}
                </p>
                {entries.map((entry, i) => (
                  <div key={i} className={`log-entry log-${(entry.level || 'info').toLowerCase()}`}>
                    <div className="log-meta">
                      <span className={`log-level level-${(entry.level || 'info').toLowerCase()}`}>
                        {entry.level}
                      </span>
                      <span className="log-timestamp">{entry.timestamp}</span>
                      {entry.event_type && (
                        <span className="log-tag">{entry.event_type}</span>
                      )}
                      {entry.error_uuid && (
                        <span className="log-tag">error_uuid: {entry.error_uuid}</span>
                      )}
                    </div>
                    <p className="log-message">{entry.message}</p>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
