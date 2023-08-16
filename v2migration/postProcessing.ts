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

function checkIsDefinitionTag(value: string): boolean {
  return !!value.match(DEFINED_TAGS_REGEX) || !!value.match(DEFINED_TAGS_REGEX_WITHOUT_END_DOTS);
}

let tagDefinitionsCount = 0;

const notMatchingTags = [];
const result = v2dict as DictionaryV2;
// TODO: clear up and standardize all the tags of json dictionaries from the output folder
for (const expression of result.expressions) {
  let tagDefinition: string | undefined = undefined;
  for (const expressionDetails of expression.details) {
    for (const defDetail of expressionDetails.definitionDetails) {
      for (const def of defDetail.definitions) {
        if (def.tags) {
          def.tags = def.tags.map(tagMapper);
        }
        if (checkIsDefinitionTag(def.value)) {
          tagDefinition = def.value;
          tagDefinitionsCount++;
          console.log('==>', expression.spelling, '=>', tagDefinition);
        }
      }
      if (defDetail.examples) {
        for (const example of defDetail.examples) {
          if (example.tags) {
            example.tags = example.tags.map(tagMapper);
          }
        }
      }
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
writeJSONFile(resultPath, result);
