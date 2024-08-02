import fs from 'fs';
import path from 'path';
import tags from '../../tags';
import { DictionaryV2_1, Example } from '../engine/types';

import rusLezgiHajyiev from './splittedSpellingOutput/rus_lezgi_dict_hajiyev_v2_1.json';
import lezRuzBabakhanov from './splittedSpellingOutput/lezgi_rus_dict_babakhanov_v2_1.json';
import { toLowerCaseLezgi } from '../../utils';

// ================== CONFIG VARIABLES ==================
const USE_QUESTION_TEMPLATES = true;
const EXPORT_JSONL = false;
const EXPORT_CSV = true;

// ======================================================

// ====================== TAGS ==========================

const standardizedTags = Object.keys(tags);
const notMatchingTags = [];
function isTag(tag: string): boolean {
  let cleanTag = tag.replaceAll(/(<|>|,)/g, '').trim();
  if (
    // by this comparison we ensure that regular words which look like a tag are not included
    cleanTag !== tag &&
    (standardizedTags.includes(cleanTag) || standardizedTags.includes(cleanTag + '.'))
  ) {
    return true;
  }
  notMatchingTags.push(cleanTag);
  return false;
}
function cleanFromTags(str: string): string | undefined {
  const cleanStrArray: string[] = [];
  for (const word of str.split(' ')) {
    if (!isTag(word)) {
      cleanStrArray.push(word);
    } else if (word.includes('см')) {
      // console.log('Tag with "см" found and filtered:', word);
      return undefined;
    }
  }
  return cleanStrArray.join(' ').trim();
}
// ======================================================

type TrainingExample = {
  messages: [
    // { role: 'system'; content: string },
    { role: 'user'; content: string },
    { role: 'assistant'; content: string },
  ];
};

function randomItem(items: any[]) {
  return items[Math.floor(Math.random() * items.length)];
}

const questionTemplates = [
  // eng
  // 'Translate this from Russian to Lezgi:',
  'How do you say this in Lezgi?',
  'Translate this to Lezgi:',
  'Translate this to Lezgi language:',
  'How to say this in Lezgi?',
  'How to say this in Lezgi language?',
  'What is this in Lezgi?',
  'What is this in Lezgi language?',
  'What is the Lezgi translation of this?',
  // rus
  // 'Переведи это с русского на лезгинский:',
  'Как сказать это по-лезгински?',
  'Переведи это на лезгинский:',
  'Переведи это на лезгинский язык:',
  'Как сказать это по-лезгински?',
  'Как сказать это на лезгинском языке?',
  'Что это на лезгинском?',
  'Что это на лезгинском языке?',
  'Как переводится это на лезгинский?',
];

const createTrainingExampleJsonl = (lezgiText: string, rusText: string): TrainingExample => ({
  messages: [
    // {
    //   role: 'system',
    //   content:
    //     'Lek is a helpful translator from and to Lezgi language. It translates from and to Lezgi everything it knows. The unknown words are either being derived from context or not being translated and the original word is used in the translation',
    // },
    {
      role: 'user',
      content: USE_QUESTION_TEMPLATES ? `${randomItem(questionTemplates)}: ${rusText}` : rusText,
    },
    { role: 'assistant', content: lezgiText },
  ],
});

const dictionaries: { dictionary: DictionaryV2_1; outFileName: string; isSrcLezgi: boolean }[] = [
  {
    dictionary: rusLezgiHajyiev as DictionaryV2_1,
    outFileName: 'rus_lezgi_dict_hajiyev_v2_1',
    isSrcLezgi: false,
  },
  {
    dictionary: lezRuzBabakhanov as DictionaryV2_1,
    outFileName: 'lezgi_rus_dict_babakhanov_v2_1',
    isSrcLezgi: true,
  },
];

const langMapper = {
  lez: 'lezgi',
  rus: 'russian',
  eng: 'english',
  tab: 'tabasaran',
};

