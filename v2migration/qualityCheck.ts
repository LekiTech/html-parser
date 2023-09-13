import fs from 'fs';
import path from 'path';
import { DefinitionDetails, DictionaryV2, DictionaryV2_1, ExpressionV2 } from './engine/types';
import { DEFINED_TAGS_REGEX, DEFINED_TAGS_REGEX_WITHOUT_END_DOTS } from './engine';
import tags from '../tags';

import lezgiRusBabakhanov from './postProcessing/splittedSpellingOutput/lezgi_rus_dict_babakhanov_v2_1.json';
import rusLezgiHajyiev from './postProcessing/splittedSpellingOutput/rus_lezgi_dict_hajiyev_v2_1.json';
import tabRusHanShal from './postProcessing/splittedSpellingOutput/tab_rus_dict_hanmagomedov_shalbuzov_v2_1.json';

/**
 * Function to write a CSV file
 *
 * @param {string} filePath Absolute path and name of the file to be written
 * @param {Dictionary} data Dictionary data to be written to the file
 */
export function writeCsvFile(filePath: string, data: string) {
  fs.writeFileSync(filePath, data);
}

const dictionaries: DictionaryV2_1[] = [
  lezgiRusBabakhanov as DictionaryV2_1,
  rusLezgiHajyiev as DictionaryV2_1,
  tabRusHanShal as DictionaryV2_1,
];

// ========== QUALITY CHECKS =================
// EXPRESSIONS WITH RANDOM CHARACTERS
//    regex:    "spelling": "([а-яА-ЯёЁ]*)([^а-яА-ЯёЁI!?-])([а-яА-ЯёЁ]*)"
//
// INFLECTION WITH RANDOM CHARACTERS
//    regex:    "inflection": "([а-яА-ЯёЁ]*)([^а-яА-ЯёЁ -])([а-яА-ЯёЁ]*)"
//
// DEFINITIONS CONTAINING EXPRESSIONS
//    regex: "value": ".*([А-ЯЁ]{2})
//
// DEFINITIONS START WITH PARENTHESIS
//    noregex:  "value": "(
//
// DEFINITIONS START WITH RANDOM CHARACTERS
//    regex:    "value": "([^а-яА-ЯёЁ{<]).*
//
// EXAMPLES CONTAINING EXPRESSIONS
//    regex: "raw": ".*([А-ЯЁ]{2})
//
// DEFINITIONS START WITH TAGS
//    noregex:  "value": "<
//
// ANY STRING ENDS WITH {
//    regex:    \{"[\n|,]
// ----------------------------------------
// UNSPLITTED DEFINITIONS
//    find `,` in values to split the defintitions as far as possible:
//              "value": "([а-яА-ЯёЁ]*)([^а-яА-ЯёЁI\{}.<\(\)?:! -])(.*)"
//    OR
//              "value": "([а-яА-ЯёЁI-]*),([а-яА-ЯёЁI,-]*)"
// ----------------------------------------
// Replace random chars looking like dashes
// – => -

// TODO: add check for: "definitions": []
// TODO: add check for: "definitionDetails": [] and "examples": []

class ExpressionAnalysisResult {
  private static readonly csvSeparator = ';';
  spellingWithRandomChars: boolean;
  spellingWithRandomCharsIgnoreSpaces: boolean;
  inflectionsWithRandomChars?: string;
  tagInExpressionDetails: boolean = false;
  private _definitionsContainingExpressions: string[] = [];
  private _definitionsStartingWithParenthesis: string[] = [];
  private _definitionsStartingWithRandomChars: string[] = [];
  private _examplesContainingExpressions: string[] = [];
  private _definitionsStartingWithTags: string[] = [];
  private _stringsEndingWithCurlyBraces: string[] = [];
  private _examplesStoredAsDefinitions: string[] = [];

