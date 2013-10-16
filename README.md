# TAP [![Build Status](https://travis-ci.org/icholy/Tap.js.png?branch=master)](https://travis-ci.org/icholy/Tap.js)

> Transport Agnostic Object Proxy 

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

// create the tap class
var Remote = Tap.remote();

// create a Remote instance wrapping the obj
var remote = new Remote(obj);

// events can be sent in either direction
var console = {
  log: function () {
    var msg = Array.prototype.join(arguments, " ");
    remote.send("console", msg);
  }
};
```

**main.js**

``` javascript 

// create the worker
var worker = new Worker("worker.js");

// create deferred function (optional)
var makeDeferred = Q.defer.bind(Q);

// create Tap class
var Local = Tap.local(worker, makeDeferred);

// create Tap instance
var local = new Local();

// register methods available on remote object
local.methods("foo", "bar", "baz");

// invoke methods
local.foo();

// callbacks are handled automagically
// Note: they only work for 1 invocation
local.bar(function (x) {
  console.log("x:", x);
});

// invcations return promises which resolve to the invoked function's return value
// this will only work if a makeDeferred function was provided to the factory
local.baz().then(function (x) {
  console.log("x:", x);
});

// receive events
local.on(
  "console",
  console.log.bind(console, "worker:")
);
```
