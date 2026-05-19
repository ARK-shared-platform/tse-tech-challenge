export default function ErrorBanner() {
  return (
    <div className="error-banner">
      <div className="error-banner-icon">!</div>
      <div className="error-banner-body">
        <p className="error-banner-message">
          An unexpected error occurred. Please try again or contact support.
        </p>
      </div>
    </div>
  )
}
