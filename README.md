# hershey-font-repertory

> Dr. Allen V. Hershey, a mathematical physicist at the U.S. Naval Weapons
> Laboratory in Dahlgren, Virginia, carried out the digitization (by hand and
> eye) of the characters illustrated in this publication. The successful
> completion of such an ambitious undertaking as this, required a happy mixture
> of art and science - of alphabets and algorithms, of calligraphy and
> computing, and of psychology and printing. . . . He deserves our thanks, and
> that of the readers as well, not only for having developed such a remarkably
> useful and important system but also for the generosity with which he has
> shared the fruits of his labor with others.
>
> &mdash;  Norman M. Wolcott and Joseph Hilsenrath, *A Contribution to Computer
> Typesetting Techniques: Tables of Coordinates for Hershey's Repertory of
> Occidental Type Fonts and Graphic Symbols*, NBS Special Publication 424
> (April 1976) National Bureau of Standards, Washington, D.C.

## To run the explorer

The explorer is a web interface for viewing the glyphs.  It can parse data from
the original usenet files in `sources/extracted/hershey/` or from the CSV files
in `data/`.  The CSV files contain additional metadata, which is still in the
process of being compiled.

 1. You will need [Node](https://nodejs.org/) installed as a prerequisite.
 2. From a command line in this directory, run `npm install` the first time.
 3. Then run `node express.js` to start the server.
 4. Point your web browser to `http://localhost:3000/` to view it.
 5. Hit `Ctrl`+`C` to stop the server.

## Glyph editor

You can use the same steps as above, but go to `http://localhost:3000/editor.html` for
a glyph editor.

## NWL report recreation

You can use the same steps as above, but go to `http://localhost:3000/pages.html` for
a page that generates SVG's of the Appendix B and C report pages.

The file `NWL Occidental Paths.csv` started as a copy of the regular CSV and is
in the process of being audited to accurately match the original report, as
apparently there were quite a few changes over time. Some are small differences,
like bearings spaced farther out, or tails of letters too short, others are
bigger, like Simplex Script was completely different.
