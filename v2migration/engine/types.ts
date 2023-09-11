export type ExpressionV1 = {
  spelling: string;
  inflection?: string;
  definitions: string[];
};

export type DictionaryV1 = {
  name: string;
  url?: string;
  expressionLanguageId: string;
  definitionLanguageId: string;
  dictionary: ExpressionV1[];
};

// ========= V2 TYPES ==========

export type Example = { raw: string; src?: string; trl?: string; tags?: string[] };

export type DefinitionDetails = {
  definitions: {
    value: string;
    tags?: string[];
  }[];
  examples?: Example[];
  /** tags applicable to all `definitions` and `examples` */
  tags?: string[];
};
/**
 * It represents the whole definition of a word for the following cases:
 * - Definition per dictionary (e.g. definition from Babakhanov dictionary will have one ExpressionDetails object and definition from Hajiyev dictionary will have another ExpressionDetails object)
 * - Same expression occures multiple times in the same dictionary (e.g. Babakhanov dictionary has 2 definitions for the word "АВАТIА", each of them will have its own ExpressionDetails object)
 * - Expressions with Roman numerals, so definitions under each numeral have their own ExpressionDetails object
 */
export type ExpressionDetails = {
  // grammatical forms of the expression
  gr?: string;
  inflection?: string;
  definitionDetails: DefinitionDetails[];
  examples?: Example[];
};

export type ExpressionV2 = {
  spelling: string;
  details: ExpressionDetails[];
};

export type DictionaryV2 = {
  name: string;
  authors?: string;
  publicationYear?: string;
  description?: string;
  providedBy?: string;
  providedByURL?: string;
  processedBy?: string;
  copyright?: string;
  seeSourceURL?: string;
  expressionLanguageId: string;
  definitionLanguageId: string;
  expressions: ExpressionV2[];
};

// ============================= V2.1 TYPES =============================

export type ExpressionV2_1 = {
  spelling: string[];
  details: ExpressionDetails[];
};

export type DictionaryV2_1 = {
  name: string;
  authors?: string;
  publicationYear?: string;
  description?: string;
  providedBy?: string;
  providedByURL?: string;
  processedBy?: string;
  copyright?: string;
  seeSourceURL?: string;
  expressionLanguageId: string;
  definitionLanguageId: string;
  expressions: ExpressionV2_1[];
};
