import { useState } from 'react'

export default function LogsPage() {
  const [errorId, setErrorId] = useState('')
  const [entries, setEntries] = useState(null)
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  async function handleSearch(e) {
    e.preventDefault()
    if (!errorId.trim()) return

    setLoading(true)
    setEntries(null)

    try {
      const res = await fetch('/api/logs/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ errorId: errorId.trim() })
      })
      const data = await res.json()
      setEntries(data.entries || [])
      setSearched(true)
    } catch {
      setEntries([])
      setSearched(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page">
      <div className="card">
        <div className="card-header">
          <h1 className="page-title">Log search</h1>
          <p className="page-subtitle">Search application logs by error ID.</p>
        </div>

        <form onSubmit={handleSearch} className="search-form">
          <input
            type="text"
            className="form-input search-input"
            value={errorId}
            onChange={e => setErrorId(e.target.value)}
            placeholder="Paste error ID here..."
            spellCheck={false}
            autoComplete="off"
          />
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Searching...' : 'Search'}
          </button>
        </form>

        {searched && entries !== null && (
          <div className="log-results">
            {entries.length === 0 ? (
              <p className="empty-state">No log entries found for that error ID.</p>
            ) : (
              entries.map((entry, i) => (
                <div key={i} className={`log-entry log-${(entry.level || 'info').toLowerCase()}`}>
                  <div className="log-meta">
                    <span className={`log-level level-${(entry.level || 'info').toLowerCase()}`}>
                      {entry.level}
                    </span>
                    <span className="log-timestamp">{entry.timestamp}</span>
                    {entry.signup_id && (
                      <span className="log-tag">signup: {entry.signup_id}</span>
                    )}
                    {entry.event_type && (
                      <span className="log-tag">{entry.event_type}</span>
                    )}
                  </div>
                  <p className="log-message">{entry.message}</p>
                  {entry.stack && (
                    <pre className="log-stack">{entry.stack}</pre>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}
