import path from 'path';
import { Expression, Definition, DefinitionType } from '../types';
import { parseAllPages } from '../htmlReader';
import { Page } from 'puppeteer';

// Definitions
const resultForm = {
  name: 'ТАБАСАРАНСКО-РУССКИЙ СЛОВАРЬ (ХАНМАГОМЕДОВ Б.Г.К., ШАЛБУЗОВ К.Т.)',
  url: '',
  expressionLanguageId: 'tab',
  definitionLanguageId: 'rus',
  dictionary: []
}

const verticalLines = new Set(['Ӏ', 'I']);
const wordBreak = '- ';


type TextObject = {
  text: string;
  isUpperCase: boolean;
  style: {
      fontFamily: string;
      fontSize: string;
      left: string;
      bottom: string;
  }
}
// Utils 

function getFontStyleProps(textObj: TextObject) {
  const tObjLowerFont = textObj.style.fontFamily.toLowerCase();
  const isItalic = tObjLowerFont.includes('italic');
  const isBold = tObjLowerFont.includes('bold');
  return {
    isItalic, isBold, isPlain: !isBold && ! isItalic
  };
}

function addTextObjectToList(textObject: TextObject, list: TextObject[]) {
  list.push({...textObject});
}


function appendTextToLastObjectInList(textObject: TextObject, list: TextObject[]) {
  list.push({...textObject});
}

// Parser functions

async function htmlPageParser(page: Page) {
  return await page.evaluate(() => {
    const extractedValues: TextObject[] = [...document.querySelectorAll('span')]
      .map(el => {
          const allStyles = window.getComputedStyle(el);
          const uppercaseCharsCount =  el.innerText
            .replace(/Ӏ/g, '')
            .replace(/I/g, '')
            .match(/\p{Uppercase}/gu)?.length;
          const isUpperCase = uppercaseCharsCount > 1 &&
              el.innerText !== el.innerText.toLowerCase();
          return { 
              text: el.innerText,
              isUpperCase,
              style: {
                  fontFamily: allStyles.fontFamily,
                  fontSize: allStyles.fontSize,
                  left: allStyles.left,
                  bottom: allStyles.bottom
              }
          }
      });
    return extractedValues;
  })
}

function postProcessing(extractedValues: TextObject[]) {
  const wordPartsCombined: TextObject[] = [];
  // Find out wether need to add first word of the page or is it just a title
  const isFirstTextSingleTopPlaced = extractedValues
    .filter(textObj => textObj.style.bottom === extractedValues[0].style.bottom)
    .length === 1;
  if (!isFirstTextSingleTopPlaced) {
    wordPartsCombined.push({...extractedValues[0]});
  }
  for (let i = 1; i < extractedValues.length; i++) {
    const currentTextObj = extractedValues[i];
    currentTextObj.text = currentTextObj.text.replace(new RegExp(wordBreak, 'g'), '');
    if (wordPartsCombined.length === 0) {
      wordPartsCombined.push({...currentTextObj});
      continue;
    }
    const lastTextObj = wordPartsCombined[wordPartsCombined.length - 1];
    const areLastAndCurrentPartsUppercase = (lastTextObj.isUpperCase && currentTextObj.isUpperCase);
    const endsLastPartWithVertical = verticalLines.has(lastTextObj.text.split('').pop());
    const areLastAndCurrentPartsLowercase = (!lastTextObj.isUpperCase && !currentTextObj.isUpperCase);
    
    const lastPartFontProps = getFontStyleProps(lastTextObj);
    const currentPartFontProps = getFontStyleProps(currentTextObj);
    const areBothItalic = lastPartFontProps.isItalic && currentPartFontProps.isItalic;
    const areBothBold =  lastPartFontProps.isBold && currentPartFontProps.isBold;
    const areBothPlain =  lastPartFontProps.isPlain && currentPartFontProps.isPlain;
    const haveSameFontStyles = areBothItalic || areBothBold || areBothPlain;
    if (areLastAndCurrentPartsUppercase
        || verticalLines.has(currentTextObj.text)
        || endsLastPartWithVertical
        || (areLastAndCurrentPartsLowercase && haveSameFontStyles)) {
        lastTextObj.text += currentTextObj.text;
    } else {
        wordPartsCombined.push({...currentTextObj});
    }
  }

  const expressions: Expression[] = [];
  for (const wordPart of wordPartsCombined) {
    // Condition to add new expression
    if (wordPart.isUpperCase) {
      expressions.push({ spelling: wordPart.text, definitions: [] });
    } 
    // If previous condition didn't fire then word part must be an inflection or definition part
    else if (expressions.length > 0) {
      const lastExpression = expressions[expressions.length - 1];
      const wordPartFontProps = getFontStyleProps(wordPart);
      // Condition to add inflection
      if (lastExpression.definitions.length === 0 && wordPart.text.trim().startsWith('-')) {
        lastExpression.inflection = wordPart.text;
      } else {
        lastExpression.definitions.push({
          text: wordPart.text,
          type: wordPartFontProps.isPlain ? DefinitionType.Plain : 
            (wordPartFontProps.isBold ? DefinitionType.Example : DefinitionType.Tag)
        })
      }
    }
  }

  return expressions;
}

const sourceDirPath = path.join(__dirname, 'dictionary');
const resultDirPath = path.join(__dirname, 'result');
(async () => {
  try {
      await parseAllPages(sourceDirPath, resultDirPath, htmlPageParser, postProcessing, false);
  } catch (err) {
      console.error(err)
  }
})()
