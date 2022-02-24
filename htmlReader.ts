import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";
import url from "url";

export async function parseAllPages<T>(sourceDirPath: string,
    outputDir: string,
    htmlPageParser: () => T[],
    postProcessing: (parsedValues: T[]) => any[],
    testFirstFile = false
    ) {
    const browser = await puppeteer.launch({
        args: ['--disable-web-security']
     })
    const fsPromises = fs.promises
    let directory = (await fsPromises.readdir(sourceDirPath))
        .filter((name: string) => name.endsWith('.html'));
    const page = await browser.newPage()
    
    const parsedValues = []
    const sortedFilenames = directory.sort((f1, f2) => parseInt(path.basename(f1)) - parseInt(path.basename(f2)))
    console.log(sortedFilenames);
    for (let file of directory) {
        const address = url.pathToFileURL(path.join(sourceDirPath, file)).toString()
        await page.goto(address)

        const parsedPageValues = await page.evaluate(htmlPageParser);
        parsedValues.push(...parsedPageValues);
        
        // Run single cycle of for-loop for testing purposes
        if (testFirstFile) {
            console.log(`Tested file '${file}'`);
            break;
        }
    }
    const dictionary = postProcessing(parsedValues);

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