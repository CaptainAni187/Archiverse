import { backendAdminRequest, backendRequest } from './backendApiService'

function parseCommission(commission) {
  return {
    ...commission,
    reference_images: Array.isArray(commission.reference_images)
      ? commission.reference_images
      : [],
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

  files.forEach((file) => {
    formData.append('reference_images', file)
  })

  const payload = await backendRequest('/api/commissions', {
    method: 'POST',
    body: formData,
  })

  return parseCommission(payload.commission)
}

export async function fetchCommissions() {
  const payload = await backendAdminRequest('/api/commissions')
  return payload.commissions.map(parseCommission)
}

export async function updateCommissionStatus(id, status) {
  const payload = await backendAdminRequest(`/api/commissions/${Number(id)}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  })

  return parseCommission(payload.commission)
}
