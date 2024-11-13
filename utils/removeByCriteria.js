const fs = require('node:fs');
const path = require('node:path');

const txtFilePath = path.join(__dirname, '../lists/main.txt');
const csvFilePath = path.join(__dirname, '../lists/details.csv');

const removeFromFile = (filePath, patterns) => {
	if (!fs.existsSync(filePath)) {
		console.error(`File not found: ${filePath}`);
		return 0;
	}

	try {
		const originalData = fs.readFileSync(filePath, 'utf8').split('\n');
		const filteredData = originalData.filter(line => !patterns.some(pattern => line.trim() === pattern.trim()));
		fs.writeFileSync(filePath, filteredData.join('\n'));
		return originalData.length - filteredData.length;
	} catch (err) {
		console.error(err);
		return 0;
	}
};

const parseCSV = csvContent => {
	return csvContent.split('\n').map(line => {
		const values = [];
		let current = '';
		let insideQuotes = false;
		for (let i = 0; i < line.length; i++) {
			const char = line[i];
			if (char === '"') {
				insideQuotes = true;
				current += char;
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

const filterByCriteria = (csvData, criteria, columnIndex) => csvData.filter(line => line[columnIndex]?.includes(criteria));
const removeLinesFromCSV = (csvData, matchingLines) => csvData.filter(line => !matchingLines.some(matchingLine => JSON.stringify(line) === JSON.stringify(matchingLine)));

const removeByCriteria = (criteria, criteriaType) => {
	if (!criteria || !criteriaType) return console.error('Criteria and criteriaType are required parameters.');
	if (!fs.existsSync(csvFilePath)) return console.error(`CSV file not found: ${csvFilePath}`);

	try {
		const csvContent = fs.readFileSync(csvFilePath, 'utf8');
		const csvData = parseCSV(csvContent);
		let matchingLines = [];
		if (criteriaType === 'endpoint') {
			matchingLines = filterByCriteria(csvData, criteria, 4);
		} else if (criteriaType === 'ip') {
			matchingLines = filterByCriteria(csvData, criteria, 3);
		} else if (criteriaType === 'userAgent') {
			matchingLines = filterByCriteria(csvData, criteria, 5);
		} else {
			console.error('Invalid criteriaType. Valid types are: endpoint, ip, userAgent.');
			return;
		}

		const ipsToRemove = [...new Set(matchingLines.map(line => line[3]))];
		if (ipsToRemove.length) {
			const txtRemovedCount = removeFromFile(txtFilePath, ipsToRemove);
			const updatedCsvData = removeLinesFromCSV(csvData, matchingLines);
			fs.writeFileSync(csvFilePath, updatedCsvData.map(line => line.join(',')).join('\n'));
			console.log(`-${txtRemovedCount} lines from main.txt | -${matchingLines.length} lines from details.csv`);
		} else {
			console.warn(`No matching ${criteriaType.toUpperCase()} found in CSV for: ${criteria}`);
		}
	} catch (err) {
		console.error(err);
	}
};

// Remove by endpoint
// removeByCriteria('', 'endpoint');

// Remove by IP
// removeByCriteria('', 'ip');

// Remove by user-agent
// removeByCriteria('', 'userAgent');