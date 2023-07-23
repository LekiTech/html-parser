import fs from 'fs';
import path from 'path';
import { DEFINED_TAGS_REGEX, DEFINED_TAGS_REGEX_WITHOUT_END_DOTS } from '../v2migration/engine';
import { DictionaryV2, ExpressionV2 } from '../v2migration/engine/types';
import v2dict from '../v2migration/clean-output/lezgi_rus_dict_babakhanov_v2.json';

const dictionary = (v2dict as DictionaryV2).expressions as ExpressionV2[];

const allDefinitions = dictionary
  .map((expression) => {
    const { spelling, details } = expression;
    const definitions = details
      .map((detail) => {
        const { definitionDetails, examples: expDetailsExamples } = detail;
        const definition = definitionDetails.map((def) => {
          const { definitions, examples: defDetailsExamples } = def;
          return definitions
            .filter(
              (def) =>
                def.tags == undefined || def.tags.length == 0 || !def.tags.join(' ').includes('см'),
            )
            .map((def) => {
              const flippedExpression: ExpressionV2 = {
                spelling: def.value,
                details: [
                  {
                    definitionDetails: [
                      {
                        definitions: [
                          {
                            value: spelling,
                            tags: def.tags,
                          },
                        ],
                        examples: [],
                      },
                    ],
                  },
                ],
              };
              if (defDetailsExamples && defDetailsExamples.length > 0) {
                flippedExpression.details[0].definitionDetails[0].examples.push(
                  ...defDetailsExamples,
                );
              }
              if (expDetailsExamples && expDetailsExamples.length > 0) {
                flippedExpression.details[0].definitionDetails[0].examples.push(
                  ...expDetailsExamples,
                );
              }
              if (flippedExpression.details[0].definitionDetails[0].examples.length == 0) {
                delete flippedExpression.details[0].definitionDetails[0].examples;
              }
              return flippedExpression; //def.value;
            });
        });
        return definition;
      })
      .flat(2);
    return definitions;
  })
  .flat(2);

const singleWordFilter = (def: string): boolean =>
  def != '' &&
  !def.includes(' ') &&
  !def.includes('-') &&
  !def.includes(',') &&
  !def.includes('{') &&
  !def.includes('}') &&
  !!def.match(/([А-ЯЁа-яё\-]+)/gi);

const singleWordDefinitions = allDefinitions.filter((exp) => singleWordFilter(exp.spelling));

const tagAsDefinition = singleWordDefinitions.filter(
  (exp) =>
    exp.spelling.match(DEFINED_TAGS_REGEX) ||
    exp.spelling.match(DEFINED_TAGS_REGEX_WITHOUT_END_DOTS),
);
console.log('Amount of tags that are parsed as definitions [TO BE FIXED]:', tagAsDefinition.length);
console.log('Amount of single word definitions:', singleWordDefinitions.length);

const commaSeparatedDefinitions = allDefinitions.filter(
  (exp) =>
    exp.spelling.includes(',') &&
    exp.spelling != '' &&
    !exp.spelling.includes('-') &&
    !exp.spelling.includes('{') &&
    !exp.spelling.includes('}'),
);
// console.log(commaSeparatedDefinitions);
console.log('Amount of comma separated definitions:', commaSeparatedDefinitions.length);

const splittedCommadSeparatedDefinitions = commaSeparatedDefinitions
  .map((exp) =>
    exp.spelling
      .split(',')
      .map((def) => {
        const newExp = { ...exp };
        newExp.spelling = def.replaceAll('(', '').replaceAll(')', '').trim();
        return newExp;
      })
      .filter((exp) => singleWordFilter(exp.spelling)),
  )
  .flat(2);

// console.log(splittedCommadSeparatedDefinitions);
console.log(
  'Amount of splitted comma separated definitions:',
  splittedCommadSeparatedDefinitions.length,
);

const groupedByExpressionSpelling = splittedCommadSeparatedDefinitions.reduce(function (r, a) {
  // r[a.spelling] = r[a.spelling] || [];
  // r[a.spelling].push(a);
  if (r[a.spelling]) {
    r[a.spelling].details.push(...a.details);
  } else {
    r[a.spelling] = a;
  }
  return r;
}, Object.create(null));

const groupedExpressionsList: ExpressionV2[] = Object.values(groupedByExpressionSpelling);

const flippedDictionary: DictionaryV2 = {
  name: (v2dict as DictionaryV2).name,
  url: (v2dict as DictionaryV2).url,
  definitionLanguageId: (v2dict as DictionaryV2).expressionLanguageId,
  expressionLanguageId: (v2dict as DictionaryV2).definitionLanguageId,
  expressions: groupedExpressionsList.sort((a, b) => a.spelling.localeCompare(b.spelling)),
};

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

const resultPath = path.join(__dirname, './output/lezgi_rus_dict_babakhanov_v2_flipped.json');
writeJSONFile(resultPath, flippedDictionary);

// TODO: ALL EXAMPLES SHOULD BE REUSED IN THE DATABASE with the 'raw' field as a source to compare
// TODO: all definitions in the flipped dictionary are synonyms in the original dictionary, so they should be marked as such
