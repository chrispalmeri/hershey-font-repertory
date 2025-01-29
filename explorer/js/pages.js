import { loadData } from './data.js';
import { parseRange } from './utilities.js';
import { pagerSetup } from './pager.js';

/*
install the Courier Prime Sans fonts locally
download these svg's
open in inkscape and save as pdf, embedding font

merge the pdfs into one
  can use https://www.adobe.com/acrobat/online/merge-pdf.html just have to login after
  four svg's was 366K originaly - so like literally just concating the files
compress/optimize the pdf, which should deduplicate the embedded font
  after merging and logging in, more menu > compress made it 96K
  no visible loss in quality - as expected
  does still show as having multiple fonts in Adobe file info, might be a subset thing

should also do that on the libreoffice pdf at some point
*/

// TODO
// optionally embed css font - should probably be in the css anyway if it is public
// any point to making print media css?

// use utilities.createSvgElement() in this file

// theoretically you could make a whole pdf generator for all pages

// 'NWL Oriental' would skip 295
// page 14 kanji 2097 has spaces stripped intentionally

// centered option in addition to front/back, and custom non 8x10.5 sizing
// would let you make custom pages

const pages = await loadData('NWL Page');
const occidental = await loadData('NWL Occidental');
const oriental = await loadData('NWL Oriental');

const dataAccess = {
	Occidental: occidental,
	Oriental: oriental
};

pages.forEach(function(page) {
	page.Bearings = page.Bearings === '1';
	page.Nearby = page.Nearby === '1';
	page.Front = page.Front === '1';

	// EXCEPT FOR MANUALLY CHANGING THE RANGE FIELD
	// could get rid of later filtering for invalid glyph numbers
	// also clean this up to not have to match old format

	// also the other range stuff is in makeSvg(), rather than upfront in forEach

	const pageGlyphs = dataAccess[page.Data].filter(x => x.Page === page.Page);

	// sorts and inserts blanks
	const newRange = [];
	for (const g of pageGlyphs) {
		// notice position is 1 based, instead of 0
		newRange[parseInt(g.Position) - 1] = parseInt(g['Glyph Number']);
	}

	page.Range = newRange;
});

pagerSetup(
	document.getElementById('number'),
	document.getElementById('prev'),
	document.getElementById('next'),
	pages.map(x => x.Page),
	function(index) {
		showSvg(pages[index]);
	}
);

// still want compatible with range input, so you can make your own pages
// parseRange is in utilities.js, this is here cause references data
function serializeRange(group, range) {
	// you start with the exact ones you need, as int's, with undefined's, in display order

	// get min/max
	let min = null;
	let max = null;

	for (const inner of range) {
		if (inner !== undefined) {
			if (min === null || inner < min) {
				min = inner;
			}
			if (max === null || inner > max) {
				max = inner;
			}
		}
	}

	// get all the ones in database from min to max, assume already sequential glyph order
	const covered = dataAccess[group].filter(x => parseInt(x['Glyph Number']) >= min && parseInt(x['Glyph Number']) <= max);

	// go through the actual range and gather up ones that are sequential
	const output = [];
	let sequence = null;
	let sIndex = null;

	const blank = '';
	const delim = ',';

	for (let i = 0; i < range.length; i += 1) {
		// skipped space on page
		if (!range[i]) {
			// end sequence
			if (sequence) {
				output.push(sequence.join('-'));
				sequence = null;
				sIndex = null;
			}
			// null, undefined, 0, whatever
			output.push(blank);
			continue;
		}

		const match = covered.findIndex(x => parseInt(x['Glyph Number']) === range[i]);
		// not possible for match === -1 (covered to not include valid)

		if (!sequence) {
			// start sequence
			sequence = [range[i]]; // only one so can end early
			sIndex = match;
		} else if (match === sIndex + 1) { // sequential
			// continue sequence
			sequence[1] = range[i];
			sIndex = match;
		} else { // not sequential, skipped character
			// restart sequence
			output.push(sequence.join('-'));
			sequence = [range[i]];
			sIndex = match;
		}
	}

	// end final sequence
	if (sequence) {
		output.push(sequence.join('-'));
		sequence = null;
		sIndex = null;
	}

	return output.join(delim);
}

