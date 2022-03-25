let extractedValues = [...document.querySelectorAll('span')]
  .map(el => {
      const allStyles = window.getComputedStyle(el);
      const uppercaseCharsCount =  el.innerText
        .replace(/Ӏ/g, '')
        .replace(/I/g, '')
        .match(/\p{Uppercase}/gu)?.length;
      const isUpperCase = uppercaseCharsCount >= 1 &&
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

// ====== GETTING EXPRESSIONS =========
function roundDownToNearest10(num) {
  return Math.floor(num / 10) * 10;
}
// Find dynamically left values that shoud be applied to get all expressions spellings
let mostOccurringLeftValuesOnUppercaseTexts = extractedValues
    .filter(tObj => tObj.isUpperCase)
    .map(tObj => roundDownToNearest10(parseFloat(tObj.style.left.replace('px', ''))))
    .reduce((results, org) => {
        (results[org] = results[org] || 0);
        results[org] += 1;
        return results;
    }, {})
let leftOffsetsOfExpressions = Object.entries(mostOccurringLeftValuesOnUppercaseTexts)
  .sort(([left1, count1], [left2, count2]) => count2 - count1)
  .slice(0, 2)
  .map(([left, count]) => parseInt(left));

let leftOffset1 = leftOffsetsOfExpressions[0];
let leftOffset2 = leftOffsetsOfExpressions[1];

extractedValues.filter(tObj => {
  const left = parseFloat(tObj.style.left.replace('px', ''));
  return ((left > leftOffset1 - 10 && left < leftOffset1 + 10)
      || (left > leftOffset2 - 10 && left < leftOffset2 + 10))
      && tObj.isUpperCase;
});

/* 
Pages with issues:
  85.html - 1 word extra
  
  204.html - 4 words on the left part wrong offsets



*/

/// =============================
/// =============================
/// =============================
/// =============================
const verticalLines = new Set(['Ӏ', 'I']);
const wordBreak = '- ';

function getFontStyleProps(textObj) {
  const tObjLowerFont = textObj.style.fontFamily.toLowerCase();
  const isItalic = tObjLowerFont.includes('italic');
  const isBold = tObjLowerFont.includes('bold');
  return {
    isItalic, isBold, isPlain: !isBold && ! isItalic
  };
}

let wordPartsCombined = [];

let isFirstTextSingleTopPlaced = extractedValues
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

// ====== GETTING EXPRESSIONS =========
function roundDownToNearest10(num) {
  return Math.floor(num / 10) * 10;
}
// Find dynamically left values that shoud be applied to get all expressions spellings
let mostOccurringLeftValuesOnUppercaseTexts = wordPartsCombined
    .filter(tObj => tObj.isUpperCase)
    .map(tObj => roundDownToNearest10(parseFloat(tObj.style.left.replace('px', ''))))
    .reduce((results, org) => {
        (results[org] = results[org] || 0);
        results[org] += 1;
        return results;
    }, {})
let leftOffsetsOfExpressions = Object.entries(mostOccurringLeftValuesOnUppercaseTexts)
  .sort(([left1, count1], [left2, count2]) => count2 - count1)
  .slice(0, 2)
  .map(([left, count]) => parseInt(left));

let leftOffset1 = leftOffsetsOfExpressions[0];
let leftOffset2 = leftOffsetsOfExpressions[1];

wordPartsCombined.filter(tObj => {
  const left = parseFloat(tObj.style.left.replace('px', ''));
  return ((left >= leftOffset1 && left <= leftOffset1 + 10)
      || (left >= leftOffset2 && left <= leftOffset2 + 10))
      && tObj.isUpperCase;
});
