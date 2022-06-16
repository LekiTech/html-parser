import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";
import url from "url";

export type Dictionary = {
    name: string;
    url?: string;
    expressionLanguageId: string;
    definitionLanguageId: string;
    dictionary: any[]
}
const _inspectBrowser = false;

export async function parseAllPages<T>(sourceDirPath: string,
    outputDir: string,
    htmlPageParser: (page: puppeteer.Page) => Promise<T[]>,
    postProcessing: (parsedValues: T[]) => any[],
    testFirstFile = false,
    dictionaryTemplate?: Dictionary
    ) {
    const browser = await puppeteer.launch({
        args: ['--disable-web-security'],
        headless: !_inspectBrowser
     })
    const fsPromises = fs.promises
    let directory = (await fsPromises.readdir(sourceDirPath))
        .filter((name: string) => name.endsWith('.html'));
    const page = await browser.newPage()
    // Log all messages from browser console to terminal
    // @ts-ignore
    page.on('console', async msg => console[msg._type](
        ...await Promise.all(msg.args().map(arg => arg.jsonValue()))
      ));

    const parsedValues = []
    const sortedFilenames = directory.sort((f1, f2) => parseInt(path.basename(f1)) - parseInt(path.basename(f2)))
    console.log(sortedFilenames);
    for (let file of directory) {
        const address = url.pathToFileURL(path.join(sourceDirPath, file)).toString()
        await page.goto(address)

        const parsedPageValues = await htmlPageParser(page);
        parsedValues.push(...parsedPageValues);
        
        // Run single cycle of for-loop for testing purposes
        if (testFirstFile) {
            console.log(`Tested file '${file}'`);
            break;
        }
    }
    if (_inspectBrowser) {
        await page.waitForTimeout(10000000);
    }
    const dictionary = getResultDictionary<T>(dictionaryTemplate, postProcessing, parsedValues);

    const resultPath = path.join(outputDir, 'dictionary.json');
    fs.writeFile(resultPath, JSON.stringify(dictionary, null, 2),
        (exception) => {
            if (exception) {
                console.error(exception.message)
            } else {
                console.log(`Success! Path to file: ${resultPath.toString()}`)
            }
        });

    await browser.close()
}

function getResultDictionary<T>(dictionaryTemplate: Dictionary, postProcessing: (parsedValues: T[]) => any[], parsedValues: any[]) {
    if (dictionaryTemplate) {
        const dictData = postProcessing(parsedValues);
        console.log('dictData', dictData.length);
        dictionaryTemplate.dictionary = dictData;
        return dictionaryTemplate;
    }
    return postProcessing(parsedValues);
}
