import { Link, Text, View } from '@react-pdf/renderer'
import type { ReactNode } from 'react'

const ink = '#1c1412'
const terracotta = '#a67d32'

const block = {
  h2: {
    fontFamily: 'Times-Bold',
    fontSize: 14,
    color: terracotta,
    marginTop: 12,
    marginBottom: 6,
  },
  h3: {
    fontFamily: 'Times-Bold',
    fontSize: 12,
    color: terracotta,
    marginTop: 10,
    marginBottom: 4,
  },
  p: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    lineHeight: 1.5,
    color: ink,
    marginBottom: 8,
  },
  item: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    lineHeight: 1.45,
    color: ink,
    marginBottom: 3,
  },
}

function inlineNodes(node: Node, key: string): ReactNode[] {
  const out: ReactNode[] = []
  node.childNodes.forEach((child, index) => {
    const childKey = `${key}-${index}`
    if (child.nodeType === Node.TEXT_NODE) {
      const text = child.textContent ?? ''
      if (text) out.push(text)
      return
    }
    if (!(child instanceof HTMLElement)) return
    const tag = child.tagName.toLowerCase()
    if (tag === 'br') {
      out.push('\n')
      return
    }
    if (tag === 'strong' || tag === 'b') {
      out.push(
        <Text key={childKey} style={{ fontFamily: 'Helvetica-Bold' }}>
          {inlineNodes(child, childKey)}
        </Text>,
      )
      return
    }
    if (tag === 'em' || tag === 'i') {
      out.push(
        <Text key={childKey} style={{ fontFamily: 'Helvetica-Oblique' }}>
          {inlineNodes(child, childKey)}
        </Text>,
      )
      return
    }
    if (tag === 'a') {
      const href = child.getAttribute('href')?.trim()
      const content = inlineNodes(child, childKey)
      out.push(
        href ? (
          <Link key={childKey} src={href}>
            {content}
          </Link>
        ) : (
          <Text key={childKey}>{content}</Text>
        ),
      )
      return
    }
    out.push(...inlineNodes(child, childKey))
  })
  return out
}

function blockNodes(node: Node, key: string): ReactNode[] {
  const out: ReactNode[] = []
  node.childNodes.forEach((child, index) => {
    const childKey = `${key}-${index}`
    if (child.nodeType === Node.TEXT_NODE) {
      const text = child.textContent?.trim()
      if (text) {
        out.push(
          <Text key={childKey} style={block.p}>
            {text}
          </Text>,
        )
      }
      return
    }
    if (!(child instanceof HTMLElement)) return
    const tag = child.tagName.toLowerCase()
    if (tag === 'h2') {
      out.push(
        <Text key={childKey} style={block.h2}>
          {inlineNodes(child, childKey)}
        </Text>,
      )
      return
    }
    if (tag === 'h3') {
      out.push(
        <Text key={childKey} style={block.h3}>
          {inlineNodes(child, childKey)}
        </Text>,
      )
      return
    }
    if (tag === 'p') {
      out.push(
        <Text key={childKey} style={block.p}>
          {inlineNodes(child, childKey)}
        </Text>,
      )
      return
    }
    if (tag === 'ul' || tag === 'ol') {
      const items = [...child.children].filter((item) => item.tagName.toLowerCase() === 'li')
      out.push(
        <View key={childKey} style={{ marginBottom: 8 }}>
          {items.map((item, itemIndex) => (
            <Text key={`${childKey}-li-${itemIndex}`} style={block.item}>
              {tag === 'ol' ? `${itemIndex + 1}. ` : '• '}
              {inlineNodes(item, `${childKey}-li-${itemIndex}`)}
            </Text>
          ))}
        </View>,
      )
      return
    }
    out.push(...blockNodes(child, childKey))
  })
  return out
}

export function descriptionHtmlToPdf(html: string): ReactNode[] {
  const trimmed = html.trim()
  if (!trimmed) return []
  const doc = new DOMParser().parseFromString(`<div>${trimmed}</div>`, 'text/html')
  const root = doc.body.firstElementChild
  if (!root) return []
  return blockNodes(root, 'copy')
}
