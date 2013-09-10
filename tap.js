
var tapFactory = function (send, recv, makeDeferred, undefined) {

  makeDeferred = makeDeferred || function () { return null; };

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
        INVOKE   = 1,
        RETURN   = 2;

    var isFunction = function (x) {
      return Object.prototype.toString.call(x) === "[object Function]";
    };

    var toArray = function (x) {
      return Array.prototype.slice.call(x, 0);
    };

    var isSerializedCallback = function (x) {
      return x && x.type === CALLBACK;
    };

    var isNull = function (x) {
      return x === null;
    };

    var Tap = function (obj) {
      this._obj       = obj;
      this._callbacks = {};
      this._generator = new IdGeneraor();
      recv(this.onMessage.bind(this));
    };

    Tap.prototype.onMessage = function (msg) {
      switch (msg.type) {

        // other end invoked a passed callback
        case CALLBACK:
          var args = this.deserializeArguments(msg.args);
          this._callbacks[msg.id].apply(null, args);
          delete this._callbacks[msg.id];
          break;

        // other end invoked a method
        case INVOKE:
          var that = this._obj,
              args = this.deserializeArguments(msg.args),
              ret  = that[msg.method].apply(that, args);
          send({
            type : RETURN,
            id   : msg.id,
            ret  : isFunction(ret) ? this.serializeCallback(ret) : ret
          });
          break;

        // other end return value for an invoke
        case RETURN:
          var ret = this.isSerializedCallback(msg.ret) ? this.deserializeCallback(msg.ret) : ret,
              id  = msg.id,
              cb  = this._callbacks[id];
          if (!isNull(cb)) {
            cb.call(null, ret);
          }
          delete this._callbacks[id];
          break;

        // other end is screwing around
        default:
          throw new Error(
            "unsupported message type: " + msg.type
          );
      }
    };

    Tap.prototype.serializeCallback = function (callback) {
      var id = this._generator.next();
      this._callbacks[id] = callback;
      return { type: CALLBACK, id: id };
    };

    Tap.prototype.serializeArguments = function (args) {
      return args.map(function (arg) {
        return isFunction(arg) ? this.serializeCallback(arg) : arg;
      }.bind(this));
    };

    Tap.prototype.deserializeCallback = function (arg) {
      var _this = this;
      return function () {
        var args = toArray(arguments);
        send({ 
          type : CALLBACK,
          id   : arg.id,
          args : _this.serializeArguments(args);
        });
      };
    };

    Tap.prototype.deserializeArguments = function (args) {
      return args.map(function (arg) {
        return isSerializedCallback(arg) ? this.deserializeCallback(arg) : arg;
      }.bind(this));
    };

    Tap.prototype.invokeFn = function (name) {
      return function () {
        var args       = toArray(arguments),
            serialized = this.serializeArguments(args),
            deferred   = makeDeferred(),
            id         = this._generator.next(),
            promise;
        if (!isNull(deferred)) {
          this._callbacks[id] = deferred.resolve.bind(deferred);
          promise = deferred.promise;
        } else {
          this._callbacks[id] = null;
        }
        send({ 
          type   : INVOKE,
          method : name,
          args   : serialized
        });
        return promise;
      };
    };

    Tap.prototype.register = function () {
      toArray(arguments).reduce(function (acc, methodName) {
        acc[methodName] = acc.invokeFn(methodName);
        return acc;
      }, this);
    };

    return Tap;

  }).call(null);

};

var tapLocalWorkerFactory = function (worker, makeDeferred) {
  var send = worker.postMessage.bind(worker);
  var recv = function (callback) {
    worker.onmessage = function (e) {
      callback(e.data);
    };
  };
  return tapFactory(send, recv, makeDeferred);
};

var tapRemoteWorkerFactory = function (makeDeferred) {
  var send = postMessage;
  var recv = function (callback) {
    addEventListener("message", function (e) {
      callback(e.data);
    });
  };
  return tapFactory(send, recv, makeDeferred);
};

var Tap = {
  factory: tapFactory,
  local: tapLocalWorkerFactory,
  remote: tapRemoteWorkerFactory
};

if (typeof module !== "undefined") {
  module.exports = Tap;
}
