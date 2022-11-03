// should use animation frame

function thumbnail(glp) {
	let width = glp.right - glp.left;

	// I don't think browser knows what to do with 0
	// cause it was blank in thumbnail, even with overflow visible and working in details
	if(width === 0) { width = 1; }

	const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
	svg.setAttribute('viewBox', glp.left + ' -25 ' + width + ' 50');
	svg.style.setProperty('height', '50px');
	svg.style.setProperty('width', width + 'px');
	const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
	path.setAttribute('d', glp.path);
	svg.appendChild(path);

	svg.dataset.id = glp.id;


	const wrap = document.createElement('div');
	wrap.appendChild(svg);

	wrap.addEventListener('click', function () {
		details(glp);
	});


	document.getElementById('output').appendChild(wrap);
}

function details(glp) {
	const element = document.getElementById('details');
	element.querySelector('text').innerHTML = glp.id;
	element.querySelector('path').setAttribute('d', glp.path);
}

export { thumbnail };
