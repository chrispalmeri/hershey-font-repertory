function parseLine(line) {
	var output = [];
	var index = 0;
	var data = ''; // to handle empty columns even first one
	var quoted = false;
	var escaped = false;

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
	var data = [];
	var lines = text.split(/\r?\n/);
	var headers = parseLine(lines[0]);

	for (let i = 1; i < lines.length; i += 1) {
		if (lines[i].length > 0) { // cause file ends with line break
			var obj = {};
			var arr = parseLine(lines[i]);

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

export { parseCsv };
