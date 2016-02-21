/* global __dirname */
var express = require("express"),
    app = express(),
    mongoose = require('mongoose');

/**SET MongoDB URL**/
var mURL = "";
if (process.env.ENVIRONMENT == "dev") {
    mURL = 'mongodb://' + process.env.MONGO_USERNAME + ':' + process.env.MONGO_PASS + '@aws-us-east-1-portal.10.dblayer.com:10576/watergatedb-dev';
} else {
    mURL = 'mongodb://' + process.env.MONGO_USERNAME + ':' + process.env.MONGO_PASS + '@aws-us-east-1-portal.10.dblayer.com:10576,aws-us-east-1-portal.11.dblayer.com:27055/watergatedb';
}
mongoose.connect(mURL);
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'Mongodb connection error:'));
db.once('open', function() {
    console.log('connected to mongodb');
});

/**DEFINE SCHEMA**/
//pole object
var poleSchema = mongoose.Schema({
    name: String, //not sure necessary, but names yay
    deviceID: String, //human made unique device id
    lat: {
        type: Number,
        default: 0
    }, //latitude
    long: {
        type: Number,
        default: 0
    } //longitude
});
var Pole = mongoose.model('Pole', poleSchema);

//schema for measurements
var measurementSchema = mongoose.Schema({
    deviceID: String, //human made unqiue device ID (stored on device)
    measurements: [{
        waterLevel: {
            type: Number,
            default: -1
        }, //water level in CM
        clarity: {
            type: Number,
            default: -1
        }, //Clarity level in Turbidity?
        timestamp: {
            type: Date,
            default: Date.now
        }
    }]
});
var Measurement = mongoose.model('Measurement', measurementSchema);


/**API CALLS**/

//register a Pole
app.post("/register_pole", function(req, res) {
    console.log('registering pole');
    //Need to confirm that req is formatted properly-------
    //Create a new pole object with passed in info
    var pole = new Pole({
        name: req.name,
        deviceID: req.deviceID,
        lat: req.lat,
        long: req.long
    });

    //Save the new pole
    pole.save(function(err, pole) {
        if (err) return console.error(err);
        console.log("pole saved", pole.toString());
    });
    // .then(function(product) {
    //   console.log("product", product.toString());
    // });

});

//Update a poles measurements
//use deviceID to find and update various measurements
app.post("/post_measurement", function(req, res) {
    console.log('starting update');
    //Should find a single document of measurements based on given deviceID
    Measurement.findOne({
        deviceID: req.deviceID
    }, function(err, m) {
        if (err) return console.error(err);
        if (typeof m === 'undefined') { //if no device found with that ID create a new one
            var measurement = new Measurement({
                deviceID: req.deviceID, //human made unqiue device ID (stored on device)
                measurements: [{
                    waterLevel: req.waterLevel
                }]
            });
        } else { //if m is found just update waterlevel
            console.log(m);

            //Add new water level measurement (and clarity if we have it)
            m.measurements.push({
                waterLevel: req.waterLevel
                //Should auto dateTime
            });

            //save the measurement to the server
            m.save(function(err, m) {
                if (err) return console.error(err);
                console.log('updated', m);
            });
        }
    });
});

// get from DB
// Pole.find(function (err, poles) {
//   if (err) return console.error(err);
//   for (var i = 0; i < poles.length; i++) {
//     console.log(poles[i].name);
//   }
// });

// app.post("/measurements", function(req, res) {
//     console.log(req);
//     var measurement = new Measurement({
//
//     });
// });

app.listen(8080, function() {
    console.info('Server listening on port ' + this.address().port);
});
