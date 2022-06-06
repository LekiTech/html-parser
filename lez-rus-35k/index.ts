import path from 'path';
import { Page } from 'puppeteer';
import { parseAllPages, Dictionary } from '../htmlReader';
import tags from './tags';
import { addTagsWithinSpaces, aggregateDefinitions } from '../utils';
import { Expression } from '../types';

const dictionaryTemplate: Dictionary = {
  name: 'ЛЕЗГИНСКО-РУССКИЙ СЛОВАРЬ 2018 (Бабаханов М.Б)',
  url: '',
  expressionLanguageId: 'lez',
  definitionLanguageId: 'rus',
  dictionary: []
}

type PreProcessedArticle = {
  spelling?: string;
  inflection?: string;
  text?: string;
  type?: string;
};;
/*
  ChildNodes:
    span.af - title (for now only title)
    span.a - symbols like: ♦
    span.a1 - italic text, can be a tag or an explanation of definition text like: (упакованные вещи пассажира)
    span.aff0 - bold text, can be an example of usage or inflection
    text - plain definition text
    span.24 (and maybe other random numbers)- also plain text
    span.a7 - found only spaces, but it could be anything
*/
async function htmlPageParser(page: Page) { //}: Promise<PreProcessedArticle[][]> {
  return await page.evaluate((tags) => {
    // Get all lines from single HTML page (1 letter per page)
    const allLines = [...document.querySelectorAll('p.af1')].map(el => {
      return [...el.childNodes]
    })
    // Map all HTML DOM elements (lines) to JS objects
    const result = allLines.map(line => {
      // Map every word/phrase in a line to JS object so that spelling, definition and inflection 
      // texts are  distinguishable. 
      // Also to find different types of text within definitions like plain text, examples or tags
      return line.map((el: ChildNode & {className: string}) => {
        if (el.nodeName === '#text' || el.textContent.trim().length === 0) {
            return { text: el.textContent, type: 'Plain' };
        }
        switch(el.className) {
            case 'af': return { spelling: el.textContent };
            case 'a1':
              const tagKey = el.textContent.endsWith('.') ? el.textContent.trim() : (el.textContent.trim() + '.');
              if (tags[tagKey]) {
                  return { text: el.textContent, type: 'Tag' };
              }
              return { text: el.textContent, type: 'Plain' };
            case 'aff0': 
              const trimmedText = el.textContent.trim();
              if (trimmedText.startsWith('(') && trimmedText.endsWith(')')) {
                return { inflection: el.textContent };
              }
              return { text: el.textContent, type: 'Example' };
            default: return { text: el.textContent, type: 'Plain' };
        }
      })
      .filter(obj => obj != undefined)
      // Map line arrays to the objects where all definition phrases are inside a 'definitions' array
      .reduce((acc, obj) => {
        if (obj.spelling) {
          acc['spelling'] = obj.spelling;
        }
        else if (obj.inflection) {
          acc['inflection'] = obj.inflection;
        } else {
          acc.definitions.push(obj);
        }
        return acc;
      }, { definitions: [] });
    })
    .reduce((acc, lineObj) => {
      if (lineObj['spelling']) {
        acc.push(lineObj);
      } else {
        acc[acc.length - 1].definitions.push(...lineObj.definitions);
      }
      return acc;
    }, []);
    return result;
    // .map(line => {
    //   const result = {};
    //   const spellingObjIdx = line.findIndex(obj => obj.spelling);
    //   if (spellingObjIdx > -1) {
    //     result['spelling'] = line[spellingObjIdx];
    //     result['definitions'] = [
    //       line.splice(spellingObjIdx,spellingObjIdx)
    //         .map(obj => obj.text)
    //         .join('')
    //     ]
    //   } else {
    //     result['definitions'] = [
    //       line.map(obj => obj.text).join('')
    //     ]
    //   }
    //   return result;
    // });
  }, tags);
}

function postProcessing(extractedValues: Expression[]): any[] {
  // return extractedValues.flat().filter(obj => obj.inflection);
  // const result = [];
  // for(let i = 0; i < extractedValues.length; i++) {
  //   const line = extractedValues[i];
  //   const article = {};
  //   const spellingObjIdx = line.findIndex(obj => obj.spelling);
  //   if (spellingObjIdx > -1) {
  //     article['spelling'] = line[spellingObjIdx];
  //     article['definitions'] = [
  //       line.splice(spellingObjIdx, spellingObjIdx)
  //         .map(obj => obj.text)
  //         .join('')
  //     ]
  //   } else {
  //     article['definitions'] = [
  //       line.map(obj => obj.text).join('')
  //     ]
  //   }
  // }
  //  .map(line => {
  //   return line.map(obj => {
  //     if (obj.text) {
  //       return { text: () }
  //     } 
  //   })
  // });
  return extractedValues.map(exp => {
    return {
      spelling: exp.spelling,
      inflection: exp.inflection,
      definitions: aggregateDefinitions(exp.definitions)
    };
  });
}

const sourceDirPath = path.join(__dirname, 'dictionary/letters');
const resultDirPath = path.join(__dirname, 'result');
(async () => {
  try {
      await parseAllPages(sourceDirPath, resultDirPath, htmlPageParser, postProcessing, true, dictionaryTemplate);
  } catch (err) {
      console.error(err)
  }
})()