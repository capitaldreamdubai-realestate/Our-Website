import type { ArticleBodySection, ArticleTocEntry } from '@/data/articleDetails'

const BODY_SECTION_ID = 'body'

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function looksLikeHtml(value: string): boolean {
  return /<[a-z][\s\S]*>/i.test(value.trim())
}

/** Load editor HTML from stored sections (WYSIWYG or legacy plain-text sections). */
export function sectionsToBodyHtml(sections: ArticleBodySection[]): string {
  if (sections.length === 0) return ''

  if (
    sections.length === 1 &&
    sections[0].id === BODY_SECTION_ID &&
    sections[0].paragraphs.length === 1 &&
    looksLikeHtml(sections[0].paragraphs[0] ?? '')
  ) {
    return sections[0].paragraphs[0]
  }

  return sections
    .map((section) => {
      const heading = section.heading.trim()
      const headingHtml = heading ? `<h2>${escapeHtml(heading)}</h2>` : ''
      const bodyHtml = section.paragraphs
        .filter((p) => p.trim().length > 0)
        .map((p) =>
          looksLikeHtml(p) ? p : `<p>${escapeHtml(p)}</p>`,
        )
        .join('')
      return `${headingHtml}${bodyHtml}`
    })
    .join('')
}

/** Persist WYSIWYG body as a single HTML section. */
export function bodyHtmlToSections(html: string): ArticleBodySection[] {
  const trimmed = html.trim()
  return [
    {
      id: BODY_SECTION_ID,
      heading: '',
      paragraphs: trimmed ? [trimmed] : [''],
    },
  ]
}

/** Minimal table of contents for single-body articles. */
export function defaultArticleToc(title: string): ArticleTocEntry[] {
  const label = title.trim() || 'Article'
  return [{ id: BODY_SECTION_ID, label }]
}
