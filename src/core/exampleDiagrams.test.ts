import { describe, expect, it } from 'vitest';
import { invalidExamples, validExamples } from './exampleDiagrams';
import type { ParseErrorCode } from './model';
import { parseErDiagram } from './parser';
import { buildSemanticTree } from './semanticTree';

describe('diagramas de exemplo válidos', () => {
  it.each(validExamples)('$name é interpretado sem erros e gera a árvore', (example) => {
    const result = parseErDiagram(example.source);
    expect(result.errors).toEqual([]);
    expect(result.diagram?.entities).toHaveLength(example.entityCount);
    expect(result.diagram?.relationships).toHaveLength(example.relationshipCount);
    expect(() => buildSemanticTree(result.diagram!)).not.toThrow();
  });

  it('cobrem todas as cardinalidades, as quatro classificações e os dois tipos de ligação', () => {
    const relationships = validExamples.flatMap(
      (example) => parseErDiagram(example.source).diagram!.relationships,
    );
    const cardinalities = new Set(
      relationships.flatMap((r) => [r.leftCardinality, r.rightCardinality]),
    );
    expect([...cardinalities].sort()).toEqual(
      ['exactlyOne', 'oneOrMany', 'zeroOrMany', 'zeroOrOne'].sort(),
    );
    expect(new Set(relationships.map((r) => r.classification)).size).toBe(4);
    expect(new Set(relationships.map((r) => r.kind)).size).toBe(2);
  });
});

describe('diagramas de exemplo inválidos', () => {
  it('têm um exemplo para cada código de erro', () => {
    const codes = invalidExamples.map((example) => example.expectedCode);
    const allCodes = Array.from(
      { length: 14 },
      (_, index) => `E${String(index + 1).padStart(2, '0')}` as ParseErrorCode,
    );
    expect(codes).toEqual(allCodes);
  });

  it.each(invalidExamples)('$name gera $expectedCode', (example) => {
    const result = parseErDiagram(example.source);
    expect(result.diagram).toBeUndefined();
    expect(result.errors.map((error) => error.code)).toContain(example.expectedCode);
  });
});
