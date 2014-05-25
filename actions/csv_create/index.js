var settings = require('../../lib/settings'),
    TableDiscovery = require('../../lib/sources/tableDiscovery'),
    TableMultiplexer = require('../../lib/sources/tableMultiplexer'),
    Q = require('q'),
    Sequelize = require('sequelize'),
    split = require('split'),
    through = require('through'),
    csv = require('csvrow'),
    bloomDB = require('../../lib/bloomDB');

module.exports = function (config) {
  this.table = config.table;
};

module.exports.prototype = {
  execute: function (data, callback) {
    var inputStream, tableDiscovery, inputSchema, sequelize, schema;

    sequelize = new Sequelize(settings.sql.dbname, settings.sql.username, settings.sql.password, {
      dialect: 'postgres',
      host: settings.sql.host,
      port: settings.sql.port
    });
  
    // build input csv stream
    inputStream = data
      .pipe(split())
      .pipe(through(function (data) {
        if (!data) return this.queue(null);
        this.queue(csv.parse(data)); 
      }));

    // setup specified schema
    if (this.table) {
      if (typeof this.table === 'string' || this.table instanceof String) {
        inputSchema = {};
        inputSchema[this.table] = null;
      } else {
        inputSchema = this.table;
      }
    }
    
    // discover sequelize schema
    tableDiscovery = new TableDiscovery(inputSchema, inputStream);
    Q.ninvoke(tableDiscovery, "schema")
      .then(function (discoveredSchema) {
        schema = discoveredSchema;
        // create tables
        var promises = Object.keys(schema).map(function (table) {
          var deferred = Q.defer(),
              tableSchema = bloomDB.schemaToSequelize(schema[table]),
              model = sequelize.define(table, tableSchema),
              p = model.sync().complete(function (err) {
                if (err) return deferred.reject(new Error(err));
                deferred.resolve(); 
              });
          return deferred.promise
        });

        return Q.all(promises);
      })
      .then(function () {
        // copy data to tables
        var tableMultiplexer = new TableMultiplexer(schema),
            tables = Object.keys(schema);

        promises = tables.map(function (tableName) {
          var deferred = Q.defer(),
              source = tableMultiplexer.fetchPipe(tableName),
              dest = bloomDB.copyTo(tableName);

          source.pipe(dest)
            .on('finish', function () {
              promise.resolve(); 
            })
            .on('error', function (err) {
              promise.reject(new Error(err)); 
            });
          
          return deferred.promise;
        });

        tableMultiplexer.execute(inputStream);

        return Q.all(promises);
      })
      .then(function () {
        callback(null, null); 
      })
      .fail(function (err) {
        callback(new Error(err), null);
      });
  }
};
