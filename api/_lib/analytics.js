import { supabaseAdminRequest } from './supabaseAdmin.js'

export async function logAnalyticsEvent({
  event_type,
  metadata = {},
  timestamp = new Date().toISOString(),
}) {
  try {
    await supabaseAdminRequest('analytics_events', {
      method: 'POST',
      headers: {
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        event_type,
        timestamp,
        metadata,
      }),
    })
  } catch (error) {
    console.error('[analytics] Failed to persist analytics event:', error.message)
  }
}
