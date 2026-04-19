const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co'
const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-public-anon-key'

export const hasValidSupabaseConfig =
  SUPABASE_URL !== 'https://your-project.supabase.co' &&
  SUPABASE_ANON_KEY !== 'your-public-anon-key'

function ensureSupabaseConfig() {
  if (!hasValidSupabaseConfig) {
    throw new Error(
      'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
    )
  }

  if (SUPABASE_ANON_KEY.includes('service_role')) {
    throw new Error('Service role key is not allowed in frontend environment.')
  }
}

const headers = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json',
}

function buildUrl(table, query = '') {
  return `${SUPABASE_URL}/rest/v1/${table}${query}`
}

export async function supabaseRequest(path, options = {}) {
  ensureSupabaseConfig()

  const response = await fetch(buildUrl(path), {
    ...options,
    headers: {
      ...headers,
      ...(options.headers || {}),
    },
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(errorText || `Supabase request failed with status ${response.status}.`)
  }

  if (response.status === 204) {
    return null
  }

  return response.json()
}
