import fs from 'fs';
import path from 'path';
import { DictionaryV2, ExpressionV2 } from './engine/types';
import tags from '../tags';

import v2dict from './output/lezgi_rus_dict_babakhanov_v2.json';
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

const notMatchingTags = [];
const result = v2dict as DictionaryV2;
// TODO: clear up and standardize all the tags of json dictionaries from the output folder
for (const expression of result.expressions) {
  for (const expressionDetails of expression.details) {
    for (const defDetail of expressionDetails.definitionDetails) {
      for (const def of defDetail.definitions) {
        if (def.tags) {
          def.tags = def.tags.map(tagMapper);
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

console.log(notMatchingTags);

// TODO: FIXME: tags that are parsed as definitions

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
