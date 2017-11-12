'use strict'

const DEBUG = true                      // turn on console logging
const FREQ = 1                          // Hz
const MQTT_TOPIC = "/flight/data"       // topic on to which to publish


// -------------------------- DO NOT EDIT BELOW THIS LINE --------------------------


var mosca = require('mosca');
var fs = require('fs');
var stream = require('stream');
var lineByLine = require('n-readlines');
var countLinesInFile = require('./lib/countLinesInFile')


var dataFilename = "data.csv"
var instream = fs.createReadStream(dataFilename);
var numberOfLines = 0 ;
var INTERVAL = 1000/FREQ                // ms


var settings = {
    port: 1883,
    backend: {
        pubsubCollection: 'ascoltatori',
        redis: {}
    }
}

var lineCounter = 1;

var server = new mosca.Server(settings);
server.on('clientConnected', clientConnected);

server.on('ready', setup);

server.on('published', function(packet, client) {
//   console.log('Published', packet.topic);
});

// fired when the mqtt server is ready
function setup() {
  if (DEBUG)
    {
        console.log('Mosca server is up and running');
        console.log(`Publish rate: ${FREQ} Hz`)
    }

  countLinesInFile(dataFilename, (err, numLines) => {
   if (!err){
       numberOfLines = numLines
   }
    });
}

server.on('clientDisconnected', function(client) {
    if (DEBUG)
        console.log('Client Disconnected:', client.id);
}); 



function clientConnected(client) {
    if (DEBUG)
        console.log('client connected', client.id);

    var liner = new lineByLine(dataFilename);
    var lineNumber = 0 ;
        
    var interval = setInterval(function(){

        var line = liner.next();  
        var jsonLine = JSON.parse(line).data

        var message = {
            topic: MQTT_TOPIC,
            payload : JSON.stringify(jsonLine),
            qos: 0, // 0, 1, or 2
            retain: false // or true
        }


        server.publish(message, function() {
           
        });

        if (numberOfLines-lineNumber > 0){
            lineNumber++;
        } else {
            lineNumber=0;
            liner = new lineByLine(dataFilename);
        }

        
    }.bind(this),INTERVAL)
}




