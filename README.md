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

// create the tap class
var Remote = Tap.remote();

// create a Remote instance wrapping the obj
var remote = new Remote(obj);
```

**main.js**

``` javascript 

// create the worker
var worker = new Worker("worker.js");

// create deferred function
var makeDeferred = function () {
  return Q.defer();
};

// create Tap class
var Local = Tap.local(worker, makeDeferred);

// create Tap instance
var local = new Local();

// register methods available on remote object
local.register("foo", "bar", "baz");

// invoke methods
local.foo();

// callbacks are handled automagically
local.bar(function (x) {
  console.log("x:", x);
});

// invcations return promises which resolve to the invoked function's return value
local.baz().then(function (x) {
  console.log("x:", x);
});

```
