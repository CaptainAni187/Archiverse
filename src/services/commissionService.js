import { backendAdminRequest, backendRequest } from './backendApiService'

function parseCommission(commission) {
  return {
    ...commission,
    reference_images: Array.isArray(commission.reference_images)
      ? commission.reference_images
      : [],
    idea_text: commission.idea_text || commission.description || '',
    structured_brief: commission.structured_brief && typeof commission.structured_brief === 'object'
      ? commission.structured_brief
      : {},
    clearer_brief: commission.clearer_brief || '',
    suggested_reply: commission.suggested_reply || '',
    status: commission.status || 'pending',
  }
}

export async function submitCommission(form, files) {
  const formData = new FormData()
  formData.append('name', form.name)
  formData.append('email', form.email)
  formData.append('phone', form.phone)
  formData.append('artwork_type', form.artwork_type)
  formData.append('size', form.size)
  formData.append('deadline', form.deadline)
  formData.append('description', form.description)
  formData.append('idea_text', form.idea_text || '')
  formData.append('structured_brief', JSON.stringify(form.structured_brief || {}))
  formData.append('clearer_brief', form.clearer_brief || '')
  formData.append('suggested_reply', form.suggested_reply || '')

  files.forEach((file) => {
    formData.append('reference_images', file)
  })

  const payload = await backendRequest('/api/commissions', {
    method: 'POST',
    body: formData,
  })

  return parseCommission(payload.data?.commission)
}

export async function fetchCommissions() {
  const payload = await backendAdminRequest('/api/commissions')
  return (payload.data || []).map(parseCommission)
}

export async function updateCommissionStatus(id, status) {
  const payload = await backendAdminRequest(`/api/commissions/${Number(id)}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  })

  return parseCommission(payload.data)
}
