// components/editor/extensions/EnhancedLinkExtension.ts
import { Mark, mergeAttributes } from '@tiptap/core'
import { Plugin, PluginKey } from 'prosemirror-state'
import { Mark as ProseMirrorMark } from 'prosemirror-model'

export interface LinkOptions {
  openOnClick: boolean
  linkOnPaste: boolean
  autolink: boolean
  protocols: Array<{
    scheme: string
    optionalSlashes?: boolean
  }>
  HTMLAttributes: Record<string, any>
  validate?: (url: string) => boolean
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    link: {
      /**
       * Set a link mark
       */
      setLink: (attributes: { href: string; target?: string; title?: string }) => ReturnType
      /**
       * Toggle a link mark
       */
      toggleLink: (attributes: { href: string; target?: string; title?: string }) => ReturnType
      /**
       * Unset a link mark
       */
      unsetLink: () => ReturnType
    }
  }
}

// URL detection regex
const URL_REGEX = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/gi

// Domain-specific patterns for better detection
const DOMAIN_PATTERNS = {
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/gi,
  shortUrl: /\b(bit\.ly|tinyurl\.com|t\.co|goo\.gl|ow\.ly)\/\w+/gi,
  github: /\bgithub\.com\/[\w.-]+\/[\w.-]+/gi,
  youtube: /\b(youtube\.com\/watch\?v=|youtu\.be\/)[\w-]+/gi,
}

export const EnhancedLink = Mark.create<LinkOptions>({
  name: 'link',

  priority: 1000,

  keepOnSplit: false,

  onCreate() {
    // Initialize link detection
    this.editor.storage.linkDetection = {
      enabled: true,
      autolink: this.options.autolink,
    }
  },

  addOptions() {
    return {
      openOnClick: true,
      linkOnPaste: true,
      autolink: true,
      protocols: [
        {
          scheme: 'http',
          optionalSlashes: true,
        },
        {
          scheme: 'https',
          optionalSlashes: true,
        },
        {
          scheme: 'ftp',
          optionalSlashes: true,
        },
        {
          scheme: 'ftps',
          optionalSlashes: true,
        },
        {
          scheme: 'mailto',
          optionalSlashes: false,
        },
        {
          scheme: 'tel',
          optionalSlashes: false,
        },
      ],
      HTMLAttributes: {
        target: '_blank',
        rel: 'noopener noreferrer nofollow',
        class: 'link-enhanced',
      },
      validate: (url: string) => {
        return true // Allow all URLs by default
      },
    }
  },

  addAttributes() {
    return {
      href: {
        default: null,
        parseHTML: (element) => element.getAttribute('href'),
        renderHTML: (attributes) => {
          if (!attributes.href) {
            return {}
          }
          return { href: attributes.href }
        },
      },
      target: {
        default: this.options.HTMLAttributes.target,
        parseHTML: (element) => element.getAttribute('target'),
        renderHTML: (attributes) => {
          if (!attributes.target) {
            return {}
          }
          return { target: attributes.target }
        },
      },
      title: {
        default: null,
        parseHTML: (element) => element.getAttribute('title'),
        renderHTML: (attributes) => {
          if (!attributes.title) {
            return {}
          }
          return { title: attributes.title }
        },
      },
      class: {
        default: this.options.HTMLAttributes.class,
        parseHTML: (element) => element.getAttribute('class'),
        renderHTML: (attributes) => {
          if (!attributes.class) {
            return {}
          }
          return { class: attributes.class }
        },
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'a[href]',
        getAttrs: (element) => {
          const href = (element as HTMLElement).getAttribute('href')
          if (!href || href.startsWith('javascript:')) {
            return false
          }
          return {}
        },
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['a', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0]
  },

  addCommands() {
    return {
      setLink: (attributes) => ({ chain }) => {
        return chain()
          .setMark(this.name, attributes)
          .setMeta('preventAutolink', true)
          .run()
      },

      toggleLink: (attributes) => ({ chain }) => {
        return chain()
          .toggleMark(this.name, attributes, { extendEmptyMarkRange: true })
          .setMeta('preventAutolink', true)
          .run()
      },

      unsetLink: () => ({ chain }) => {
        return chain()
          .unsetMark(this.name, { extendEmptyMarkRange: true })
          .setMeta('preventAutolink', true)
          .run()
      },
    }
  },

  addProseMirrorPlugins() {
    const plugins = []

    // Auto-link detection plugin
    if (this.options.autolink) {
      plugins.push(
        new Plugin({
          key: new PluginKey('autolink'),
          
          appendTransaction: (transactions, oldState, newState) => {
            const docChanges = transactions.some(transaction => transaction.docChanged) &&
              !oldState.doc.eq(newState.doc)
            
            const preventAutolink = transactions.some(transaction =>
              transaction.getMeta('preventAutolink')
            )

            if (!docChanges || preventAutolink) {
              return
            }

            const { tr } = newState
            const transform = this.autolink(newState, tr)

            if (transform) {
              return transform
            }
          },
        })
      )
    }

    // Click handler plugin
    if (this.options.openOnClick) {
      plugins.push(
        new Plugin({
          key: new PluginKey('linkClick'),
          
          props: {
            handleClick: (view, pos, event) => {
              const { schema } = view.state
              const attrs = this.getAttributes(view.state, this.name)

              if (attrs.href && event.ctrlKey) {
                window.open(attrs.href, attrs.target || '_blank')
                return true
              }

              return false
            },
          },
        })
      )
    }

    return plugins
  },

  // Auto-link detection method
  autolink(state: any, tr: any) {
    const { doc, selection } = state
    const { from, to } = selection
    let hasChanges = false

    // Only check the current text node and nearby nodes
    doc.nodesBetween(Math.max(0, from - 100), Math.min(doc.content.size, to + 100), (node: any, pos: number) => {
      if (!node.isText) return

      const text = node.text
      if (!text) return

      // Find URLs in text
      const matches = Array.from(text.matchAll(URL_REGEX))
      
      matches.forEach((match) => {
        const url = match[0]
        const start = pos + match.index!
        const end = start + url.length

        // Check if this position already has a link mark
        const existingMark = doc.rangeHasMark(start, end, state.schema.marks.link)
        if (existingMark) return

        // Validate URL
        if (this.options.validate && !this.options.validate(url)) return

        // Add link mark
        tr.addMark(start, end, state.schema.marks.link.create({ href: url }))
        hasChanges = true
      })

      // Check for email addresses
      const emailMatches = Array.from(text.matchAll(DOMAIN_PATTERNS.email))
      emailMatches.forEach((match) => {
        const email = match[0]
        const start = pos + match.index!
        const end = start + email.length

        const existingMark = doc.rangeHasMark(start, end, state.schema.marks.link)
        if (existingMark) return

        tr.addMark(start, end, state.schema.marks.link.create({ href: `mailto:${email}` }))
        hasChanges = true
      })
    })

    return hasChanges ? tr : null
  },

  // Helper method to get link attributes at current position
  getAttributes(state: any, markType: any) {
    const { from, to, empty } = state.selection
    
    if (empty) {
      const mark = state.storedMarks?.find((mark: ProseMirrorMark) => mark.type === markType) ||
        state.selection.$from.marks().find((mark: ProseMirrorMark) => mark.type === markType)
      
      return mark?.attrs || {}
    }

    let attrs = {}
    state.doc.nodesBetween(from, to, (node: any) => {
      const mark = node.marks.find((mark: ProseMirrorMark) => mark.type === markType)
      if (mark) {
        attrs = mark.attrs
      }
    })

    return attrs
  },
})

export default EnhancedLink