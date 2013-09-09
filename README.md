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
  }
};

// Send / Recv functions 
var send = postMessage;
var recv = function (callback) {
  addEventListever("message", function (e) {
    callback(e.data);
  });
};

// create a Tap class
var Tap = tapFactory(send, recv);

// create a Tap instance wrapping the obj
var tap = new Tap(obj);
```

**main.js**

``` javascript 

// create the worker
var worker = new Worker("worker.js");

// define the send recieve methods
var send = function (msg) {
  worker.postMessage(msg);
};
var recv = function (callback) {
  worker.onmessage = callback;
};

// create Tap class
var Tap = tapFactory(send, recv);

// create Tap instance
var tap = new Tap();

// register methods available on remote object
tap.register("foo", "bar");

// invoke
tap.foo();
tap.bar(function (x) {
  console.log("x:", x);
});

```
