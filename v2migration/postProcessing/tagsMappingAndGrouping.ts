import fs from 'fs';
import path from 'path';
import { DefinitionDetails, DictionaryV2, ExpressionV2 } from '../engine/types';
import tags from '../../tags';

import v2dict from '../output/lezgi_rus_dict_babakhanov_v2.json';
import { DEFINED_TAGS_REGEX, DEFINED_TAGS_REGEX_WITHOUT_END_DOTS } from '../engine';
// import v2dict from './output/rus_lezgi_dict_hajiyev_v2.json';
// import v2dict from './output/tab_rus_dict_hanmagomedov_shalbuzov_v2.json';

const standardizedTags = Object.keys(tags);
const DEFAULT_SEE_ALSO_TAG = 'см.';
const DEFAULT_POSTPOSITION_TAG = 'посл.';

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
  // standardize tags
  return newTags.map((tag) =>
    tag === 'см.тж.' ? DEFAULT_SEE_ALSO_TAG : tag === 'послелог.' ? DEFAULT_POSTPOSITION_TAG : tag,
  );
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

let fixedCommonTagsCount = 0;
/**
 * Move tags that are applicable to all `definitions` and `examples`
 * to the `tags` field of the `definitionDetails` object
 */
function moveCommonTags(defDetails: DefinitionDetails) {
  if (!defDetails.definitions || defDetails.definitions.length === 0) {
    return;
  }
  const definitionsWithoutSeeTags = defDetails.definitions.filter(
    (def) => !def.tags?.includes(DEFAULT_SEE_ALSO_TAG),
  );
  if (definitionsWithoutSeeTags.length < 2) {
    return;
  }
  // Find the common tags among all definitions
  const commonTags = definitionsWithoutSeeTags[0].tags?.slice() || [];
  for (let definition of definitionsWithoutSeeTags) {
    for (let i = commonTags.length - 1; i >= 0; i--) {
      if (!definition.tags?.includes(commonTags[i])) {
        commonTags.splice(i, 1);
      }
    }
  }
  // Handle exceptional cases when there is a tag only in first definition, then it should be considered as common
  if (
    // If there are no common tags found
    commonTags.length === 0 &&
    // and there are more than 1 definitions
    definitionsWithoutSeeTags.length > 1 &&
    // and the first definition has tags
    definitionsWithoutSeeTags[0].tags &&
    // and all other definitions have no tags
    definitionsWithoutSeeTags.slice(1).every((def) => !def.tags)
  ) {
    // then the tags of the first definition should be considered as common
    commonTags.push(...definitionsWithoutSeeTags[0].tags);
  }
  // Remove common tags from individual definitions
  for (let definition of definitionsWithoutSeeTags) {
    if (definition.tags) {
      definition.tags = definition.tags.filter((tag) => !commonTags.includes(tag));
      if (definition.tags.length === 0) {
        delete definition.tags;
      }
    }
  }
  if (commonTags.length === 0) {
    return;
  }
  // Add the common tags to the root level tags
  if (!defDetails.tags) {
    defDetails.tags = [];
  }
  for (let tag of commonTags) {
    if (!defDetails.tags.includes(tag)) {
      defDetails.tags.push(tag);
    }
  }
  if (defDetails.tags.length === 0) {
    delete defDetails.tags;
  } else {
    fixedCommonTagsCount++;
  }
}

let tagDefinitionsCount = 0;
let amountOfDefinitions = 0;

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
      // after all the tags from definitions are processed, move common tags to the `tags` field
      moveCommonTags(defDetail);
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
console.log('fixedCommonTagsCount', fixedCommonTagsCount);

// TODO: FIXME: tags that are parsed as definitions
// ========== FIXING =================
// EXPRESSIONS IN DEFINITIONS
//    regex: "value": ".*([А-ЯЁ]{2})
//    regex: "raw": ".*([А-ЯЁ]{2})
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
  './cleanTagsOutput/lezgi_rus_dict_babakhanov_v2.json',
  // './clean-output/rus_lezgi_dict_hajiyev_v2.json',
  // './clean-output/tab_rus_dict_hanmagomedov_shalbuzov_v2.json',
);
writeJSONFile(resultPath, result);
