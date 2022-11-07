import { loadData } from './data.js';
import { parseRange } from './utilities.js';

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

should also do that on the libreoffice pdf at some point
*/

// TODO
// optionally embed css font - should probably be in the css anyway if it is public
// any point to making print media css?

// NEEDED
// NWL Overrides file + editor to populate it
// Finish Oriental unicodes, verifying pronunciation

// theoretically you could make a whole pdf generator for all pages

/*
examples:
Part I:
'Occidental', '1-42',							7, 6, 24, 28,  2, true,  true,  true
'Occidental', '43-50 198-228 235',				7, 6, 24, 28,  2, true,  true,  false
'Occidental', '501-520',						5, 4, 34, 42,  1, true,  true,  true
'Occidental', '521-540',						5, 4, 34, 42,  1, true,  true,  false
'Occidental', '541-560',						5, 4, 34, 42,  1, true,  true,  true
'Occidental', '561-583',						5, 4, 34, 42,  1, true,  true,  false
'Occidental', '601-620',						5, 4, 34, 42, -1, true,  true,  true
'Occidental', '621-640',						5, 4, 34, 42, -1, true,  true,  false
'Occidental', '641-660',						5, 4, 34, 42, -1, true,  true,  true
'Occidental', '661-676 683-686',				5, 4, 34, 42, -1, true,  true,  false
'Occidental', 'null 698-715',					5, 4, 34, 42,  1, true,  true,  true
'Occidental', '716-728 735 745-746 741-744',	5, 4, 34, 42,  1, true,  true,  false
'Occidental', '800-805',						3, 2, 56, 84,  2, true,  false, true
'Occidental', '806-817',						4, 3, 42, 56,  2, false, false, false
'Occidental', '819 822 824 818 823 825',		3, 2, 56, 84,  2, true,  false, true
'Occidental', '830-834',						3, 2, 56, 84,  2, true,  false, false
'Occidental', '840-857',						4, 4, 42, 42,  2, true,  false, true
'Occidental', '860-868',						3, 3, 56, 56,  2, true,  false, false
'Occidental', '870-905',						4, 3, 42, 56,  2, false, false, true
'Occidental', '906-909',						2, 2, 84, 84,  0, true,  false, false

Part II:
'Occidental', '1001-1020',						5, 4, 34, 42,  1, true,  true,  true
...like 30 pages the same except offset

'Oriental', '1-62', 5, 4, 34, 42, 1, true, false, true
*/

async function makeSvg(group, glyphs, columns, rows, width, height, offset, bearings, nearby, front) {
	let alldata = await loadData(group);
	let range = await parseRange(glyphs);
	// def want a cache module
	// and a move some of this to a getRangeData module

	// should error check range length, it's fine

	let subset = [];

	for (const id of range) {
		if(id) {
			const index = alldata.findIndex(element => element['Glyph Number'] === id.toString());
			// not really error checking, but skip missing
			// e.g. first page of kanji is 1-62, so just skip all the non-existent numbers
			if(index >= 0) {
				subset.push(alldata[index]);
			}
		} else {
			subset.push(null);
		}
	}

	const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
	svg.setAttributeNS('http://www.w3.org/2000/xmlns/', 'xmlns', 'http://www.w3.org/2000/svg');
	svg.setAttribute('version', '1.1');

	const rpi = 29;

	let gridw = width * columns; // 170
	let gridh = height * rows; // 168
	let pagew = 8 * rpi;
	let pageh = 10.5 * rpi;
	let inner = 1.25 * rpi; // 36.25
	let outer = 0.75 * rpi; // 21.75

	let hgap = (pagew - inner - outer - gridw) / 2;
	let vgap = (pageh - gridh) / 2;

	let viewx = (inner + hgap) * -1;
	let viewy = vgap * -1;

	if(!front) {
		viewx = (outer + hgap) * -1;
	}

	svg.setAttribute('viewBox', `${viewx} ${viewy} ${pagew} ${pageh}`);
	svg.setAttribute('width', '8in');
	svg.setAttribute('height', '10.5in');

	const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
	svg.appendChild(style);

	let styles = '';
	let docRules = document.styleSheets[0].cssRules;
	for (const rule of docRules) {
		if (['body', 'main', 'svg'].indexOf(rule.selectorText) < 0) {
			styles += rule.cssText + ' ';
		}
	}

	const node = document.createTextNode(styles.trim());
	style.appendChild(node);

	for (let x = 0; x < columns; x += 1) {
		for (let y = 0; y < rows; y += 1) {
			let i = (y * columns) + x;

			let tx = x * width + (width / 2);
			let ty = y * height + (height / 2);

			const textleft = ((width / 2) - 4) * -1 + 0.3;          // -12.7
			const texttop = ((height / 2) - 4) * -1 + 1.7 - offset; // -16.3
			const textbottom = ((height / 2) - 4) - 0.3 - offset;   // 15.7

			ty = ty + offset; // this seems like the wrong place for this

			let item = subset[i];
			// leave blank cells for null
			if(item) {
				let desc = '';
				if(item['NWL Pronunciation']) {
					desc = `<text x="${textleft}" y="${textbottom}">${item['NWL Pronunciation'].toUpperCase()}</text>`;
				}

				let bdots = '';
				if(bearings) {
					bdots = `<circle cx="${item['Left Bearing']}" cy="0" r="0.167"></circle>
					<circle cx="${item['Right Bearing']}" cy="0" r="0.167"></circle>`;
				}

				let html = `<g transform="translate(${tx} ${ty})">
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
			let localx = (x % width) - ((width / 2) % 10);
			let localy = (y % height)- ((height / 2) % 10 + offset);

			if(x % width === 0 || y % height === 0) {
				// added +-1 also, to not make line if within one of major separator
				// as seen on Occidental 806-817 page
				// but it is not like that on 840-857
				// so 'nearby' flag
				if(localx % 10 === 0 && x % width !== 0 && (nearby || ((x - 1) % width !== 0 && (x + 1) % width !== 0))) {
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

document.getElementById('generate').addEventListener('click', async function() {
	let group = document.getElementById('group').value;
	let glyphs = document.getElementById('glyphs').value;
	let columns = parseInt(document.getElementById('columns').value);
	let rows = parseInt(document.getElementById('rows').value);
	let width = parseInt(document.getElementById('width').value);
	let height = parseInt(document.getElementById('height').value);
	let offset = parseInt(document.getElementById('offset').value);
	let bearings = document.getElementById('bearings').checked;
	let nearby = document.getElementById('nearby').checked;
	let front = document.getElementById('front').checked;

	document.getElementById('svg').innerHTML = '';

	let svg = await makeSvg(group, glyphs, columns, rows, width, height, offset, bearings, nearby, front);

	// append to body
	document.getElementById('svg').appendChild(svg);

	let dldata = '<?xml version="1.0" encoding="utf-8" standalone="yes"?>' + svg.outerHTML;

	let download = document.getElementById('download');
	download.setAttribute('href', 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(dldata));
	download.setAttribute('download', 'NWL Page.svg');
});
