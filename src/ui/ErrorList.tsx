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
    <div id={id} className="rounded border-2 border-red-800 bg-red-50 p-3 text-red-950">
      <h3 className="font-semibold">
        {errors.length === 1 ? '1 erro de sintaxe' : `${errors.length} erros de sintaxe`}
      </h3>
      <p className="text-sm">Ative um erro para ir até a linha no código.</p>
      <ul className="mt-2 flex flex-col gap-1">
        {errors.map((error, index) => (
          <li key={`${error.line}-${error.code}-${index}`}>
            <button
              type="button"
              className="focus-ring w-full rounded px-1 py-0.5 text-left underline hover:bg-red-100"
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
