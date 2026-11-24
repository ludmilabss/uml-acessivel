import { describe, expect, it } from 'vitest';
import { exportMarkdown } from './markdownExport';
import { describeEntity, describeRelationship } from './narration';
import { parseErDiagram } from './parser';

describe('exportMarkdown', () => {
  it('descreve o diagrama com títulos e listas, usando as frases da narração', () => {
    const diagram = parseErDiagram(`erDiagram
  CLIENTE ||..o{ PEDIDO : faz
  CLIENTE {
    int id PK
    string nome "nome completo"
  }`).diagram!;
    const [cliente, pedido] = diagram.entities;
    const faz = describeRelationship(diagram.relationships[0]);
    // Resumo da entidade sem o "Entidade: NOME." do começo (o nome já está no título).
    const summary = (text: string) => text.replace(/^Entidade: [^.]+\. /, '');

    expect(exportMarkdown(diagram)).toBe(`# Diagrama ER

Diagrama ER com 2 entidades e 1 relacionamento.

## Entidades

### CLIENTE

${summary(describeEntity(cliente, 1))}

**Atributos**

- id: int, chave primária.
- nome: string. Comentário: nome completo.

**Relacionamentos**

- ${faz}

### PEDIDO

${summary(describeEntity(pedido, 1))}

**Relacionamentos**

- ${faz}

## Relacionamentos

- ${faz}
`);
  });

  it('não repete o nome da entidade no resumo (já está no título)', () => {
    const diagram = parseErDiagram('erDiagram\n  ALUNO {\n    int id PK\n  }').diagram!;
    expect(exportMarkdown(diagram)).not.toContain('Entidade: ALUNO');
    expect(exportMarkdown(diagram)).toContain('### ALUNO\n\n1 atributo');
  });
});
