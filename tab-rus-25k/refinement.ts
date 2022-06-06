// REFINEMENT OF MANUALLY EDITED DICTIONARY PARSE RESULTS
import fs from "fs";
import path from "path";
import editedDictionary from './result/dictionary_manual_check.json';
import { Expression, Definition, DefinitionType } from '../types';
import { aggregateDefinitions } from '../utils';

type ExpressionResult = Omit<Expression, 'definitions'> & {
  definitions: string[];
}

const dictData = editedDictionary as Expression[];

// function addTagsWithinSpaces(text: string, leftTag: string, rightTag: string) {
//   const hasLeftSpace = /^\s/.test(text);
//   const hasRightSpace = /\s$/.test(text);
//   return (hasLeftSpace ? ' ' : '') + leftTag +
//     text.trim() +
//     rightTag + (hasRightSpace ? ' ' : '');
// }


const finalDictionary = {
  name: 'ТАБАСАРАНСКО-РУССКИЙ СЛОВАРЬ (ХАНМАГОМЕДОВ Б.Г.К., ШАЛБУЗОВ К.Т.)',
  url: '',
  expressionLanguageId: 'tab',
  definitionLanguageId: 'rus',
  dictionary: []
}

finalDictionary.dictionary = dictData.map(exp => {
  const resultExpression: ExpressionResult = {
    spelling: exp.spelling.toUpperCase(),
    inflection: exp.inflection,
    definitions: aggregateDefinitions(exp.definitions)
  }
  if (!exp.inflection) {
    delete resultExpression.inflection;
  } 
  return resultExpression;
})

const resultPath = path.join(__dirname, 'result', 'tab_rus_dict_hanmagomedov_shalbuzov.json');
fs.writeFile(resultPath, JSON.stringify(finalDictionary, null, 2),
    (exception) => {
        if (exception) {
            console.error(exception.message)
        } else {
            console.log(`Success! Path to file: ${resultPath.toString()}`)
        }
    });