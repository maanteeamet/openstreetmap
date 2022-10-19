var categoryDefaults = require('../config/category_map');

var streams = {};

streams.config = {
  categoryDefaults: categoryDefaults
};

const request = require('request');
const es = require('event-stream');
const JSONStream = require('JSONStream');
const parameters = require('pelias-config').generate().imports['openstreetmap-venues'];

streams.pbfParser = require('./multiple_pbfs').create;
streams.docConstructor = require('./document_constructor');
streams.blacklistStream = require('pelias-blacklist-stream');
streams.tagMapper = require('./tag_mapper');
streams.adminLookup = require('pelias-wof-admin-lookup').create;
streams.addressExtractor = require('./address_extractor');
streams.categoryMapper = require('./category_mapper');
streams.addendumMapper = require('./addendum_mapper');
streams.popularityMapper = require('./popularity_mapper');
streams.dbMapper = require('pelias-model').createDocumentMapperStream;
streams.elasticsearch = require('pelias-dbclient');

console.log(parameters.download[0].sourceURL);

// default import pipeline
streams.import = function(){
  request({url: parameters.download[0].sourceURL})
    .pipe(JSONStream.parse('elements.*'))
    .pipe(es.mapSync(function (data) {
      console.log(data.length);
      console.log(data.size);
      return data;
    }))
    .pipe( streams.docConstructor() )
    .pipe( streams.tagMapper() )
    //.pipe( streams.addressExtractor() )
    //.pipe( streams.blacklistStream() )
    //.pipe( streams.categoryMapper( categoryDefaults ) )
    //.pipe( streams.addendumMapper() )
    //.pipe( streams.popularityMapper() )
    //.pipe( streams.adminLookup() )
    .pipe( streams.dbMapper() )
    .pipe( streams.elasticsearch({name: 'openstreetmap'}) );
};

module.exports = streams;
