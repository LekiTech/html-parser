import path from 'path';
import { parseAllPages } from '../htmlReader';


function htmlPageParser() {
	return [...document.querySelectorAll('span')]
		.map(el => {
				const allStyles = window.getComputedStyle(el);
				const isUpperCase = el.innerText === el.innerText.toUpperCase() &&
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
}

function postProcessing(parsedvalues: any[]) {
	// TODO: process values to get final result
	return parsedvalues;
}

const sourceDirPath = path.join(__dirname, 'dictionary');
const resultDirPath = path.join(__dirname, 'result');
(async () => {
	try {
			await parseAllPages(sourceDirPath, resultDirPath, htmlPageParser, postProcessing, true);
	} catch (err) {
			console.error(err)
	}
})()
