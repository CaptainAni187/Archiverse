import { methodNotAllowed, readJson, sendJson } from './_lib/http.js'
import { getBackendConfig } from './_lib/env.js'
import { sendResendEmail } from './_lib/notifications.js'
import { supabaseAdminRequest } from './_lib/supabaseAdmin.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return methodNotAllowed(res, ['POST'])
  }

  try {
    const body = await readJson(req)
    const name = String(body.name || '').trim()
    const email = String(body.email || '').trim()
    const subject = String(body.subject || '').trim()
    const message = String(body.message || '').trim()

    if (!name || !email || !subject || !message) {
      return sendJson(res, 400, {
        success: false,
        message: 'Name, email, subject, and message are required.',
      })
    }

    const inserted = await supabaseAdminRequest('inquiries', {
      method: 'POST',
      headers: {
        Prefer: 'return=representation',
      },
      body: JSON.stringify({
        name,
        email,
        subject,
        message,
      }),
    })

    const config = getBackendConfig()
    const recipients = ['kanimesh187@gmail.com', 'archikri07@gmail.com']
    const emailHtml = `
      <h2>New ARCHIVERSE inquiry</h2>
      <p><strong>Name:</strong> ${name}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Subject:</strong> ${subject}</p>
      <p><strong>Message:</strong></p>
      <p>${message.replaceAll('\n', '<br/>')}</p>
    `

    await Promise.allSettled(
      recipients.map((to) =>
        sendResendEmail({
          resendApiKey: config.resendApiKey,
          fromEmail: config.fromEmail,
          to,
          subject: `Archiverse inquiry: ${subject}`,
          html: emailHtml,
        }),
      ),
    )

    return sendJson(res, 201, {
      success: true,
      message: 'Inquiry received.',
      inquiry: inserted?.[0] || null,
    })
  } catch (error) {
    return sendJson(res, error.status || 500, {
      success: false,
      message: error.message || 'Unable to submit inquiry.',
    })
  }
}
