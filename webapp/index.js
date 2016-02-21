/* global __dirname */
var express = require("express"),
    app = express(),
    http = require('http').Server(app),
    io = require('socket.io')(http),
    // http = require('http'),
    // server = http.createServer(app),
    // io = require('socket.io').listen(server),
    mongoose = require('mongoose'),
    path = require('path'),
    hbs = require("hbs");


app.use(express.static(path.join(__dirname, 'public'))); //Set root to public
app.set("view engine", "html");
app.engine("html", hbs.__express); //set view engine to handlebars

/**SET MongoDB URL**/
var mURL = "";
if (process.env.ENVIRONMENT == "dev") {
    console.log("Dev Env");
    mURL = 'mongodb://' + process.env.MONGO_USERNAME + ':' + process.env.MONGO_PASS + '@aws-us-east-1-portal.10.dblayer.com:10576/watergatedb-dev';
} else { //production
    mURL = 'mongodb://' + process.env.MONGO_USERNAME + ':' + process.env.MONGO_PASS + '@aws-us-east-1-portal.10.dblayer.com:10576,aws-us-east-1-portal.11.dblayer.com:27055/watergatedb';
}
/**CONNECT TO MONGO DB**/
mongoose.connect(mURL, function (err) {
    if (err) console.log(err);
});
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'Mongodb connection error:'));
db.once('open', function() {
    console.log('connected to mongodb');
});




/**DEFINE SCHEMA**/
//pole object
var poleSchema = mongoose.Schema({
    //name: String, //not sure necessary, but names yay
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

app.get("/measurements", function (req, res) {
    console.log("getting measurements");
    //res.sendFile(path.join(__dirname, "public", "index.html")); //Send back html file
    var data;
    Pole.find(function (err, measurements) {
        if (err) return console.error(err);
        console.log(measurements);
        data = measurements;
    });
    res.render(path.join(__dirname, "public", "index.html"), {test: JSON.stringify(data)}); //Handlebars stuff

});

//register a Pole
app.post("/register_pole", function(req, res) {
    console.log('registering pole', req.query.name);
    //Create a new pole object with passed in info
    var pole = new Pole({
        // name: req.query.name,
        deviceID: req.query.deviceID,
        // lat: req.query.lat,
        // long: req.query.long
        //name: "name", //req.query.name,
        // deviceID: "blarg", //req.query.deviceID,
        lat: 1, //req.query.lat,
        long: 2 //req.query.long
    });
    console.log(pole.toString());
    //Save the new pole
    pole.save(function(err, pole) {
        if (err) return console.error(err);
        console.log("pole saved", pole.toString());
    });

    // .then(function(product) {
    //   console.log("product", product.toString());
    // });

    res.send("registered");

});


//Update a poles measurements
//use deviceID to find and update various measurements
app.post("/post_measurement", function(req, res) {
    console.log('starting update');
    //Should find a single document of measurements based on given deviceID
    Measurement.findOne({
        deviceID: req.query.deviceID
    }, function(err, m) {
        if (err) return console.error(err);
        if (typeof m === 'undefined') { //if no device found with that ID create a new one
            m = new Measurement({
                deviceID: req.query.deviceID, //human made unqiue device ID (stored on device)
                measurements: [{
                    waterLevel: req.query.waterLevel
                }]
            });

        } else { //if m is found just update waterlevel
            console.log(m);

            //Add new water level measurement (and clarity if we have it)
            m.measurements.push({
                waterLevel: req.query.waterLevel
                    //Should auto dateTime
            });
        }
        //save updated m
        m.save(function(err, m) {
            if (err) return console.error(err);
            console.log('updated', m);
        }).then(function (product) {
            console.log("product", product.toString());
            emitData(product);
        });
    });
});

function emitData (data) {
    io.emit('data', JSON.stringify(data));
}

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

io.on('connection', function(socket){
    console.log('a user connected');
    //on connection begin emiting data

    // socket.on('test', function(msg){ //receive things
    //     console.log(msg);
    //     io.emit('test', "resturnignding"); //emit things
    // });
});


http.listen(8080, function() {
    console.info('Server listening on port ' + this.address().port);
});
