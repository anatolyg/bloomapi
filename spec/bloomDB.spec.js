var BloomDB = require('../lib/bloomDB'),
    Sequelize = require('sequelize'),
    pg = require('pg'),
    settings = require('../lib/settings'),
    through = require('through'),
    split = require('split'),
    csvrow = require('csvrow'),
    fs = require('fs');

describe('BloomDB', function () {
  afterEach(function () {
    pg.end();
  });

  it('converts a schema to a sequelize model', function () {
    var model = BloomDB.schemaToSequelize({
      "id": {
        composite: [
          'hello'
        ]
      },
      "joe": {
        named: "shmo",
        type: "string/50"
      },
      "other": {
        named: /other/,
        type: "string"
      }
    });

    expect(model).toEqual({
      "id": Sequelize.STRING(32),
      "joe": Sequelize.STRING(50),
      "other": Sequelize.STRING
    });
  });

  it('provides a safe name', function () {
    var names = [
      ['Hello World4', 'hello_world4'],
      ['U.S. (Only if things)', 'u_s_only_if_things'],
      ['joe', 'joe'],
      ['HelloWorld', 'helloworld']
    ];

    names.forEach(function (namePair) {
      expect(BloomDB.safeName(namePair[0])).toEqual(namePair[1]);
    });
  });

  it('provides safe names', function () {
    expect(BloomDB.safeNames(['O', 'Q'])).toEqual(['o', 'q']);
  });

  describe('bloomDB object', function () {
    var connectionString = "postgres://" + settings.sql.username + ":" +
      settings.sql.password + "@" + settings.sql.host + ":" + settings.sql.port +
      "/" + settings.sql.dbname,
        input = function () { return fs.createReadStream(__dirname + "/fixtures/bloomdb.csv")
                  .pipe(split())
                  .pipe(through(function (data) {
                    if (!data) return this.queue(null);
                    this.queue(csvrow.parse(data)); 
                  })); },
        bloomDB = new BloomDB();

    beforeEach(function (done) {
      pg.connect(connectionString, function (err, client, pdone) {
        if (err) {
          console.dir(err);
          pdone();
          done();
          return;
        }
        
        client.query("CREATE TABLE IF NOT EXISTS demo ( one varchar(255), two varchar(255) ); INSERT INTO demo VALUES ('1','2'); INSERT INTO demo VALUES ('4', '5');", function (err, result) {
          if (err) {
            console.dir(err);
          }

          pdone();
          done();
        });
      });
    });

    afterEach(function (done) {
      pg.connect(connectionString, function (err, client, pdone) {
        if (err) {
          console.dir(err);
          pdone();
          done();
          return;
        }
        client.query("DROP TABLE demo;", function (err, result) {
          if (err) {
            console.dir(err);
          }

          pdone();
          done();
        });
      });
    });

    it('inserts documents', function (done) {
      bloomDB.insert('demo', ['one', 'two'], input(), function (err) {
        pg.connect(connectionString, function (err, client, pdone) {
          client.query("SELECT * FROM demo;", function (err, result) {
            expect(result.rows).toEqual([{
              one: "1",
              two: "3"
            },
            {
              one: "hello",
              two: "world"
            }]);
            pdone();
            done();
          });
        });
      });
    });

    xit('upserts documents', function (done) {
      bloomDB.upsert('demo', ['one', 'two'], input(), function (err) {
        pg.connect(connectionString, function (err, client, pdone) {
          client.query("SELECT * FROM demo;", function (err, result) {
            expect(result.rows).toEqual([{
              one: "4",
              two: "5"
            },
            {
              one: "1",
              two: "3"
            },
            {
              one: "hello",
              two: "world"
            }]);
            pdone();
            done();
          });
        });
      });
    });
  });
});
