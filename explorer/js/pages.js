import { loadData } from './data.js';
import { pagerSetup } from './pager.js';
import { parseRange, intersects, createSvgElement } from './utilities.js';

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
	const covered = dataAccess[group].filter(x => {
		const gn = parseInt(x['Glyph Number']);
		return gn >= min && gn <= max;
	});

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
	}

	return output.join(delim);
}

function makeSvg(page) {
	const alldata = dataAccess[page.Data];

	// TODO: get rid of these
	const columns = parseInt(page.Columns);
	const rows = parseInt(page.Rows);
	const cellWidth = parseInt(page.Width);
	const cellHeight = parseInt(page.Height);
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

	// inches
	const PAGE_WIDTH = 8;
	const PAGE_HEIGHT = 10.5;
	const MARGIN_INNER = 1.25; // spine
	const MARGIN_OUTER = 0.75; // fore-edge

	const rpi = 29; // higher shrinks the graphic on the page

	const gridw = cellWidth * columns; // 170
	const gridh = cellHeight * rows; // 168
	const pagew = PAGE_WIDTH * rpi;
	const pageh = PAGE_HEIGHT * rpi;
	const inner = MARGIN_INNER * rpi; // 36.25
	const outer = MARGIN_OUTER * rpi; // 21.75

	// these are to center the grid, since if it can be too big or small for the preset margins
	// depending on how manu columns and rows are selected
	const hgap = (pagew - inner - outer - gridw) / 2;
	const vgap = (pageh - gridh) / 2;

	let viewx = (inner + hgap) * -1;
	const viewy = vgap * -1;

	if (!front) {
		viewx = (outer + hgap) * -1;
	}

	const svg = createSvgElement('svg', {
		xmlns: 'http://www.w3.org/2000/svg',
		version: '1.1',
		viewBox: `${viewx} ${viewy} ${pagew} ${pageh}`,
		width: '8in',
		height: '10.5in'
	});

	let styles = '';
	const docRules = document.styleSheets[0].cssRules;
	for (const rule of docRules) {
		// if (['body', 'main', '.shortcut', 'svg'].indexOf(rule.selectorText) < 0) {
		// not necessary to filter when using two stylesheets
		styles += rule.cssText + ' ';
	}

	createSvgElement('style', {
		content: styles.trim(),
		parent: svg
	});

	// cause it was reused a lot
	const halfCellWidth = cellWidth / 2;
	const halfCellHeight = cellHeight / 2;

	// for each cell
	for (let x = 0; x < columns; x += 1) {
		for (let y = 0; y < rows; y += 1) {
			const i = y * columns + x;

			// center coordinate of cell
			const tx = x * cellWidth + halfCellWidth;
			const ty = y * cellHeight + halfCellHeight + offset;

			const TEXT_CENTER = 0.7; // half of the apparent size, to use for centering
			const TEXT_MARGIN = 5; // from border to center of first character
			const ID_DIGITS = 4; // leading zeros

			// svg text positioning is from the bottom left corner of the text
			const textleft = -halfCellWidth + TEXT_MARGIN - TEXT_CENTER;
			const texttop = -halfCellHeight + TEXT_MARGIN + TEXT_CENTER - offset;
			const textbottom = halfCellHeight - TEXT_MARGIN + TEXT_CENTER - offset;

			const item = subset[i];
			// leave blank cells for null
			if (item) {
				const g = createSvgElement('g', { transform: `translate(${tx} ${ty})`, parent: svg });

				createSvgElement('text', {
					x: textleft,
					y: texttop,
					content: item['Glyph Number'].padStart(ID_DIGITS, '0'),
					parent: g
				});

				if (bearings) {
					createSvgElement('circle', { cx: item['Left Bearing'], cy: 0, r: 0.167, parent: g });
					createSvgElement('circle', { cx: item['Right Bearing'], cy: 0, r: 0.167, parent: g });
				}

				createSvgElement('path', { d: item['SVG Path'], parent: g });

				if (item['NWL Pronunciation']) {
					createSvgElement('text', {
						x: textleft,
						y: textbottom,
						content: item['NWL Pronunciation'].toUpperCase(),
						parent: g
					});
				}
			}
		}
	}

	const TICK_EVERY = 10;
	const TICK_LENGTH = 0.75; // each side

	// x,y relative to whole grid, going though every point in one loop
	// was easier to deal with the intersections/overlap
	for (let x = 0; x <= columns * cellWidth; x += 1) {
		for (let y = 0; y <= rows * cellHeight; y += 1) {
			// relative to individual cell
			const localx = x % cellWidth;
			const localy = y % cellHeight;

			if (localx === 0 || localy === 0) {
				// centered and offset, so can be used for tick marks
				const correctx = localx - halfCellWidth;
				const correcty = localy - halfCellHeight - offset;

				// pages 101 and 104 show 'nearby' difference
				if (intersects(correctx, TICK_EVERY) && !intersects(x, cellWidth, nearby)) {
					createSvgElement('line', { x1: x, y1: y - TICK_LENGTH, x2: x, y2: y + TICK_LENGTH, parent: svg });
				} else if (intersects(correcty, TICK_EVERY) && !intersects(y, cellHeight, nearby)) {
					createSvgElement('line', { x1: x - TICK_LENGTH, y1: y, x2: x + TICK_LENGTH, y2: y, parent: svg });
				} else {
					createSvgElement('circle', { cx: x, cy: y, r: 0.167, parent: svg });
				}
			}
		}
	}

	return svg;
}

function showSvg(page) {
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

	document.getElementById('svg').innerHTML = ''; // wrapper div

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
		'Page': 'Custom',
		'Data': document.getElementById('group').value,
		'glyphs': document.getElementById('glyphs').value, // unique in this object
		'Columns': document.getElementById('columns').value,
		'Rows': document.getElementById('rows').value,
		'Width': document.getElementById('width').value,
		'Height': document.getElementById('height').value,
		'Vertical Offset': document.getElementById('offset').value,
		'Bearings': document.getElementById('bearings').checked,
		'Nearby': document.getElementById('nearby').checked,
		'Front': document.getElementById('front').checked
	};

	showSvg(customPage);
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
