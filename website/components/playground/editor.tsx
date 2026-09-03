'use client';

import { javascript } from '@codemirror/lang-javascript';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { EditorState } from '@codemirror/state';
import { EditorView, highlightSpecialChars, lineNumbers } from '@codemirror/view';
import { tags } from '@lezer/highlight';
import { basicSetup } from 'codemirror';
import { useEffect, useRef } from 'react';

const highlightStyle = HighlightStyle.define([
  { tag: [tags.comment, tags.lineComment, tags.blockComment], color: 'var(--pg-comment)' },
  {
    tag: [tags.keyword, tags.controlKeyword, tags.moduleKeyword, tags.operatorKeyword, tags.self],
    color: 'var(--pg-keyword)',
  },
  { tag: [tags.string, tags.special(tags.string), tags.regexp], color: 'var(--pg-string)' },
  { tag: [tags.number, tags.bool, tags.null, tags.atom], color: 'var(--pg-number)' },
  {
    tag: [tags.function(tags.variableName), tags.definition(tags.variableName), tags.className],
    color: 'var(--pg-function)',
  },
  { tag: [tags.propertyName, tags.attributeName], color: 'var(--pg-property)' },
  { tag: [tags.tagName, tags.angleBracket], color: 'var(--pg-tag)' },
]);

/**
 * One colour for every kind of selection the panes can show: CodeMirror's drawn
 * rectangles in the editable pane, and the browser's native highlight in the
 * read-only one, which has no `drawSelection` to replace it.
 */
const SELECTION = 'color-mix(in oklab, var(--color-fd-primary) 30%, transparent)';

const theme = EditorView.theme({
  '&': {
    backgroundColor: 'transparent',
    color: 'var(--color-fd-foreground)',
    fontSize: '13px',
  },
  '&.cm-focused': { outline: 'none' },
  '.cm-scroller': {
    fontFamily: 'var(--font-mono, ui-monospace, SFMono-Regular, Menlo, monospace)',
    lineHeight: '1.5rem',
    // Thin, themed scrollbars flush to the pane edge. The padding that used to sit
    // on the wrapper lives here instead, so the track isn't inset from the border
    scrollbarWidth: 'thin',
    scrollbarColor: 'var(--color-fd-border) transparent',
  },
  '.cm-scroller::-webkit-scrollbar': { width: '10px', height: '10px' },
  '.cm-scroller::-webkit-scrollbar-track': { background: 'transparent' },
  '.cm-scroller::-webkit-scrollbar-thumb': {
    backgroundColor: 'var(--color-fd-border)',
    borderRadius: '9999px',
    // Inset the thumb without insetting the track
    border: '3px solid transparent',
    backgroundClip: 'content-box',
  },
  '.cm-scroller::-webkit-scrollbar-thumb:hover': {
    backgroundColor: 'var(--color-fd-muted-foreground)',
    backgroundClip: 'content-box',
  },
  '.cm-scroller::-webkit-scrollbar-corner': { background: 'transparent' },
  // Only vertical padding out here. The horizontal padding goes on the line and
  // gutter elements themselves, so the active-line highlight, which paints those
  // elements' backgrounds, runs edge to edge instead of stopping short
  '.cm-content': { padding: '0.75rem 0' },
  '.cm-line': { padding: '0 0.75rem 0 0.5rem' },
  '.cm-gutters': {
    backgroundColor: 'transparent',
    color: 'var(--color-fd-muted-foreground)',
    border: 'none',
  },
  '.cm-lineNumbers .cm-gutterElement': { padding: '0 0.5rem 0 0.75rem' },
  '.cm-activeLine': { backgroundColor: 'var(--color-fd-accent)' },
  '.cm-activeLineGutter': {
    backgroundColor: 'var(--color-fd-accent)',
    color: 'var(--color-fd-foreground)',
  },
  // The drawn selection is a layer *behind* the content, so an opaque active-line
  // background hides it, which is why selecting within one line used to show no
  // colour at all while a multi-line selection appeared everywhere but the line
  // the cursor was on. Drop the highlight while a selection exists (the layer only
  // has children then), the way editors like VS Code do
  '&:has(.cm-selectionLayer > *) .cm-activeLine': { backgroundColor: 'transparent' },
  '&:has(.cm-selectionLayer > *) .cm-activeLineGutter': {
    backgroundColor: 'transparent',
    color: 'var(--color-fd-muted-foreground)',
  },
  // Spelled out to the base theme's full depth, which is more specific than a bare
  // `.cm-selectionBackground` and would otherwise win. Focused and unfocused match,
  // so reaching for Format or Copy doesn't dim what you just selected
  '& > .cm-scroller > .cm-selectionLayer .cm-selectionBackground': {
    backgroundColor: SELECTION,
  },
  '&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground': {
    backgroundColor: SELECTION,
  },
  // The read-only pane keeps the browser's own selection, so it is styled here too
  '.cm-content ::selection': { backgroundColor: SELECTION },
  // Both of these have a three-class base rule behind them, hence the `.cm-scroller`
  // step; without it the search plugin's green and the bracket default stay put
  '& .cm-scroller .cm-selectionMatch': {
    backgroundColor: 'color-mix(in oklab, var(--color-fd-foreground) 12%, transparent)',
  },
  '& .cm-scroller .cm-matchingBracket': {
    backgroundColor: 'var(--color-fd-secondary)',
    outline: '1px solid var(--color-fd-border)',
  },
  '.cm-cursor, .cm-dropCursor': { borderLeftColor: 'var(--color-fd-foreground)' },
  '.cm-tooltip': {
    backgroundColor: 'var(--color-fd-popover)',
    border: '1px solid var(--color-fd-border)',
    color: 'var(--color-fd-popover-foreground)',
  },
});

