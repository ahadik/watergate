/* global __dirname */
var express = require("express"),
    app = express(),
    mongoose = require('mongoose');

var mURL = "";
//if dev
if (process.env.ENVIRONMENT == "dev") {
  mURL = 'mongodb://' + process.env.MONGO_USERNAME + ':' + process.env.MONG_PASS + '@aws-us-east-1-portal.10.dblayer.com:10576/watergatedb-dev';
} else {
  mURL = 'mongodb://' + process.env.MONGO_USERNAME + ':' + process.env.MONG_PASS + '@aws-us-east-1-portal.10.dblayer.com:10576,aws-us-east-1-portal.11.dblayer.com:27055/watergatedb';
}
mongoose.connect(mURL);
var db = mongoose.connection; //db = mongoose connection
db.on('error', console.error.bind(console, 'Mongodb connection error:'));
db.once('open', function() {
  console.log('connected to mongodb');
});

var poleSchema = mongoose.Schema({
    name: String,
    deviceID: String,
    lat: Number,
    long: Number,
    test: [{
      blah: Number
    }]
});
var Pole = mongoose.model('Pole', poleSchema);

var measurementSchema = mongoose.Schema({
  boardID: Number,
  measurements: [{
    waterLevel: Number,
    clarity: Number,
    timestamp: { type: Date, default: Date.now }
  }]
});
var Measurement = mongoose.model('Measurement', measurementSchema);

var aPoleID;
//register a Pole
//Should not always be a new object, may just change lat and longitude
app.post("/register_pole", function (req, res) {
  console.log(req);
  var pole = new Pole({
    // name: req.name,
    // deviceID: req.deviceID,
    // lat: req.lat,
    // long: req.long,
    name: "blah",
    deviceID: "blah",
    lat: 2,
    long: 4,
    test: [{
      blah: 1
    }]
  });

  pole.save(function (err, pole) {
    if (err) return console.error(err);
    console.log("saved", pole);
  }).then(function(product) {
    console.log("product", product);
    aPoleID = product._id;
  });

  res.send('hey');
  //res.send the generated pole id back?
});

//Find a pole
app.post("/update_pole", function (req, res) {
  Pole.findById(aPoleID, function (err, pole) {
    if (err) return console.error(err);
    console.log(pole);
    pole.test.push({
      blah: 1001
    });

    pole.save(function (err, pole) {
      if (error) return console.error(err);
      console.log(pole);
    });
  });
  res.send('update?');

});

// get from DB
// Pole.find(function (err, poles) {
//   if (err) return console.error(err);
//   for (var i = 0; i < poles.length; i++) {
//     console.log(poles[i].name);
//   }
// });

app.post("/measurements", function (req, res) {
  console.log(req);
  var measurement = new Measurement({

  });
});

app.listen(8080, function () {
	console.info('Server listening on port ' + this.address().port);
});
