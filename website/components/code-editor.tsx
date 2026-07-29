'use client';

import { javascript } from '@codemirror/lang-javascript';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
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

const theme = EditorView.theme({
  '&': {
    height: '100%',
    backgroundColor: 'transparent',
    color: 'var(--color-fd-foreground)',
    fontSize: '13px',
  },
  '&.cm-focused': { outline: 'none' },
  '.cm-scroller': {
    fontFamily: 'var(--font-mono, ui-monospace, SFMono-Regular, Menlo, monospace)',
    lineHeight: '1.5rem',
    // Thin, themed scrollbars flush to the pane edge. The padding that used to sit
    // on the wrapper lives here instead, so the track isn't inset from the border.
    scrollbarWidth: 'thin',
    scrollbarColor: 'var(--color-fd-border) transparent',
  },
  '.cm-scroller::-webkit-scrollbar': { width: '10px', height: '10px' },
  '.cm-scroller::-webkit-scrollbar-track': { background: 'transparent' },
  '.cm-scroller::-webkit-scrollbar-thumb': {
    backgroundColor: 'var(--color-fd-border)',
    borderRadius: '9999px',
    // Inset the thumb without insetting the track.
    border: '3px solid transparent',
    backgroundClip: 'content-box',
  },
  '.cm-scroller::-webkit-scrollbar-thumb:hover': {
    backgroundColor: 'var(--color-fd-muted-foreground)',
    backgroundClip: 'content-box',
  },
  '.cm-scroller::-webkit-scrollbar-corner': { background: 'transparent' },
  // Only vertical padding out here. The horizontal padding goes on the line and
  // gutter elements themselves, so the active-line highlight — which paints those
  // elements' backgrounds — runs edge to edge instead of stopping short.
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
  '.cm-cursor, .cm-dropCursor': { borderLeftColor: 'var(--color-fd-foreground)' },
  '.cm-selectionBackground, &.cm-focused .cm-selectionBackground, ::selection': {
    backgroundColor: 'var(--color-fd-primary)',
    opacity: 0.25,
  },
  '.cm-matchingBracket, &.cm-focused .cm-matchingBracket': {
    backgroundColor: 'var(--color-fd-secondary)',
    outline: '1px solid var(--color-fd-border)',
  },
  '.cm-tooltip': {
    backgroundColor: 'var(--color-fd-popover)',
    border: '1px solid var(--color-fd-border)',
    color: 'var(--color-fd-popover-foreground)',
  },
});

export default function CodeEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView>(null);
  // Kept in a ref so swapping the handler never tears down the editor.
  const handler = useRef(onChange);
  handler.current = onChange;

  useEffect(() => {
    if (!container.current) return;

    const editor = new EditorView({
      parent: container.current,
      state: EditorState.create({
        doc: value,
        extensions: [
          basicSetup,
          javascript({ jsx: true, typescript: true }),
          syntaxHighlighting(highlightStyle),
          theme,
          EditorView.lineWrapping,
          EditorView.updateListener.of((update) => {
            if (update.docChanged) handler.current(update.state.doc.toString());
          }),
        ],
      }),
    });

    view.current = editor;
    return () => {
      editor.destroy();
      view.current = null;
    };
    // Mount once — `value` is the initial document, later updates flow in below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Accept programmatic changes (e.g. loading an example) without fighting typing.
  useEffect(() => {
    const editor = view.current;
    if (!editor || editor.state.doc.toString() === value) return;
    editor.dispatch({
      changes: { from: 0, to: editor.state.doc.length, insert: value },
    });
  }, [value]);

  return <div ref={container} className="h-full overflow-auto" />;
}
