function parseRange(text) {
	const output = [];

	const matches = text.matchAll(/\S+/g);

	for (const match of matches) {
		const value = match[0];

		if (/-/.test(value)) {
			const bounds = value.split('-');
			const start = parseInt(bounds[0]);
			const end = parseInt(bounds[1]);
			for (let i = start; i <= end; i++) {
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

export { parseRange };
