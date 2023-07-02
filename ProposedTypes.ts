export type DictionaryV2_1 = {
  name: string;
  url?: string;
  expressionLanguageId: string;
  definitionLanguageId: string;
  expressions: {
    spelling: string;
    details: {
      grammar: string;
      inflection: string;
      definitions: string[];
      examples: string[];
    };
  }[];
};

/*
 * In DB expresiion table should have a composed primary key of (spelling, lang)
 */
export type DictionaryV2_2 = {
  name: string;
  url?: string;
  expressionLanguageId: string;
  definitionLanguageId: string;
  expressions: {
    spelling: string;
    // TODO: find out the full name of the field
    lex?: string;
    details: {
      // TODO: find out the full name of the field
      gr?: string;
      inflection?: string;
      definitions: {
        text: string;
        // NOTE: extracted from the definition
        tags: string[];
      }[];
      // NOTE: extracted from the definition
      examples: string[];
    };
  }[];
};
