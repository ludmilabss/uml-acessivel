export type AttributeKey = 'PK' | 'FK' | 'UK';

export type Cardinality = 'exactlyOne' | 'zeroOrOne' | 'oneOrMany' | 'zeroOrMany';

export type RelationshipKind = 'identifying' | 'nonIdentifying';

export type RelationshipClassification = 'oneToOne' | 'oneToMany' | 'manyToOne' | 'manyToMany';

export interface Attribute {
  readonly type: string;
  readonly name: string;
  readonly keys: readonly AttributeKey[];
  readonly comment?: string;
  readonly line: number;
}

export interface Entity {
  readonly name: string;
  readonly attributes: readonly Attribute[];
  readonly firstMentionLine: number;
  readonly declarationLine?: number;
}

export interface Relationship {
  readonly leftEntity: string;
  readonly rightEntity: string;
  readonly leftCardinality: Cardinality;
  readonly rightCardinality: Cardinality;
  readonly kind: RelationshipKind;
  readonly classification: RelationshipClassification;
  readonly label: string;
  readonly line: number;
}

export interface Diagram {
  readonly headerLine: number;
  readonly entities: readonly Entity[];
  readonly relationships: readonly Relationship[];
}

export type ParseErrorCode =
  | 'E01'
  | 'E02'
  | 'E03'
  | 'E04'
  | 'E05'
  | 'E06'
  | 'E07'
  | 'E08'
  | 'E09'
  | 'E10'
  | 'E11'
  | 'E12'
  | 'E13'
  | 'E14';

export interface ParseError {
  readonly code: ParseErrorCode;
  readonly message: string;
  readonly line: number;
}

export interface ParseResult {
  readonly diagram?: Diagram;
  readonly errors: readonly ParseError[];
}
