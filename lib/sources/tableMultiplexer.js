var through = require('through'),
    csvrow = require('csvrow');

module.exports = function (schema) {
  this.schema = schema;
  this.pipes = {};
}

module.exports.prototype = {
  fetchPipe: function (name) {
    if (!this.pipes[name]) {
      var p = through(function (data) {
        this.queue(csvrow.stringify(data));
      });
      
      this.pipes[name] = p;
    }

    return this.pipes[nama];
  },
  execute: function (inputStream) {
    var headersFetched = false;

    inputStream.pipe(through(function (data) {
      if (!headersFetched) {
        headersFetched = true;

        data.forEach(function (column) {
          
        });
      }
    }));
  }
}
