export interface PerformanceScenario {
  readonly name: string;
  readonly entityCount: number;
  readonly attributesPerEntity: number;
}

/** Tamanhos usados no teste de desempenho e no benchmark (docs/relatorio-desempenho.md). */
export const performanceScenarios: readonly PerformanceScenario[] = [
  { name: 'pequeno', entityCount: 10, attributesPerEntity: 5 },
  { name: 'médio', entityCount: 100, attributesPerEntity: 10 },
  { name: 'grande', entityCount: 500, attributesPerEntity: 10 },
];

/**
 * Gera um diagrama válido com blocos de atributos, comentários entre aspas,
 * chaves PK/FK e cerca de dois relacionamentos por entidade.
 */
export function generateDiagram(scenario: PerformanceScenario): string {
  const { entityCount, attributesPerEntity } = scenario;
  const lines = ['erDiagram'];

  for (let index = 0; index < entityCount; index += 1) {
    lines.push(`  ENTIDADE_${index} {`);
    lines.push('    int id PK');
    for (let attribute = 1; attribute < attributesPerEntity; attribute += 1) {
      lines.push(`    string campo_${attribute} "descrição do campo ${attribute}"`);
    }
    if (index > 0) {
      lines.push(`    int entidade_${index - 1}_id FK`);
    }
    lines.push('  }');
  }

  for (let index = 1; index < entityCount; index += 1) {
    lines.push(`  ENTIDADE_${index - 1} ||--o{ ENTIDADE_${index} : possui`);
    lines.push(
      `  ENTIDADE_${index} }o..o{ ENTIDADE_${(index * 7) % entityCount} : "relaciona com"`,
    );
  }

  return lines.join('\n');
}
