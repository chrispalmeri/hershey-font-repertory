import { parsePath, serializePath, createSvgElement } from './utilities.js';
import { loadData } from './data.js';

/*
TODO

warning to save work
local storage current navigation
second pass to cleaup initial render
	inital viewbox and bounds indicators still in html

way to switch to oriental, or way to upload/download whole csv maybe?
clear button, or some toggle between audit/create mode

do you really still need offset field to be shown now?
should the size inputs keep the +2 sizing, or no?

config for line width

button to change lines to untransparent black
color multiply type things with image?

split button shouldn't be too hard - once you have selected node

double click segment to add node - or whatever is easiest - shift drag to duplicate?
	shift drag together to delete one?
	or even autodelete sequential, identical nodes

allow mouse moving bearings just constrained to x only

baselines
node insert and segment split/join would be amazing
copy button, maybe even tab separated values
small svg preview

REFACTOR

I think updateView() is unnecessary - well, now you added a needed state.dom update to it

mixed onchange vs oninput - prob standardize on onchange

consolidate moveref and selectednode

node selection/deleting was added pretty quickly
	some names could be better
	may want more granular render functions, segment handles vs segment vs path vs page

state.move {seg, handle, data}

would be really cool to highlight nodes based on cursor position in textarea
also maybe autocorrect if you accidentally put in odd number of points?
syntax highlighting? - I think editable AND syntax highlighting is pretty complicated

remove spaces in column names during csv parse, MAYBE parseInt's (check perf if so)

*/

let alldata = await loadData('NWL Occidental');
let pagedata = await loadData('NWL Page');

// merge data
// maybe you should do this individually as glyphs are selected?
for (let i = 0; i < alldata.length; i += 1) {
	const index = pagedata.findIndex(element => element['Page'] === alldata[i]['Page']);

	if(index !== -1) {
		Object.assign(alldata[i], pagedata[index]);
	}
}

const state = {
	moveHandleRef: null,
	moveDataRef: null,
	mouse: {
		x: null,
		y: null
	},
	dom: {
		x: 0,
		y: 0,
		width: 0,
		height: 0
	},
	view: {
		x: 0,
		y: 0,
		width: 0,
		height: 0
	},
	selected: null,
	offset: -1,
	selectedRef: null,
	selectedId: null
};


// Dom elements and initial setup

const svg = document.querySelector('svg');
const bg = document.getElementById('bg');
const grid = document.getElementById('grid');
const ggp = document.getElementById('glyph');
const leftb = document.getElementById('leftb');
const rightb = document.getElementById('rightb');
const pageNum = document.getElementById('number');

let parsed = [];
let currentIndex = 0;
var imageSizer = new Image;

imageSizer.addEventListener('load', function() {
	let width = imageSizer.width / 10;
	let height = imageSizer.height / 10;
	let x = width * -1 / 2;
	let y = height * -1 / 2;
	bg.innerHTML = `<image x="${x}" y="${y}" width="${width}" height="${height}" href="${imageSizer.src}"></image>`;
});

document.getElementById('hide').checked = false; // to keep synced on page refresh


// Functions

function updateView() {
	let viewArr = svg.getAttribute('viewBox').split(' ');
	state.view = {
		x: parseInt(viewArr[0]),
		y: parseInt(viewArr[1]),
		width: parseInt(viewArr[2]),
		height: parseInt(viewArr[3])
	}

	// so mouse still tracks after svg size changed
	state.dom = svg.getBoundingClientRect();
}

function initialRender() {
	for (let seg = 0; seg < parsed.length; seg += 1) {
		let segment = parsed[seg];
		let g = createSvgElement('g', {
			id: 'grp' + seg,
			parent: ggp
		});
		createSvgElement('path', {
			id: 'seg' + seg,
			d: serializePath([segment]),
			parent: g
		});
	}
}

function reRender(replacement) {
	for (let seg = 0; seg < parsed.length; seg += 1) {
		document.getElementById(`grp${seg}`).remove();
	}

	parsed = replacement;
	state.selected = null;

	initialRender();

	document.getElementById('out').value = serializePath(parsed);
}

