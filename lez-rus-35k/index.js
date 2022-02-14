const puppeteer = require("puppeteer")
const fs = require("fs")
const path = require("path")
const url = require("url")

async function run() {
    let browser = await puppeteer.launch()
    let fsPromises = fs.promises
    let sourceDirPath = path.join(__dirname, "dictionary/letters")
    let directory = await fsPromises.readdir(sourceDirPath)
    let page = await browser.newPage()
    let dictionary = []

    for (let file of directory) {
        let address = url.pathToFileURL(path.join(sourceDirPath, file)).toString()
        await page.goto(address)

        const article = {spelling: "", inflection: "", definitions: []}
        article.definitions = await page.evaluate(() => {
            let p = document.querySelectorAll("p");
            return [...p].map((el) => el.innerText.split('\n'))
                .flat()
                .filter((el) => el.match(/[^\s]+/g))
                .reduce((prev, curr) => prev + curr)
                .replaceAll(/\s{2,}/g, " ")
        })
        dictionary.push(article)
    }

    let resultPath = path.join(__dirname, 'result', 'dictionary.json')
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

(async () => {
    try {
        await run()
    } catch (err) {
        console.error(err)
    }
})()
