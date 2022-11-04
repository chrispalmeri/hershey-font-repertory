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
