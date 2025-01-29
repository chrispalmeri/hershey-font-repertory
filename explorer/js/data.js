import { parseCsv } from './csv.js';
import { thumbnail } from './render.js';

let data = [];

async function loadFile(url) {
	const file = await fetch(url);
	if (file.status !== 200) {
		return;
	}

	const text = await file.text();

	const records = parseCsv(text);

	// merge into data
	for (const record of records.data) {
		const index = data.findIndex(element => element[records.id] === record[records.id]);

		if (index === -1) {
			data.push(record);
		} else {
			Object.assign(data[index], record);
		}
	}
}

async function loadData(set) {
	// if set === current set then just return data
	if (!(set instanceof Array)) {
		set = [set];
	}

	// should probably fail silently if file doesn't exist
	// but will just create empty NWL Override Metadata.csv

	data = [];

	for (const item of set) {
		await loadFile('data/' + item + ' Metadata.csv');
		await loadFile('data/' + item + ' Paths.csv');
	}

	return data;
}

async function showCsv(set) {
	document.getElementById('groups').innerHTML = '';
	document.getElementById('output').innerHTML = '';

	await loadData(set);

	// filter those with no Unicode info yet
	// const filtered = data.filter(element => element['Unicode'] === '');
	const filtered = data;

	for (const record of filtered) {
		thumbnail({
			id: record['Glyph Number'],
			left: record['Left Bearing'],
			right: record['Right Bearing'],
			path: record['SVG Path'],
			desc: record['NBS Description'] || record['NWL Pronunciation'],
			unicode: record.Unicode,
			group: record['NBS Font'] || record['NWL Section']
		});
	}
}

export { loadData, showCsv };
