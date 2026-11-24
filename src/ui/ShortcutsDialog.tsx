import { useId, useRef } from 'react';

interface Shortcut {
  readonly keys: readonly string[];
  readonly name: string;
  readonly action: string;
}

/**
 * Cada atalho é lido como uma frase contínua. Sem negrito ou outro elemento no meio,
 * porque o VoiceOver dividiria a frase em duas paradas.
 */
const shortcutGroups: readonly { title: string; shortcuts: readonly Shortcut[] }[] = [
  {
    title: 'Em qualquer lugar',
    shortcuts: [
      {
        keys: ['Alt', 'Shift', '1'],
        name: 'Alt + Shift + 1 (Option no Mac)',
        action: 'vai para o código',
      },
      { keys: ['Alt', 'Shift', '2'], name: 'Alt + Shift + 2', action: 'vai para a árvore' },
      { keys: ['Alt', 'Shift', '3'], name: 'Alt + Shift + 3', action: 'vai para o desenho' },
    ],
  },
  {
    title: 'Na árvore semântica',
    shortcuts: [
      { keys: ['↑', '↓'], name: 'Setas para cima e para baixo', action: 'item anterior e próximo' },
      {
        keys: ['→'],
        name: 'Seta para a direita',
        action: 'abre o grupo ou entra no primeiro item',
      },
      {
        keys: ['←'],
        name: 'Seta para a esquerda',
        action: 'fecha o grupo ou volta para o item pai',
      },
      { keys: ['Home', 'End'], name: 'Home e End', action: 'primeiro e último item' },
      { keys: ['Enter'], name: 'Enter', action: 'em um relacionamento, vai até a outra entidade' },
      { keys: ['Tab'], name: 'Tab', action: 'sai da árvore' },
    ],
  },
  {
    title: 'No campo de código',
    shortcuts: [
      {
        keys: ['Ctrl', 'Enter'],
        name: 'Ctrl + Enter (Cmd + Enter no Mac)',
        action: 'interpreta o código',
      },
    ],
  },
  {
    title: 'Com a voz ligada',
    shortcuts: [{ keys: ['Esc'], name: 'Esc', action: 'cala a fala' }],
  },
  {
    title: 'Na área do desenho',
    shortcuts: [
      { keys: ['+', '−'], name: 'Mais e menos', action: 'aumenta e diminui o zoom' },
      { keys: ['0'], name: 'Zero', action: 'ajusta o desenho à área' },
    ],
  },
];

/**
 * Botão que abre a lista de atalhos num diálogo nativo (<dialog>): o leitor anuncia o diálogo,
 * o foco fica dentro dele enquanto está aberto, Esc fecha e o foco volta para o botão.
 */
export function ShortcutsDialog() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const openerRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();

  function open() {
    const dialog = dialogRef.current;
    if (dialog?.showModal) {
      dialog.showModal();
    } else {
      dialog?.setAttribute('open', '');
    }
  }

  function close() {
    const dialog = dialogRef.current;
    if (dialog?.close) {
      dialog.close();
    } else {
      dialog?.removeAttribute('open');
      openerRef.current?.focus();
    }
  }

  return (
    <>
      <button
        ref={openerRef}
        type="button"
        className="focus-ring rounded-sm border-2 border-muted bg-raised px-3 py-1 font-semibold text-fg"
        onClick={open}
      >
        Atalhos de teclado
      </button>
      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        className="m-auto w-[min(40rem,calc(100%-2rem))] rounded-sm border-2 border-line bg-raised p-6 text-fg backdrop:bg-black/60"
        // Esc fecha o diálogo nativo; o foco volta para o botão que o abriu.
        onClose={() => openerRef.current?.focus()}
      >
        <div className="flex items-start justify-between gap-4">
          <h2 id={titleId} className="text-xl font-bold">
            Atalhos de teclado
          </h2>
          <button
            type="button"
            className="focus-ring rounded-sm border-2 border-muted bg-raised px-3 py-1 font-semibold text-fg"
            onClick={close}
          >
            Fechar
          </button>
        </div>
        {shortcutGroups.map((group) => (
          <section key={group.title} className="mt-5">
            <h3 className="font-bold">{group.title}</h3>
            <ul className="mt-2 flex flex-col gap-2">
              {group.shortcuts.map(({ keys, name, action }) => (
                <li key={name} className="flex items-baseline gap-3">
                  <KeyCaps keys={keys} />
                  <span>{`${name}: ${action}`}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </dialog>
    </>
  );
}

function KeyCaps({ keys }: { readonly keys: readonly string[] }) {
  return (
    <span aria-hidden="true" className="flex w-40 shrink-0 gap-1">
      {keys.map((key) => (
        <kbd
          key={key}
          className="min-w-8 rounded-sm border-2 border-muted bg-surface px-1.5 text-center font-sans text-lg leading-snug font-bold"
        >
          {key}
        </kbd>
      ))}
    </span>
  );
}
