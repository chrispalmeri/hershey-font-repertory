// for usenet files
function parseOldRange(text) {
	const output = [];

	const matches = text.matchAll(/\S+/g);

	for (const match of matches) {
		const value = match[0];

		if (/-/.test(value)) {
			const bounds = value.split('-');
			const start = parseInt(bounds[0]);
			const end = parseInt(bounds[1]);
			for (let i = start; i <= end; i += 1) {
				output.push(i);
			}
		} else if (value === 'null') {
			output.push(null);
		} else {
			output.push(parseInt(value));
		}
	}

	return output;
}

// TODO: combine these again

// for page glyph ranges
function parseRange(text) {
	const output = [];

	const matches = text.split(',');

	for (const match of matches) {
		const value = match.trim();

		if (/-/.test(value)) {
			const bounds = value.split('-');
			const start = parseInt(bounds[0]);
			const end = parseInt(bounds[1]);
			for (let i = start; i <= end; i += 1) {
				output.push(i);
			}
		} else if (value === '') {
			output.push(null);
		} else {
			output.push(parseInt(value));
		}
	}

	return output;
}

function parsePath(input) {
	const output = [];

	let cleaned = input.replace(/[\n\r]/g, '');
	cleaned = cleaned.replace(/\s+/g, ' ');

	const segments = cleaned.split('M');

	for (const segment of segments) {
		const converted = [];
		const split = segment.replace('L', ' ').split(/([ -]\d+)/);

		let x = true;
		for (const item of split) {
			if (['', ' ', '  '].indexOf(item) > -1) continue;

			if (x) {
				converted.push([parseInt(item)]);
			} else {
				converted[converted.length - 1][1] = parseInt(item);
			}
			x = !x;
		}

		if (converted.length > 0) output.push(converted);
	}

	return output;
}

function serializePath(input) {
	let output = '';

	for (const segment of input) {
		for (let i = 0; i < segment.length; i += 1) {
			let x = segment[i][0];
			let y = segment[i][1];

			if (y >= 0) y = ' ' + y;

			if (i === 0) {
				output += `M${x}${y}`;
			} else if (i === 1) {
				output += `L${x}${y}`;
			} else {
				if (x >= 0) x = ' ' + x;
				output += `${x}${y}`;
			}
		}
	}

	return output;
}

function createSvgElement(tag, options) {
	const element = document.createElementNS('http://www.w3.org/2000/svg', tag);

	for (const key in options) {
		switch (key) {
			case 'id':
				element.id = options[key];
				break;
			case 'class':
				for (const itm of options[key].split(/\s/)) {
					element.classList.add(itm);
				}
				break;
			case 'content':
				element.textContent = options[key];
				break;
			case 'parent':
				options[key].appendChild(element);
				break;
			default:
				element.setAttribute(key, options[key]);
		}
	}

	return element;
}

function intersects(n, interval, exact = true) {
	if (n % interval === 0) return true;
	if (exact) return false;
	return (n + 1) % interval === 0 || (n - 1) % interval === 0;
}

export { parseOldRange, parseRange, parsePath, serializePath, createSvgElement, intersects };
