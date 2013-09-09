

var comFactory = function (send, recv) {

  var IdGeneraor = (function () {

    // http://stackoverflow.com/a/6249043/215969
    var IdGeneraor = function IdGeneraor () {
      this._nextIndex = [0, 0, 0];
      this._chars     = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    };

    IdGeneraor.prototype.next = function() {
      var a   = this._nextIndex[0],
          b   = this._nextIndex[1],
          c   = this._nextIndex[2],
          id  = this._chars[a] + this._chars[b] + this._chars[c],
          num = this._chars.length;
      a = ++a % num;
      if (!a) {
        b = ++b % num; 
        if (!b) {
          c = ++c % num; 
        }
      }
      this._nextIndex = [a, b, c]; 
      return id;
    };

    return IdGeneraor;

  }).call(null);

  return (function () {

    var CALLBACK = 0,
        INVOKE   = 1;

    var isFunction = function (x) {
      return Object.prototype.toString.call(x) === "[object Function]";
    };

    var toArray = function (x) {
      return Array.prototype.slice.call(x, 0);
    };

    var isSerializedCallback = function (x) {
      return x && x.type === CALLBACK;
    };

    var Com = function (obj) {
      this._obj       = obj;
      this._callbacks = {};
      this._generator = new IdGeneraor();
      recv(this.onMessage.bind(this));
    };

    Com.prototype.onMessage = function (msg) {
      switch (msg.type) {

        // other end invoked a passed callback
        case CALLBACK:
          this._callbacks[msg.id].apply(null, msg.args);
          delete this._callbacks[msg.id];
          break;

        // other end invoked a method
        case INVOKE:
          var that = this._obj;
          that[msg.method].apply(that, msg.args);
          break;

        // other end is screwing around
        default:
          throw new Error(
            "unsupported message type: " + msg.type
          );
      }
    };

    Com.prototype.serializeCallback = function (callback) {
      var id = this._generator.next();
      this._callbacks[id] = callback;
      return { type: CALLBACK, id: id };
    };

    Com.prototype.serializeArguments = function (args) {
      return args.map(function (arg) {
        return isFunction(arg) ? this.serializeCallback(arg) : arg;
      }.bind(this));
    };

    Com.prototype.deserializeCallback = function (arg) {
      return function () {
        send({ 
          type : CALLBACK,
          id   : arg.id,
          args : toArray(arguments)
        });
      };
    };

    Com.prototype.deserializeArguments = function (args) {
      return args.map(function (arg) {
        return isSerializedCallback(arg) ? this.deserializeCallback(arg) : arg;
      }.bind(this));
    };

    Com.prototype.invokeFn = function (name) {
      return function () {
        var args       = toArray(arguments),
            serialized = this.serializeArguments(args);
        send({ 
          type   : INVOKE,
          method : name,
          args   : serialized
        });
      };
    };

    Com.prototype.register = function () {
      toArray(arguments).reduce(function (acc, methodName) {
        acc[methodName] = acc.invokeFn(methodName);
        return acc;
      }, this);
    };

    return Com;

  }).call(null);

};

if (typeof module !== "undefined") {
  module.exports = comFactory;
}
