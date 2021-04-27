/**
 * Required External Modules
 */

const express = require("express");
const path = require("path");
var cors = require('cors')

/**
 * App Variables
 */

/**
 *  App Configuration
 */

const app = express();
const port = process.env.PORT || "8000";
app.use(cors())
// app.use(express.static(path.join(__dirname, 'dist/tmdb')))

/**
 * Routes Definitions
 */

app.get("/", (req, res) => {
  res.status(200).send("Hello world!");
});

const api = require('./routes');
app.use('/', api);
// app.use('/*', function (req, res) {
//   res.sendFile(path.join(__dirname + '/dist/tmdb/index.html'))
// })

/**
 * Server Activation
 */

app.listen(port, () => {
  console.log(`Listening to requests on http://localhost:${port}`);
});

