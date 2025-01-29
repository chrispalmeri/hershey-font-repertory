import { parseFiles, parseMap } from './parse.js';
import { thumbnail } from './render.js';
import { showCsv } from './data.js';

// put this somewhere better
// like a cache module
let glyphs = null;

async function render(group = null) {
	document.getElementById('output').innerHTML = '';

	if (!glyphs) {
		glyphs = await parseFiles([
			'./data/hersh.oc1',
			'./data/hersh.oc2',
			'./data/hersh.oc3',
			'./data/hersh.oc4'
			// won't work because they have duplicate id's
			// './data/hersh.or1',
			// './data/hersh.or2',
			// './data/hersh.or3',
			// './data/hersh.or4'
		]);
	}

	if (!glyphs) {
		console.warn('No glyphs');
		return;
	}

	if (group) {
		// you should probably cache these to
		const map = await parseMap('./data/' + group);
		// only this set
		for (const id of map) {
			const glp = glyphs[id] || null;
			if (glp) {
				thumbnail(glp);
			}
		}
	} else {
		// everything
		// let temp = 'Id\tLeft\tRight\tPath\n';
		for (const id in glyphs) {
			const glp = glyphs[id] || null;
			if (glp) {
				thumbnail(glp);
			}
			// temp += `${glp.id}\t${glp.left}\t${glp.right}\t${glp.path}\t\n`;
		}
		// console.log(temp)
		// var link = document.createElement("a");
		// link.setAttribute("href", 'data:text/plain;charset=utf-8,' + encodeURIComponent(temp));
		// link.setAttribute("download", 'numbers.csv');
		// link.click();
	}
}

function showOldGroups() {
	// names from http://paulbourke.net/dataformats/hershey/
	// comments from https://web.archive.org/web/20111116000733/http://idlastro.gsfc.nasa.gov/idl_html_help/Hershey_Vector_Font_Samples.html
	const groups = [
		{ file: 'gothgbt.hmp',	name: 'Gothic English Triplex'	},	// Font 11, Gothic English
		{ file: 'gothgrt.hmp',	name: 'Gothic German Triplex'	},	// Font 15, Gothic German
		{ file: 'gothitt.hmp',	name: 'Gothic Italian Triplex'	},	// Font 14, Gothic Italian
		{ file: 'greekc.hmp',	name: 'Greek Complex'			},	// Font 7, Complex Greek
		{ file: 'greekcs.hmp',	name: 'Greek Complex Small'		},
		{ file: 'greekp.hmp',	name: 'Greek Plain'				},
		{ file: 'greeks.hmp',	name: 'Greek Simplex'			},	// Font 4, Simplex Greek
		{ file: 'cyrilc.hmp',	name: 'Cyrillic Complex'		},	// Font 16, B Cyrilic
		{ file: 'italicc.hmp',	name: 'Italic Complex'			},	// Font 8, Complex Italic
		{ file: 'italiccs.hmp',	name: 'Italic Complex Small'	},
		{ file: 'italict.hmp',	name: 'Italic Triplex'			},	// Font 18, Triplex Italic
		{ file: 'scriptc.hmp',	name: 'Script Complex'			},	// Font 13, Complex Script
		{ file: 'scripts.hmp',	name: 'Script Simplex'			},	// Font 12, Simplex Script
		{ file: 'romanc.hmp',	name: 'Roman Complex'			},	// Font 6, Complex Roman
		{ file: 'romancs.hmp',	name: 'Roman Complex Small'		},
		{ file: 'romand.hmp',	name: 'Roman Duplex'			},	// Font 5, Duplex Roman
		{ file: 'romanp.hmp',	name: 'Roman Plain'				},
		{ file: 'romans.hmp',	name: 'Roman Simplex'			},	// Font 3, Simplex Roman (default)
		{ file: 'romant.hmp',	name: 'Roman Triplex'			}	// Font 17, Triplex Roman
	// Font 9, Math and Special
	// Font 20, Miscellaneous
	];

	document.getElementById('groups').innerHTML = '';

	// All button
	const button = document.createElement('a');
	button.href = '#';
	button.innerHTML = 'All';
	button.addEventListener('click', function(e) {
		e.preventDefault();
		render();
	});
	const li = document.createElement('li');
	li.appendChild(button);
	document.getElementById('groups').appendChild(li);

	// Group buttons
	for (const group of groups) {
		const button = document.createElement('a');
		button.href = '#';
		button.innerHTML = group.name;
		button.addEventListener('click', function(e) {
			e.preventDefault();
			render(group.file);
		});
		const li = document.createElement('li');
		li.appendChild(button);
		document.getElementById('groups').appendChild(li);
	}

	render();
}

document.getElementById('usenet').addEventListener('click', showOldGroups);

document.getElementById('occsv').addEventListener('click', function() {
	showCsv('Occidental');
	// showCsv(['Occidental', 'Additional']);
});
document.getElementById('orcsv').addEventListener('click', function() {
	showCsv('Oriental');
});