function makeSvg(page) {
	const alldata = dataAccess[page.Data];

	// TODO: get rid of these
	const columns = parseInt(page.Columns);
	const rows = parseInt(page.Rows);
	const width = parseInt(page.Width);
	const height = parseInt(page.Height);
	const offset = parseInt(page['Vertical Offset']);
	const bearings = page.Bearings;
	const nearby = page.Nearby;
	const front = page.Front;

	// allow either new or old type of range
	const range = page.Range || parseRange(page.glyphs);
	// and a move some of this to a getRangeData module

	// should error check range length, it's fine

	const subset = [];

	for (const id of range) {
		if (id) {
			const index = alldata.findIndex(element => element['Glyph Number'] === id.toString());
			// not really error checking, but skip missing
			// e.g. first page of kanji is 1-62, so just skip all the non-existent numbers
			// not needed in new ranges, still needed in old
			if (index >= 0) {
				subset.push(alldata[index]);
			}
		} else {
			subset.push(null);
		}
	}

	const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
	svg.setAttributeNS('http://www.w3.org/2000/xmlns/', 'xmlns', 'http://www.w3.org/2000/svg');
	svg.setAttribute('version', '1.1');

	const rpi = 29; // higher shrinks the graphic on the page

	const gridw = width * columns; // 170
	const gridh = height * rows; // 168
	const pagew = 8 * rpi;
	const pageh = 10.5 * rpi;
	const inner = 1.25 * rpi; // 36.25
	const outer = 0.75 * rpi; // 21.75

	const hgap = (pagew - inner - outer - gridw) / 2;
	const vgap = (pageh - gridh) / 2;

	let viewx = (inner + hgap) * -1;
	const viewy = vgap * -1;

	if (!front) {
		viewx = (outer + hgap) * -1;
	}

	svg.setAttribute('viewBox', `${viewx} ${viewy} ${pagew} ${pageh}`);
	svg.setAttribute('width', '8in');
	svg.setAttribute('height', '10.5in');

	const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
	svg.appendChild(style);

	let styles = '';
	const docRules = document.styleSheets[0].cssRules;
	for (const rule of docRules) {
		// if (['body', 'main', '.shortcut', 'svg'].indexOf(rule.selectorText) < 0) {
		// not necessary to filter when using two stylesheets
		styles += rule.cssText + ' ';
	}

	const node = document.createTextNode(styles.trim());
	style.appendChild(node);

	for (let x = 0; x < columns; x += 1) {
		for (let y = 0; y < rows; y += 1) {
			const i = (y * columns) + x;

			const tx = x * width + (width / 2);
			let ty = y * height + (height / 2);

			const textleft = ((width / 2) - 4) * -1 + 0.3;			// -12.7
			const texttop = ((height / 2) - 4) * -1 + 1.7 - offset;	// -16.3
			const textbottom = ((height / 2) - 4) - 0.3 - offset;	// 15.7

			ty = ty + offset; // this seems like the wrong place for this

			const item = subset[i];
			// leave blank cells for null
			if (item) {
				let desc = '';
				if (item['NWL Pronunciation']) {
					desc = `<text x="${textleft}" y="${textbottom}">${item['NWL Pronunciation'].toUpperCase()}</text>`;
				}

				let bdots = '';
				if (bearings) {
					bdots = `<circle cx="${item['Left Bearing']}" cy="0" r="0.167"></circle>
					<circle cx="${item['Right Bearing']}" cy="0" r="0.167"></circle>`;
				}

				const html = `<g transform="translate(${tx} ${ty})">
					<text x="${textleft}" y="${texttop}">${item['Glyph Number'].padStart(4, '0')}</text>
					${bdots}
					<path d="${item['SVG Path']}"></path>
					${desc}
				</g>`;

				svg.insertAdjacentHTML('beforeend', html);
			}
		}
	}

	for (let x = 0; x <= (columns * width); x += 1) {
		for (let y = 0; y <= (rows * height); y += 1) {
			const localx = (x % width) - ((width / 2) % 10);
			const localy = (y % height) - ((height / 2) % 10 + offset);

			if (x % width === 0 || y % height === 0) {
				// added +-1 also, to not make line if within one of major separator
				// as seen on Occidental 806-817 page
				// but it is not like that on 840-857
				// so 'nearby' flag
				if (localx % 10 === 0 && x % width !== 0 && (nearby || ((x - 1) % width !== 0 && (x + 1) % width !== 0))) {
					svg.insertAdjacentHTML('beforeend', `<line x1="${x}" y1="${y - 0.75}" x2="${x}" y2="${y + 0.75}"></line>`);
				} else if (localy % 10 === 0 && y % height !== 0 && (nearby || ((y - 1) % height !== 0 && (y + 1) % height !== 0))) {
					svg.insertAdjacentHTML('beforeend', `<line x1="${x - 0.75}" y1="${y}" x2="${x + 0.75}" y2="${y}"></line>`);
				} else {
					svg.insertAdjacentHTML('beforeend', `<circle cx="${x}" cy="${y}" r="0.167"></circle>`);
				}
			}
		}
	}

	return svg;
}

async function showSvg(page) {
	// update the controls
	// page.glyphs is from UI, so ignore
	// page.Range is from database
	if (page.Range) {
		// sticking with existing types for now
		// text
		document.getElementById('group').value = page.Data;
		// range
		document.getElementById('glyphs').value = serializeRange(page.Data, page.Range);
		// text
		document.getElementById('columns').value = page.Columns;
		document.getElementById('rows').value = page.Rows;
		document.getElementById('width').value = page.Width;
		document.getElementById('height').value = page.Height;
		document.getElementById('offset').value = page['Vertical Offset'];
		// bool
		document.getElementById('bearings').checked = page.Bearings;
		document.getElementById('nearby').checked = page.Nearby;
		document.getElementById('front').checked = page.Front;
	}

	document.getElementById('svg').innerHTML = '';

	const svg = makeSvg(page);

	const dldata = '<?xml version="1.0" encoding="utf-8" standalone="yes"?>' + svg.outerHTML;

	const download = document.getElementById('download');
	download.setAttribute('href', 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(dldata));
	download.setAttribute('download', `NWL Page ${page.Page}.svg`);

	// remove after download is already prepped, just for responsive display
	// needed in download, otherwise GIMP uses the viewbox and rounds to pixels
	svg.removeAttribute('width');
	svg.removeAttribute('height');

	// append to body
	document.getElementById('svg').appendChild(svg);
}

document.getElementById('generate').addEventListener('click', function() {
	const customPage = {
		Page: 'Custom',
		Data: document.getElementById('group').value,
		glyphs: document.getElementById('glyphs').value, // unique in this object
		Columns: document.getElementById('columns').value,
		Rows: document.getElementById('rows').value,
		Width: document.getElementById('width').value,
		Height: document.getElementById('height').value,
		'Vertical Offset': document.getElementById('offset').value,
		Bearings: document.getElementById('bearings').checked,
		Nearby: document.getElementById('nearby').checked,
		Front: document.getElementById('front').checked
	};

	showSvg(customPage);
});
