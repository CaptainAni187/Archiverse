import formidable from 'formidable'
import { requireAdminAuth } from './_lib/adminSession.js'
import { methodNotAllowed, sendJson } from './_lib/http.js'
import { uploadArtworkImageFile } from './_lib/supabaseStorage.js'

export const config = {
  api: {
    bodyParser: false,
  },
}

function parseMultipartForm(req) {
  const form = formidable({
    multiples: true,
    maxFiles: 5,
    maxFileSize: 10 * 1024 * 1024,
    keepExtensions: true,
  })

  return new Promise((resolve, reject) => {
    form.parse(req, (error, fields, files) => {
      if (error) {
        reject(error)
        return
      }

      resolve({ fields, files })
    })
  })
}

function getImageFiles(files) {
  const candidates = files.images || files.files || []
  const list = Array.isArray(candidates) ? candidates : [candidates]

  return list.filter((file) => file && typeof file === 'object')
}

export async function buildUploadedImagesResponse(imageFiles, uploader = uploadArtworkImageFile) {
  return Promise.all(
    imageFiles.map(async (file, index) => {
      const uploaded = await uploader(file)
      return {
        url: uploaded.url,
        is_primary: index === 0,
      }
    }),
  )
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return methodNotAllowed(res, ['POST'])
  }

  try {
    if (!requireAdminAuth(req, res)) {
      return null
    }

    const { files } = await parseMultipartForm(req)
    const imageFiles = getImageFiles(files)

    if (imageFiles.length < 1 || imageFiles.length > 5) {
      return sendJson(res, 400, {
        success: false,
        error: 'VALIDATION_ERROR',
        details: [
          {
            path: 'images',
            message: 'Images must contain between 1 and 5 files.',
            code: 'custom',
          },
        ],
      })
    }

    const invalidFile = imageFiles.find(
      (file) => typeof file.mimetype !== 'string' || !file.mimetype.startsWith('image/'),
    )

    if (invalidFile) {
      return sendJson(res, 400, {
        success: false,
        error: 'VALIDATION_ERROR',
        details: [
          {
            path: 'images',
            message: 'Only image files are allowed.',
            code: 'custom',
          },
        ],
      })
    }

    const uploadedImages = await buildUploadedImagesResponse(imageFiles)

    return sendJson(res, 200, {
      success: true,
      images: uploadedImages,
    })
  } catch (error) {
    return sendJson(res, error.status || 500, {
      success: false,
      message: error.message || 'Unable to upload artwork images.',
    })
  }
}