function dictExamplesToTrainingExamples(
  isSrcLezgi: boolean,
  examples?: Example[],
): [string, string][] {
  return examples == undefined
    ? []
    : examples
        .filter((ex) => ex.src && ex.trl)
        .flatMap((ex) => {
          if (isSrcLezgi) {
            return createTrainingExample(ex.src, ex.trl);
          }
          return createTrainingExample(ex.trl, ex.src);
        });
}

// ================ CLEAN-UP FUNCTIONS ==================

function splitSemicolons(srcText: string, trlText: string) {
  if (srcText.includes(';')) {
    const srcTextOptions = srcText.split(';');
    return srcTextOptions.map((sto) => [sto, trlText]);
  }
  if (trlText.includes(';')) {
    const trlTextOptions = trlText.split(';');
    return trlTextOptions.map((tto) => [srcText, tto]);
  }
  return [[srcText, trlText]];
}

function removeNameDescription(definitionStr: string) {
  const regex = /.*прописное имя.*- /gm;
  return definitionStr.replace(regex, '');
}

function isSeeAlso(str: string, isRussian: boolean): boolean {
  str = toLowerCaseLezgi(str);
  const isSeeAlso =
    str.includes('{') ||
    str.includes('}') ||
    (isRussian &&
      (str.includes('I') ||
        str.includes('гь') ||
        str.includes('гъ') ||
        str.includes('къ') ||
        str.includes('хь') ||
        str.includes('хъ') ||
        str.includes('уь')));
  return isSeeAlso;
}

function removeEnumerations(str: string): string {
  // This regex matches Roman numerals from I to XXXIX at the beginning of a string followed by a space
  const withoutRomanNumerals = str.trim().replace(/\b(I|II|III|IV|V|VI|VII|VIII|IX|X)\b/g, '');
  return withoutRomanNumerals.replace(/^\d[\)|\.][\s|]/, '');
}

function splitCommaSeparatedLists(str: string, wordCountDeviationThreshold = 2): string[] {
  const commas = str.match(/,/g) || [];
  const sentencePunctuation = str.match(/[.!?]/g) || [];
  const parts = str.split(',');

  const hasUnmatchedBrackets = parts.some((part) => {
    const openingBrackets = (part.match(/\(/g) || []).length;
    const closingBrackets = (part.match(/\)/g) || []).length;
    return openingBrackets !== closingBrackets;
  });
  // Calculate average word count per part.
  const wordCounts = parts.map((part) => part.trim().split(/\s+/).length);
  const averageWordCount = wordCounts.reduce((a, b) => a + b, 0) / wordCounts.length;

  // Check if word count per part deviates from the average by more than the threshold.
  const isWordCountConsistent = wordCounts.every(
    (count) => Math.abs(count - averageWordCount) <= wordCountDeviationThreshold,
  );
  // If there are more commas than sentence-ending punctuation, no unmatched brackets,
  // and the word count per part is consistent, it's likely a list.
  if (
    commas.length > sentencePunctuation.length &&
    !hasUnmatchedBrackets &&
    isWordCountConsistent
  ) {
    // console.log(
    //   'List:',
    //   parts.map((s) => s.trim()),
    // );
    return parts.map((s) => s.trim());
  } else {
    return [str]; // Likely a regular sentence or doesn't meet our list criteria.
  }
}

// ======================================================

