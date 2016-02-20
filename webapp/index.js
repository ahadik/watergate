/* global __dirname */
var express = require("express"),
    app = express(),
    mongoose = require('mongoose');

var mURL = "";
//if dev
if (process.env.ENVIRONMENT == "dev") {
  mURL = 'mongodb://' + process.env.MONGO_USERNAME + ':' + process.env.MONG_PASS + '@aws-us-east-1-portal.10.dblayer.com:10576/watergatedb-dev';
}
mongoose.connect(mURL);
var db = mongoose.connection; //db = mongoose connection
db.on('error', console.error.bind(console, 'Mongodb connection error:'));
db.once('open', function() {
  console.log('connected');
});

app.get("/", function (req, res) {
	res.send("hey"); //Send back html file
});

// app.listen(8000, function () {
// 	console.info('Server listening on port ' + this.address().port);
// });
