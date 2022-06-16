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

type ChildNodeExt = ChildNode 
  & {tagName: string}
  & {className: string};

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
    const isInflection = (lines, i, el) => {
      // const trimmedText = el.textContent.trim();
      // return (
      //   (trimmedText.startsWith('(') && trimmedText.endsWith(')')) || 
      //   (i > 0 && lines[i-1]?.textContent.trim().endsWith('(') && lines[i+1]?.textContent.trim().startsWith(')'))
      // );
      const trimmedText = el.textContent.trim();
      const currentElStartsWithBrace = trimmedText.startsWith('(');
      const currentElEndsWithBrace = trimmedText.endsWith(')');
      const prevElEndsWithBrace = i > 0 && lines[i-1]?.textContent.trim().endsWith('(');
      const nextElStartsWithBrace = lines[i+1]?.textContent.trim().startsWith(')')
      // console.log(trimmedText, prevElEndsWithBrace,
      //    currentElStartsWithBrace, currentElEndsWithBrace,
      //    nextElStartsWithBrace)
      return (
        (currentElStartsWithBrace && currentElEndsWithBrace) || 
        (prevElEndsWithBrace && currentElEndsWithBrace) || 
        (currentElStartsWithBrace && nextElStartsWithBrace) || 
        (prevElEndsWithBrace && nextElStartsWithBrace)
      );
    }
    // Get all lines from single HTML page (1 letter per page)
    const allLines = [...document.querySelectorAll('p.af1')].map(el => {
      return [...el.childNodes]
    })
    // Map all HTML DOM elements (lines) to JS objects
    //.slice(2980, 2981) ashukarun
    //.slice(3035, 3036) ayaman
    const result = allLines.map((line: ChildNodeExt[], i) => {
      // aggregate sibling elements with the same className
      const aggregatedLine = [line[0]];
      for (let i = 1; i < line.length; i++) {
          if (aggregatedLine[aggregatedLine.length - 1].className === line[i].className) {
              aggregatedLine[aggregatedLine.length - 1].textContent += line[i].textContent;
          } else {
              if (line[i].className === 'af') {
                  // only 'spelling' type may have className = 'af' others with the same className should be plain text
                  line[i].className = '';
              }
              aggregatedLine.push(line[i]);
          }
      }

      // Map every word/phrase in a line to JS object so that spelling, definition and inflection 
      // texts are  distinguishable. 
      // Also to find different types of text within definitions like plain text, examples or tags
      return aggregatedLine
        .map((el: ChildNodeExt) => el.tagName === 'A' ? [...el.childNodes] : el)
        .flat()
        .map((el: ChildNodeExt, i) => {
          if (el.nodeName === '#text' || el.textContent.trim().length === 0) {
              return { text: el.textContent, type: 'Plain' };
          }
          switch(el.className) {
              case 'af':
                return { spelling: el.textContent };
              case 'a1':
                // Parse italic text, we are only interested in separating tags
                // all other texts like comments or description can be plain text
                const tagKey = el.textContent.endsWith('.') ? el.textContent.trim() : (el.textContent.trim() + '.');
                if (tags[tagKey]) {
                    return { text: el.textContent, type: 'Tag' };
                }
                return { text: el.textContent, type: 'Plain' };
              case 'aff0':
                // Parse bold text, it can be an inflection or an example
                if (isInflection(line, i, el)) {
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
          } else if (obj.inflection) {
            acc['inflection'] = obj.inflection;
          } else if (obj.type === 'Example' && obj.inflection && acc.definitions.length === 0) {
            // If we find objects of type "Example" 
            // and it is the first one to add to "definitions"
            // and there is already an inflection added to accumulating object
            // Then this "Example" object is most probably wrongly parsed inflection
            acc['inflection'] += obj.text;
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
        acc[acc.length - 1]?.definitions.push(...lineObj.definitions);
      }
      return acc;
    }, []);
    return result;
  }, tags);
}

function postProcessing(extractedValues: Expression[]): any[] {
  return extractedValues.map(exp => {
    return {
      spelling: exp.spelling,
      // remove enclosing parentheses
      inflection: exp.inflection?.trim().replace(/^\(|\)$/gm, ''),
      definitions: aggregateDefinitions(exp.definitions)
    };
  });
}

const sourceDirPath = path.join(__dirname, 'dictionary/letters');
const resultDirPath = path.join(__dirname, 'result');
(async () => {
  try {
      await parseAllPages(
        sourceDirPath,
        resultDirPath,
        htmlPageParser,
        postProcessing,
        false,
        dictionaryTemplate);
  } catch (err) {
      console.error(err)
  }
})()