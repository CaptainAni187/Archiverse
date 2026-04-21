import { requireAdminAuth } from '../../_lib/adminSession.js'
import { methodNotAllowed, readJson, sendJson } from '../../_lib/http.js'
import {
  fetchCommissionById,
  updateCommissionById,
} from '../../_lib/supabaseAdmin.js'
import {
  commissionStatusUpdateSchema,
  sendValidationError,
  validateWithSchema,
} from '../../_lib/validation.js'

function normalizeCommission(commission) {
  return {
    ...commission,
    reference_images: Array.isArray(commission.reference_images)
      ? commission.reference_images
      : [],
    status: commission.status || 'pending',
  }
}

export default async function handler(req, res) {
  if (req.method !== 'PATCH') {
    return methodNotAllowed(res, ['PATCH'])
  }

  try {
    if (!requireAdminAuth(req, res)) {
      return null
    }

    const commissionId = Number(req.query.id)
    if (!Number.isInteger(commissionId) || commissionId <= 0) {
      return sendJson(res, 400, {
        success: false,
        message: 'A valid commission id is required.',
      })
    }

    const body = await readJson(req)
    const payload = validateWithSchema(commissionStatusUpdateSchema, body)
    const existingCommission = await fetchCommissionById(commissionId)

    if (!existingCommission) {
      return sendJson(res, 404, {
        success: false,
        message: 'Commission not found.',
      })
    }

    const updatedCommission = await updateCommissionById(commissionId, payload)

    return sendJson(res, 200, {
      success: true,
      commission: normalizeCommission(updatedCommission),
    })
  } catch (error) {
    if (error.validationIssues) {
      return sendValidationError(res, error.validationIssues)
    }

    return sendJson(res, error.status || 500, {
      success: false,
      message: error.message || 'Unable to update commission status.',
    })
  }
}
