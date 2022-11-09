import { parseRange } from './utilities.js';

const center = 'R'.charCodeAt(0);

const whole = {};

const part = {
	id: '',
	len: '',
	path: '',
	left: 0,
	right: 0
};

let count = 0;
let point = '';
let move = 'M';

function getid(chr) {
	if (/\n/.test(chr)) return true;
	if (!/[ \d]/.test(chr)) return false;

	part.id += chr;

	if (part.id.length === 5) {
		part.id = parseInt(part.id);
		parser = getlen;
	}

	return true;
}

function getlen(chr) {
	if (!/[ \d]/.test(chr)) return false;

	part.len += chr;

	if (part.len.length === 3) {
		part.len = parseInt(part.len);
		parser = getpath;
	}

	return true;
}

function getpath(chr) {
	if (/\n/.test(chr)) return true;

	point += chr;

	if (point.length === 2) {
		if (count === 0) {
			part.left = point.charCodeAt(0) - center;
			part.right = point.charCodeAt(1) - center;
		} else if (point === ' R') {
			move = 'M'; // and continue
		} else {
			let x = point.charCodeAt(0) - center;
			let y = point.charCodeAt(1) - center;

			// only add space if needed to distinguish number
			// repeated L can be ommitted

			if (y >= 0) y = ` ${y}`;
			if (move === 'M') {
				part.path += `M${x}${y}`;
				move = 'L';
			} else if (move === 'L') {
				part.path += `L${x}${y}`;
				move = '';
			} else {
				if (x >= 0) x = ` ${x}`;
				part.path += `${x}${y}`;
			}
		}
		count += 1;
		point = '';
	}

	if (count === part.len) {
		parser = newline;
	}

	return true;
}

function newline(chr) {
	if (!/\n/.test(chr)) return false;

	whole[part.id] = {
		id: part.id,
		left: part.left,
		right: part.right,
		path: part.path
	};

	// reset part
	part.id = '';
	part.len = '';
	part.path = '';
	part.left = 0;
	part.right = 0;

	// reset getpath vars
	count = 0;
	point = '';
	move = 'M';

	parser = getid;

	return true;
}

let parser = getid;

function parseGlyphs(str) {
	const lines = str.split(/\n/);

	for (let l = 0; l < lines.length; l += 1) {
		const line = lines[l] + '\n';

		for (let p = 0; p < line.length; p += 1) {
			const chr = line[p];

			const success = parser(chr);
			if (!success) {
				return new Error('Unexpected character.', {
					cause: {
						parser: parser.name,
						character: chr,
						line: l + 1,
						position: p + 1
					}
				});
			}
		}
	}

	// should check for 'Unexpected end of data.'
	// console.log(parser.name, part);

	return whole;
}

async function parseFiles(urls) {
	let all = '';

	for (const url of urls) {
		const file = await fetch(url);
		const text = await file.text();
		all += text;
	}

	let output = parseGlyphs(all);

	if (output instanceof Error) {
		console.error(output.message, output.cause);
		output = null;
	}

	return output;
}

async function parseMap(url) {
	const file = await fetch(url);
	const text = await file.text();

	return parseRange(text);
}

export { parseFiles, parseMap };
