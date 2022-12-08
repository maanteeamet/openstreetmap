/**
 The document constructor is responsible for mapping input data from the parser
 in to model.Document() objects which the rest of the pipeline expect to consume.
 **/

const through = require('through2');
const Document = require('pelias-model').Document;
const peliasLogger = require('pelias-logger').get('openstreetmap');
const _ = require('lodash');
const got = require('got');
const transformation = require('transform-coordinates');

module.exports = function () {

  var stream = through.obj(async function (item, enc, next) {

    try {
      if (!item.type || !item.id) {
        throw new Error('doc without valid id or type');
      }
      if (!item.lat || !item.lon) {
        throw new Error('venue without coordinates');
      }
      if (!item.tags.name) {
        throw new Error('venue without a name');
      }

      const transformForReverseGeocoding = transformation('EPSG:4326', 'EPSG:3301');
      const estCoordinates = transformForReverseGeocoding.forward(
        {x: parseFloat(item.lon), y: parseFloat(item.lat)}
      );

      let county, localadmin, locality = '';

      var uniqueId = [item.type, item.id].join('/');

      // we need to assume it will be a venue and later if it turns out to be an address it will get changed
      var doc = new Document('openstreetmap', 'venue', uniqueId);
      doc.setName('default', item.tags.name);
      doc.setCentroid({lon: item.lon, lat: item.lat});

      const addressResponse = await got(
        `https://inaadress.maaamet.ee/inaadress/gazetteer?x=${estCoordinates.x}&y=${estCoordinates.y}`
      );
      const admin_parts = JSON.parse(addressResponse.body).addresses[0].taisaadress.split(',');//0-county, 1-localadmin, 2-locality
      const admin_parts_length = admin_parts.length - 1;
      if (admin_parts_length >= 3) {
        county = admin_parts[0].trim();
        localadmin = admin_parts[1].trim();
        locality = admin_parts[2].trim();
      } else {
        county = admin_parts[0].trim();
        locality = admin_parts[1].trim();
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
      // console.log(doc);
      this.push(doc);
    } catch (e) {
      peliasLogger.error('error constructing document model', e.stack);
    }

    return next();

  });

  // catch stream errors
  stream.on('error', peliasLogger.error.bind(peliasLogger, __filename));

  return stream;
};
