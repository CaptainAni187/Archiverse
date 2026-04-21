import { requireAdminAuth } from './_lib/adminSession.js'
import { getBackendConfig } from './_lib/env.js'
import { getMultipartFiles, parseMultipartForm } from './_lib/multipart.js'
import { methodNotAllowed, readJson, sendJson } from './_lib/http.js'
import { notifyCommissionRequest } from './_lib/notifications.js'
import { uploadPublicFile } from './_lib/supabaseStorage.js'
import {
  commissionPayloadSchema,
  sendValidationError,
  validateWithSchema,
} from './_lib/validation.js'
import {
  createCommission,
  fetchCommissions,
} from './_lib/supabaseAdmin.js'

const COMMISSION_BUCKET = 'commission-references'

export const config = {
  api: {
    bodyParser: false,
  },
}

function normalizeCommission(commission) {
  return {
    ...commission,
    reference_images: Array.isArray(commission.reference_images)
      ? commission.reference_images
      : [],
    status: commission.status || 'pending',
  }
}

async function handleCreateCommission(req, res) {
  const contentType = String(req.headers['content-type'] || '')
  let body = {}

  if (contentType.includes('multipart/form-data')) {
    const { fields, files } = await parseMultipartForm(req, {
      maxFiles: 5,
      maxFileSize: 10 * 1024 * 1024,
    })

    const referenceFiles = getMultipartFiles(files, 'reference_images')
    const invalidFile = referenceFiles.find(
      (file) => typeof file.mimetype !== 'string' || !file.mimetype.startsWith('image/'),
    )

    if (invalidFile) {
      return sendJson(res, 400, {
        success: false,
        error: 'VALIDATION_ERROR',
        details: [
          {
            path: 'reference_images',
            message: 'Only image files are allowed.',
            code: 'custom',
          },
        ],
      })
    }

    const uploadedImages = await Promise.all(
      referenceFiles.map((file) =>
        uploadPublicFile(file, COMMISSION_BUCKET, 'references').then((uploaded) => uploaded.url),
      ),
    )

    body = {
      name: Array.isArray(fields.name) ? fields.name[0] : fields.name,
      email: Array.isArray(fields.email) ? fields.email[0] : fields.email,
      phone: Array.isArray(fields.phone) ? fields.phone[0] : fields.phone,
      artwork_type: Array.isArray(fields.artwork_type)
        ? fields.artwork_type[0]
        : fields.artwork_type,
      size: Array.isArray(fields.size) ? fields.size[0] : fields.size,
      deadline: Array.isArray(fields.deadline) ? fields.deadline[0] : fields.deadline,
      description: Array.isArray(fields.description)
        ? fields.description[0]
        : fields.description,
      reference_images: uploadedImages,
    }
  } else {
    body = await readJson(req)
  }

  const payload = {
    ...validateWithSchema(commissionPayloadSchema, body),
    status: 'pending',
  }
  const commission = await createCommission(payload)
  const notifications = await notifyCommissionRequest(
    normalizeCommission(commission),
    getBackendConfig(),
  )

  return sendJson(res, 201, {
    success: true,
    commission: normalizeCommission(commission),
    notifications,
  })
}

async function handleFetchCommissions(req, res) {
  if (!requireAdminAuth(req, res)) {
    return null
  }

  const commissions = await fetchCommissions()
  return sendJson(res, 200, {
    success: true,
    commissions: commissions.map(normalizeCommission),
  })
}

export default async function handler(req, res) {
  try {
    if (req.method === 'POST') {
      return await handleCreateCommission(req, res)
    }

    if (req.method === 'GET') {
      return await handleFetchCommissions(req, res)
    }

    return methodNotAllowed(res, ['GET', 'POST'])
  } catch (error) {
    if (error.validationIssues) {
      return sendValidationError(res, error.validationIssues)
    }

    return sendJson(res, error.status || 500, {
      success: false,
      message: error.message || 'Unable to process commission request.',
    })
  }
}
