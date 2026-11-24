// @vitest-environment jsdom
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { exampleDiagram } from './ui/exampleDiagram';
import { installSpeechMock, removeSpeechMock } from './ui/speechMock';

afterEach(() => {
  cleanup();
  removeSpeechMock();
  localStorage.clear();
  delete document.documentElement.dataset.theme;
});

function setup() {
  const user = userEvent.setup();
  render(<App />);
  const editor = screen.getByRole('textbox', { name: 'Editor (sintaxe erDiagram do Mermaid)' });
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

  it('dá ao campo de código um nome diferente do título do painel', () => {
    const { editor } = setup();
    const heading = screen.getByRole('heading', { level: 2, name: 'Código do diagrama' });
    expect(editor.getAttribute('aria-labelledby')).toBeNull();
    expect(heading.textContent).not.toContain('Editor');
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
      '1 erro de sintaxe. Linha 2: O relacionamento precisa de um rótulo depois de "dois-pontos". Código E07.',
    );
    expect(editor.getAttribute('aria-invalid')).toBe('true');
    expect(screen.queryByRole('tree')).toBeNull();
    expect(screen.getByText('Corrija os erros de sintaxe para ver a árvore.')).toBeTruthy();

    const errorButton = screen.getByRole('button', {
      name: 'E07 Linha 2: O relacionamento precisa de um rótulo depois de "dois-pontos".',
    });
    await user.click(errorButton);
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

  it('destaca no desenho o item focado na árvore e mantém o destaque ao sair dela', async () => {
    const { user } = setup();
    const highlighted = () =>
      [...screen.getByRole('img').querySelectorAll('[data-highlighted]')].map(
        (element) => element.getAttribute('data-entity') ?? element.getAttribute('data-attribute'),
      );
    expect(highlighted()).toEqual([]);

    act(() => screen.getByRole('treeitem', { name: /^Entidade: PEDIDO/ }).focus());
    expect(highlighted()).toEqual(['PEDIDO']);

    // Num grupo da entidade ("Atributos (3)"), o destaque fica na própria entidade.
    await user.keyboard('{ArrowRight}{ArrowRight}');
    expect(document.activeElement).toBe(screen.getByRole('treeitem', { name: 'Atributos (3)' }));
    expect(highlighted()).toEqual(['PEDIDO']);

    await user.keyboard('{ArrowRight}{ArrowRight}{ArrowDown}');
    expect(highlighted()).toEqual(['cliente_id']);

    await user.tab();
    expect(highlighted()).toEqual(['cliente_id']);

    await user.click(screen.getByRole('button', { name: 'Interpretar diagrama' }));
    expect(highlighted()).toEqual([]);
  });

  it('amplia o desenho escondendo o código, sem reiniciar a árvore, e lembra a escolha', async () => {
    const { user } = setup();
    const enlarge = screen.getByRole('button', { name: 'Ampliar desenho' });
    expect(enlarge.getAttribute('aria-pressed')).toBe('false');

    const cliente = screen.getByRole('treeitem', { name: /^Entidade: CLIENTE/ });
    act(() => cliente.focus());
    await user.keyboard('{ArrowRight}');

    await user.click(enlarge);
    expect(enlarge.getAttribute('aria-pressed')).toBe('true');
    expect(screen.queryByRole('heading', { level: 2, name: 'Código do diagrama' })).toBeNull();
    expect(screen.getByRole('heading', { level: 2, name: 'Visualização (SVG)' })).toBeTruthy();
    expect(screen.getByRole('status').textContent).toBe(
      'Desenho ampliado. O código fica oculto e a árvore fica à esquerda.',
    );
    expect(
      screen.getByRole('treeitem', { name: /^Entidade: CLIENTE/ }).getAttribute('aria-expanded'),
    ).toBe('true');

    cleanup();
    render(<App />);
    expect(screen.queryByRole('heading', { level: 2, name: 'Código do diagrama' })).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Ampliar desenho' }));
    expect(screen.getByRole('heading', { level: 2, name: 'Código do diagrama' })).toBeTruthy();
    expect(screen.getByRole('status').textContent).toBe(
      'Desenho no tamanho normal. O código voltou a aparecer.',
    );
  });

  it('desliga a ampliação ao ocultar a visualização', async () => {
    const { user } = setup();
    await user.click(screen.getByRole('button', { name: 'Ampliar desenho' }));
    expect(screen.queryByRole('heading', { level: 2, name: 'Código do diagrama' })).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Mostrar visualização' }));
    expect(screen.getByRole('heading', { level: 2, name: 'Código do diagrama' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Ampliar desenho' })).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Mostrar visualização' }));
    expect(
      screen.getByRole('button', { name: 'Ampliar desenho' }).getAttribute('aria-pressed'),
    ).toBe('false');
  });

  it('deixa "Ampliar desenho" a um Tab da árvore', async () => {
    const { user } = setup();
    act(() => screen.getByRole('treeitem', { name: /^Diagrama ER/ }).focus());
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Ampliar desenho' }));
  });

  it('mostra os atalhos num diálogo, em frases contínuas, e devolve o foco ao fechar', async () => {
    const { user } = setup();
    const opener = screen.getByRole('button', { name: 'Atalhos de teclado' });
    expect(screen.queryByRole('dialog')).toBeNull();

    await user.click(opener);
    const dialog = screen.getByRole('dialog', { name: 'Atalhos de teclado' });
    for (const group of ['Na árvore semântica', 'No campo de código', 'Na área do desenho']) {
      expect(screen.getByRole('heading', { level: 3, name: group })).toBeTruthy();
    }

    // Cada atalho é um único trecho de texto; as teclas desenhadas ficam escondidas do leitor.
    const shortcut = screen
      .getByText('Setas para cima e para baixo: item anterior e próximo')
      .closest('li')!;
    expect(shortcut.querySelector('[aria-hidden="true"]')?.textContent).toBe('↑↓');
    expect(shortcut.querySelector('span:not([aria-hidden])')!.childNodes).toHaveLength(1);

    await user.click(screen.getByRole('button', { name: 'Fechar' }));
    expect(dialog.hasAttribute('open')).toBe(false);
    expect(document.activeElement).toBe(opener);
  });

  it('deixa a árvore logo depois do título do painel, sem atalhos no caminho', () => {
    setup();
    const panel = screen.getByRole('region', { name: 'Árvore semântica' });
    expect(panel.querySelector('details')).toBeNull();
    expect(screen.queryByText('Atalhos de teclado da árvore')).toBeNull();
  });

  it('começa com a voz desligada e não fala ao navegar', () => {
    const { synthesis } = installSpeechMock();
    setup();
    expect(screen.getByRole('button', { name: 'Voz' }).getAttribute('aria-pressed')).toBe('false');

    act(() => screen.getByRole('treeitem', { name: /^Entidade: CLIENTE/ }).focus());
    expect(synthesis.speak).not.toHaveBeenCalled();
  });

  it('com a voz ligada, fala o item focado na árvore e os anúncios, na velocidade escolhida', async () => {
    const speech = installSpeechMock();
    const { user } = setup();

    await user.click(screen.getByRole('button', { name: 'Voz' }));
    expect(speech.lastText()).toBe('Voz ligada.');
    expect(screen.getByRole('status').textContent).toBe('Voz ligada.');

    await user.selectOptions(screen.getByRole('combobox', { name: 'Velocidade' }), '1,5');
    expect(speech.spoken.at(-1)).toMatchObject({ text: 'Velocidade 1,5.', rate: 1.5 });

    act(() => screen.getByRole('treeitem', { name: /^Entidade: ITEM PEDIDO/ }).focus());
    expect(speech.spoken.at(-1)).toMatchObject({
      text: 'Entidade: ITEM PEDIDO. 3 atributos, 2 relacionamentos',
      rate: 1.5,
    });

    await user.click(screen.getByRole('button', { name: 'Interpretar diagrama' }));
    expect(speech.lastText()).toMatch(/^Diagrama interpretado\./);

    // A escolha fica salva.
    cleanup();
    render(<App />);
    expect(screen.getByRole('button', { name: 'Voz' }).getAttribute('aria-pressed')).toBe('true');
    expect((screen.getByRole('combobox', { name: 'Velocidade' }) as HTMLSelectElement).value).toBe(
      '1.5',
    );
  });

  it('cala a voz com Esc e ao desligar', async () => {
    const speech = installSpeechMock();
    const { user } = setup();
    await user.click(screen.getByRole('button', { name: 'Voz' }));
    const cancels = speech.synthesis.cancel.mock.calls.length;

    speech.synthesis.speaking = true;
    await user.keyboard('{Escape}');
    expect(speech.synthesis.cancel.mock.calls.length).toBe(cancels + 1);

    await user.click(screen.getByRole('button', { name: 'Voz' }));
    expect(speech.synthesis.cancel.mock.calls.length).toBe(cancels + 2);
    expect(screen.getByRole('status').textContent).toBe('Voz desligada.');
    expect(screen.queryByRole('combobox', { name: 'Velocidade' })).toBeNull();
  });

  it('avisa quando o navegador não tem síntese de voz', () => {
    setup();
    expect(screen.queryByRole('button', { name: 'Voz' })).toBeNull();
    expect(screen.getByText('Voz indisponível neste navegador')).toBeTruthy();
  });

  describe('ao reinterpretar (#34)', () => {
    const current = () =>
      screen.getAllByRole('treeitem').find((item) => item.getAttribute('tabindex') === '0');

    async function openClienteAttribute(user: ReturnType<typeof userEvent.setup>) {
      act(() => screen.getByRole('treeitem', { name: /^Entidade: CLIENTE/ }).focus());
      await user.keyboard('{ArrowRight}{ArrowRight}{ArrowRight}{ArrowRight}');
      expect(document.activeElement).toBe(
        screen.getByRole('treeitem', { name: 'id: int, chave primária' }),
      );
    }

    it('mantém os grupos abertos e o item atual, sem tirar o foco de quem interpretou', async () => {
      const { user } = setup();
      await openClienteAttribute(user);

      const interpretButton = screen.getByRole('button', { name: 'Interpretar diagrama' });
      await user.click(interpretButton);

      expect(document.activeElement).toBe(interpretButton);
      expect(
        screen.getByRole('treeitem', { name: /^Entidade: CLIENTE/ }).getAttribute('aria-expanded'),
      ).toBe('true');
      expect(current()?.getAttribute('aria-label')).toBe('id: int, chave primária');
    });

    it('leva o item atual para o ancestral mais próximo quando ele some', async () => {
      const { user, editor } = setup();
      await openClienteAttribute(user);

      await replaceCode(user, editor, exampleDiagram.replaceAll('CLIENTE', 'CONSUMIDOR'));
      await user.click(screen.getByRole('button', { name: 'Interpretar diagrama' }));
      expect(current()?.getAttribute('aria-label')).toBe('Entidades (4)');
    });

    it('volta ao estado de antes do erro depois de corrigir o código', async () => {
      const { user, editor } = setup();
      await openClienteAttribute(user);

      await replaceCode(user, editor, 'erDiagram\n  CLIENTE ||..o{ PEDIDO');
      await user.click(screen.getByRole('button', { name: 'Interpretar diagrama' }));
      expect(screen.queryByRole('tree')).toBeNull();

      await replaceCode(user, editor, exampleDiagram);
      await user.click(screen.getByRole('button', { name: 'Interpretar diagrama' }));
      expect(current()?.getAttribute('aria-label')).toBe('id: int, chave primária');
    });
  });

  describe('atalhos para os painéis (#33)', () => {
    const pressPanel = (user: ReturnType<typeof userEvent.setup>, number: 1 | 2 | 3) =>
      user.keyboard(`{Alt>}{Shift>}${number}{/Shift}{/Alt}`);

    it('tem "Ir para a árvore" como primeira parada de Tab, levando ao item atual', async () => {
      const { user } = setup();
      await user.tab();
      const skipLink = screen.getByRole('link', { name: 'Ir para a árvore' });
      expect(document.activeElement).toBe(skipLink);

      await user.keyboard('{Enter}');
      expect(document.activeElement).toBe(screen.getByRole('treeitem', { name: /^Diagrama ER/ }));
    });

    it('vai para a árvore, o código e o desenho com Alt + Shift + 2, 1 e 3, de dentro do campo de código', async () => {
      const { user, editor } = setup();
      await user.click(editor);

      await pressPanel(user, 2);
      expect(document.activeElement).toBe(screen.getByRole('treeitem', { name: /^Diagrama ER/ }));

      await pressPanel(user, 3);
      expect(document.activeElement).toBe(screen.getByRole('region', { name: 'Área do diagrama' }));

      await pressPanel(user, 1);
      expect(document.activeElement).toBe(editor);
      expect((editor as HTMLTextAreaElement).value).toBe(exampleDiagram);
    });

    it('mostra o painel oculto antes de levar o foco até ele', async () => {
      const { user } = setup();
      await user.click(screen.getByRole('button', { name: 'Ampliar desenho' }));
      await pressPanel(user, 1);
      expect(document.activeElement).toBe(
        screen.getByRole('textbox', { name: 'Editor (sintaxe erDiagram do Mermaid)' }),
      );

      await user.click(screen.getByRole('button', { name: 'Mostrar visualização' }));
      await pressPanel(user, 3);
      expect(document.activeElement).toBe(screen.getByRole('region', { name: 'Área do diagrama' }));
    });

    it('leva à lista de erros quando não há árvore', async () => {
      const { user, editor } = setup();
      await replaceCode(user, editor, 'erDiagram\n  CLIENTE ||..o{ PEDIDO');
      await user.click(screen.getByRole('button', { name: 'Interpretar diagrama' }));

      await pressPanel(user, 2);
      expect(document.activeElement).toBe(screen.getByRole('button', { name: /^E07/ }));
      expect(screen.getByRole('status').textContent).toBe(
        'Não há árvore: corrija os erros de sintaxe. O foco está na lista de erros.',
      );
    });
  });

  describe('da árvore para o código (#35)', () => {
    const clienteIdLine = exampleDiagram.split('\n').indexOf('    int cliente_id FK') + 1;

    async function focusClienteId(user: ReturnType<typeof userEvent.setup>) {
      act(() => screen.getByRole('treeitem', { name: /^Entidade: PEDIDO/ }).focus());
      await user.keyboard('{ArrowRight}{ArrowRight}{ArrowRight}{ArrowRight}{ArrowDown}');
      expect(document.activeElement).toBe(
        screen.getByRole('treeitem', { name: 'cliente id: int, chave estrangeira' }),
      );
    }

    it('Shift + Enter leva o cursor à linha do item no código e anuncia a linha', async () => {
      const { user, editor } = setup();
      await focusClienteId(user);

      await user.keyboard('{Shift>}{Enter}{/Shift}');
      const textarea = editor as HTMLTextAreaElement;
      expect(document.activeElement).toBe(textarea);
      expect(textarea.value.slice(textarea.selectionStart, textarea.selectionEnd)).toBe(
        '    int cliente_id FK',
      );
      // Anúncio urgente (interrompe a leitura do campo de código pelo leitor de tela).
      await waitFor(() =>
        expect(screen.getByRole('alert').textContent).toBe(
          `Linha ${clienteIdLine} do código: int cliente id FK.`,
        ),
      );
      expect(screen.getByRole('status').textContent).toBe('');

      // Volta para o mesmo item da árvore.
      await user.keyboard('{Alt>}{Shift>}2{/Shift}{/Alt}');
      expect(document.activeElement).toBe(
        screen.getByRole('treeitem', { name: 'cliente id: int, chave estrangeira' }),
      );
    });

    it('avisa quando o item não tem linha (grupos)', async () => {
      const { user } = setup();
      const group = screen.getByRole('treeitem', { name: 'Entidades (4)' });
      act(() => group.focus());

      await user.keyboard('{Shift>}{Enter}{/Shift}');
      expect(document.activeElement).toBe(group);
      expect(screen.getByRole('status').textContent).toBe('Este item não tem uma linha no código.');
    });

    it('mostra o código antes, se ele estiver oculto pelo "Ampliar desenho"', async () => {
      const { user } = setup();
      await user.click(screen.getByRole('button', { name: 'Ampliar desenho' }));
      await focusClienteId(user);

      await user.keyboard('{Shift>}{Enter}{/Shift}');
      const textarea = screen.getByRole('textbox', {
        name: 'Editor (sintaxe erDiagram do Mermaid)',
      }) as HTMLTextAreaElement;
      expect(document.activeElement).toBe(textarea);
      expect(textarea.value.slice(textarea.selectionStart, textarea.selectionEnd)).toBe(
        '    int cliente_id FK',
      );
    });
  });

  describe('exportar descrição (#27)', () => {
    it('baixa a descrição em Markdown e anuncia o arquivo', async () => {
      const { user } = setup();
      let exported: Blob | undefined;
      Object.assign(URL, {
        createObjectURL: vi.fn((blob: Blob) => {
          exported = blob;
          return 'blob:diagrama';
        }),
        revokeObjectURL: vi.fn(),
      });
      const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

      await user.click(screen.getByRole('button', { name: 'Exportar descrição (.md)' }));

      expect(click).toHaveBeenCalled();
      expect(exported?.type).toBe('text/markdown;charset=utf-8');
      const text = await exported!.text();
      expect(text).toMatch(/^# Diagrama ER\n\nDiagrama ER com 4 entidades e 3 relacionamentos\./);
      expect(text).toContain('### ITEM_PEDIDO');
      expect(screen.getByRole('status').textContent).toBe('Descrição exportada: diagrama-er.md.');
      click.mockRestore();
    });

    it('avisa que não há o que exportar quando o código tem erros', async () => {
      const { user, editor } = setup();
      await replaceCode(user, editor, 'erDiagram\n  CLIENTE ||..o{ PEDIDO');
      await user.click(screen.getByRole('button', { name: 'Interpretar diagrama' }));

      await user.click(screen.getByRole('button', { name: 'Exportar descrição (.md)' }));
      expect(screen.getByRole('status').textContent).toBe(
        'Não há descrição para exportar: corrija os erros de sintaxe.',
      );
    });
  });
});
