import type { ParseError } from '../core';

interface ErrorListProps {
  readonly id: string;
  readonly errors: readonly ParseError[];
  readonly onSelectLine: (line: number) => void;
}

/** Erros em texto (não só em cor). Cada erro é um botão que leva o cursor até a linha no código. */
export function ErrorList({ id, errors, onSelectLine }: ErrorListProps) {
  if (errors.length === 0) {
    return null;
  }

  return (
    <div id={id} className="rounded-sm border-2 border-danger bg-danger-bg p-3 text-danger">
      <h3 className="font-bold">
        {errors.length === 1 ? '1 erro de sintaxe' : `${errors.length} erros de sintaxe`}
      </h3>
      <p>Ative um erro para ir até a linha no código.</p>
      <ul className="mt-2 flex flex-col gap-1">
        {errors.map((error, index) => (
          <li key={`${error.line}-${error.code}-${index}`}>
            <button
              type="button"
              className="focus-ring w-full rounded-sm px-1 py-0.5 text-left underline"
              onClick={() => onSelectLine(error.line)}
            >
              <span aria-hidden="true">⚠ </span>
              {error.message}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
