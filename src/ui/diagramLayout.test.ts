import { describe, expect, it } from 'vitest';
import { parseErDiagram, type Diagram } from '../core';
import { boxExit, layoutDiagram, type Box } from './diagramLayout';
import { exampleDiagram } from './exampleDiagram';

function parseValid(source: string): Diagram {
  const result = parseErDiagram(source);
  if (!result.diagram) {
    throw new Error(JSON.stringify(result.errors));
  }
  return result.diagram;
}

function overlaps(a: Box, b: Box): boolean {
  return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
}

describe('layoutDiagram', () => {
  const layout = layoutDiagram(parseValid(exampleDiagram));
  const boxOf = (name: string) => layout.entities.find((entity) => entity.name === name)!.box;

  it('põe as entidades em colunas, na direção dos relacionamentos', () => {
    expect(boxOf('CLIENTE').x).toBeLessThan(boxOf('PEDIDO').x);
    expect(boxOf('PEDIDO').x).toBeLessThan(boxOf('ITEM_PEDIDO').x);
    // PRODUTO só aponta para ITEM_PEDIDO: fica na coluna logo antes, junto do PEDIDO.
    expect(boxOf('PRODUTO').x).toBe(boxOf('PEDIDO').x);
  });

  it('não sobrepõe caixas e cabe no tamanho calculado', () => {
    const boxes = layout.entities.map((entity) => entity.box);
    boxes.forEach((a, i) => boxes.slice(i + 1).forEach((b) => expect(overlaps(a, b)).toBe(false)));
    for (const box of boxes) {
      expect(box.x + box.width).toBeLessThanOrEqual(layout.width);
      expect(box.y + box.height).toBeLessThanOrEqual(layout.height);
    }
  });

  it('cria uma linha por atributo, com o texto e as chaves', () => {
    const item = layout.entities.find((entity) => entity.name === 'ITEM_PEDIDO')!;
    expect(item.attributes.map(({ text, keys }) => [text, keys])).toEqual([
      ['pedido_id: int', 'PK, FK'],
      ['produto_id: int', 'PK, FK'],
      ['quantidade: int', ''],
    ]);
  });

  it('começa e termina cada relacionamento na borda das caixas', () => {
    const [faz] = layout.relationships;
    const cliente = boxOf('CLIENTE');
    const pedido = boxOf('PEDIDO');
    expect(faz.start.point.x).toBeCloseTo(cliente.x + cliente.width);
    expect(faz.end.point.x).toBeCloseTo(pedido.x);
    expect(faz.identifying).toBe(false);
    expect(faz.start.cardinality).toBe('exactlyOne');
    expect(faz.end.cardinality).toBe('zeroOrMany');
  });

  it('desenha autorrelacionamento como laço do lado direito da caixa', () => {
    const self = layoutDiagram(
      parseValid('erDiagram\n  FUNCIONARIO |o..o{ FUNCIONARIO : gerencia'),
    );
    const [box] = self.entities.map((entity) => entity.box);
    const [loop] = self.relationships;
    expect(loop.start.point.x).toBe(box.x + box.width);
    expect(loop.end.point.x).toBe(box.x + box.width);
    expect(loop.start.angle).toBe(0);
    expect(self.width).toBeGreaterThan(box.x + box.width + 70);
  });

  it('separa relacionamentos repetidos entre o mesmo par', () => {
    const repeated = layoutDiagram(
      parseValid('erDiagram\n  ALUNO }o..o{ CURSO : cursa\n  ALUNO }o..o{ CURSO : "já cursou"'),
    );
    const [first, second] = repeated.relationships;
    expect(first.path).not.toBe(second.path);
  });

  it('aceita diagrama sem entidades', () => {
    expect(layoutDiagram(parseValid('erDiagram')).entities).toEqual([]);
  });
});

describe('boxExit', () => {
  const box = { x: 0, y: 0, width: 100, height: 50 };

  it('encontra o ponto da borda na direção do alvo', () => {
    expect(boxExit(box, { x: 50, y: 25 }, { x: 300, y: 25 })).toEqual({ x: 100, y: 25 });
    expect(boxExit(box, { x: 50, y: 25 }, { x: 50, y: -200 })).toEqual({ x: 50, y: 0 });
  });
});
