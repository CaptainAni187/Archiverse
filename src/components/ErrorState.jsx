function ErrorState({
  message,
  onRetry,
  retryLabel = 'Try Again',
  className = '',
}) {
  return (
    <div className={`error-state ${className}`.trim()} role="alert">
      <p className="status-message error">{message}</p>
      {onRetry ? (
        <button type="button" className="text-link-button action-button secondary-action" onClick={onRetry}>
          {retryLabel}
        </button>
      ) : null}
    </div>
  )
}

export default ErrorState
