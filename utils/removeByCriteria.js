const fs = require('node:fs');
const path = require('node:path');

const txtFilePath = path.join(__dirname, '../lists/main.txt');
const csvFilePath = path.join(__dirname, '../lists/details.csv');

const removeFromFile = (filePath, patterns) => {
	const originalData = fs.readFileSync(filePath, 'utf8').split('\n');
	const filteredData = originalData.filter(line => !patterns.some(pattern => line.includes(pattern)));
	fs.writeFileSync(filePath, filteredData.join('\n'));
	return originalData.length - filteredData.length;
};

const parseCSV = csvContent => {
	return csvContent.split('\n').map(line => {
		const values = [];
		let current = '';
		let insideQuotes = false;
		for (let i = 0; i < line.length; i++) {
			const char = line[i];
			if (char === '"' && (i === 0 || line[i - 1] !== '\\')) {
				insideQuotes = !insideQuotes;
			} else if (char === ',' && !insideQuotes) {
				values.push(current);
				current = '';
			} else {
				current += char;
			}
		}
		values.push(current);
		return values;
	});
};

const filterByCriteria = (csvData, criteria, columnIndex) => {
	return csvData.filter(line => {
		const columnValue = line[columnIndex];
		return columnValue?.includes(criteria);
	});
};

const removeByCriteria = (criteria, criteriaType) => {
	const csvContent = fs.readFileSync(csvFilePath, 'utf8');
	const csvData = parseCSV(csvContent);

	let matchingLines = [];

	if (criteriaType === 'endpoint') {
		matchingLines = filterByCriteria(csvData, criteria, 4);
	} else if (criteriaType === 'ip') {
		matchingLines = filterByCriteria(csvData, criteria, 3);
	} else if (criteriaType === 'userAgent') {
		matchingLines = filterByCriteria(csvData, criteria, 5);
	}

	const ipsToRemove = [...new Set(matchingLines.map(line => line[3]))];
	if (ipsToRemove.length) {
		const txtRemovedCount = removeFromFile(txtFilePath, ipsToRemove);
		const csvRemovedCount = removeFromFile(csvFilePath, ipsToRemove);
		console.log(`Removed ${txtRemovedCount} lines from main.txt and ${csvRemovedCount} lines from details.csv containing IPs: ${ipsToRemove.join(', ')}`);
	} else {
		console.log(`No matching ${criteriaType.toUpperCase()} found in CSV for: ${criteria}`);
	}
};

// Remove by endpoint
// removeByCriteria('/generated/', 'endpoint');

// Remove by IP
// removeByCriteria('', 'ip');

// Remove by user-agent
// removeByCriteria('', 'userAgent');