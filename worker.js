const axios = require('axios');
const fs = require('node:fs');
const path = require('node:path');
const { version } = require('./package.json');

const listFilePath = path.join(__dirname, 'list.txt');
const logsFilePath = path.join(__dirname, 'logs.csv');

const whitelistUserAgents = [
	'Mozilla/5.0 (compatible; Bytespider; spider-feedback@bytedance.com) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/70.0.0.0 Safari/537.36'
];

const fileContains = (filePath, value) => {
	const content = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '';
	return content.split('\n').some(line => line.includes(value));
};

const ensureCsvHeader = (filePath, header) => {
	if (!fs.existsSync(filePath)) {
		fs.writeFileSync(filePath, `${header}\n`);
	}
};

const escapeCsvValue = (value) => {
	if (typeof value === 'string' && (value.includes(',') || value.includes('\n'))) {
		return `"${value.replace(/"/g, '""')}"`;
	}
	return value;
};

(async () => {
	try {
		const apiKey = process.env.SEFIN_API_KEY;
		if (!apiKey) throw new Error('SEFIN_API_KEY environment variable not set');

		const res = await axios.get('https://api.sefinek.net/api/v2/cloudflare-waf-abuseipdb/get', {
			headers: {
				'Authorization': apiKey,
				'User-Agent': `Mozilla/5.0 (compatible; Malicious-IP-Addresses/${version}; +https://github.com/sefinek24/malicious-ip-addresses)`
			}
		});

		const data = res.data?.logs;
		let newCsvEntries = 0, newIPsAdded = 0, skippedEntries = 0, totalLogsProcessed = 0;
		if (data?.length) {
			ensureCsvHeader(logsFilePath, 'Timestamp UTC, Original Timestamp, CF RayID, IP, Endpoint, User-Agent, Action, Country');

			data.forEach(entry => {
				const { rayId, ip, endpoint, useragent, action, country, timestamp } = entry;

				if (whitelistUserAgents.includes(useragent)) {
					skippedEntries++;
					return;
				}

				totalLogsProcessed++;

				if (!fileContains(listFilePath, ip)) {
					fs.appendFileSync(listFilePath, `${ip}\n`);
					newIPsAdded++;
				}

				if (!fileContains(logsFilePath, rayId)) {
					const logEntry = [
						new Date().toISOString(),
						new Date(timestamp).toISOString(),
						escapeCsvValue(rayId),
						escapeCsvValue(ip),
						escapeCsvValue(endpoint),
						escapeCsvValue(useragent),
						escapeCsvValue(action),
						escapeCsvValue(country)
					].join(',') + '\n';

					fs.appendFileSync(logsFilePath, logEntry);
					newCsvEntries++;
				} else {
					skippedEntries++;
				}
			});
		}

		console.log(`Total logs processed: ${totalLogsProcessed}`);
		console.log(`New IPs added to list: ${newIPsAdded}`);
		console.log(`New entries added to CSV: ${newCsvEntries}`);
		console.log(`Skipped entries: ${skippedEntries}`);
	} catch (err) {
		console.error('Error fetching or processing data:', err.message);
		process.exit(1);
	}
})();