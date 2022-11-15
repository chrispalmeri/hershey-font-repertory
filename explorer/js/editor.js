import { parsePath, serializePath, createSvgElement } from './utilities.js';

/*
TODO

button to change lines to untransparent black
color multiply type things with image?

split button shouldn't be too hard - once you have selected node

double click segment to add node - or whatever is easiest - shift drag to duplicate?
	shift drag together to delete one?
	or even autodelete sequential, identical nodes

allow mouse moving bearings just constrained to x only

input where you can paste multiline groups
and then next/prev buttons through them

baselines
node insert and segment split/join would be amazing
copy button, maybe even tab separated values
small svg preview

repo images?
load from csv?
I don't know how needful that is, you have to manually enter into csv anyway

allow changing layout size

REFACTOR

consolidate moveref and selectednode

node selection/deleting was added pretty quickly
	some names could be better
	may want more granular render functions, segment handles vs segment vs path vs page

state.move {seg, handle, data}
initial global rendering into newfunction?
get rid of default placeholder glyph/image?

would be really cool to highlight nodes based on cursor position in textarea
also maybe autocorrect if you accidentally put in odd number of points?
syntax highlighting? - I think editable AND syntax highlighting is pretty complicated

*/

const glyph = {
	left: '-12',
	right: '12',
	path: 'M-6-6L-7-7-7-9-5-11-2-12 0-12-3-1-5 5-6 7-7 8-9 9-11 9-12 8-12 6-11 5-10 6-11 7M0-12L-3-3-4 0-6 5-7 7-9 9M8-11L5-7 3-5 1-4-2-3M11-11L10-10 11-9 12-10 12-11 11-12 10-12 8-11 5-6 4-5 2-4-2-3M-2-3L1-2 2 0 3 7 4 9M-2-3L0-2 1 0 2 7 4 9 5 9 7 8 9 6'
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
	offset: 1,
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

document.getElementById('offset').value = state.offset;
document.getElementById('left').value = glyph.left;
document.getElementById('right').value = glyph.right;
document.getElementById('out').value = glyph.path;


// Functions

function updateView() {
	let viewArr = svg.getAttribute('viewBox').split(' ');
	state.view = {
		x: parseInt(viewArr[0]),
		y: parseInt(viewArr[1]),
		width: parseInt(viewArr[2]),
		height: parseInt(viewArr[3])
	}
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


// Initial render

// Grid lines
for (let x = -17; x <= 17; x += 1) {
	createSvgElement('line', {
		x1: x,
		y1: -21,
		x2: x,
		y2: 21,
		parent: grid
	});
}

for (let y = -21; y <= 21; y += 1) {
	createSvgElement('line', {
		x1: -17,
		y1: y,
		x2: 17,
		y2: y,
		parent: grid
	});
}

// Bearings
leftb.setAttribute('cx', glyph.left);
rightb.setAttribute('cx', glyph.right);

// Path segments
let parsed = parsePath(glyph.path);
initialRender();

// Mouse prep
state.dom = svg.getBoundingClientRect();
updateView();


// Input changes

// Background image
document.getElementById('upload').addEventListener('change', function(e) {
	var reader = new FileReader();

	reader.addEventListener('load', function(event) {
		var imageData = event.target.result;

		bg.innerHTML = `<image x="-19" y="-23" width="38" height="46" href="${imageData}"></image>`;
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

// Offset
document.getElementById('offset').addEventListener('input', function(e) {
	if(e.target.value.length > 0) {
		state.offset = parseInt(e.target.value);
		ggp.setAttribute('transform', `translate(0 ${state.offset})`);
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
	let y = Math.round((e.y - state.dom.y) * state.view.height / state.dom.height + state.view.y - state.offset);

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
