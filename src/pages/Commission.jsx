import { useState } from 'react'
import Reveal from '../components/Reveal'
import usePageMeta from '../hooks/usePageMeta'
import { submitCommission } from '../services/commissionService'

const initialForm = {
  name: '',
  email: '',
  phone: '',
  artwork_type: 'canvas',
  size: '',
  deadline: '',
  description: '',
}

function Commission() {
  usePageMeta({
    title: 'Commission | Archiverse',
    description: 'Request a custom Archiverse commission.',
  })

  const [form, setForm] = useState(initialForm)
  const [files, setFiles] = useState([])
  const [status, setStatus] = useState({ type: '', message: '' })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const onChange = (event) => {
    const { name, value } = event.target
    setForm((previous) => ({ ...previous, [name]: value }))
  }

  const onFileSelection = (event) => {
    setFiles(Array.from(event.target.files || []).slice(0, 5))
  }

  const onSubmit = async (event) => {
    event.preventDefault()
    setStatus({ type: '', message: '' })
    setIsSubmitting(true)

    try {
      await submitCommission(form, files)
      setStatus({ type: 'success', message: 'COMMISSION REQUEST SENT.' })
      setForm(initialForm)
      setFiles([])
    } catch (error) {
      setStatus({
        type: 'error',
        message: String(error.message || 'Unable to submit commission request.'),
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="page-flow page-with-header-gap">
      <Reveal className="contact-layout">
        <div className="contact-copy">
          <p className="eyebrow">COMMISSION</p>
          <p className="section-copy">
            SHARE YOUR IDEA, REFERENCES, AND TIMELINE FOR A CUSTOM ARCHIVERSE WORK.
          </p>
        </div>

        <form className="contact-form" onSubmit={onSubmit}>
          <label>
            NAME
            <input name="name" value={form.name} onChange={onChange} required />
          </label>
          <label>
            EMAIL
            <input type="email" name="email" value={form.email} onChange={onChange} required />
          </label>
          <label>
            PHONE
            <input name="phone" value={form.phone} onChange={onChange} required />
          </label>
          <label>
            ARTWORK TYPE
            <select name="artwork_type" value={form.artwork_type} onChange={onChange}>
              <option value="canvas">canvas</option>
              <option value="sketch">sketch</option>
            </select>
          </label>
          <label>
            SIZE
            <input name="size" value={form.size} onChange={onChange} required />
          </label>
          <label>
            DEADLINE
            <input name="deadline" type="date" value={form.deadline} onChange={onChange} required />
          </label>
          <label>
            REFERENCE IMAGES
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={onFileSelection}
            />
          </label>
          <label>
            DESCRIPTION
            <textarea
              name="description"
              value={form.description}
              onChange={onChange}
              required
            />
          </label>
          <button type="submit" className="text-link-button action-button">
            {isSubmitting ? 'SENDING...' : 'SEND COMMISSION REQUEST'}
          </button>
          {status.message ? (
            <p className={`status-message ${status.type}`.trim()}>{status.message}</p>
          ) : null}
        </form>
      </Reveal>
    </section>
  )
}

export default Commission
