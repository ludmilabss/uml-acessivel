import type { Ref } from 'react';

interface DiagramEditorProps {
  readonly id: string;
  readonly value: string;
  readonly hasErrors: boolean;
  /** Id do título do painel, que também nomeia o campo. */
  readonly labelledBy: string;
  /** Ids dos textos que descrevem o campo (dica de atalho e lista de erros). */
  readonly describedBy: string;
  readonly textareaRef: Ref<HTMLTextAreaElement>;
  readonly onChange: (value: string) => void;
  readonly onSubmit: () => void;
}

export function DiagramEditor({
  id,
  value,
  hasErrors,
  labelledBy,
  describedBy,
  textareaRef,
  onChange,
  onSubmit,
}: DiagramEditorProps) {
  return (
    <textarea
      id={id}
      ref={textareaRef}
      value={value}
      rows={16}
      spellCheck={false}
      autoCapitalize="off"
      autoCorrect="off"
      aria-labelledby={labelledBy}
      aria-invalid={hasErrors}
      aria-describedby={describedBy}
      className="focus-ring min-h-64 w-full flex-1 resize-y rounded-sm border-2 border-muted bg-raised p-2 font-mono leading-relaxed text-fg lg:resize-none"
      onChange={(event) => onChange(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
          event.preventDefault();
          onSubmit();
        }
      }}
    />
  );
}
