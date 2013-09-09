# COM.js

> transport agnostic communication

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

// create a Com class
var Com = comFactory(send, recv);

// create a Com instance wrapping the obj
var com = new Com(obj);
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

// create Com class
var Com = comFactory(send, recv);

// create Com instance
var com = new Com();

// register methods available on remote object
com.register("foo", "bar");

// invoke
com.foo();
com.bar(function (x) {
  console.log("x:", x);
});

```
