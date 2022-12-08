var combinedStream = require('combined-stream');
var logger = require('pelias-logger').get('openstreetmap');
const request = require('request');

function createCombinedStream(){
  var fullStream = combinedStream.create();
  var defaultPath= require('pelias-config').generate().imports['openstreetmap-venues'];

  defaultPath.download.forEach(function( importObject){
    fullStream.append(function(next){
      logger.info('Creating read stream for osm venues');
      next(request({url: importObject.sourceURL}));
    });
  });

  return fullStream;
}

module.exports.create = createCombinedStream;
