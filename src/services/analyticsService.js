import { backendRequest } from './backendApiService'

export async function trackAnalyticsEvent(eventType, metadata = {}) {
  try {
    await backendRequest('/api/analytics', {
      method: 'POST',
      body: JSON.stringify({
        event_type: eventType,
        metadata,
      }),
    })
  } catch (error) {
    console.error('Analytics tracking failed:', error)
  }
}
