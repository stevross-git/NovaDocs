// components/editor/extensions/SlashCommandPlugin.ts
import { Extension } from '@tiptap/core'
import { ReactRenderer } from '@tiptap/react'
import { Plugin, PluginKey } from 'prosemirror-state'
import tippy, { Instance } from 'tippy.js'
import { SlashCommandMenu, getSlashCommandItems } from './SlashCommandExtension'

let component: ReactRenderer | null = null
let popup: Instance | null = null

function showSlashCommand(editor: any, view: any, range: any, query: string = '') {
  if (component) {
    component.updateProps({ query })
    return
  }

  if (!view || !view.dom) return

  try {
    component = new ReactRenderer(SlashCommandMenu, {
      props: {
        items: getSlashCommandItems(),
        command: (item: any) => {
          const { tr } = view.state
          
          // Delete the slash and query
          tr.delete(range.from, range.to)
          view.dispatch(tr)
          
          // Execute the command
          item.command({ 
            editor: editor,
            range: { from: range.from, to: range.from }
          })
          
          // Hide suggestions
          hideSlashCommand()
        },
        editor: editor,
        range,
        query,
      },
      element: document.body,
    })

    if (!popup && component.element) {
      popup = tippy(view.dom, {
        getReferenceClientRect: () => {
          try {
            const coords = view.coordsAtPos(range.from)
            return {
              width: 0,
              height: 0,
              top: coords.top,
              right: coords.left,
              bottom: coords.top,
              left: coords.left,
            }
          } catch (error) {
            return {
              width: 0,
              height: 0,
              top: 0,
              right: 0,
              bottom: 0,
              left: 0,
            }
          }
        },
        appendTo: () => document.body,
        content: component.element,
        showOnCreate: true,
        interactive: true,
        trigger: 'manual',
        placement: 'bottom-start',
        theme: 'light-border',
        maxWidth: 'none',
      })
    }
  } catch (error) {
    console.error('Error showing slash command:', error)
    hideSlashCommand()
  }
}

function hideSlashCommand() {
  if (popup) {
    popup.destroy()
    popup = null
  }

  if (component) {
    component.destroy()
    component = null
  }
}

export const SlashCommandPlugin = Extension.create({
  name: 'slashCommandPlugin',

  addProseMirrorPlugins() {
    const editor = this.editor

    return [
      new Plugin({
        key: new PluginKey('slashCommandHandler'),
        
        state: {
          init() {
            return {
              active: false,
              range: null,
              query: '',
            }
          },
          
          apply(tr, prev, oldState, newState) {
            const { selection } = newState
            const { $from } = selection
            
            // Only check if cursor is in a text position
            if (!$from.parent || $from.parent.type.name !== 'paragraph') {
              if (prev.active) {
                hideSlashCommand()
              }
              return {
                active: false,
                range: null,
                query: '',
              }
            }
            
            // Get text before cursor in current paragraph
            const textBefore = $from.parent.textBetween(0, $from.parentOffset, null, ' ')
            
            // Check for slash at start of line or after space
            const slashMatch = textBefore.match(/(^|\s)\/([^\/\s]*)$/)
            
            if (slashMatch && ($from.parentOffset === 1 || textBefore[$from.parentOffset - 2] === ' ')) {
              const slashIndex = slashMatch.index! + slashMatch[1].length
              const slashPos = $from.start() + slashIndex
              const query = slashMatch[2] || ''
              
              const newState = {
                active: true,
                range: { from: slashPos, to: $from.pos },
                query: query,
              }
              
              // Show or update slash command menu
              const view = editor?.view
              if (view) {
                setTimeout(() => {
                  showSlashCommand(editor, view, newState.range, newState.query)
                }, 0)
              }
              
              return newState
            }
            
            // Hide if we were active but no longer match
            if (prev.active) {
              hideSlashCommand()
            }
            
            return {
              active: false,
              range: null,
              query: '',
            }
          },
        },
        
        props: {
          handleKeyDown(view, event) {
            const state = this.getState(view.state)
            
            if (!state.active || !component) return false
            
            // Handle navigation keys
            if (event.key === 'ArrowDown') {
              component.ref?.onKeyDown?.({ event })
              return true
            }
            
            if (event.key === 'ArrowUp') {
              component.ref?.onKeyDown?.({ event })
              return true
            }
            
            if (event.key === 'Enter') {
              component.ref?.onKeyDown?.({ event })
              return true
            }
            
            if (event.key === 'Escape') {
              hideSlashCommand()
              return true
            }
            
            return false
          },
          
          handleClick(view, pos, event) {
            // Hide slash command on click outside
            const state = this.getState(view.state)
            if (state.active) {
              hideSlashCommand()
            }
            return false
          },
        },
        
        view(editorView) {
          return {
            destroy: () => {
              hideSlashCommand()
            },
          }
        },
      }),
    ]
  },

  addCommands() {
    return {
      showSlashCommand: (range: any, query: string = '') => ({ editor }) => {
        const view = editor.view
        if (view) {
          showSlashCommand(editor, view, range, query)
        }
        return true
      },
      hideSlashCommand: () => () => {
        hideSlashCommand()
        return true
      },
    }
  },
  
  onDestroy() {
    hideSlashCommand()
  },
})

export default SlashCommandPlugin