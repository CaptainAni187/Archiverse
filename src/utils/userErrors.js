export function getUserFriendlyError(error, fallbackMessage = 'Something went wrong. Please try again.') {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return 'You appear to be offline. Check your internet connection and try again.'
  }

  const message = String(error?.message || '').trim()
  const normalizedMessage = message.toLowerCase()

  if (!message) {
    return fallbackMessage
  }

  if (
    normalizedMessage.includes('failed to fetch') ||
    normalizedMessage.includes('networkerror') ||
    normalizedMessage.includes('network request failed')
  ) {
    return 'We could not reach the server. Please try again in a moment.'
  }

  if (
    normalizedMessage.includes('invalid response') ||
    normalizedMessage.includes('request failed (5') ||
    normalizedMessage.includes('supabase request failed')
  ) {
    return 'The service is having trouble right now. Please retry shortly.'
  }

  if (normalizedMessage.includes('not found')) {
    return 'The requested item could not be found.'
  }

  if (normalizedMessage.includes('payment') || normalizedMessage.includes('razorpay')) {
    return message
  }

  return message || fallbackMessage
}
