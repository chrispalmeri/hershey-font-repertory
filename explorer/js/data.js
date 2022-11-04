import { parse } from './csv-parse/sync.js';
import { thumbnail } from './render.js';

let data = [];

async function loadData(url) {
	const file = await fetch(url);
	const text = await file.text();

	const records = parse(text, {
		columns: true
	});

	// merge into data
	for (const record of records) {
		const index = data.findIndex(element => element['Glyph Number'] === record['Glyph Number']);

		if(index === -1) {
			data.push(record);
		} else {
			Object.assign(data[index], record);
		}
	}
}

async function showCsv(set) {
	document.getElementById('groups').innerHTML = '';
	document.getElementById('output').innerHTML = '';
	data = [];

	await loadData('data/' + set + ' Metadata.csv');
	await loadData('data/' + set + ' Paths.csv');

	// filter those with no Unicode info yet
	//const filtered = data.filter(element => element['Unicode'] === '');
	const filtered = data;

	for (const record of filtered) {
		thumbnail({
			id: record['Glyph Number'],
			left: record['Left Bearing'],
			right: record['Right Bearing'],
			path: record['SVG Path'],
			desc: record['NBS Description'] || record['NWL Pronunciation'],
			unicode: record['Unicode'],
			group: record['NBS Font'] || record['NWL Section']
		});
	}
}

export { showCsv };
