const axios = require('axios');
const fs = require('node:fs');
const path = require('node:path');
const { version } = require('./package.json');

const listFilePath = path.join(__dirname, 'lists', 'main.txt');
const logsFilePath = path.join(__dirname, 'lists', 'main.csv');

const whitelistUserAgents = [
	'Mozilla/5.0 (compatible; Bytespider; spider-feedback@bytedance.com) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/70.0.0.0 Safari/537.36'
];

const loadUniqueIPsFromFile = (filePath) => {
	const content = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '';
	const lines = content.split('\n').map(line => line.trim()).filter(line => line !== '');
	return new Set(lines);
};

const loadCsvRayIds = filePath => {
	const content = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '';
	return new Set(content.split('\n').map(line => {
		const columns = line.split(',');
		return columns.length > 2 ? columns[2].trim() : null;
	}).filter(line => line));
};

const ensureCsvHeader = (filePath, header) => {
	if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, `${header}\n`);
};

const escapeCsvValue = value => {
	return (typeof value === 'string' && (value.includes(',') || value.includes('\n')))
		? `"${value.replace(/"/g, '""')}"`
		: value;
};

const appendToFile = (filePath, content) => {
	if (fs.existsSync(filePath)) {
		fs.appendFileSync(filePath, `\n${content}`);
	} else {
		fs.writeFileSync(filePath, content);
	}
};

(async () => {
	try {
		const apiKey = process.env.SEFIN_API_KEY;
		if (!apiKey) throw new Error('SEFIN_API_KEY environment variable not set');

		const res = await axios.get('https://api.sefinek.net/api/v2/cloudflare-waf-abuseipdb/get', {
			headers: {
				'Authorization': apiKey,
				'User-Agent': `Mozilla/5.0 (compatible; Malicious-IP-Addresses/${version}; +https://github.com/sefinek24/Malicious-IP-Addresses)`
			}
		});

		const data = res.data?.logs || [];
		let newCsvEntries = 0, newIPsAdded = 0, skippedEntries = 0, totalLogsProcessed = 0;

		const existingIPs = loadUniqueIPsFromFile(listFilePath);
		const existingRayIds = loadCsvRayIds(logsFilePath);

		if (data.length > 0) {
			ensureCsvHeader(logsFilePath, 'Timestamp UTC, Original Timestamp, CF RayID, IP, Endpoint, User-Agent, Action, Country');

			data.forEach(entry => {
				const { rayId, ip, endpoint, useragent, action, country, timestamp } = entry;

				if (whitelistUserAgents.includes(useragent)) {
					skippedEntries++;
					return;
				}

				totalLogsProcessed++;

				if (!existingIPs.has(ip)) {
					appendToFile(listFilePath, ip);
					existingIPs.add(ip);
					newIPsAdded++;
				}

				if (!existingRayIds.has(rayId)) {
					const logEntry = [
						new Date().toISOString(),
						new Date(timestamp).toISOString(),
						rayId,
						ip,
						escapeCsvValue(endpoint),
						escapeCsvValue(useragent),
						action,
						country
					].join(',') + '\n';

					fs.appendFileSync(logsFilePath, logEntry);
					existingRayIds.add(rayId);
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