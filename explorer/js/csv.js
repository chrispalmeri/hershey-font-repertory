function parseLine(line) {
	const output = [];
	let index = 0;
	let data = ''; // to handle empty columns even first one
	let quoted = false;
	let escaped = false;

	for (let i = 0; i < line.length; i += 1) {
		const chr = line[i];

		if (chr === ',' && (!quoted || escaped)) { // allowed when quoted
			output[index] = data;
			index += 1;
			data = '';
			quoted = false; // escaped converts to end quote
			escaped = false;
		} else if (chr === '"') {
			// """test"" me" = "test" me
			if (escaped) {
				data += chr;
				escaped = false;
			} else if (quoted) {
				escaped = true;
			} else {
				quoted = true;
			}
		} else {
			data += chr;
		}
	}

	// last column
	output[index] = data;

	return output;
}

function parseCsv(text) {
	const data = [];
	const lines = text.split(/\r?\n/);
	const headers = parseLine(lines[0]);

	for (let i = 1; i < lines.length; i += 1) {
		if (lines[i].length > 0) { // cause file ends with line break
			const obj = {};
			const arr = parseLine(lines[i]);

			// not worried about anything that doesn't align with headers
			for (let j = 0; j < headers.length; j += 1) {
				obj[headers[j]] = arr[j];
			}

			data.push(obj);
		}
	}

	// also return first column name, presumably it's an id that can be used to merge data
	return {
		id: headers[0],
		data: data
	};
}

function serializeCSV(array) {
	// this will not have any escaped characters in it
	// [{ "Glyph Number": "1", "Left Bearing": "-5", "Right Bearing": "5", "SVG Path": "M0-5L-4 4M0-5L4 4M-2 1L2 1" }]

	let output = '';

	// get headers from first element
	// will enforce value ordering later, although I doubt it matters
	const headers = Object.keys(array[0]);
	output += headers.join(',') + '\r\n';

	for (let i = 0; i < array.length; i += 1) {
		// output += Object.values(array[i]).join(',') + '\r\n'; // unforced ordering

		for (let j = 0; j < headers.length; j += 1) {
			output += array[i][headers[j]];

			if (j === headers.length - 1) {
				output += '\r\n';
			} else {
				output += ',';
			}
		}
	}

	return output;
}

export { parseCsv, serializeCSV };
