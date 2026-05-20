import { useState } from 'react'

const DEFAULT_QUERY = `SELECT * FROM signups LIMIT 10;`

const SCHEMA = `signups        (id, signup_uuid, name, email, dob, years_fundraising, created_at)
signups_cache  (id, cache_uuid, email, name, dob, years_fundraising, status, created_at)
debug_events   (id, cache_uuid, error_uuid, event_type, payload, metadata, created_at)
emails_cache   (id, domain, valid, reason, checked_at)`

const PAGE_SIZE = 20

export default function SqlPage() {
  const [query, setQuery] = useState(DEFAULT_QUERY)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(0)

  async function handleRun(e) {
    e.preventDefault()
    setLoading(true)
    setResult(null)
    setError(null)

    try {
      const res = await fetch('/api/sql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error)
      } else {
        setResult(data)
        setPage(0)
      }
    } catch {
      setError('Failed to run query.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page">
      <div className="card">
        <div className="card-header">
          <h1 className="page-title">SQL console</h1>
          <p className="page-subtitle">Run read-only queries against the application database.</p>
        </div>

        <form onSubmit={handleRun} className="sql-form">
          <textarea
            className="sql-textarea"
            value={query}
            onChange={e => setQuery(e.target.value)}
            rows={8}
            spellCheck={false}
            autoComplete="off"
          />
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Running...' : 'Run query'}
          </button>
        </form>

        {error && (
          <div className="sql-error">
            <strong>Error:</strong> {error}
          </div>
        )}

        {result && (() => {
          const totalPages = Math.ceil(result.rows.length / PAGE_SIZE)
          const pageRows = result.rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
          return (
            <div className="sql-results">
              <p className="result-count">
                {result.rows.length} row{result.rows.length !== 1 ? 's' : ''} returned
                {totalPages > 1 && ` — page ${page + 1} of ${totalPages}`}
              </p>
              {result.rows.length > 0 && (
                <>
                  <div className="table-wrapper">
                    <table className="sql-table">
                      <thead>
                        <tr>
                          {result.columns.map(col => (
                            <th key={col}>{col}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {pageRows.map((row, i) => (
                          <tr key={i}>
                            {result.columns.map(col => (
                              <td key={col} title={row[col] !== null ? String(row[col]) : 'NULL'}>
                                {row[col] === null
                                  ? <span className="null-val">NULL</span>
                                  : String(row[col])
                                }
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {totalPages > 1 && (
                    <div className="pagination">
                      <button
                        className="btn btn-secondary"
                        onClick={() => setPage(p => p - 1)}
                        disabled={page === 0}
                      >
                        Previous
                      </button>
                      <span className="pagination-info">
                        Rows {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, result.rows.length)}
                      </span>
                      <button
                        className="btn btn-secondary"
                        onClick={() => setPage(p => p + 1)}
                        disabled={page >= totalPages - 1}
                      >
                        Next
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )
        })()}

        <div className="schema-hint">
          <p className="schema-hint-title">Available tables</p>
          <pre>{SCHEMA}</pre>
        </div>
      </div>
    </div>
  )
}
