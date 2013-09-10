# TAP: Transport Agnostic Object Proxy

**worker.js**

``` javascript

// Some object with methods (could be a class)
var obj = {
  x: 0,
  foo: function () {
    this.x++;
  },
  bar: function (callback) {
    callback(this.x);
  },
  baz: function () {
    return this.x;
  }
};

// Send / Recv functions 
var send = postMessage;
var recv = function (callback) {
  addEventListever("message", function (e) {
    callback(e.data);
  });
};

// function that creates deferred object, I'm using Q https://github.com/kriskowal/q
var makeDeferred = function () {
  return Q.defer();
};

// create a Tap class
var Tap = tapFactory(send, recv, makeDeferred);

// create a Tap instance wrapping the obj
var tap = new Tap(obj);
```

**main.js**

``` javascript 

// create the worker
var worker = new Worker("worker.js");

// define the send recieve methods
var send = worker.postMessage.bind(worker);
var recv = function (callback) {
  worker.onmessage = function (e) {
    callback(e.data);
  };
};

// create deferred function
var makeDeferred = function () {
  return Q.defer();
};

// create Tap class
var Tap = tapFactory(send, recv, makeDeferred);

// create Tap instance
// we can use this as a proxy to the remote obj
var tap = new Tap();

// register methods available on remote object
tap.register("foo", "bar", "baz");

// invoke
tap.foo();

// callbacks are handled automagically
tap.bar(function (x) {
  console.log("x:", x);
});

// invcations return promises which resolve to the invoked function's return value
tap.baz().then(function (x) {
  console.log("x:", x);
});

```
