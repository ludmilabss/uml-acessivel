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
    <div className="flex flex-col gap-3">
      <label htmlFor={id} className="font-semibold">
        Código do diagrama (erDiagram)
      </label>
      <textarea
        id={id}
        ref={textareaRef}
        value={value}
        rows={18}
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
        aria-invalid={hasErrors}
        aria-describedby={describedBy}
        className="focus-ring w-full resize-y rounded border-2 border-gray-700 p-3 font-mono text-sm leading-relaxed"
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
            event.preventDefault();
            onSubmit();
          }
        }}
      />
      <button
        type="button"
        className="focus-ring self-start rounded bg-blue-800 px-4 py-2 font-semibold text-white hover:bg-blue-900"
        onClick={onSubmit}
      >
        Interpretar diagrama
      </button>
    </div>
  );
}
