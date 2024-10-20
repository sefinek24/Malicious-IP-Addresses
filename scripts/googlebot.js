const processUrls = require('../utils/processUrls.js');
const path = require('node:path');

const URLS = [
	'https://developers.google.com/search/apis/ipranges/googlebot.json',
	'https://developers.google.com/search/apis/ipranges/special-crawlers.json'
];

const FILE_PATH = path.resolve(__dirname, '..', 'whitelists', 'googlebot.txt');

(async () => {
	await processUrls(URLS, FILE_PATH);
})();