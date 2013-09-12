
var tapFactory = function (send, recv, makeDeferred, undefined) {

  makeDeferred = makeDeferred || function () { return null; };

  var IdGenerator = (function () {


    /**
     * unique id string generator
     * 
     * credit: http://stackoverflow.com/a/6249043/215969
     *
     * @class IdGenerator
     */
    var IdGenerator = function IdGenerator () {
      this._nextIndex = [0, 0, 0];
      this._chars     = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    };

    /**
     * get the next id string
     *
     * @method next
     * @return {String} id
     */
    IdGenerator.prototype.next = function() {
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

    return IdGenerator;

  }).call(null);

  return (function () {

    var CALLBACK = 0,
        INVOKE   = 1,
        RETURN   = 2;

    // helper functions
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

    /**
     * transport agnostic object proxy
     *
     * @class Tap
     * @param {Object} obj - object that gets proxied
     */
    var Tap = function (obj) {
      this._obj       = obj;
      this._callbacks = {};
      this._generator = new IdGenerator();
      recv(this.onMessage.bind(this));
    };

    /**
     * handles all incoming messages
     *
     * @method onMessage
     * @param {Object} msg - message
     */
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
          var ret      = isSerializedCallback(msg.ret) ? this.deserializeCallback(msg.ret) : msg.ret,
              id       = msg.id,
              deferred = this._callbacks[id];
          if (!isNull(deferred)) {
            deferred.resolve(ret);
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

    /**
     * serialize a callback parameter
     *
     * @method serializeCallback
     * @param {Function} callback - callback function
     * @return {Object} object containing the callback id
     */
    Tap.prototype.serializeCallback = function (callback) {
      var id = this._generator.next();
      this._callbacks[id] = callback;
      return { type: CALLBACK, id: id };
    };

    /**
     * serialize array of arguments
     *
     * @method serializeArguments
     * @param {Array} args - arguments
     * @return {Array} serialized arguments
     */
    Tap.prototype.serializeArguments = function (args) {
      return args.map(function (arg) {
        return isFunction(arg) ? this.serializeCallback(arg) : arg;
      }.bind(this));
    };

    /**
     * deserialize a serialized callback parameter into a callable function
     *
     * @method deserializeCallback
     * @param {Object} arg - serialized callback
     * @return {Function} callable function
     */
    Tap.prototype.deserializeCallback = function (arg) {
      return function () {
        var args       = toArray(arguments),
            serialized = this.serializeArguments(args);
        send({ 
          type : CALLBACK,
          id   : arg.id,
          args : serialized
        });
      }.bind(this);
    };

    /**
     * deserialize arguments array
     *
     * @method deserializeArguments
     * @param {Array} args - serialized arguments
     * @return {Array} deserialize arguments
     */
    Tap.prototype.deserializeArguments = function (args) {
      return args.map(function (arg) {
        return isSerializedCallback(arg) ? this.deserializeCallback(arg) : arg;
      }.bind(this));
    };

    /**
     * create a method that is proxied to the remote object
     *
     * @method invokeFn
     * @param {String} name - remote method name
     * @return {Function} proxy method
     */
    Tap.prototype.invokeFn = function (name) {
      return function () {
        var args       = toArray(arguments),
            serialized = this.serializeArguments(args),
            deferred   = makeDeferred(),
            id         = this._generator.next();
        this._callbacks[id] = deferred;
        send({ 
          type   : INVOKE,
          method : name,
          id     : id,
          args   : serialized
        });
        return isNull(deferred) ? undefined : deferred.promise;
      };
    };

    /**
     * register available proxy methods
     *
     * @method register
     * @param {String} name - method name
     */
    Tap.prototype.register = function (/* name, ... */) {
      toArray(arguments).forEach(function (methodName) {
        this[methodName] = this.invokeFn(methodName);
      }.bind(this));
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
  factory : tapFactory,
  local   : tapLocalWorkerFactory,
  remote  : tapRemoteWorkerFactory
};

if (typeof module !== "undefined") {
  module.exports = Tap;
}
