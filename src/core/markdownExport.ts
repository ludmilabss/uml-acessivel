import type { Diagram, Relationship } from './model';
import {
  describeAttribute,
  describeDiagram,
  describeEntity,
  describeRelationship,
} from './narration';

/**
 * Descrição do diagrama em Markdown, com as mesmas frases da narração da árvore.
 * Usa títulos e listas (e não tabelas), que são mais fáceis de navegar com leitor de tela.
 */
export function exportMarkdown(diagram: Diagram): string {
  const lines = ['# Diagrama ER', '', describeDiagram(diagram)];

  if (diagram.entities.length > 0) {
    lines.push('', '## Entidades');
    for (const entity of diagram.entities) {
      const related = relationshipsOf(entity.name, diagram.relationships);
      // describeEntity começa com "Entidade: NOME."; o nome já está no título.
      const summary = describeEntity(entity, related.length).replace(/^Entidade: [^.]+\. /, '');
      lines.push('', `### ${entity.name}`, '', summary);

      if (entity.attributes.length > 0) {
        lines.push('', '**Atributos**', '');
        entity.attributes.forEach((attribute) => lines.push(`- ${describeAttribute(attribute)}`));
      }
      if (related.length > 0) {
        lines.push('', '**Relacionamentos**', '');
        related.forEach((relationship) => lines.push(`- ${describeRelationship(relationship)}`));
      }
    }
  }

  if (diagram.relationships.length > 0) {
    lines.push('', '## Relacionamentos', '');
    diagram.relationships.forEach((relationship) =>
      lines.push(`- ${describeRelationship(relationship)}`),
    );
  }

  return `${lines.join('\n')}\n`;
}

function relationshipsOf(entityName: string, relationships: readonly Relationship[]) {
  return relationships.filter((r) => r.leftEntity === entityName || r.rightEntity === entityName);
}
