import fs from 'fs';
import path from 'path';
import { DictionaryV2, ExpressionV2 } from './engine/types';
import tags from '../tags';

import v2dict from './output/lezgi_rus_dict_babakhanov_v2.json';
import { DEFINED_TAGS_REGEX, DEFINED_TAGS_REGEX_WITHOUT_END_DOTS } from './engine';
// import v2dict from './output/rus_lezgi_dict_hajiyev_v2.json';
// import v2dict from './output/tab_rus_dict_hanmagomedov_shalbuzov_v2.json';

const standardizedTags = Object.keys(tags);

function tagMapper(tag: string): string {
  let cleanTag = tag.replaceAll(/(<|>|,)/g, '').trim();
  if (!standardizedTags.includes(cleanTag)) {
    cleanTag += '.';
  }
  if (!standardizedTags.includes(cleanTag)) {
    notMatchingTags.push(cleanTag);
  }
  return cleanTag;
}

function mapTags(tags: string[] | undefined, tagDefinition: string): string[] {
  const newTags = [];
  if (tags) {
    newTags.push(...tags.map(tagMapper));
  }
  if (tagDefinition && !newTags?.includes('см.тж.') && !newTags?.includes('см.')) {
    const newTag = tagMapper(tagDefinition);
    newTags.push(newTag);
  }
  return newTags;
}

function checkIsDefinitionTag(value: string): boolean {
  return (
    (!!value.match(DEFINED_TAGS_REGEX) || !!value.match(DEFINED_TAGS_REGEX_WITHOUT_END_DOTS)) &&
    // make sure it's not a phrase
    !value.includes(' ') &&
    // make sure it's not a composed word
    !value.includes('-') &&
    // make sure it is a tag and not an actual definition
    // e.g. tag 'мор.' as shortened for 'морской' and a word 'мор' as a definition
    (value.includes('.') || value.includes('<') || value.includes('>') || value.includes(','))
  );
}

let tagDefinitionsCount = 0;
let amountOfDefinitions = 0;
let splitCandidatesCount = 0;

const notMatchingTags = [];
const result = v2dict as DictionaryV2;
// Clear up and standardize all the tags of json dictionaries from the output folder
for (const expression of result.expressions) {
  for (const expressionDetails of expression.details) {
    let tagDefinition: string | undefined = undefined;
    let tagDefinitionDefIdx: number | undefined = undefined;
    for (const defDetail of expressionDetails.definitionDetails) {
      try {
        for (let i = 0; i < defDetail.definitions.length; i++) {
          const def = defDetail.definitions[i];
          amountOfDefinitions++;
          // ======= Handle mapping and moving tags from definitions to the tags array =======
          const newTags = mapTags(def.tags, tagDefinition);
          if (newTags.length > 0) {
            def.tags = newTags;
          }
          if (checkIsDefinitionTag(def.value)) {
            tagDefinition = def.value;
            tagDefinitionDefIdx = i;
            tagDefinitionsCount++;
            // prettier-ignore
            // console.log('==>', expression.spelling, expression.spelling.length >= 18 ? '=>\t\t' : expression.spelling.length >= 11 ? '\t=>\t\t' : '\t\t=>\t\t', tagDefinition);
          }
          // =================================================================================
          if (
            !def.value.includes('(') &&
            !def.value.includes('{') &&
            def.value.includes(',') &&
            !def.tags?.includes('см.тж.') &&
            !def.tags?.includes('см.')
          ) {
            splitCandidatesCount++;
            console.log(expression.spelling, '\t', def.value);
          }
        }
        // Clean up empty definitions and moved tags
        if (tagDefinitionDefIdx !== undefined) {
          const newDefinitions = defDetail.definitions.filter(
            (def, i) => i !== tagDefinitionDefIdx,
          );
          defDetail.definitions = newDefinitions;
          tagDefinitionDefIdx = undefined;
        }
      } catch (e) {
        console.log(expression.spelling);
        console.log(defDetail);
        throw e;
      }
      if (defDetail.examples) {
        for (const example of defDetail.examples) {
          if (example.tags) {
            example.tags = example.tags.map(tagMapper);
          }
        }
      }
    }
    const newDefinitionDetails = expressionDetails.definitionDetails.filter(
      (defDetail) => defDetail.definitions.length > 0 || defDetail.examples?.length > 0,
    );
    if (newDefinitionDetails.length !== expressionDetails.definitionDetails.length) {
      expressionDetails.definitionDetails = newDefinitionDetails;
      // console.log('=== MODIFIED ===', expression.spelling);
      // console.log('NEW:\n', JSON.stringify(expressionDetails, null, 2));
    }
    if (expressionDetails.examples) {
      for (const example of expressionDetails.examples) {
        if (example.tags) {
          example.tags = example.tags.map(tagMapper);
        }
      }
    }
  }
}

// console.log(notMatchingTags);
console.log('tagDefinitionsCount', tagDefinitionsCount);
console.log('amountOfExpressions', result.expressions.length);
console.log('amountOfDefinitions', amountOfDefinitions);
console.log('splitCandidatesCount', splitCandidatesCount);

// TODO: FIXME: tags that are parsed as definitions
// ========== FIXING =================
// noregex:  "value": "(
// regex:    "value": "([^а-яА-ЯёЁ{<]).*
// regex:    "spelling": "([а-яА-ЯёЁ]*)([^а-яА-ЯёЁI!?-])([а-яА-ЯёЁ]*)"
// regex:    "inflection": "([а-яА-ЯёЁ]*)([^а-яА-ЯёЁ -])([а-яА-ЯёЁ]*)"
// noregex:  "value": "<
// ----------------------------------------
// find `,` in values to split the defintitions as far as possible:
//           "value": "([а-яА-ЯёЁ]*)([^а-яА-ЯёЁI\{}.<\(\)?:! -])(.*)"
// OR
//           "value": "([а-яА-ЯёЁI-]*),([а-яА-ЯёЁI,-]*)"
// ----------------------------------------
// – => -
// find `\{"[\n|,]`
/*
TRY WITH REGEX:
find:
            {
              "raw": "{вадралди  кIелзавайди} <сущ> отличник"
            }
replace by:
            {
              "src": "вадралди  кIелзавайди",
              "trl": "отличник",
              "tags": ["<сущ>"],
              "raw": "{вадралди  кIелзавайди} <сущ> отличник"
*/

// ===================================

// ===================== TODO: ADD `tags` TO THE `definitionDetails` LEVEL TOO ====================
// ===================== TODO: ADD `description` TO THE `definition` OBJECT =======================
// ===================== TODO: CHANGE `trl` TO ARRAY OF STRINGS IN EXAMPLE ========================

/**
 * Function to write a JSON file
 *
 * @param {string} filePath Absolute path and name of the JSON file to be written
 * @param {Dictionary} data Dictionary data to be written to the JSON file
 * @param {boolean} prettyPrint Whether to pretty print the JSON file
 */
export function writeJSONFile(filePath: string, data: DictionaryV2, prettyPrint = true) {
  const fileContent = JSON.stringify(data, null, prettyPrint ? 2 : null);
  fs.writeFileSync(filePath, fileContent);
}

const resultPath = path.join(
  __dirname,
  './clean-output/lezgi_rus_dict_babakhanov_v2.json',
  // './clean-output/rus_lezgi_dict_hajiyev_v2.json',
  // './clean-output/tab_rus_dict_hanmagomedov_shalbuzov_v2.json',
);
// writeJSONFile(resultPath, result);
