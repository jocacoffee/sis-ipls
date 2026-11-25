import React from 'react';
import ReactMarkdown, { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';

/**
 * Markdown das respostas da IA (tabelas, listas, títulos, negrito, código, links, emojis).
 * HTML embutido no texto é ignorado (o react-markdown não interpreta HTML sem rehype-raw),
 * então a resposta do modelo não consegue injetar scripts na página.
 */
const components: Components = {
  p: ({ children }) => <p className="mb-2.5 last:mb-0 leading-relaxed">{children}</p>,
  h1: ({ children }) => <h3 className="mt-3 mb-2 text-sm font-bold text-slate-900 dark:text-white first:mt-0">{children}</h3>,
  h2: ({ children }) => <h3 className="mt-3 mb-2 text-sm font-bold text-slate-900 dark:text-white first:mt-0">{children}</h3>,
  h3: ({ children }) => <h4 className="mt-3 mb-1.5 text-xs font-bold text-slate-900 dark:text-white first:mt-0">{children}</h4>,
  h4: ({ children }) => <h4 className="mt-2 mb-1 text-xs font-bold text-slate-800 dark:text-slate-100">{children}</h4>,
  strong: ({ children }) => <strong className="font-bold text-slate-900 dark:text-white">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  ul: ({ children }) => <ul className="mb-2.5 ml-4 list-disc space-y-1 marker:text-emerald-600">{children}</ul>,
  ol: ({ children }) => <ol className="mb-2.5 ml-4 list-decimal space-y-1 marker:text-emerald-700 marker:font-semibold">{children}</ol>,
  li: ({ children }) => <li className="pl-0.5">{children}</li>,
  blockquote: ({ children }) => (
    <blockquote className="mb-2.5 border-l-4 border-amber-300 bg-amber-50/70 px-3 py-2 text-slate-700 rounded-r-lg dark:bg-amber-950/30 dark:text-slate-200">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-3 border-slate-200 dark:border-slate-700" />,
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className="font-semibold text-emerald-700 underline underline-offset-2 hover:text-emerald-900">
      {children}
    </a>
  ),
  code: ({ className, children }) =>
    className ? (
      <code className={`${className} block`}>{children}</code>
    ) : (
      <code className="rounded bg-slate-200/70 px-1 py-0.5 font-mono text-[11px] text-slate-800 dark:bg-slate-700 dark:text-slate-100">{children}</code>
    ),
  pre: ({ children }) => (
    <pre className="mb-2.5 overflow-x-auto rounded-xl bg-slate-900 p-3 font-mono text-[11px] text-slate-100">{children}</pre>
  ),
  table: ({ children }) => (
    <div className="mb-3 overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-2xs dark:border-slate-700 dark:bg-slate-900">
      <table className="w-full border-collapse text-left text-[11.5px]">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">{children}</thead>,
  tbody: ({ children }) => <tbody className="divide-y divide-slate-100 dark:divide-slate-800">{children}</tbody>,
  tr: ({ children }) => <tr className="even:bg-slate-50/60 dark:even:bg-slate-800/40">{children}</tr>,
  th: ({ children, style }) => (
    <th style={style} className="whitespace-nowrap border-b border-slate-200 px-3 py-2 font-bold dark:border-slate-700">
      {children}
    </th>
  ),
  td: ({ children, style }) => (
    <td style={style} className="px-3 py-1.5 align-top tabular-nums">
      {children}
    </td>
  )
};

export const ChatMarkdown: React.FC<{ text: string }> = ({ text }) => (
  <div className="font-sans text-slate-800 dark:text-slate-200">
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
      {text}
    </ReactMarkdown>
  </div>
);
