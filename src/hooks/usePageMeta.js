import { useEffect } from 'react'

function upsertMeta(selector, attribute, value, content) {
  let element = document.head.querySelector(selector)
  if (!element) {
    element = document.createElement('meta')
    element.setAttribute(attribute, value)
    document.head.appendChild(element)
  }
  element.setAttribute('content', content)
}

export default function usePageMeta({ title, description }) {
  useEffect(() => {
    if (title) {
      document.title = title
    }

    if (description) {
      upsertMeta('meta[name="description"]', 'name', 'description', description)
      upsertMeta('meta[property="og:description"]', 'property', 'og:description', description)
      upsertMeta('meta[name="twitter:description"]', 'name', 'twitter:description', description)
    }

    if (title) {
      upsertMeta('meta[property="og:title"]', 'property', 'og:title', title)
      upsertMeta('meta[name="twitter:title"]', 'name', 'twitter:title', title)
    }
  }, [title, description])
}
