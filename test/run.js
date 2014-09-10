
var tape = require('tape');
var common = {};

var tests = [
  require('./util/centroidCodec'),
  require('./stream/osm/any/buildHierachy'),
  require('./stream/node_filter'),
  require('./stream/way_filter'),
  require('./stream/address_extractor'),
  require('./stream/stats'),
  require('./stream/osm_types')
];

tests.map(function(t) {
  t.all(tape, common);
});