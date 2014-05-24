var Sequelize = require('sequelize'),
    settings = require('./settings'),
    pg = require('pg'),
    through = require('through'),
    csvrow = require('csvrow');

var connectionString = "postgres://" + settings.sql.username + ":" +
  settings.sql.password + "@" + settings.sql.host + ":" + settings.sql.port +
  "/" + settings.sql.dbname;

var bloomDB = module.exports = function () {
};

bloomDB.schemaToSequelize = function (inputSchema) {
  var model = {},
      key;

  Object.keys(inputSchema).forEach(function (key) {
    model[key] = {};
  });

  for (key in inputSchema) {
    var elm = inputSchema[key];

    if (typeof elm.composite !== 'undefined') {
      model[key] = Sequelize.STRING(32);
    } else {
      var parts = elm.type.split('/');
      if (parts.length === 1) {
        model[key] = Sequelize[elm.type.toUpperCase()]; 
      } else if (parts.length === 2) {
        model[key] = Sequelize[parts[0].toUpperCase()](parseInt(parts[1])); 
      } else {
        throw new Error("Invalid schema type:" + elm.type.toString());
      }
    }
  }

  return model;
};

bloomDB.safeName = function (nonSafeName) {
  nonSafeName = nonSafeName.replace(/\s|\(|\)|\./g, '_');
  nonSafeName = nonSafeName.replace(/_+/g, '_');
  nonSafeName = nonSafeName.replace(/^_+/g, '');
  nonSafeName = nonSafeName.replace(/_+$/g, '');
  return nonSafeName.toLowerCase();
};

bloomDB.safeNames = function (nonSafeNames) {
  var safeName = this.safeName;
  return nonSafeNames.map(function (name) { return safeName(name); });
};

bloomDB.prototype = {
  insert: function (table, columns, dataPipe, callback) {
    var query = 'TRUNCATE ' + table + '; ' + 'COPY ' + table + '(' + columns.join(',') + ') FROM STDIN WITH CSV;';

    pg.connect(connectionString, function (err, client, done) {
      var copyFrom
      
      if (err) return callback(new Error(err));
      
      copyFrom = client.copyFrom(query);

      dataPipe.pipe(through(function (data) {
        this.queue(csvrow.stringify(data) + '\n');
      })).pipe(copyFrom)
        .on('error', function (err) {
          done();
          callback(new Error(err));
        })
        .on('close', function () {
          done();
          callback(); 
        });
    });
  },

  upsert: function (table, columns, dataPipe, callback) {
    callback();
  }
};
