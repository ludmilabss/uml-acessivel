import type { ReactNode } from 'react';

interface ToggleButtonProps {
  readonly pressed: boolean;
  readonly onClick: () => void;
  readonly children: ReactNode;
}

/** Botão liga/desliga: o nome fica fixo e o estado vai no aria-pressed. */
export function ToggleButton({ pressed, onClick, children }: ToggleButtonProps) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      className={`focus-ring rounded-sm border-2 px-3 py-1 font-semibold ${
        pressed ? 'border-accent bg-accent text-accent-fg' : 'border-muted bg-raised text-fg'
      }`}
      onClick={onClick}
    >
      {/* O estado também aparece em forma, não só em cor. */}
      <span aria-hidden="true">{pressed ? '✓ ' : '○ '}</span>
      {children}
    </button>
  );
}
