import { parsePath, serializePath, createSvgElement } from './utilities.js';
import { loadData } from './data.js';
import { serializeCSV } from './csv.js';
import { pagerSetup, pagerNext } from './pager.js';

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

autodelete sequential, overlapping, identical nodes?
could then drag one onto neighbor to delete

allow mouse moving bearings just constrained to x only

baselines
copy button, maybe even tab separated values
small svg preview

deleting nodes one at a time til one/none are left is weird
well, so is deleting all paths til none are left, then you are stuck
but why would anyone do either of those?

sometimes after moving node, segment becomes unselected
suspect its when mousedown and mouseup targets don't match it reports click target as svg
see :558 but not sure why it does that, can test by removing handle transform

REFACTOR

1. refactor deleteNode()

transforming both #glyph and #handles, group them maybe?
handles is seperate layer cause of segment opacity

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

const alldata = await loadData('NWL Occidental');
const pagedata = await loadData('NWL Page');

// copy for local changes
const localData = alldata.map(function(x) {
	return {
		'Glyph Number': x['Glyph Number'],
		'Left Bearing': x['Left Bearing'],
		'Right Bearing': x['Right Bearing'],
		'SVG Path': x['SVG Path']
	};
});

// merge data
// maybe you should do this individually as glyphs are selected?
for (let i = 0; i < alldata.length; i += 1) {
	const index = pagedata.findIndex(element => element.Page === alldata[i].Page);

	if (index !== -1) {
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
const handles = document.getElementById('handles');

let parsed = [];
let currentIndex = 0;
const imageSizer = document.createElement('img');

imageSizer.addEventListener('load', function() {
	const width = imageSizer.width / 10;
	const height = imageSizer.height / 10;
	const x = width * -1 / 2;
	const y = height * -1 / 2;
	bg.innerHTML = `<image x="${x}" y="${y}" width="${width}" height="${height}" href="${imageSizer.src}"></image>`;
});

document.getElementById('hide').checked = false; // to keep synced on page refresh

// Functions

function updateView() {
	const viewArr = svg.getAttribute('viewBox').split(' ');
	state.view = {
		x: parseInt(viewArr[0]),
		y: parseInt(viewArr[1]),
		width: parseInt(viewArr[2]),
		height: parseInt(viewArr[3])
	};

	// so mouse still tracks after svg size changed
	state.dom = svg.getBoundingClientRect();
}

function initialRender() {
	for (let seg = 0; seg < parsed.length; seg += 1) {
		const segment = parsed[seg];
		const g = createSvgElement('g', {
			id: 'grp' + seg,
			parent: ggp
		});

		for (let i = 0; i < segment.length - 1; i += 1) {
			const x1 = segment[i][0];
			const y1 = segment[i][1];
			const x2 = segment[i + 1][0];
			const y2 = segment[i + 1][1];

			createSvgElement('line', {
				id: `s${seg}l${i}`,
				x1: x1,
				y1: y1,
				x2: x2,
				y2: y2,
				parent: g
			});
		}
	}
}

function reRender(replacement) {
	unrenderSelected();

	for (let seg = 0; seg < parsed.length; seg += 1) {
		document.getElementById(`grp${seg}`).remove();
	}

	parsed = replacement;
	initialRender();

	document.getElementById('out').value = serializePath(parsed);
}

function navChange(selectedGlyph, really = false) {
	if (!selectedGlyph) {
		return;
	}

	// Viewbox
	const width = parseInt(selectedGlyph.Width) + 2;
	const height = parseInt(selectedGlyph.Height) + 2;
	const x = width * -1 / 2;
	const y = height * -1 / 2;
	document.getElementById('svg').setAttribute('viewBox', `${x} ${y} ${width} ${height}`);
	updateView();

	// Background image
	imageSizer.src = `img/occidental/${selectedGlyph['Glyph Number'].padStart(4, '0')}.jpg`;

	// Grid lines
	// just made it cover everything in inital setup below

	// Width and height
	document.getElementById('width').value = selectedGlyph.Width;
	document.getElementById('height').value = selectedGlyph.Height;

	// Offset
	const metaOffset = parseInt(selectedGlyph['Vertical Offset']);
	state.offset = isNaN(metaOffset) ? 1 : metaOffset; // old default just in case
	document.getElementById('offset').value = state.offset;
	ggp.setAttribute('transform', `translate(0 ${state.offset})`);
	handles.setAttribute('transform', `translate(0 ${state.offset})`);

	// THIS IS A HACK
	// added feature to save to localData, now want it to reflect when navigating
	if (!really) {
		selectedGlyph = localData[currentIndex];
	}

	// Bearings
	document.getElementById('left').value = selectedGlyph['Left Bearing'];
	leftb.setAttribute('cx', selectedGlyph['Left Bearing']);

	document.getElementById('right').value = selectedGlyph['Right Bearing'];
	rightb.setAttribute('cx', selectedGlyph['Right Bearing']);

	// Path segments
	const copy = parsePath(selectedGlyph['SVG Path']);
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

// currentIndex referenced in save, revert, ENTER, and one place in navChange
pagerSetup(
	document.getElementById('number'),
	document.getElementById('prev'),
	document.getElementById('next'),
	alldata.map(x => x['Glyph Number']),
	function(index) {
		currentIndex = index; // has more references than you thought
		navChange(alldata[index]);
	}
);

// Mouse prep
state.dom = svg.getBoundingClientRect();

// Input changes

// Background image
document.getElementById('upload').addEventListener('change', function(e) {
	const reader = new FileReader();

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
	if (e.target.value.length > 0) {
		const width = parseInt(e.target.value) + 2;
		const x = width * -1 / 2;
		document.getElementById('svg').setAttribute('viewBox', `${x} ${state.view.y} ${width} ${state.view.height}`);
		updateView();
	}
});

document.getElementById('height').addEventListener('change', function(e) {
	if (e.target.value.length > 0) {
		const height = parseInt(e.target.value) + 2;
		const y = height * -1 / 2;
		document.getElementById('svg').setAttribute('viewBox', `${state.view.x} ${y} ${state.view.width} ${height}`);
		updateView();
	}
});

// Offset
document.getElementById('offset').addEventListener('input', function(e) {
	if (e.target.value.length > 0) {
		state.offset = parseInt(e.target.value);
		ggp.setAttribute('transform', `translate(0 ${state.offset})`);
		handles.setAttribute('transform', `translate(0 ${state.offset})`);
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
	const copy = parsePath(e.target.value.trim());
	reRender(copy);
});

// Resize
window.addEventListener('resize', function() {
	state.dom = svg.getBoundingClientRect();
});

// Save
document.getElementById('save').addEventListener('click', function() {
	localData[currentIndex]['Left Bearing'] = document.getElementById('left').value;
	localData[currentIndex]['Right Bearing'] = document.getElementById('right').value;
	localData[currentIndex]['SVG Path'] = document.getElementById('out').value;
});

document.getElementById('revert').addEventListener('click', function() {
	navChange(alldata[currentIndex], true);
	// I guess also save it?
	// usually you would use revert to discard unsaved changes
	// but if you were trying to discard saved changes it felt weird to have to click save again
	localData[currentIndex]['Left Bearing'] = document.getElementById('left').value;
	localData[currentIndex]['Right Bearing'] = document.getElementById('right').value;
	localData[currentIndex]['SVG Path'] = document.getElementById('out').value;
});

document.getElementById('export').addEventListener('click', function() {
	const data = serializeCSV(localData);
	const link = document.createElement('a');
	link.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(data));
	link.setAttribute('download', 'NWL Occidental Paths.csv');
	link.click();
});

// MOUSE STUFF

svg.addEventListener('mousemove', function(e) {
	if (!state.moveHandleRef) return;

	const x = Math.round((e.x - state.dom.x) * state.view.width / state.dom.width + state.view.x);
	const y = Math.round((e.y - state.dom.y) * state.view.height / state.dom.height + state.view.y - state.offset);

	// check if x,y changed since last mouse move
	// to not spam render
	if (x !== state.mouse.x || y !== state.mouse.y) {
		state.mouse.x = x;
		state.mouse.y = y;

		state.moveHandleRef.setAttribute('cx', state.mouse.x);
		state.moveHandleRef.setAttribute('cy', state.mouse.y);
		state.moveDataRef[0] = state.mouse.x;
		state.moveDataRef[1] = state.mouse.y;

		const segment = parsed[state.selected];

		// update the connected lines, just the changed ends
		if (state.selectedId > 0) {
			// update preceding line
			const i = state.selectedId - 1;
			const elem = document.getElementById(`s${state.selected}l${i}`);
			elem.setAttribute('x2', segment[i + 1][0]);
			elem.setAttribute('y2', segment[i + 1][1]);
		}
		if (state.selectedId < segment.length - 1) {
			// update following line
			const i = state.selectedId;
			const elem = document.getElementById(`s${state.selected}l${i}`);
			elem.setAttribute('x1', segment[i][0]);
			elem.setAttribute('y1', segment[i][1]);
		}

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
	const segment = parsed[state.selected];
	const group = document.getElementById(`grp${state.selected}`);
	group.classList.add('selected');

	for (let i = 0; i < segment.length; i += 1) {
		const x = segment[i][0];
		const y = segment[i][1];

		let cls = 'handle';
		if (i === 0) cls += ' first';
		if (i === segment.length - 1) cls += ' last';

		const handle = createSvgElement('circle', {
			id: 'node' + i,
			class: cls,
			cx: x,
			cy: y,
			r: 0.5,
			parent: handles
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
		const segment = parsed[state.selected];
		const group = document.getElementById(`grp${state.selected}`);
		group.classList.remove('selected');

		// loop remove
		for (let i = 0; i < segment.length; i += 1) {
			const oldNode = document.getElementById(`node${i}`);
			if (oldNode) oldNode.remove();
		}

		state.selected = null;
	}
}

function selectNode(node) {
	if (state.selectedRef !== null && state.selectedRef !== node) {
		deselectNode();
	}
	state.selectedRef = node;
	state.selectedId = parseInt(node.id.replace('node', ''));
	node.classList.add('selected');
}

function deselectNode() {
	if (state.selectedRef) {
		state.selectedRef.classList.remove('selected');
		state.selectedId = null;
		state.selectedRef = null;
	}
}

function deleteNode(really = true) {
	// you need to fully rerender otherwise dom id's don't match array anymore
	// for both lines and handles
	// probably should break out functions, only one line does deletion
	// reusing this for adding nodes also
	// also, can maybe move delete from middle to top since error checking?
	// and make nuke loops go +1 always?

	// nuke all the lines
	let segment = parsed[state.selected];
	for (let i = 0; i < segment.length - 1; i += 1) {
		const oldLine = document.getElementById(`s${state.selected}l${i}`);
		if (oldLine) oldLine.remove();
	}

	// nuke all the handles
	const temp = parseInt(state.selected); // just to copy cause unrenderSelected will nuke it
	unrenderSelected(); // before delete node otherwise it misses last node
	state.selected = temp;

	// delete the node
	if (really) {
		parsed[state.selected].splice(state.selectedId, 1);
		deselectNode();
	}

	// rerender lines
	segment = parsed[state.selected];
	const g = document.getElementById(`grp${state.selected}`);
	for (let i = 0; i < segment.length - 1; i += 1) {
		createSvgElement('line', {
			id: `s${state.selected}l${i}`,
			x1: segment[i][0],
			y1: segment[i][1],
			x2: segment[i + 1][0],
			y2: segment[i + 1][1],
			parent: g // what is this
		});
	}

	// rerender handles
	renderSelected();

	document.getElementById('out').value = serializePath(parsed);
}

// inconsistent, blanket deselecting node, targeted deselecting path
svg.addEventListener('click', function(e) {
	// check either e.target.id !== ''
	// or e.target.parentNode.id !== 'grid'
	// to make sure it is not a grid line that you clicked on
	if (e.target.nodeName === 'line' && e.target.id) {
		deselectNode();

		const clicked = parseInt(e.target.parentNode.id.replace('grp', ''));
		// double check not NaN, but grid fix above should handle it
		if (clicked !== state.selected && !isNaN(clicked)) {
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

// Keyboard handling
document.addEventListener('keydown', function(e) {
	if (['input', 'textarea'].indexOf(e.target.localName) >= 0) {
		return;
	}

	switch (e.key) {
		case 'Delete':
			// Delete segment
			if (state.selectedId !== null) {
				deleteNode();
			} else if (state.selected !== null) {
				const copy = parsed.slice();
				copy.splice(state.selected, 1);
				reRender(copy);
			}
			break;
		case 'Enter':
			// Save (duplicated in input handlers far above)
			localData[currentIndex]['Left Bearing'] = document.getElementById('left').value;
			localData[currentIndex]['Right Bearing'] = document.getElementById('right').value;
			localData[currentIndex]['SVG Path'] = document.getElementById('out').value;

			// Navigate
			pagerNext();
			break;
	}
});

svg.addEventListener('dblclick', function(e) {
	if (e.target.nodeName === 'line') {
		// deselecting, checking selected, etc doesn't matter
		// cause it gets selected on first click anyway
		const segment = parsed[state.selected];

		const x = Math.round((e.x - state.dom.x) * state.view.width / state.dom.width + state.view.x);
		const y = Math.round((e.y - state.dom.y) * state.view.height / state.dom.height + state.view.y - state.offset);

		const line = parseInt(e.target.id.replace(`s${state.selected}l`, ''));

		segment.splice(line + 1, 0, [x, y]);
		deleteNode(false); // hacked to basically just re-render lines and handles
	}
});
