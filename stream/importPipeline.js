var categoryDefaults = require('../config/category_map');

var streams = {};

streams.config = {
  categoryDefaults: categoryDefaults
};

const es = require('event-stream');
const JSONStream = require('JSONStream');

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

// default import pipeline
streams.import = function(){
  streams.pbfParser()
    .pipe(JSONStream.parse('elements.*'))
    .pipe(es.mapSync(function (data) {
      return data;
    }))
    .pipe( streams.docConstructor() )
    .pipe( streams.tagMapper() )
    .pipe( streams.dbMapper() )
    .pipe( streams.elasticsearch({name: 'openstreetmap'}) );
};

module.exports = streams;
