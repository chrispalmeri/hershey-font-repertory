function parseRange(text) {
	const output = [];

	const matches = text.split(',');

	for (const match of matches) {
		const value = match.trim();

		if (/-/.test(value)) {
			const bounds = value.split('-');
			const start = parseInt(bounds[0]);
			const end = parseInt(bounds[1]);
			for (let i = start; i <= end; i++) {
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
	let output = [];

	input = input.replace(/[\n\r]/g, '');
	input = input.replace(/\s+/g, ' ');

	const segments = input.split('M');

	for (const segment of segments) {
		let cleaned = [];
		const split = segment.replace('L', ' ').split(/([ -]\d+)/);

		let x = true;
		for (const item of split) {
			if (['', ' ', '  '].indexOf(item) > -1) continue;

			if (x) {
				cleaned.push([parseInt(item)]);
			} else {
				cleaned[cleaned.length - 1][1] = parseInt(item)
			}
			x = !x;
		}

		if (cleaned.length > 0) output.push(cleaned);
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

	for (var key in options) {
		switch(key) {
			case 'id':
				element.id = options[key];
				break;
			case 'class':
				let splt = options[key].split(/\s/);
				for (const itm of splt) {
					element.classList.add(itm);
				}
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

export { parseRange, parsePath, serializePath, createSvgElement };
