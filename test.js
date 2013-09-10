var Tap    = require("./tap.js"),
    expect = require("chai").expect,
    Q      = require("q");

var hub = {
  channels: {},
  subscribe: function (name, callback) {
    if (typeof this.channels[name] === "undefined") {
      this.channels[name] = [callback];
    } else {
      this.channels[name].push(callback);
    }
  },
  publish: function (name, payload) {
    payload = JSON.parse(JSON.stringify(payload));
    if (typeof this.channels[name] !== "undefined") {
      this.channels[name].forEach(function (callback) {
        callback(payload);
      });
    }
  },
  reset: function () {
    this.channels = {};
  }
};

var obj = {
  x     : 0,
  foo   : function ()         { this.x++;         },
  bar   : function (callback) { callback(this.x); },
  baz   : function ()         { return this.x;    },
  bat   : function (callback) { callback(function (x) { this.x = x; }.bind(this)); },
  bap   : function (v)        { return function () { this.x = v; }.bind(this); },
  poop  : function (cb1, cb2) { cb1(this.x); this.foo(); cb2(this.x); },
  reset : function ()         { this.x = 0;       }
};

var Remote = Tap.factory(
  hub.publish.bind(hub, "remote"),
  hub.subscribe.bind(hub, "local")
);

var Local = Tap.factory(
  hub.publish.bind(hub, "local"),
  hub.subscribe.bind(hub, "remote"),
  Q.defer.bind(Q)
);

describe("Tap", function () {

  var local,
      remote;

  beforeEach(function () {
    hub.reset();
    obj.reset();
    remote = new Remote(obj);
    local = new Local();
    local.register("foo", "bar", "baz", "bat", "bap", "poop");
  });

  it("should be able to call a remote method", function () {
    local.foo();
    local.foo();
    expect(obj.x).to.equal(2);
  });

  it("should work with callbacks", function (done) {
    local.foo();
    local.bar(function (x) {
      expect(x).to.equal(1);
      done();
    });
  });

  it("should work with multiple callbacks", function (done) {
    local.poop(
      function (x) {
        expect(x).to.equal(0);
      },
      function (x) {
        expect(x).to.equal(1);
        done();
      }
    );
  });

  it("should work with callbacks both ways", function (done) {
    local.bat(function (setX) { setX(5); });
    local.bar(function (x) {
      expect(x).to.equal(5);
      done();
    });
  });

  it("should work with return values", function (done) {
    local.baz().then(function (x) {
      expect(x).to.equal(0);
      done();
    });
  });

  it("should be able to return callbacks", function (done) {
    local.bap(123).then(function (fn) {
      fn();
      expect(obj.x).to.equal(123);
      done();
    });
  });

});