  get definitionsContainingExpressions() {
    return this._definitionsContainingExpressions;
  }
  get definitionsStartingWithParenthesis() {
    return this._definitionsStartingWithParenthesis;
  }
  get definitionsStartingWithRandomChars() {
    return this._definitionsStartingWithRandomChars;
  }
  get examplesContainingExpressions() {
    return this._examplesContainingExpressions;
  }
  get definitionsStartingWithTags() {
    return this._definitionsStartingWithTags;
  }
  get stringsEndingWithCurlyBraces() {
    return this._stringsEndingWithCurlyBraces;
  }
  get examplesStoredAsDefinitions() {
    return this._examplesStoredAsDefinitions;
  }

  isEmpty(): boolean {
    return (
      this.spellingWithRandomChars === false &&
      this.spellingWithRandomCharsIgnoreSpaces === false &&
      this.inflectionsWithRandomChars === undefined &&
      this.definitionsContainingExpressions.length === 0 &&
      this.definitionsStartingWithParenthesis.length === 0 &&
      this.definitionsStartingWithRandomChars.length === 0 &&
      this.examplesContainingExpressions.length === 0 &&
      this.definitionsStartingWithTags.length === 0 &&
      this.stringsEndingWithCurlyBraces.length === 0 &&
      this.examplesStoredAsDefinitions.length === 0 &&
      this.tagInExpressionDetails === false
    );
  }

  toCsv(firstColumn?: string): string {
    const result = [
      this.spellingWithRandomChars,
      this.spellingWithRandomCharsIgnoreSpaces,
      this.inflectionsWithRandomChars,
      this.definitionsContainingExpressions.join('|'),
      this.definitionsStartingWithParenthesis.join('|'),
      this.definitionsStartingWithRandomChars.join('|'),
      this.examplesContainingExpressions.join('|'),
      this.definitionsStartingWithTags.join('|'),
      this.stringsEndingWithCurlyBraces.join('|'),
      this.examplesStoredAsDefinitions.join('|'),
      this.tagInExpressionDetails,
    ].join(ExpressionAnalysisResult.csvSeparator);
    return firstColumn ? firstColumn + ExpressionAnalysisResult.csvSeparator + result : result;
  }

  static getHeader(firstColumn?: string): string {
    const result = [
      'spellingWithRandomChars',
      'spellingWithRandomCharsIgnoreSpaces',
      'inflectionsWithRandomChars',
      'definitionsContainingExpressions',
      'definitionsStartingWithParenthesis',
      'definitionsStartingWithRandomChars',
      'examplesContainingExpressions',
      'definitionsStartingWithTags',
      'stringsEndingWithCurlyBraces',
      'examplesStoredAsDefinitions',
      'tagInExpressionDetails',
    ].join(ExpressionAnalysisResult.csvSeparator);
    return firstColumn ? firstColumn + ExpressionAnalysisResult.csvSeparator + result : result;
  }
}
const stats = {
  expressionsWithRandomChars: 0,
  expressionsWithRandomCharsIgnoreSpaces: 0,
  inflectionsWithRandomChars: 0,
  definitionsContainingExpressions: 0,
  definitionsStartingWithParenthesis: 0,
  definitionsStartingWithRandomChars: 0,
  examplesContainingExpressions: 0,
  definitionsStartingWithTags: 0,
  stringsEndingWithCurlyBraces: 0,
  examplesStoredAsDefinitions: 0,
  tagsInExpressionDetails: 0,
};

const includeDefinitionsStartingWithRandomChars = true;

