# hershey-font-repertory

## To run the explorer

The explorer is a web interface for viewing the glyphs.  It can parse data from
the original usenet files in `sources/extracted/hershey/` or from the CSV files
in `data/`.  The CSV files contain additional metadata, which is still in the
process of being compiled.

You will need [Node](https://nodejs.org/) installed as a prerequisite.

From a command line in this directory, run `npm install` the first time.

Then run `node express.js` to start the server.

Point your web browser to `http://localhost:3000/` to view it.

Hit `Ctrl`+`C` to stop the server.

## Glyph editor

You can use the same steps as above, but go to `http://localhost:3000/editor.html` for
a glyph editor. You will have to manually copy and paste individual paths into and out
of the editor.

## NWL report recreation

You can use the same steps as above, but go to `http://localhost:3000/pages.html` for
a page that generates SVG's of the Appendix B and C report pages.

The file `NWL Occidental Paths.csv` surely has some differences from the actual report.

Some are small things, like bearings spaced farther out, or tails of letters too short,
others are bigger, like Simplex Script was completely different. Reviewed up to Indexical,
which has differences too, some of those were only adjusted by eye.

Probably needs a full audit, takes a lot of effort to properly crop individual images
from the report, adjust perspective in GIMP, and use as editor background image to verify
they are exactly right, edit and paste into CSV.
