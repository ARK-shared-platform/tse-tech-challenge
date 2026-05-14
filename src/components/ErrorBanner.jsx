import { useState } from 'react'

export default function ErrorBanner({ errorId }) {
  const [copied, setCopied] = useState(false)

  function copyId() {
    navigator.clipboard.writeText(errorId).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="error-banner">
      <div className="error-banner-icon">!</div>
      <div className="error-banner-body">
        <p className="error-banner-message">
          An unexpected error occurred. Please try again or contact support.
        </p>
        <div className="error-banner-id">
          <span className="error-id-label">Error ID</span>
          <code className="error-id-value">{errorId}</code>
          <button className="copy-btn" onClick={copyId}>
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>
    </div>
  )
}
