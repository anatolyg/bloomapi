var Parser = require('../actions/parser');

module.exports = function (context) {
  this.context = context || {};
};

module.exports.prototype = {
  execute: function (source, callback) {
    // create context
    var context = this.context,
        index = 0;
    
    function execAction (err, data) {
      //  parse action
      var parser = new Parser(context),
          actionDetails = parser.parse(source[index]),
          action = new actionDetails.action(actionDetails.parameters);
      
      index += 1;
      //  execute
      action.execute(data, function (err, details) {
        if (err) {
          return callback(new Error(err), null);
        }
        //  if 'set', set data in context
        if (actionDetails.parameters.set) {
          context[actionDetails.parameters.set] = details;
        }

        if (index === source.length) {
          callback(null, context); 
        } else {
          execAction(null, details);
        }
      });
    }

    execAction(null, null);
  }
};
