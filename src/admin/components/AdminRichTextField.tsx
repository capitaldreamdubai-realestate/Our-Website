import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Bold, Heading2, Heading3, Italic, Link2, List, ListOrdered } from 'lucide-react'
import { useEffect } from 'react'

type Props = {
  value: string
  onChange: (html: string) => void
  minHeight?: number
  placeholder?: string
}

const btn =
  'rounded-lg border border-ink/10 bg-white p-2 text-ink/70 transition hover:bg-ink/[0.04] hover:text-ink disabled:opacity-35'

export function AdminRichTextField({
  value,
  onChange,
  minHeight = 280,
  placeholder = 'Write listing copy…',
}: Props) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: 'text-[var(--admin-primary)] underline' },
      }),
      Placeholder.configure({
        placeholder,
      }),
    ],
    content: value || '',
    editorProps: {
      attributes: {
        class:
          'prose-admin prose-p:my-2 prose-headings:font-display prose-headings:text-ink max-w-none px-3 py-2 text-sm text-ink focus:outline-none',
      },
    },
    onUpdate: ({ editor: ed }) => {
      const html = ed.getHTML()
      const plain = html === '<p></p>' ? '' : html
      onChange(plain)
    },
  })

  useEffect(() => {
    if (!editor) return
    const html = editor.getHTML()
    const cur = html === '<p></p>' ? '' : html
    const next = value || ''
    if (cur === next) return
    editor.commands.setContent(next || '', { emitUpdate: false })
  }, [value, editor])

  if (!editor) {
    return (
      <div
        className="mt-1 rounded-2xl border border-ink/15 bg-white px-3 py-4 text-xs text-ink/45"
        style={{ minHeight }}
      >
        Loading editor…
      </div>
    )
  }

  return (
    <div
      className="mt-1 overflow-hidden rounded-2xl border border-ink/15 bg-white"
      style={{ ['--editor-min-h' as string]: `${minHeight}px` }}
    >
      <div className="flex flex-wrap gap-1 border-b border-ink/10 bg-ink/[0.02] px-2 py-2">
        <button
          type="button"
          className={btn}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          disabled={!editor.can().chain().focus().toggleHeading({ level: 2 }).run()}
          aria-label="Heading 2"
        >
          <Heading2 className="size-4" />
        </button>
        <button
          type="button"
          className={btn}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          disabled={!editor.can().chain().focus().toggleHeading({ level: 3 }).run()}
          aria-label="Heading 3"
        >
          <Heading3 className="size-4" />
        </button>
        <button
          type="button"
          className={btn}
          data-active={editor.isActive('bold')}
          onClick={() => editor.chain().focus().toggleBold().run()}
          disabled={!editor.can().chain().focus().toggleBold().run()}
          aria-label="Bold"
        >
          <Bold className="size-4" />
        </button>
        <button
          type="button"
          className={btn}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          disabled={!editor.can().chain().focus().toggleItalic().run()}
          aria-label="Italic"
        >
          <Italic className="size-4" />
        </button>
        <button
          type="button"
          className={btn}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          aria-label="Bullet list"
        >
          <List className="size-4" />
        </button>
        <button
          type="button"
          className={btn}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          aria-label="Numbered list"
        >
          <ListOrdered className="size-4" />
        </button>
        <button
          type="button"
          className={btn}
          onClick={() => {
            const prev = window.prompt('Link URL', 'https://')
            if (prev === null) return
            const url = prev.trim()
            if (url === '') {
              editor.chain().focus().extendMarkRange('link').unsetLink().run()
              return
            }
            editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
          }}
          aria-label="Link"
        >
          <Link2 className="size-4" />
        </button>
      </div>
      <EditorContent
        editor={editor}
        className="[&_.ProseMirror]:min-h-[var(--editor-min-h)]"
      />
    </div>
  )
}
