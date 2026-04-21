import formidable from 'formidable'

export function parseMultipartForm(req, options = {}) {
  const form = formidable({
    multiples: true,
    keepExtensions: true,
    ...options,
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

export function getMultipartFiles(files, fieldName = 'files') {
  const candidates = files[fieldName] || []
  const list = Array.isArray(candidates) ? candidates : [candidates]
  return list.filter((file) => file && typeof file === 'object')
}