function navChange(selectedGlyph) {
	if (!selectedGlyph) {
		return;
	}

	// Viewbox
	let width = parseInt(selectedGlyph['Width']) + 2;
	let height = parseInt(selectedGlyph['Height']) + 2;
	let x = width * -1 / 2;
	let y = height * -1 / 2;
	document.getElementById('svg').setAttribute("viewBox", `${x} ${y} ${width} ${height}`);
	updateView();

	// Background image
	imageSizer.src = `img/occidental/${selectedGlyph['Glyph Number'].padStart(4, '0')}.jpg`;

	// Grid lines
	// just made it cover everything in inital setup below

	// Width and height
	document.getElementById('width').value = selectedGlyph['Width'];
	document.getElementById('height').value = selectedGlyph['Height'];

	// Offset
	let metaOffset = parseInt(selectedGlyph['Vertical Offset']);
	state.offset = isNaN(metaOffset) ? -1 : metaOffset; // old default just in case
	document.getElementById('offset').value = state.offset;
	ggp.setAttribute('transform', `translate(0 ${state.offset * -1})`);

	// Bearings
	document.getElementById('left').value = selectedGlyph['Left Bearing'];
	leftb.setAttribute('cx', selectedGlyph['Left Bearing']);

	document.getElementById('right').value = selectedGlyph['Right Bearing'];
	rightb.setAttribute('cx', selectedGlyph['Right Bearing']);

	// Path segments
	let copy = parsePath(selectedGlyph['SVG Path']);
	reRender(copy); // will set field value also
}

// Initial render

// Grid lines
// you could nuke 'grid' innerHTML and make this a function to redraw
// used to only draw it to actual height/width (-1 fron viewbox)
// for now just made it big enough to cover everything (84x84)
for (let x = -43; x <= 43; x += 1) {
	createSvgElement('line', {
		x1: x,
		y1: -43,
		x2: x,
		y2: 43,
		parent: grid
	});
}

for (let y = -43; y <= 43; y += 1) {
	createSvgElement('line', {
		x1: -43,
		y1: y,
		x2: 43,
		y2: y,
		parent: grid
	});
}

// Path segments
pageNum.value = alldata[currentIndex]['Glyph Number'];
navChange(alldata[0]);

// Mouse prep
state.dom = svg.getBoundingClientRect();


// Input changes

// Navigation number input
pageNum.addEventListener("change", function(e) {
	let gi = alldata.findIndex(element => element['Glyph Number'] === e.target.value);
	if (gi > -1) {
		currentIndex = gi;
		navChange(alldata[currentIndex]);
	} else {
		// figure out the valid glyph that is directionaly closest
		let last = alldata[currentIndex]['Glyph Number'];
		let desired = parseInt(e.target.value) || 0;

		// start high cause findIndex returns first match
		let highIndex = alldata.findIndex(element => parseInt(element['Glyph Number']) > desired);
		if (highIndex === -1) {
			highIndex = alldata.length - 1;
		}

		if (desired > last) {
			currentIndex = highIndex;
		} else {
			let lowIndex = highIndex - 1;
			if (lowIndex < 0) {
				lowIndex = 0;
			}
			currentIndex = lowIndex;
		}

		pageNum.value = alldata[currentIndex]['Glyph Number'];
		navChange(alldata[currentIndex]);
	}
});

// Navigation previous
document.getElementById('prev').addEventListener("click", function(e) {
	currentIndex -= 1;
	if (currentIndex < 0) {
		currentIndex = 0;
	}
	pageNum.value = alldata[currentIndex]['Glyph Number'];
	navChange(alldata[currentIndex]);

});

// Navigation next
document.getElementById('next').addEventListener("click", function(e) {
	currentIndex += 1;
	if (currentIndex > alldata.length - 1) {
		currentIndex = alldata.length - 1;
	}
	pageNum.value = alldata[currentIndex]['Glyph Number'];
	navChange(alldata[currentIndex]);
});

// Background image
document.getElementById('upload').addEventListener('change', function(e) {
	var reader = new FileReader();

	reader.addEventListener('load', function(event) {
		imageSizer.src = event.target.result;
	});

	reader.readAsDataURL(e.target.files[0]);
});

document.getElementById('hide').addEventListener('change', function(e) {
	if (e.target.checked) {
		bg.style.display = 'none';
	} else {
		bg.style.display = 'block';
	}
});

// Width and height
document.getElementById('width').addEventListener('change', function(e) {
	if(e.target.value.length > 0) {
		let width = parseInt(e.target.value) + 2;
		let x = width * -1 / 2;
		document.getElementById('svg').setAttribute("viewBox", `${x} ${state.view.y} ${width} ${state.view.height}`);
		updateView();
	}
});

document.getElementById('height').addEventListener('change', function(e) {
	if(e.target.value.length > 0) {
		let height = parseInt(e.target.value) + 2;
		let y = height * -1 / 2;
		document.getElementById('svg').setAttribute("viewBox", `${state.view.x} ${y} ${state.view.width} ${height}`);
		updateView();
	}
});

