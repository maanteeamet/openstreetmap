
/**
  The document constructor is responsible for mapping input data from the parser
  in to model.Document() objects which the rest of the pipeline expect to consume.
**/

const through = require('through2');
const Document = require('pelias-model').Document;
const peliasLogger = require( 'pelias-logger' ).get( 'openstreetmap' );
const _ = require('lodash');
const request = require('requestretry');
const transformation = require('transform-coordinates');

module.exports = function(){

  var stream = through.obj( function( item, enc, next ) {

    try {
      if (!item.type || ! item.id) {
        throw new Error('doc without valid id or type');
      }
      if (!item.tags.name) {
        throw new Error('venue without a name');
      }

      const transformForReverseGeocoding = transformation('EPSG:4326', 'EPSG:3301');
      const reverseCoordinates = transformForReverseGeocoding.forward(
        {x: parseFloat(item.lon), y: parseFloat(item.lat)}
      );

      let county, localadmin, locality = '';

      request(`https://inaadress.maaamet.ee/inaadress/gazetteer?x=${reverseCoordinates.x}&y=${reverseCoordinates.y}`,
        {headers: {'Content-Type': 'application/json'}}
      )
        .then((data) => {
          const aadress = JSON.parse(data.body).addresses[0].taisaadress;
          const admin_parts = aadress.split(',');//0-county, 1-localadmin, 2-locality
          const admin_parts_length = admin_parts.length - 1;
        if (admin_parts_length >= 3) {
          county = admin_parts[0];
          localadmin = admin_parts[1];
          locality = admin_parts[2];
        } else {
          county = admin_parts[0];
          locality = admin_parts[1];
        }
      });

      var uniqueId = [ item.type, item.id ].join('/');

      // we need to assume it will be a venue and later if it turns out to be an address it will get changed
      var doc = new Document( 'openstreetmap/overpass', 'venue', uniqueId );

      // Set latitude / longitude
      if( item.hasOwnProperty('lat') && item.hasOwnProperty('lon') ){
        doc.setCentroid({
          lat: item.lat,
          lon: item.lon
        });
      }

      // Set latitude / longitude (for ways where the centroid has been precomputed)
      else if( item.hasOwnProperty('centroid') ){
        if( item.centroid.hasOwnProperty('lat') && item.centroid.hasOwnProperty('lon') ){
          doc.setCentroid({
            lat: item.centroid.lat,
            lon: item.centroid.lon
          });
        }
      }

      // set bounding box
      if( _.isPlainObject(item.bounds) ){
        doc.setBoundingBox({
          upperLeft: {
            lat: parseFloat(item.bounds.n),
            lon: parseFloat(item.bounds.w)
          },
          lowerRight: {
            lat: parseFloat(item.bounds.s),
            lon: parseFloat(item.bounds.e)
          }
        });
      }

      if (county && county.length > 0) {
        doc.addParent('county', county, 'c:' + item.id);
      }
      if (localadmin && localadmin.length > 0) {
        doc.addParent('localadmin', localadmin, 'la:' + item.id);
      }
      if (locality && locality.length > 0) {
        doc.addParent('locality', locality, 'l:' + item.id);
      }

      // Store osm tags as a property inside _meta
      doc.setMeta( 'tags', item.tags || {} );

      // Push instance of Document downstream
      this.push( doc );
    }

    catch( e ){
      peliasLogger.error( 'error constructing document model', e.stack );
    }

    return next();

  });

  // catch stream errors
  stream.on( 'error', peliasLogger.error.bind( peliasLogger, __filename ) );

  return stream;
};
