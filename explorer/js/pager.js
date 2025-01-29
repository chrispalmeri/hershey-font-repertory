let display = null;
let values = [];
let index = 0;
let callback = null;

function pagerPrev() {
	index -= 1;
	if (index < 0) {
		index = 0;
	}
	display.value = values[index];
	callback(index);
}

function pagerNext() {
	index += 1;
	if (index > values.length - 1) {
		index = values.length - 1;
	}
	display.value = values[index];
	callback(index);
}

function pagerSetup(input, back, forward, data, func) {
	// Setup globals
	display = input;
	values = data;
	callback = func;

	// Initial render
	display.value = values[index];
	callback(index);

	// Navigation number input
	display.addEventListener('change', function(e) {
		const gi = values.findIndex(element => element === e.target.value);
		if (gi > -1) {
			index = gi;
			callback(index);
		} else {
			// figure out the valid glyph that is directionaly closest
			const last = values[index];
			const desired = parseInt(e.target.value) || 0;

			// start high cause findIndex returns first match
			let highIndex = values.findIndex(element => parseInt(element) > desired);
			if (highIndex === -1) {
				highIndex = values.length - 1;
			}

			if (desired > last) {
				index = highIndex;
			} else {
				let lowIndex = highIndex - 1;
				if (lowIndex < 0) {
					lowIndex = 0;
				}
				index = lowIndex;
			}

			display.value = values[index];
			callback(index);
		}
	});

	// Navigation previous
	back.addEventListener('click', function() {
		pagerPrev();
		back.blur(); // needed to prevent ENTER from navigating twice
	});

	// Navigation next
	forward.addEventListener('click', function() {
		pagerNext();
		forward.blur(); // needed to prevent ENTER from navigating twice
	});
}

export { pagerSetup, pagerNext };