let countCurrentIssues = 0;
const createTrainingExample = (lezgiText: string, rusText: string): [string, string][] => {
  const splittedSemicolons = splitSemicolons(lezgiText, rusText);
  const removedNameDescriptions: [string, string][] = splittedSemicolons.map(
    ([lezgiText, rusText]) => {
      const cleanedRus = removeNameDescription(rusText);
      return [cleanedRus, lezgiText];
    },
  );
  const dirtyArray = [];
  const filteredSeeAlsoDefinitions: [string, string][] = [];
  for (const [rus, lez] of removedNameDescriptions) {
    if (isSeeAlso(rus, true) || isSeeAlso(lez, false)) {
      dirtyArray.push([rus, lez]);
    } else {
      filteredSeeAlsoDefinitions.push([rus, lez]);
    }
  }
  // if (dirtyArray.length > 0) {
  //   console.log(dirtyArray);
  // }
  const removedListingNumbers: [string, string][] = filteredSeeAlsoDefinitions.map(([rus, lez]) => [
    removeEnumerations(rus),
    removeEnumerations(lez),
  ]);

  const removedTags = removedListingNumbers
    .map(([rus, lez]) => [cleanFromTags(rus), cleanFromTags(lez)])
    .filter(([rus, lez]) => rus !== undefined && lez !== undefined) as [string, string][];

  const splittedCommaSeparatedLists = removedTags.flatMap(([rus, lez]) => {
    const splittedRus = splitCommaSeparatedLists(rus);
    const splittedLez = splitCommaSeparatedLists(lez);
    const combinations: [string, string][] = [];
    for (const splittedRusPart of splittedRus) {
      for (const splittedLezPat of splittedLez) {
        combinations.push([splittedRusPart, splittedLezPat]);
      }
    }
    return combinations;
  });

  const cleanedUp: [string, string][] = splittedCommaSeparatedLists
    .map(([rus, lez]) => [toLowerCaseLezgi(rus), toLowerCaseLezgi(lez)])
    .filter(
      ([rus, lez]) =>
        rus !== undefined && lez !== undefined && rus.trim() !== '' && lez.trim() !== '',
    ) as [string, string][];
  return cleanedUp;
};

const trainingExamplesAll: [string, string][] = [];
for (const { dictionary, outFileName, isSrcLezgi } of dictionaries) {
  const trainingExamples: [string, string][] = [];
  for (const expression of dictionary.expressions) {
    // Definitions as raw strings translations of spelling
    const definitionStrings: string[] = [];
    for (const expDetails of expression.details) {
      const fromExpExamples = dictExamplesToTrainingExamples(isSrcLezgi, expDetails.examples);
      trainingExamples.push(...fromExpExamples);
      for (const defDetails of expDetails.definitionDetails) {
        const fromDefExamples = dictExamplesToTrainingExamples(isSrcLezgi, defDetails.examples);
        trainingExamples.push(...fromDefExamples);
        for (const def of defDetails.definitions) {
          definitionStrings.push(def.value);
        }
      }
    }
    for (const spelling of expression.spelling) {
      for (const definition of definitionStrings) {
        const trainingExample = isSrcLezgi
          ? createTrainingExample(spelling, definition)
          : createTrainingExample(definition, spelling);
        trainingExamples.push(...trainingExample);
      }
    }
  }
  if (EXPORT_JSONL) {
    const trainingExamplesJson: TrainingExample[] = trainingExamples.map((exp) =>
      createTrainingExampleJsonl(exp[0], exp[1]),
    );
    const result = trainingExamplesJson.map((expObj) => JSON.stringify(expObj)).join('\n');
    const resultPath = path.join(__dirname, `./jsonl/${outFileName}.jsonl`);
    fs.writeFileSync(resultPath, result);
  }
  if (EXPORT_CSV) {
    const result = trainingExamples.map((exp) => exp.join(';')).join('\n');
    const resultPath = path.join(__dirname, `./csv/${outFileName}.csv`);
    fs.writeFileSync(resultPath, result);
  }
  trainingExamplesAll.push(...trainingExamples);
}

console.log('Total of current issues:', countCurrentIssues);
console.log('Total of all after filtering:', trainingExamplesAll.length);

if (EXPORT_JSONL) {
  const trainingExamplesAllJson: TrainingExample[] = trainingExamplesAll.map((exp) =>
    createTrainingExampleJsonl(exp[0], exp[1]),
  );
  const result = trainingExamplesAllJson.map((expObj) => JSON.stringify(expObj)).join('\n');
  const resultPath = path.join(__dirname, './jsonl/all_rus_lezgi_no_system.jsonl');
  fs.writeFileSync(resultPath, result);
}
if (EXPORT_CSV) {
  const result = trainingExamplesAll.map((exp) => exp.join(';')).join('\n');
  const resultPath = path.join(__dirname, './csv/all_rus_lezgi.csv');
  fs.writeFileSync(resultPath, result);
}