// Offset
document.getElementById('offset').addEventListener('input', function(e) {
	if(e.target.value.length > 0) {
		state.offset = parseInt(e.target.value);
		ggp.setAttribute('transform', `translate(0 ${state.offset * -1})`);
	}
});

// Bearings
document.getElementById('left').addEventListener('input', function(e) {
	leftb.setAttribute('cx', e.target.value);
});

document.getElementById('right').addEventListener('input', function(e) {
	rightb.setAttribute('cx', e.target.value);
});

// Path
document.getElementById('out').addEventListener('change', function(e) {
	let copy = parsePath(e.target.value.trim());
	reRender(copy);
});

// Resize
window.addEventListener('resize', function() {
	state.dom = svg.getBoundingClientRect();
});


// MOUSE STUFF

svg.addEventListener('mousemove', function(e) {
	if(!state.moveHandleRef) return;

	let x = Math.round((e.x - state.dom.x) * state.view.width / state.dom.width + state.view.x);
	let y = Math.round((e.y - state.dom.y) * state.view.height / state.dom.height + state.view.y + state.offset);

	// check if x,y changed since last mouse move
	// to not spam render
	if (x !== state.mouse.x || y !== state.mouse.y) {
		state.mouse.x = x;
		state.mouse.y = y;

		state.moveHandleRef.setAttribute('cx', state.mouse.x);
		state.moveHandleRef.setAttribute('cy', state.mouse.y);
		state.moveDataRef[0] = state.mouse.x;
		state.moveDataRef[1] = state.mouse.y;

		let segment = parsed[state.selected];

		let elem = document.getElementById(`seg${state.selected}`);
		elem.setAttribute('d', serializePath([segment]));

		document.getElementById('out').value = serializePath(parsed);
	}

});

document.addEventListener('mouseup', function() {
	state.moveHandleRef = null;
	state.moveDataRef = null;
});


// SELECTION STUFF

// only used one place
function renderSelected() {
	let segment = parsed[state.selected];
	let group = document.getElementById(`grp${state.selected}`);
	group.classList.add('selected');

	for (let i = 0; i < segment.length; i += 1) {
		let x = segment[i][0];
		let y = segment[i][1];

		let cls = 'handle';
		if (i === 0) cls += ' first';
		if (i === segment.length - 1) cls += ' last';

		const handle = createSvgElement('circle', {
			id: 'node' + i,
			class: cls,
			cx: x,
			cy: y,
			r: 0.5,
			parent: group
		});

		// move it to the top
		ggp.appendChild(group);

		handle.addEventListener('mousedown', function(e) {
			state.moveHandleRef = e.target;
			state.moveDataRef = segment[i];

			selectNode(e.target);
		});
	}
}

function unrenderSelected() {
	if (state.selected !== null) {
		let segment = parsed[state.selected];
		let group = document.getElementById(`grp${state.selected}`);
		group.classList.remove('selected');

		// i think this is just to remove the handles
		group.innerHTML = `<path id="seg${state.selected}" d="${serializePath([segment])}"></path>`;

		state.selected = null;
	}
}

function selectNode(node) {
	if(state.selectedRef !== null && state.selectedRef !== node) {
		deselectNode();
	}
	state.selectedRef = node;
	state.selectedId = parseInt(node.id.replace('node', ''));
	node.classList.add('selected');
}

function deselectNode() {
	if(state.selectedRef) {
		state.selectedRef.classList.remove('selected');
		state.selectedId = null;
		state.selectedRef = null;
	}
}

function deleteNode() {
	let temp = parseInt(state.selected); // just to copy cause unrenderSelected will nuke it
	parsed[state.selected].splice(state.selectedId, 1);
	deselectNode();
	unrenderSelected();
	state.selected = temp;
	renderSelected();

	// just cause don't NEED to fully rerender
	document.getElementById('out').value = serializePath(parsed);
}

// inconsistent, blanket deselecting node, targeted deselecting path
svg.addEventListener('click', function(e) {
	if(e.target.nodeName === 'path') {
		deselectNode();

		const clicked = parseInt(e.target.id.replace('seg', ''));
		if(clicked !== state.selected) {
			unrenderSelected();

			state.selected = clicked;
			renderSelected();
		}
	} else if (e.target.classList.contains('handle')) {
		// nothing, done in mousedown
	} else {
		deselectNode();
		unrenderSelected();
	}
});

// Delete segment
document.addEventListener('keydown', function(e) {
	if (e.key === 'Delete' && ['input', 'textarea'].indexOf(e.target.localName) === -1) {
		if (state.selectedId !== null) {
			deleteNode();
		} else if (state.selected !== null) {
			let copy = parsed.slice();
			copy.splice(state.selected, 1);
			reRender(copy);
		}
	}
});