/** The editable pane fills the height its container was given. */
const fillHeight = EditorView.theme({ '&': { height: '100%' } });

/**
 * The read-only pane sizes to its content instead, since it sits under the message
 * list rather than in a pane of its own, but caps out so a long transform can't
 * push the page down forever.
 */
const capHeight = EditorView.theme({ '&': { maxHeight: '600px' } });

/**
 * `basicSetup` is all editing affordances: history, autocompletion, bracket
 * matching, the search panel. A pane you can only read needs none of it; line
 * numbers and the special-character replacement are what carry the shared look.
 */
function readOnlyExtensions() {
  return [
    lineNumbers(),
    highlightSpecialChars(),
    EditorState.readOnly.of(true),
    EditorView.editable.of(false),
    capHeight,
  ];
}

export default function CodeEditor({
  value,
  onChange,
  readOnly = false,
}: {
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
}) {
  const container = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView>(null);
  // Kept in a ref so swapping the handler never tears down the editor
  const handler = useRef(onChange);
  handler.current = onChange;

  useEffect(() => {
    if (!container.current) return;

    const editor = new EditorView({
      parent: container.current,
      state: EditorState.create({
        doc: value,
        extensions: [
          readOnly
            ? readOnlyExtensions()
            : [
                basicSetup,
                fillHeight,
                EditorView.updateListener.of((update) => {
                  if (update.docChanged) handler.current?.(update.state.doc.toString());
                }),
              ],
          javascript({ jsx: true, typescript: true }),
          syntaxHighlighting(highlightStyle),
          theme,
          EditorView.lineWrapping,
        ],
      }),
    });

    view.current = editor;
    return () => {
      editor.destroy();
      view.current = null;
    };
    // Mount once, `value` is the initial document, later updates flow in below,
    // and `readOnly` is fixed by the call site
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Accept programmatic changes (e.g. loading an example, or a fresh transform)
  // without fighting typing. `EditorState.readOnly` only refuses user edits, so a
  // dispatched change still lands in the read-only pane
  useEffect(() => {
    const editor = view.current;
    if (!editor || editor.state.doc.toString() === value) return;
    editor.dispatch({
      changes: { from: 0, to: editor.state.doc.length, insert: value },
    });
  }, [value]);

  return <div ref={container} className={readOnly ? undefined : 'h-full overflow-auto'} />;
}
