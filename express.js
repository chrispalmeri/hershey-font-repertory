const express = require('express');
const app = express();
const port = 3000;

app.use(express.static('explorer'));
app.use('/data', express.static('data'));
app.use('/data', express.static('sources/extracted/hershey'));

app.listen(port, () => {
	console.log(`Listening on port ${port}`);
});
