'use strict'

const DEBUG = true                      // turn on console logging
const FREQ = 1                          // Hz
const MQTT_TOPIC = "/flight/data"       // topic on to which to publish

// -------------------------- DO NOT EDIT BELOW THIS LINE --------------------------

var memwatch = require('memwatch-next');
var mosca = require('mosca');
var fs = require('fs');
var stream = require('stream');
var lineByLine = require('n-readlines');
var countLinesInFile = require('./lib/countLinesInFile')

var dataFilename = "/home/nvidia/projects/simDataProducer/data.csv"
var instream = fs.createReadStream(dataFilename);
var numberOfLines = 0 ;
var INTERVAL = 1000/FREQ                // ms

memwatch.on('leak', (info) => {
    console.error('memory leak detected:\n', info);
});

var settings = {
    port: 1883,
    backend: {
        pubsubCollection: 'ascoltatori',
        redis: {}
    },
    http: {
	port: 1884,
	bundle: true,
	static: './'
    }
}

var publishClientID = 'IoT_GGD'; // ID of treadstone client
var liner = new lineByLine(dataFilename);
var lineNumber = 0;

var server = new mosca.Server(settings);

server.on('clientConnected', clientConnected);

server.on('ready', setup);

server.on('published', function(packet, client) {
//   console.log('Published', packet.topic);
});

// fired when the mqtt server is ready
function setup() {
  if (DEBUG) {
      console.log('Mosca server is up and running');
      console.log(`Publish rate: ${FREQ} Hz`)
  }

  countLinesInFile(dataFilename, (err, numLines) => {
      if (!err) {
	  numberOfLines = numLines
      }
  });
}

server.on('clientDisconnected', function(client) {
    if (DEBUG) {
        console.log('client disconnected:', client.id);
    }

    global.gc();
}); 

function clientConnected(client) {
    // only start the publish timer if the client is treadstone
    if (client.id.trim().startsWith(publishClientID.trim())) {
	console.log('TS client connected');
	console.log('starting interval publishing');
    }
    else {
	if (DEBUG) {
	    //console.log('non TS client connected');
	}
	return;
    }
    
    var interval = setInterval(function() {
        var line = liner.next();  
        var jsonLine = JSON.parse(line).data

	line = null;
	
        var message = {
            topic: MQTT_TOPIC,
            payload : JSON.stringify(jsonLine),
            qos: 0, // 0, 1, or 2
            retain: false // or true
        };

        server.publish(message, function() {
	    console.log("published");
	    message = null;
	    jsonLine = null;
        });

        if ((numberOfLines - lineNumber) > 0) {
            lineNumber++;
        }
	else {
            lineNumber = 0;
	    liner = null;

	    if (DEBUG) {
		console.log("reloading data");
	    }
	    
	    liner = new lineByLine(dataFilename);
        }
    }.bind(this), INTERVAL)
}




