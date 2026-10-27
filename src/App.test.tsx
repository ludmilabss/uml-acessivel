// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import App from './App';

afterEach(() => {
  cleanup();
  localStorage.clear();
  delete document.documentElement.dataset.theme;
});

function setup() {
  const user = userEvent.setup();
  render(<App />);
  const editor = screen.getByRole('textbox', { name: 'Código do diagrama' });
  return { user, editor };
}

async function replaceCode(
  user: ReturnType<typeof userEvent.setup>,
  editor: HTMLElement,
  code: string,
) {
  await user.clear(editor);
  await user.click(editor);
  await user.paste(code);
}

describe('App', () => {
  it('mostra os três painéis e a árvore do diagrama de exemplo', () => {
    setup();

    for (const name of ['Código do diagrama', 'Árvore semântica', 'Visualização (SVG)']) {
      expect(screen.getByRole('heading', { level: 2, name })).toBeTruthy();
    }
    expect(
      screen.getByRole('tree', {
        name: 'Árvore semântica',
        description: /^Use as setas para navegar\./,
      }),
    ).toBeTruthy();
    expect(screen.getByRole('status').textContent).toBe('');
  });

  it('interpreta o código colado e anuncia o resultado na região aria-live', async () => {
    const { user, editor } = setup();

    await replaceCode(user, editor, 'erDiagram\n  ALUNO }o..o{ CURSO : cursa');
    await user.click(screen.getByRole('button', { name: 'Interpretar diagrama' }));

    expect(screen.getByRole('status').textContent).toBe(
      'Diagrama interpretado. Diagrama ER com 2 entidades e 1 relacionamento. A árvore foi atualizada.',
    );
    expect(screen.getByRole('treeitem', { name: /^Entidade: ALUNO/ })).toBeTruthy();
  });

  it('interpreta com Ctrl + Enter sem sair do campo', async () => {
    const { user, editor } = setup();

    await replaceCode(user, editor, 'erDiagram\n  ALUNO }o..o{ CURSO : cursa');
    await user.keyboard('{Control>}{Enter}{/Control}');

    expect(screen.getByRole('status').textContent).toMatch(/^Diagrama interpretado\./);
    expect(document.activeElement).toBe(editor);
  });

  it('descreve os erros em texto e leva o cursor até a linha do erro', async () => {
    const { user, editor } = setup();

    await replaceCode(user, editor, 'erDiagram\n  CLIENTE ||..o{ PEDIDO');
    await user.keyboard('{Control>}{Enter}{/Control}');

    expect(screen.getByRole('status').textContent).toBe(
      '1 erro de sintaxe. Linha 2: O relacionamento precisa de um rótulo depois de ":".',
    );
    expect(editor.getAttribute('aria-invalid')).toBe('true');
    expect(screen.queryByRole('tree')).toBeNull();
    expect(screen.getByText('Corrija os erros de sintaxe para ver a árvore.')).toBeTruthy();

    await user.click(screen.getByRole('button', { name: /Linha 2: O relacionamento/ }));
    const textarea = editor as HTMLTextAreaElement;
    expect(document.activeElement).toBe(textarea);
    expect(textarea.value.slice(textarea.selectionStart, textarea.selectionEnd)).toBe(
      '  CLIENTE ||..o{ PEDIDO',
    );
  });

  it('troca para o tema de alto contraste e lembra a escolha', async () => {
    const { user } = setup();
    expect(document.documentElement.dataset.theme).toBe('default');

    await user.selectOptions(screen.getByRole('combobox', { name: 'Tema' }), 'Alto contraste');
    expect(document.documentElement.dataset.theme).toBe('contrast');

    cleanup();
    render(<App />);
    expect(document.documentElement.dataset.theme).toBe('contrast');
  });

  it('mostra na barra de status a narração do item focado na árvore', async () => {
    const { user } = setup();

    screen.getByRole('treeitem', { name: /^Diagrama ER/ }).focus();
    await user.keyboard('{ArrowDown}{ArrowDown}');
    expect(screen.getByText(/^Foco: Entidade: CLIENTE\./)).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Interpretar diagrama' }));
    expect(screen.queryByText(/^Foco:/)).toBeNull();
  });

  it('oculta e mostra a visualização pelo botão de alternância, e lembra a escolha', async () => {
    const { user } = setup();
    const toggle = screen.getByRole('button', { name: 'Mostrar visualização' });
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('heading', { level: 2, name: 'Visualização (SVG)' })).toBeTruthy();

    await user.click(toggle);
    expect(toggle.getAttribute('aria-pressed')).toBe('false');
    expect(screen.queryByRole('heading', { level: 2, name: 'Visualização (SVG)' })).toBeNull();
    expect(screen.getByRole('status').textContent).toBe(
      'Visualização oculta. A árvore ocupa a coluna inteira.',
    );
    expect(screen.getByRole('tree', { name: 'Árvore semântica' })).toBeTruthy();

    cleanup();
    render(<App />);
    expect(
      screen.getByRole('button', { name: 'Mostrar visualização' }).getAttribute('aria-pressed'),
    ).toBe('false');

    await user.click(screen.getByRole('button', { name: 'Mostrar visualização' }));
    expect(screen.getByRole('status').textContent).toBe('Visualização visível, abaixo da árvore.');
    expect(screen.getByRole('heading', { level: 2, name: 'Visualização (SVG)' })).toBeTruthy();
  });

  it('não recria a árvore ao alternar a visualização (o foco e os grupos abertos continuam)', async () => {
    const { user } = setup();
    const cliente = screen.getByRole('treeitem', { name: /^Entidade: CLIENTE/ });
    cliente.focus();
    await user.keyboard('{ArrowRight}');
    expect(cliente.getAttribute('aria-expanded')).toBe('true');

    await user.click(screen.getByRole('button', { name: 'Mostrar visualização' }));
    expect(
      screen.getByRole('treeitem', { name: /^Entidade: CLIENTE/ }).getAttribute('aria-expanded'),
    ).toBe('true');
  });

  it('lista os atalhos da árvore em frases visíveis, com o nome das teclas por extenso', async () => {
    const { user } = setup();
    await user.click(screen.getByText('Atalhos de teclado da árvore'));

    const shortcut = screen
      .getByText('Setas para cima e para baixo: item anterior e próximo')
      .closest('li')!;
    expect(shortcut.querySelector('[aria-hidden="true"]')?.textContent).toBe('↑↓');
    // Um único trecho de texto, sem elementos no meio, para o VoiceOver ler a frase de uma vez.
    const sentence = shortcut.querySelector('span:not([aria-hidden])')!;
    expect(sentence.childNodes).toHaveLength(1);
  });
});
