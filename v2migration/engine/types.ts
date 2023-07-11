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

// export type Definition = {
//   text: string;
//   // NOTE: extracted from the definition
//   tags?: string[];
//   examples?: Example[];
//   childDefinitions?: Definition[];
// };

export type DefinitionDetails = {
  definitions: {
    value: string;
    // NOTE: extracted from the definition
    tags?: string[];
  }[];
  examples?: Example[];
};
/**
 * It represents the whole definition of a word for the following cases:
 * - Definition per dictionary (e.g. definition from Babakhanov dictionary will have one ExpressionDetails object and definition from Hajiyev dictionary will have another ExpressionDetails object)
 * - Same expression occures multiple times in the same dictionary (e.g. Babakhanov dictionary has 2 definitions for the word "АВАТIА", each of them will have its own ExpressionDetails object)
 * - Expressions with Roman numerals, so definitions under each numeral have their own ExpressionDetails object
 */
export type ExpressionDetails = {
  // TODO: find out the full name of the field
  gr?: string;
  inflection?: string;
  definitionDetails: DefinitionDetails[];
  // NOTE: extracted from the definition
  examples?: Example[];
};

export type ExpressionV2 = {
  spelling: string;
  details: ExpressionDetails[];
};

export type DictionaryV2 = {
  name: string;
  url?: string;
  expressionLanguageId: string;
  definitionLanguageId: string;
  expressions: ExpressionV2[];
};
