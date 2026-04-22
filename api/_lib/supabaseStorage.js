import crypto from 'node:crypto'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { getBackendConfig, requireConfigValues } from './env.js'

const BUCKET_NAME = 'artworks'

export async function uploadPublicFile(file, bucketName = BUCKET_NAME, prefix = 'uploads') {
  const config = getBackendConfig()

  requireConfigValues({
    SUPABASE_URL: config.supabaseUrl,
    SUPABASE_SERVICE_ROLE_KEY: config.supabaseServiceRoleKey,
  })

  const fileBuffer = await readFile(file.filepath)
  const extension = path.extname(file.originalFilename || '').toLowerCase()
  const safeExtension = extension && extension.length <= 10 ? extension : ''
  const storagePath = `${prefix}/${Date.now()}-${crypto.randomUUID()}${safeExtension}`

  const normalizedBaseUrl = config.supabaseUrl.replace(/\/+$/, '')
  const uploadResponse = await fetch(
    `${normalizedBaseUrl}/storage/v1/object/${bucketName}/${storagePath}`,
    {
      method: 'POST',
      headers: {
        apikey: config.supabaseServiceRoleKey,
        Authorization: `Bearer ${config.supabaseServiceRoleKey}`,
        'Content-Type': file.mimetype || 'application/octet-stream',
        'cache-control': 'public, max-age=31536000, immutable',
        'x-upsert': 'false',
      },
      body: fileBuffer,
    },
  )

  if (!uploadResponse.ok) {
    const errorText = await uploadResponse.text()
    const uploadError = new Error(errorText || 'Unable to upload public file.')
    uploadError.status = uploadResponse.status
    throw uploadError
  }

  return {
    path: storagePath,
    url: `${normalizedBaseUrl}/storage/v1/object/public/${bucketName}/${storagePath}`,
  }
}

export async function uploadArtworkImageFile(file) {
  return uploadPublicFile(file, BUCKET_NAME, 'uploads')
}
