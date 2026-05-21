import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'

function formatJsonField(value) {
  if (value == null || value === '') return null
  if (typeof value === 'object') {
    return JSON.stringify(value, null, 2)
  }
  try {
    return JSON.stringify(JSON.parse(value), null, 2)
  } catch {
    return String(value)
  }
}

export default function LogsPage() {
  const [searchParams] = useSearchParams()
  const [errorId, setErrorId] = useState('')
  const [entries, setEntries] = useState(null)
  const [loading, setLoading] = useState(false)

  const runSearch = useCallback(async (id) => {
    const trimmed = id.trim()
    if (!trimmed) return

    setLoading(true)
    try {
      const res = await fetch('/api/logs/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ errorId: trimmed })
      })
      const data = await res.json()
      setEntries(data.entries || [])
    } catch {
      setEntries([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const fromUrl = searchParams.get('error_uuid')
    if (fromUrl) {
      setErrorId(fromUrl)
      runSearch(fromUrl)
    }
  }, [searchParams, runSearch])

  async function handleSearch(e) {
    e.preventDefault()
    await runSearch(errorId)
  }

  return (
    <div className="page">
      <div className="card">
        <div className="card-header">
          <h1 className="page-title">Log search</h1>
          <p className="page-subtitle">Search log entries by error UUID.</p>
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
            {loading ? 'Searching...' : 'Search'}
          </button>
        </form>

        {entries !== null && (
          <div className="log-results">
            {entries.length === 0 ? (
              <p className="empty-state">No log entries found.</p>
            ) : (
              <>
                <p className="result-count" style={{ marginBottom: '12px', fontSize: '13px', color: 'var(--text-2)' }}>
                  {entries.length} result{entries.length !== 1 ? 's' : ''}
                </p>
                {entries.map((entry, i) => {
                  const payloadText = formatJsonField(entry.payload)
                  const metadataText = formatJsonField(entry.metadata)
                  return (
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
                      {payloadText && (
                        <>
                          <p className="log-field-label">Payload</p>
                          <pre className="log-metadata">{payloadText}</pre>
                        </>
                      )}
                      {metadataText && (
                        <>
                          <p className="log-field-label">Metadata</p>
                          <pre className="log-metadata">{metadataText}</pre>
                        </>
                      )}
                    </div>
                  )
                })}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
