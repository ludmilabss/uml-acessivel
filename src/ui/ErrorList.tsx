import { forSpeech } from './pronunciation';

interface ErrorListProps {
  readonly id: string;
  /** Erros ou avisos; coluna e tamanho, quando existem, apontam o trecho exato. */
  readonly errors: readonly {
    readonly code: string;
    readonly message: string;
    readonly line: number;
    readonly column?: number;
    readonly length?: number;
  }[];
  /** Leva o cursor ao item: o trecho exato (coluna e tamanho), se conhecido, ou a linha inteira. */
  readonly onSelectLine: (line: number, column?: number, length?: number) => void;
  /** Avisos não impedem a árvore; aparecem com estilo neutro, e não em vermelho. */
  readonly kind?: 'error' | 'warning';
}

const texts = {
  error: { one: 'erro de sintaxe', many: 'erros de sintaxe', item: 'um erro', icon: '⚠ ' },
  warning: { one: 'aviso', many: 'avisos', item: 'um aviso', icon: 'ⓘ ' },
};

/**
 * Erros ou avisos em texto (não só em cor). Cada item é um botão que leva o cursor até o
 * problema no código.
 */
export function ErrorList({ id, errors, onSelectLine, kind = 'error' }: ErrorListProps) {
  if (errors.length === 0) {
    return null;
  }
  const text = texts[kind];

  return (
    <div
      id={id}
      className={`rounded-sm border-2 p-3 ${
        kind === 'error'
          ? 'border-danger bg-danger-bg text-danger'
          : 'border-muted bg-raised text-fg'
      }`}
    >
      <h3 className="font-bold">
        {errors.length === 1 ? `1 ${text.one}` : `${errors.length} ${text.many}`}
      </h3>
      <p>Ative {text.item} para ir até a linha no código.</p>
      <ul className="mt-2 flex flex-col gap-1">
        {errors.map((error, index) => (
          <li key={`${error.line}-${error.code}-${index}`}>
            <button
              type="button"
              aria-label={forSpeech(`${error.code} ${error.message}`)}
              className="focus-ring w-full rounded-sm px-1 py-0.5 text-left underline"
              onClick={() => onSelectLine(error.line, error.column, error.length)}
            >
              <span aria-hidden="true">{text.icon}</span>
              <span className="font-mono font-bold">{error.code}</span>{' '}
              <span aria-hidden="true">·</span> {error.message}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