for (const dictionary of dictionaries) {
  const analysisResults: Record<string, ExpressionAnalysisResult> = {};
  for (const expression of dictionary.expressions) {
    try {
      const expressionAR = new ExpressionAnalysisResult();
      expression.spelling.forEach((spelling) => {
        expressionAR.spellingWithRandomChars = !!spelling.match(/[^а-яА-ЯёЁI!?\(\)-]/);
        expressionAR.spellingWithRandomCharsIgnoreSpaces = !!spelling.match(/[^а-яА-ЯёЁI!?\(\) -]/);
      });
      for (const expressionDetails of expression.details) {
        if (expressionDetails.inflection?.match(/[^а-яёI\/, -]/)) {
          expressionAR.inflectionsWithRandomChars = expressionDetails.inflection;
        }
        // @ts-ignore
        if (expressionDetails.tags != undefined) {
          expressionAR.tagInExpressionDetails = true;
        }
        if (expressionDetails.examples) {
          for (const example of expressionDetails.examples) {
            if (example.raw.match(/.*([А-ЯЁ]{2})/)) {
              expressionAR.examplesContainingExpressions.push(example.raw);
            }
          }
        }
        for (const defDetail of expressionDetails.definitionDetails) {
          if (defDetail.examples) {
            for (const example of defDetail.examples) {
              if (example.raw.match(/.*([А-ЯЁ]{2})/)) {
                expressionAR.examplesContainingExpressions.push(example.raw);
              }
            }
          }
          for (const def of defDetail.definitions) {
            if (def.value.match(/.*([А-ЯЁ]{2})/)) {
              expressionAR.definitionsContainingExpressions.push(def.value);
            }
            if (def.value.match(/^\(/)) {
              expressionAR.definitionsStartingWithParenthesis.push(def.value);
            }
            // if (includeDefinitionsStartingWithRandomChars && def.value.match(/[^а-яА-ЯёЁ{<].*/)) {
            if (includeDefinitionsStartingWithRandomChars && def.value.match(/^[^а-яА-ЯёЁ\{\[]/)) {
              expressionAR.definitionsStartingWithRandomChars.push(def.value);
            }
            if (def.value.match(/^</)) {
              expressionAR.definitionsStartingWithTags.push(def.value);
            }
            if (def.value.match(/.*\{$/)) {
              expressionAR.stringsEndingWithCurlyBraces.push(def.value);
            }
            if (
              def.value.match(/^\{.*\}[^"]+/) &&
              (def.tags === undefined ||
                def.tags?.length === 0 ||
                def.tags.filter((t) => t.includes('см')).length === 0)
            ) {
              expressionAR.examplesStoredAsDefinitions.push(def.value);
            }
          }
        }
      }
      if (!expressionAR.isEmpty()) {
        analysisResults[expression.spelling.join(',')] = expressionAR;
        stats.expressionsWithRandomChars += expressionAR.spellingWithRandomChars ? 1 : 0;
        stats.expressionsWithRandomCharsIgnoreSpaces +=
          expressionAR.spellingWithRandomCharsIgnoreSpaces ? 1 : 0;
        stats.inflectionsWithRandomChars += expressionAR.inflectionsWithRandomChars ? 1 : 0;
        stats.definitionsContainingExpressions +=
          expressionAR.definitionsContainingExpressions.length;
        stats.definitionsStartingWithParenthesis +=
          expressionAR.definitionsStartingWithParenthesis.length;
        stats.definitionsStartingWithRandomChars +=
          expressionAR.definitionsStartingWithRandomChars.length;
        stats.examplesContainingExpressions += expressionAR.examplesContainingExpressions.length;
        stats.definitionsStartingWithTags += expressionAR.definitionsStartingWithTags.length;
        stats.stringsEndingWithCurlyBraces += expressionAR.stringsEndingWithCurlyBraces.length;
        stats.examplesStoredAsDefinitions += expressionAR.examplesStoredAsDefinitions.length;
        stats.tagsInExpressionDetails += expressionAR.tagInExpressionDetails ? 1 : 0;
      }
    } catch (e) {
      console.log(
        `Error processing expression "${expression.spelling}" in dictionary "${dictionary.name}"`,
      );
      console.log(e);
      throw e;
    }
  }

  // console.log('expressionWithMostExamples: ', expressionWithMostExamples);

  console.log(
    dictionary.name,
    'has',
    Object.keys(analysisResults).length,
    'expressions with errors',
  );
  console.log('-------- STATS ----------\n');
  console.table(stats);

  const csvFileData =
    ExpressionAnalysisResult.getHeader('spelling') +
    '\n' +
    Object.entries(analysisResults)
      .map(([spelling, ar]) => ar.toCsv(spelling))
      .join('\n');

  writeCsvFile(
    path.join(__dirname, 'reports', dictionary.name + '_' + dictionary.authors + '_analysis.csv'),
    csvFileData,
  );
}
