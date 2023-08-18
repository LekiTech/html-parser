import fs from 'fs';
import path from 'path';
import { DictionaryV2, ExpressionV2 } from '../engine/types';
import tags from '../../tags';

import v2dict from '../output/lezgi_rus_dict_babakhanov_v2.json';
import { DEFINED_TAGS_REGEX, DEFINED_TAGS_REGEX_WITHOUT_END_DOTS } from '../engine';

let amountOfDefinitions = 0;
let splitCandidatesCount = 0;

const result = v2dict as DictionaryV2;
// Clear up and standardize all the tags of json dictionaries from the output folder
for (const expression of result.expressions) {
  for (const expressionDetails of expression.details) {
    for (const defDetail of expressionDetails.definitionDetails) {
      try {
        for (let i = 0; i < defDetail.definitions.length; i++) {
          const def = defDetail.definitions[i];
          amountOfDefinitions++;
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
      } catch (e) {
        console.log(expression.spelling);
        console.log(defDetail);
        throw e;
      }
    }
  }
}

console.log('amountOfExpressions', result.expressions.length);
console.log('amountOfDefinitions', amountOfDefinitions);
console.log('splitCandidatesCount', splitCandidatesCount);
