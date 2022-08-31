const fs = require('fs')
const puppeteer = require('puppeteer')
const path = require('path')

const DEV_MODE = false

let filesToProcess = []


function execInDevToolsConsole() {
    let lines = Array.from(document.querySelectorAll('p.a7'))
    if (lines.length === 0) {
        lines = Array.from(document.querySelectorAll('p.msonormal'))
    }

    let currPageDictList = []

    lines.forEach((lineEl) => {
        const spelling = lineEl.childNodes[0].textContent.trim()
        if (spelling.length === 0) return

        let text = ''

        function getFormattedText(el, isBold, isCursive) {
            if (el.parentNode.nodeName === 'SUP') return
            if (el.nodeType !== Node.TEXT_NODE && getComputedStyle(el).color === 'rgb(192, 80, 77)') return

            if (el.nodeType === Node.TEXT_NODE) {
                if (isBold) {
                    text += '{' + el.textContent + '}'
                } else if (isCursive) {
                    text += '<' + el.textContent + '>'
                } else {
                    text += el.textContent
                }
                return
            }

            isCursive = getComputedStyle(el).fontStyle === 'italic'
            isBold = getComputedStyle(el).fontWeight === '700'
            
            el.childNodes.forEach((child) => {
                getFormattedText(child, isBold, isCursive)
            })

        }
        getFormattedText(lineEl)

        // Split text into text lists
        const definitions = []
        let openBrackets = 0
        let currDefinition = ''
        let numAndDotCount = 0

        for (let i = 0; i < text.length; ++i) {
            if (text[i] === '(') openBrackets++;
            else if (text[i] === ')') openBrackets--;
            const isNewDef = !isNaN(text[i]) && text[i + 1] === '.' && (openBrackets === 0)
            if (isNewDef) numAndDotCount++
            if (isNewDef && numAndDotCount > 1) {
                definitions.push(currDefinition.trim().replaceAll(/\n/g, ' '))
                currDefinition = text[i]
            } else {
                currDefinition += text[i]
            }
        }
        if (currDefinition) {
            definitions.push(currDefinition.trim().replaceAll(/\n/g, ' '))
        }

        wordDefDict = {
            'spelling': spelling,
            'definitions': definitions
        }


        currPageDictList.push(wordDefDict)
    })
    return currPageDictList
}

const resDict = {
    'name': 'РУССКО-ЛЕЗГИНСКИЙ СЛОВАРЬ (ГАДЖИЕВ М.М.)',
    'url': '',
    'expressionLanguageId': 'rus',
    'definitionLanguageId': 'lez',
    'dictionary': []
}


fs.readdirSync('./dictionary/').forEach((filename) => {
    if (!filename.startsWith('BUKVA')) return
    filesToProcess.push('./dictionary/' + filename)
});


(async () => {
    const browser = await puppeteer.launch({headless: !DEV_MODE})
    const page = await browser.newPage()

    if (DEV_MODE) {  // Process only first page in dev mode
        filesToProcess = [filesToProcess[0]]
    }

    // Process each HTML page
    for (let i = 0; i < filesToProcess.length; ++i) {  // Do not use forEach loop! It results in an error
        const filename = filesToProcess[i]
        await page.goto(path.join(__dirname, filename), { waitUntil: 'domcontentloaded' })
        const pageDictList = await page.evaluate(execInDevToolsConsole)
        resDict.dictionary.push(...pageDictList)
    }

    const resPath = path.join(__dirname, './result/dictionary.json')
    fs.writeFile(resPath, JSON.stringify(resDict, null, 2),
        (exception) => {
            if (exception) {
                console.error(exception.message)
            } else {
                console.log('Success!')
            }
        }
    )
    await browser.close()
})()
