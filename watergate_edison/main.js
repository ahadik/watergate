var mraa = require('mraa'); //require mraa
var groveSensor = require('jsupm_grove');
var sleep = require('sleep');
var doubleTriggerError = require('./errors/doubleTrigger');

//var myOnboardLed = new mraa.Gpio(3, false, true); //LED hooked up to digital pin (or built in pin on Galileo Gen1)
var ledAPin = new mraa.Gpio(3); //LED hooked up to digital pin 13 (or built in pin on Intel Galileo Gen2 as well as Intel Edison)
var ledBPin = new mraa.Gpio(4);
var readAPin = new groveSensor.GroveLight(0);
var readBPin = new groveSensor.GroveLight(1);
ledAPin.dir(mraa.DIR_OUT); //set the gpio direction to output

var height = 0;
var speed = 0;
var increment = 1.45;

var sumArray = function(prevVal, currVal, currI, array){
	return prevVal + currVal;
}

/*
INPUT:
	aLED: Gpio pin for A LED
	bLED: Gpio pin for B LED
	aRead: Sensor object for Sensor A
	BRead: Sensor object for Sensor B
ACTION:
	Take reading of both sensors over 10 second period and calculate average to determine the baseline reading for each sensor
OUTPUT:
	Object with aAvg and bAvg attributes, each the average reading of the two sensors over 10 seconds
*/
function calibrate(){
	ledAPin.write(0);
	ledBPin.write(0);
	var aSet = [];
	var bSet = [];
	for (var i = 0; i<20; i++){
		aSet.push(readAPin.raw_value());
		bSet.push(readBPin.raw_value());
		sleep.usleep(500000);
	}
	var aAvg = aSet.reduce(sumArray)/aSet.length;
	var bAvg = bSet.reduce(sumArray)/bSet.length;
	return {aAvg : aAvg, bAvg : bAvg};
}

/*
INPUT:
	level: reading from a given sensor
	avg: the average reading from the sensor during calibration
OUTPUT:
	true: the sensor is sufficiently triggered
	false: the sensor is not sufficiently triggered
*/
function sensorTest(level, avg){
	if (level > avg+50){
		return true;
	}
	return false;
}

/*
INPUT:
	lastTriggerTime: the time at which the trolley last cleared a slit
OUTPUT:
	the speed at which the trolley traveled between slits in centimeters per second
*/
function calcSpeed(lastTriggerTime){
	return increment/(currTime-lastTriggerTime)*1000;
}

/*
INPUT:
	pair: a two element array containing the last two sensors tripped (0 == Sensor A, 1 == Sensor B)
OUTPUT:
	null: the trolley is traveling neither up nor down
	0: the trolley is traveling down
	1: the trolley is traveling up
*/
function analyzeTriggerPair(pair){
	try{
		//if the entries are equal, we don't know if the trolley is traveling up or down
		if (pair[0] == pair[1]){
			return null;
		//if Sensor A was triggered, and then Sensor B, the trolley is traveling up
		}else if ((pair[0]==0) && (pair[1]==1)){
			return 1;
		//if Sensor B was triggered, and then Sensor A, the trolley is traveling down
		}else if ((pair[0]==1) && (pair[1]==0)){
			return 0;
		//if none of these cases apply, invalid values were provided
		}else{
			throw new invalidPairError('Trigger Pair contains values ['+pair[0]+','+pair[1]+']. Valid pair values are 0 and 1.', 0);
		}
	}catch(err){
		console.log(err.stack);
		console.log(err.message);
	}
}

/*
INPUT:
	sensorTriggered: 0 if Sensor A was triggered, 1 if Sensor B was triggered
	triggerPair: a two element array containing the last two sensors tripped (0 == Sensor A, 1 == Sensor B)
	dir: 1 == up, 0 == down
OUTPUT:
	pair: the updated triggerPair
	flowDir: the direction of the trolley based on the analysis of this trigger
*/
function analyzeTrigger(sensorTriggered, triggerPair, lastTriggerTime){
	var dir = null;
	//if the first value of the pair is null, this is the first entry for this pair
	if (triggerPair[0] == null){
		triggerPair[0] = sensorTriggered;
		speed = calcSpeed(lastTriggerTime);
		lastTriggerTime = null;
	//if the first value is not null and the second value is, this is the second entry for this pair
	}else if (triggerPair[1] == null){
		triggerPair[1] = sensorTriggered;
		lastTriggerTime = new Date().getTime();
		dir = analyzeTriggerPair();
		triggerPair = [null, null];
	//if neither value is null, something bad has happened
	}else{
		throw new invalidPairError('Both values of the pair have been filled, but not reset.', 0);
	}
	return {pair : triggerPair, flowDir : dir, triggerTime : lastTriggerTime};
}

var calibration = calibrate();
track(calibration.aAvg, calibration.bAvg, readAPin, readBPin);

function track(aAvg, bAvg, aRead, bRead){
	ledAPin.write(1);
	ledBPin.write(1);
	var aFlag = false;
	var bFlag = false;
	var dir = 1; //1 == up, 0 == down
	var time = new Date().getTime();
	var lastTriggerTime = 0;
	var prevTrigger = null; //0 for A, 1 for B
	var currState = 0; //0 == in-between, 1 == A, 2 == B
	var triggerPair = [null, null];

	while (true){
		var aLevel = aRead.raw_value();
		var bLevel = bRead.raw_value();

		try{
			//read in values of A and B sensors
			var aTrigger = sensorTest(aLevel, aAvg);
			var bTrigger = sensorTest(bLevel, bAvg);
			//if both sensors have been tripped, throw an error to improve calibration
			if (aTrigger && bTrigger){
				throw new doubleTriggerError('Both sensors triggered simultaneously.\nSensor A Avg: '+aAvg+'\nSensor B Avg: '+bAvg+'\nSensor A Reading: '+aLevel+'\nSensor B Reading: '+bLevel, 0);
			//if Sensor A has been triggered
			}else if (aTrigger){
				//and if the current state isn't Sensor A
				if (currState!=1){
					//Analyze the trigger
					var triggerAnalysis = analyzeTrigger(0, triggerPair, lastTriggerTime);
					//the trigger analysis returns an updated trigger pair which will reveal the state of the system
					triggerPair = triggerAnalysis.pair;
					if (triggerPair.triggerTime != null){
						lastTriggerTime = triggerPair.triggerTime;
					}
					//the trigger analysis might return a direction, which if it does, should be used to update the direction
					if (triggerAnalysis.flowDir != null){
						dir = triggerAnalysis.flowDir;
					}
				}
				//set the current state to 1, indicating Sensor A is currently activated
				currState = 1;
			}else if (bTrigger){
				if (currState!=2){
					var triggerAnalysis = analyzeTrigger(1);
					triggerPair = triggerAnalysis.pair;
					if (triggerAnalysis.flowDir != null){
						dir = triggerAnalysis.flowDir;
					}
				}
				currState = 2;
			}else{
				//if neither A nor B were triggered, the current state is null
				currState = 0;
			}
		}catch(err){
			console.log(err.stack);
			console.log(err.message);
		}
		if (currState != 0){
			if (dir == 1){
				height+=increment;
			}else if(dir == 0){
				height-=increment;
			}
			process.stdout.clearLine();
			process.stdout.cursorTo(0);
			process.stdout.write(height);
		}
	}
}