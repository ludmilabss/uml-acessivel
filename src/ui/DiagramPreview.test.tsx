// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { parseErDiagram } from '../core';
import { DiagramPreview } from './DiagramPreview';
import { layoutDiagram } from './diagramLayout';
import { exampleDiagram } from './exampleDiagram';

afterEach(cleanup);

const diagram = parseErDiagram(exampleDiagram).diagram!;

function svg() {
  return screen.getByRole('img');
}

describe('DiagramPreview', () => {
  it('tem um nome curto que aponta para a árvore', () => {
    render(<DiagramPreview diagram={diagram} />);
    expect(
      screen.getByRole('img', {
        name: 'Desenho do diagrama. Diagrama ER com 4 entidades e 3 relacionamentos. Para navegar, use a árvore semântica.',
      }),
    ).toBeTruthy();
  });

  it('desenha entidades, atributos e chaves', () => {
    render(<DiagramPreview diagram={diagram} />);
    const pedido = svg().querySelector('[data-entity="PEDIDO"]')!;
    expect(pedido.textContent).toContain('PEDIDO');
    expect(pedido.querySelector('[data-attribute="cliente_id"]')!.textContent).toBe(
      'cliente_id: intFK',
    );
  });

  it('usa linha tracejada só no relacionamento não identificador', () => {
    render(<DiagramPreview diagram={diagram} />);
    const dashed = [0, 1, 2].map((index) =>
      svg().querySelector(`[data-relationship="${index}"] path`)!.getAttribute('stroke-dasharray'),
    );
    expect(dashed).toEqual(['7 5', null, null]);
  });

  it('desenha a cardinalidade de cada ponta', () => {
    render(<DiagramPreview diagram={diagram} />);
    const ends = [...svg().querySelectorAll('[data-relationship="1"] [data-cardinality]')].map(
      (end) => end.getAttribute('data-cardinality'),
    );
    expect(ends).toEqual(['exactlyOne', 'oneOrMany']);
  });

  it('destaca o elemento focado na árvore', () => {
    const { rerender } = render(
      <DiagramPreview diagram={diagram} highlight={{ kind: 'entity', entityName: 'PEDIDO' }} />,
    );
    const highlighted = () =>
      [...svg().querySelectorAll('[data-highlighted]')].map(
        (element) =>
          element.getAttribute('data-entity') ??
          element.getAttribute('data-attribute') ??
          `relacionamento ${element.getAttribute('data-relationship')}`,
      );
    expect(highlighted()).toEqual(['PEDIDO']);

    rerender(
      <DiagramPreview
        diagram={diagram}
        highlight={{ kind: 'attribute', entityName: 'PEDIDO', attributeName: 'cliente_id' }}
      />,
    );
    expect(highlighted()).toEqual(['cliente_id']);

    rerender(
      <DiagramPreview
        diagram={diagram}
        highlight={{ kind: 'relationship', relationshipIndex: 1 }}
      />,
    );
    expect(highlighted()).toEqual(['relacionamento 1']);
  });

  it('agrupa os controles com o nome do painel, para o leitor dizer onde a pessoa entrou', () => {
    render(<DiagramPreview diagram={diagram} onToggleEnlarge={() => {}} />);
    const controls = screen.getByRole('group', { name: 'Controles da visualização (SVG)' });
    expect(controls.querySelector('button')!.textContent).toContain('Ampliar desenho');
  });

  it('pede para corrigir os erros quando não há diagrama', () => {
    render(<DiagramPreview />);
    expect(screen.getByText('Corrija os erros de sintaxe para ver o diagrama.')).toBeTruthy();
  });

  it('começa ajustado à área e aumenta ou diminui o zoom pelos botões, anunciando o nível', async () => {
    const user = userEvent.setup();
    const onAnnounce = vi.fn();
    render(<DiagramPreview diagram={diagram} onAnnounce={onAnnounce} />);
    const { width } = layoutDiagram(diagram);
    const fit = screen.getByRole('button', { name: 'Ajustar à área' });

    expect(svg().getAttribute('width')).toBe('100%');
    expect(fit.getAttribute('aria-pressed')).toBe('true');

    // No jsdom a área não tem tamanho, então o "ajustar" conta como 100%.
    await user.click(screen.getByRole('button', { name: 'Aumentar zoom' }));
    expect(svg().getAttribute('width')).toBe(String(width * 1.25));
    expect(fit.getAttribute('aria-pressed')).toBe('false');
    expect(screen.getByText('Zoom 125%')).toBeTruthy();
    expect(onAnnounce).toHaveBeenLastCalledWith('Zoom 125%.');

    await user.click(screen.getByRole('button', { name: 'Diminuir zoom' }));
    expect(onAnnounce).toHaveBeenLastCalledWith('Zoom 100%.');

    await user.click(fit);
    expect(svg().getAttribute('width')).toBe('100%');
    expect(onAnnounce).toHaveBeenLastCalledWith('Diagrama ajustado à área.');
  });

  it('avisa quando chega ao zoom máximo', async () => {
    const user = userEvent.setup();
    const onAnnounce = vi.fn();
    render(<DiagramPreview diagram={diagram} onAnnounce={onAnnounce} />);
    const zoomIn = screen.getByRole('button', { name: 'Aumentar zoom' });

    // 100% → 125 → 150 → 200 → 250 → 300 → 400
    for (let click = 0; click < 6; click += 1) {
      await user.click(zoomIn);
    }
    expect(onAnnounce).toHaveBeenLastCalledWith('Zoom 400%.');
    await user.click(zoomIn);
    expect(onAnnounce).toHaveBeenLastCalledWith('Zoom máximo, 400%.');
  });

  it('muda o zoom com + − e 0 na área do diagrama', async () => {
    const user = userEvent.setup();
    const onAnnounce = vi.fn();
    render(<DiagramPreview diagram={diagram} onAnnounce={onAnnounce} />);

    screen.getByRole('region', { name: 'Área do diagrama' }).focus();
    await user.keyboard('+');
    expect(onAnnounce).toHaveBeenLastCalledWith('Zoom 125%.');
    await user.keyboard('-');
    expect(onAnnounce).toHaveBeenLastCalledWith('Zoom 100%.');
    await user.keyboard('0');
    expect(onAnnounce).toHaveBeenLastCalledWith('Diagrama ajustado à área.');
  });
});
