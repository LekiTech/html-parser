import path from 'path';
import { Page } from 'puppeteer';
import { parseAllPages, Dictionary } from '../htmlReader';
import tags from './tags';

const dictionaryTemplate: Dictionary = {
  name: 'ЛЕЗГИНСКО-РУССКИЙ СЛОВАРЬ 2018 (Бабаханов М.Б)',
  url: '',
  expressionLanguageId: 'lez',
  definitionLanguageId: 'rus',
  dictionary: []
}

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

async function htmlPageParser(page: Page) {
  return await page.evaluate((tags) => {
    const allLines = [...document.querySelectorAll('p.af1')].map(el => {
      return [...el.childNodes]
    })
    return allLines.slice(0, 5).map(line => {
      return line.map((el: ChildNode & {className: string}) => {
        if (el.nodeName === '#text' || el.textContent.trim().length === 0) {
            return { text: el.textContent, type: 'Plain' };
        }
        if (el.className === 'a1') {
            const tagKey = el.textContent.endsWith('.') ? el.textContent.trim() : (el.textContent.trim() + '.');
            if (tags[tagKey]) {
                return { text: el.textContent, type: 'Tag' };
            }
            return { text: el.textContent, type: 'Plain' };
        }
        switch(el.className) {
            case 'af': return { spelling: el.textContent };
            case 'aff0': return { text: el.textContent, type: 'Example' };
            default: return { text: el.textContent, type: 'Plain' };
        }
      }).filter(obj => obj != undefined);
    });
  }, tags);
}

function postProcessing(extractedValues: []): any[] {
  return extractedValues;
}

const sourceDirPath = path.join(__dirname, 'dictionary/letters');
const resultDirPath = path.join(__dirname, 'result');
(async () => {
  try {
      await parseAllPages(sourceDirPath, resultDirPath, htmlPageParser, postProcessing, false, dictionaryTemplate);
  } catch (err) {
      console.error(err)
  }
})()