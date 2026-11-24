import type { Ref } from 'react';

interface DiagramEditorProps {
  readonly id: string;
  readonly value: string;
  readonly hasErrors: boolean;
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
  describedBy,
  textareaRef,
  onChange,
  onSubmit,
}: DiagramEditorProps) {
  return (
    <>
      {/* Rótulo próprio, diferente do título do painel, para o leitor não repetir "Código do diagrama". */}
      <label htmlFor={id} className="-mb-1 text-muted">
        Editor (sintaxe erDiagram do Mermaid)
      </label>
      <textarea
        id={id}
        ref={textareaRef}
        value={value}
        rows={16}
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
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
    </>
  );
}
