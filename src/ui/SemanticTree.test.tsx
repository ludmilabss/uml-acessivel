// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { buildSemanticTree, parseErDiagram } from '../core';
import { SemanticTree } from './SemanticTree';

afterEach(cleanup);

const source = `erDiagram
  CLIENTE ||..o{ PEDIDO : faz
  CLIENTE {
    int id PK
  }`;

function setup() {
  const tree = buildSemanticTree(parseErDiagram(source).diagram!);
  const user = userEvent.setup();
  render(
    <>
      <h2 id="titulo">Árvore semântica</h2>
      <SemanticTree tree={tree} labelledBy="titulo" />
    </>,
  );
  return { user };
}

function item(name: string | RegExp) {
  return screen.getByRole('treeitem', { name });
}

describe('SemanticTree', () => {
  it('segue o padrão WAI-ARIA: árvore nomeada, níveis e posição de cada item', () => {
    setup();

    expect(screen.getByRole('tree', { name: 'Árvore semântica' })).toBeTruthy();
    const root = item(/^Diagrama ER com 2 entidades/);
    expect(root.getAttribute('aria-level')).toBe('1');
    expect(root.getAttribute('aria-expanded')).toBe('true');

    const cliente = item(/^Entidade: CLIENTE/);
    expect(cliente.getAttribute('aria-level')).toBe('3');
    expect(cliente.getAttribute('aria-posinset')).toBe('1');
    expect(cliente.getAttribute('aria-setsize')).toBe('2');
    expect(cliente.getAttribute('aria-expanded')).toBe('false');
  });

  it('lê nos grupos o mesmo texto que aparece na tela', () => {
    setup();
    expect(item('Entidades (2)').textContent).toContain('Entidades (2)');
    expect(item('Relacionamentos (1)')).toBeTruthy();
  });

  it('não repete "selecionado" nem termina o nome com ponto (o leitor já pausa antes do estado)', () => {
    setup();
    for (const treeitem of screen.getAllByRole('treeitem')) {
      expect(treeitem.hasAttribute('aria-selected')).toBe(false);
      expect(treeitem.getAttribute('aria-label')).not.toMatch(/\.$/);
    }
  });

  it('começa o nome lido pelo texto visível em todos os itens (WCAG 2.5.3)', async () => {
    const { user } = setup();
    await user.tab();
    // Abre CLIENTE e os grupos dele, para conferir também atributos e relacionamentos.
    await user.keyboard('{ArrowDown}{ArrowDown}{ArrowRight}{ArrowRight}{ArrowRight}');
    await user.keyboard('{ArrowDown}{ArrowDown}{ArrowRight}');

    const treeitems = screen.getAllByRole('treeitem');
    expect(treeitems.map((treeitem) => treeitem.getAttribute('aria-label'))).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/^Atributo id, tipo int, chave primária$/),
        expect.stringMatching(/^CLIENTE, exatamente um, faz PEDIDO, zero ou muitos\./),
      ]),
    );
    for (const treeitem of treeitems) {
      const visible = treeitem.querySelector('.tree-row')!.textContent!.slice(1);
      expect(treeitem.getAttribute('aria-label')!.startsWith(visible)).toBe(true);
    }
  });

  it('tem uma única parada de Tab (roving tabindex)', async () => {
    const { user } = setup();

    const focusable = screen
      .getAllByRole('treeitem')
      .filter((element) => element.getAttribute('tabindex') === '0');
    expect(focusable).toHaveLength(1);

    await user.tab();
    expect(document.activeElement).toBe(item(/^Diagrama ER/));
  });

  it('move o foco com as setas, abre e fecha grupos', async () => {
    const { user } = setup();
    await user.tab();

    await user.keyboard('{ArrowDown}');
    expect(document.activeElement).toBe(item('Entidades (2)'));

    await user.keyboard('{ArrowDown}');
    const cliente = item(/^Entidade: CLIENTE/);
    expect(document.activeElement).toBe(cliente);

    await user.keyboard('{ArrowRight}');
    expect(cliente.getAttribute('aria-expanded')).toBe('true');
    expect(document.activeElement).toBe(cliente);

    await user.keyboard('{ArrowRight}');
    expect(document.activeElement).toBe(item('Atributos (1)'));

    await user.keyboard('{ArrowLeft}');
    expect(document.activeElement).toBe(cliente);

    await user.keyboard('{ArrowLeft}');
    expect(cliente.getAttribute('aria-expanded')).toBe('false');

    await user.keyboard('{ArrowUp}');
    expect(document.activeElement).toBe(item('Entidades (2)'));
  });

  it('vai ao primeiro e ao último item com Home e End', async () => {
    const { user } = setup();
    await user.tab();

    await user.keyboard('{End}');
    expect(document.activeElement).toBe(
      item(/^CLIENTE, exatamente um, faz PEDIDO, zero ou muitos\.[^E]*$/),
    );

    await user.keyboard('{Home}');
    expect(document.activeElement).toBe(item(/^Diagrama ER/));
  });

  it('Enter em um relacionamento leva o foco à entidade de destino', async () => {
    const { user } = setup();
    await user.tab();

    // Diagrama → Entidades → CLIENTE → (abre) → Atributos → Relacionamentos → (abre) → relacionamento
    await user.keyboard('{ArrowDown}{ArrowDown}{ArrowRight}{ArrowRight}{ArrowDown}');
    await user.keyboard('{ArrowRight}{ArrowRight}');
    const relationship = item(/Enter leva à entidade PEDIDO$/);
    expect(document.activeElement).toBe(relationship);

    await user.keyboard('{Enter}');
    expect(document.activeElement).toBe(item(/^Entidade: PEDIDO/));
  });
});
