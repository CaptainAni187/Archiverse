import { backendAdminRequest, backendRequest } from './backendApiService'

export async function fetchActiveCombos(artworkId = null) {
  try {
    const query = artworkId ? `?action=combos&artworkId=${Number(artworkId)}` : '?action=combos'
    const payload = await backendRequest(`/api/artworks${query}`)
    return Array.isArray(payload.data) ? payload.data : []
  } catch {
    return []
  }
}

export async function fetchAdminCombos() {
  try {
    const payload = await backendAdminRequest('/api/artworks?action=combos&admin=true')
    return Array.isArray(payload.data) ? payload.data : []
  } catch {
    return []
  }
}

export async function createAdminCombo(combo) {
  const payload = await backendAdminRequest('/api/artworks?action=combos', {
    method: 'POST',
    body: JSON.stringify(combo),
  })

  return payload.data
}

export async function updateAdminCombo(comboId, combo) {
  const payload = await backendAdminRequest(
    `/api/artworks?action=combos&comboId=${encodeURIComponent(comboId)}`,
    {
      method: 'PUT',
      body: JSON.stringify(combo),
    },
  )

  return payload.data
}

export async function deleteAdminCombo(comboId) {
  const payload = await backendAdminRequest(
    `/api/artworks?action=combos&comboId=${encodeURIComponent(comboId)}`,
    {
      method: 'DELETE',
    },
  )

  return payload.data
}
