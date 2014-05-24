var CsvCreate = require('../../actions/csv_create'),
    settings  = require('../../lib/settings'),
    fs        = require('fs'),
    Sequelize = require('sequelize');

// TODO: this really should test tables reflect actual desired look

describe('csv_create', function () {
  var sequelize = new Sequelize(settings.sql.dbname, settings.sql.username, settings.sql.password, {
      dialect: 'postgres',
      host: settings.sql.host,
      port: settings.sql.port
    }),
    One,
    Two;

  beforeEach(function () {
    One = sequelize.define('one', {
      first: Sequelize.STRING
      }, {
        timestamps: false 
      });
    Two = sequelize.define('two', {
        id: Sequelize.STRING(32),
        first: Sequelize.STRING
      }, {
        timestamps: false 
      });
    data = fs.createReadStream(__dirname + '/../fixtures/csv_create_in.csv');
  });

  xit('should create a table', function (done) {
    var csvCreate = new CsvCreate({table: 'one'});
    csvCreate.execute(data, function () {
      One.findAll({ where: {first: 'hello'}})
        .success(function (ones) {
          expect(ones.length).toEqual(2);
          done();
        })
        .error(function (err) {
          expect("Never here").toEqual(undefined);
          done();
        });
    });
  });

  xit('should create two tables', function (done) {
    var csvCreate = new CsvCreate({table: {
      'one': {
        'first': 'first'
      },
      'two': {
        'id': {
          'composite': [ 'second' ]
        },
        'first': {
          'named': 'second'
        }
      }
    }});
    csvCreate.execute(data, function () {
      One.findAll({ where: {first: 'hello'}})
        .success(function (ones) {
          expect(ones.length).toEqual(2);

          Two.findAll({ where: {first: 'hello'}})
            .success(function (ones) {
              expect(ones.length).toEqual(1);
              done();
            })
            .error(function (err) {
              expect("Never here").toEqual(undefined);
              done();
            });
        })
        .error(function (err) {
          expect("Never here").toEqual(undefined);
          done();
        });
    });
  });

  xit('should replace a table', function (done) {
    One.create({first: 'hello', last: 'world'})
      .success(function () {
        var csvCreate = new CsvCreate({table: 'one'});
        csvCreate.execute(data, function () {
          One.findAll({ where: {first: 'hello'}})
            .success(function (ones) {
              expect(ones.length).toEqual(2);
              done();
            })
            .error(function (err) {
              expect("Never here").toEqual(undefined);
              done();
            });
        });
      });
  });
});
