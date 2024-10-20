const axios = require('axios');
const fs = require('node:fs');
const path = require('node:path');

const URLS = [
	'https://developers.google.com/search/apis/ipranges/googlebot.json',
	'https://developers.google.com/search/apis/ipranges/special-crawlers.json'
];

const FILE_PATH = path.resolve(__dirname, '..', 'whitelists', 'googlebot.txt');

(async () => {
	try {
		const responses = await Promise.all(URLS.map(url => axios.get(url)));
		const content = responses.map(({ data }, index) => {
			const ipList = data.prefixes.map(prefix => prefix.ipv4Prefix || prefix.ipv6Prefix).join('\n');
			return `# ${URLS[index]}\n${ipList}`;
		}).join('\n\n');

		fs.mkdirSync(path.dirname(FILE_PATH), { recursive: true });
		fs.writeFileSync(FILE_PATH, content, 'utf-8');
	} catch (err) {
		console.error(err.stack);
	}
})();