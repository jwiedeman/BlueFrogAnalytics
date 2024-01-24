// modules are defined as an array
// [ module function, map of requires ]
//
// map of requires is short require name -> numeric require
//
// anything defined in a previous bundle is accessed via the
// orig method which is the require for previous bundles
parcelRequire = (function (modules, cache, entry, globalName) {
  // Save the require from previous bundle to this closure if any
  var previousRequire = typeof parcelRequire === 'function' && parcelRequire;
  var nodeRequire = typeof require === 'function' && require;

  function newRequire(name, jumped) {
    if (!cache[name]) {
      if (!modules[name]) {
        // if we cannot find the module within our internal map or
        // cache jump to the current global require ie. the last bundle
        // that was added to the page.
        var currentRequire = typeof parcelRequire === 'function' && parcelRequire;
        if (!jumped && currentRequire) {
          return currentRequire(name, true);
        }

        // If there are other bundles on this page the require from the
        // previous one is saved to 'previousRequire'. Repeat this as
        // many times as there are bundles until the module is found or
        // we exhaust the require chain.
        if (previousRequire) {
          return previousRequire(name, true);
        }

        // Try the node require function if it exists.
        if (nodeRequire && typeof name === 'string') {
          return nodeRequire(name);
        }

        var err = new Error('Cannot find module \'' + name + '\'');
        err.code = 'MODULE_NOT_FOUND';
        throw err;
      }

      localRequire.resolve = resolve;
      localRequire.cache = {};

      var module = cache[name] = new newRequire.Module(name);

      modules[name][0].call(module.exports, localRequire, module, module.exports, this);
    }

    return cache[name].exports;

    function localRequire(x){
      return newRequire(localRequire.resolve(x));
    }

    function resolve(x){
      return modules[name][1][x] || x;
    }
  }

  function Module(moduleName) {
    this.id = moduleName;
    this.bundle = newRequire;
    this.exports = {};
  }

  newRequire.isParcelRequire = true;
  newRequire.Module = Module;
  newRequire.modules = modules;
  newRequire.cache = cache;
  newRequire.parent = previousRequire;
  newRequire.register = function (id, exports) {
    modules[id] = [function (require, module) {
      module.exports = exports;
    }, {}];
  };

  var error;
  for (var i = 0; i < entry.length; i++) {
    try {
      newRequire(entry[i]);
    } catch (e) {
      // Save first error but execute all entries
      if (!error) {
        error = e;
      }
    }
  }

  if (entry.length) {
    // Expose entry point to Node, AMD or browser globals
    // Based on https://github.com/ForbesLindesay/umd/blob/master/template.js
    var mainExports = newRequire(entry[entry.length - 1]);

    // CommonJS
    if (typeof exports === "object" && typeof module !== "undefined") {
      module.exports = mainExports;

    // RequireJS
    } else if (typeof define === "function" && define.amd) {
     define(function () {
       return mainExports;
     });

    // <script>
    } else if (globalName) {
      this[globalName] = mainExports;
    }
  }

  // Override the current require with this new one
  parcelRequire = newRequire;

  if (error) {
    // throw error from earlier, _after updating parcelRequire_
    throw error;
  }

  return newRequire;
})({"actions/AuthActions.js":[function(require,module,exports) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
function ownKeys(e, r) { var t = Object.keys(e); if (Object.getOwnPropertySymbols) { var o = Object.getOwnPropertySymbols(e); r && (o = o.filter(function (r) { return Object.getOwnPropertyDescriptor(e, r).enumerable; })), t.push.apply(t, o); } return t; }
function _objectSpread(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; r % 2 ? ownKeys(Object(t), !0).forEach(function (r) { _defineProperty(e, r, t[r]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function (r) { Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r)); }); } return e; }
function _defineProperty(obj, key, value) { key = _toPropertyKey(key); if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == _typeof(i) ? i : String(i); }
function _toPrimitive(t, r) { if ("object" != _typeof(t) || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != _typeof(i)) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
function _regeneratorRuntime() { "use strict"; /*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/facebook/regenerator/blob/main/LICENSE */ _regeneratorRuntime = function _regeneratorRuntime() { return e; }; var t, e = {}, r = Object.prototype, n = r.hasOwnProperty, o = Object.defineProperty || function (t, e, r) { t[e] = r.value; }, i = "function" == typeof Symbol ? Symbol : {}, a = i.iterator || "@@iterator", c = i.asyncIterator || "@@asyncIterator", u = i.toStringTag || "@@toStringTag"; function define(t, e, r) { return Object.defineProperty(t, e, { value: r, enumerable: !0, configurable: !0, writable: !0 }), t[e]; } try { define({}, ""); } catch (t) { define = function define(t, e, r) { return t[e] = r; }; } function wrap(t, e, r, n) { var i = e && e.prototype instanceof Generator ? e : Generator, a = Object.create(i.prototype), c = new Context(n || []); return o(a, "_invoke", { value: makeInvokeMethod(t, r, c) }), a; } function tryCatch(t, e, r) { try { return { type: "normal", arg: t.call(e, r) }; } catch (t) { return { type: "throw", arg: t }; } } e.wrap = wrap; var h = "suspendedStart", l = "suspendedYield", f = "executing", s = "completed", y = {}; function Generator() {} function GeneratorFunction() {} function GeneratorFunctionPrototype() {} var p = {}; define(p, a, function () { return this; }); var d = Object.getPrototypeOf, v = d && d(d(values([]))); v && v !== r && n.call(v, a) && (p = v); var g = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(p); function defineIteratorMethods(t) { ["next", "throw", "return"].forEach(function (e) { define(t, e, function (t) { return this._invoke(e, t); }); }); } function AsyncIterator(t, e) { function invoke(r, o, i, a) { var c = tryCatch(t[r], t, o); if ("throw" !== c.type) { var u = c.arg, h = u.value; return h && "object" == _typeof(h) && n.call(h, "__await") ? e.resolve(h.__await).then(function (t) { invoke("next", t, i, a); }, function (t) { invoke("throw", t, i, a); }) : e.resolve(h).then(function (t) { u.value = t, i(u); }, function (t) { return invoke("throw", t, i, a); }); } a(c.arg); } var r; o(this, "_invoke", { value: function value(t, n) { function callInvokeWithMethodAndArg() { return new e(function (e, r) { invoke(t, n, e, r); }); } return r = r ? r.then(callInvokeWithMethodAndArg, callInvokeWithMethodAndArg) : callInvokeWithMethodAndArg(); } }); } function makeInvokeMethod(e, r, n) { var o = h; return function (i, a) { if (o === f) throw new Error("Generator is already running"); if (o === s) { if ("throw" === i) throw a; return { value: t, done: !0 }; } for (n.method = i, n.arg = a;;) { var c = n.delegate; if (c) { var u = maybeInvokeDelegate(c, n); if (u) { if (u === y) continue; return u; } } if ("next" === n.method) n.sent = n._sent = n.arg;else if ("throw" === n.method) { if (o === h) throw o = s, n.arg; n.dispatchException(n.arg); } else "return" === n.method && n.abrupt("return", n.arg); o = f; var p = tryCatch(e, r, n); if ("normal" === p.type) { if (o = n.done ? s : l, p.arg === y) continue; return { value: p.arg, done: n.done }; } "throw" === p.type && (o = s, n.method = "throw", n.arg = p.arg); } }; } function maybeInvokeDelegate(e, r) { var n = r.method, o = e.iterator[n]; if (o === t) return r.delegate = null, "throw" === n && e.iterator.return && (r.method = "return", r.arg = t, maybeInvokeDelegate(e, r), "throw" === r.method) || "return" !== n && (r.method = "throw", r.arg = new TypeError("The iterator does not provide a '" + n + "' method")), y; var i = tryCatch(o, e.iterator, r.arg); if ("throw" === i.type) return r.method = "throw", r.arg = i.arg, r.delegate = null, y; var a = i.arg; return a ? a.done ? (r[e.resultName] = a.value, r.next = e.nextLoc, "return" !== r.method && (r.method = "next", r.arg = t), r.delegate = null, y) : a : (r.method = "throw", r.arg = new TypeError("iterator result is not an object"), r.delegate = null, y); } function pushTryEntry(t) { var e = { tryLoc: t[0] }; 1 in t && (e.catchLoc = t[1]), 2 in t && (e.finallyLoc = t[2], e.afterLoc = t[3]), this.tryEntries.push(e); } function resetTryEntry(t) { var e = t.completion || {}; e.type = "normal", delete e.arg, t.completion = e; } function Context(t) { this.tryEntries = [{ tryLoc: "root" }], t.forEach(pushTryEntry, this), this.reset(!0); } function values(e) { if (e || "" === e) { var r = e[a]; if (r) return r.call(e); if ("function" == typeof e.next) return e; if (!isNaN(e.length)) { var o = -1, i = function next() { for (; ++o < e.length;) if (n.call(e, o)) return next.value = e[o], next.done = !1, next; return next.value = t, next.done = !0, next; }; return i.next = i; } } throw new TypeError(_typeof(e) + " is not iterable"); } return GeneratorFunction.prototype = GeneratorFunctionPrototype, o(g, "constructor", { value: GeneratorFunctionPrototype, configurable: !0 }), o(GeneratorFunctionPrototype, "constructor", { value: GeneratorFunction, configurable: !0 }), GeneratorFunction.displayName = define(GeneratorFunctionPrototype, u, "GeneratorFunction"), e.isGeneratorFunction = function (t) { var e = "function" == typeof t && t.constructor; return !!e && (e === GeneratorFunction || "GeneratorFunction" === (e.displayName || e.name)); }, e.mark = function (t) { return Object.setPrototypeOf ? Object.setPrototypeOf(t, GeneratorFunctionPrototype) : (t.__proto__ = GeneratorFunctionPrototype, define(t, u, "GeneratorFunction")), t.prototype = Object.create(g), t; }, e.awrap = function (t) { return { __await: t }; }, defineIteratorMethods(AsyncIterator.prototype), define(AsyncIterator.prototype, c, function () { return this; }), e.AsyncIterator = AsyncIterator, e.async = function (t, r, n, o, i) { void 0 === i && (i = Promise); var a = new AsyncIterator(wrap(t, r, n, o), i); return e.isGeneratorFunction(r) ? a : a.next().then(function (t) { return t.done ? t.value : a.next(); }); }, defineIteratorMethods(g), define(g, u, "Generator"), define(g, a, function () { return this; }), define(g, "toString", function () { return "[object Generator]"; }), e.keys = function (t) { var e = Object(t), r = []; for (var n in e) r.push(n); return r.reverse(), function next() { for (; r.length;) { var t = r.pop(); if (t in e) return next.value = t, next.done = !1, next; } return next.done = !0, next; }; }, e.values = values, Context.prototype = { constructor: Context, reset: function reset(e) { if (this.prev = 0, this.next = 0, this.sent = this._sent = t, this.done = !1, this.delegate = null, this.method = "next", this.arg = t, this.tryEntries.forEach(resetTryEntry), !e) for (var r in this) "t" === r.charAt(0) && n.call(this, r) && !isNaN(+r.slice(1)) && (this[r] = t); }, stop: function stop() { this.done = !0; var t = this.tryEntries[0].completion; if ("throw" === t.type) throw t.arg; return this.rval; }, dispatchException: function dispatchException(e) { if (this.done) throw e; var r = this; function handle(n, o) { return a.type = "throw", a.arg = e, r.next = n, o && (r.method = "next", r.arg = t), !!o; } for (var o = this.tryEntries.length - 1; o >= 0; --o) { var i = this.tryEntries[o], a = i.completion; if ("root" === i.tryLoc) return handle("end"); if (i.tryLoc <= this.prev) { var c = n.call(i, "catchLoc"), u = n.call(i, "finallyLoc"); if (c && u) { if (this.prev < i.catchLoc) return handle(i.catchLoc, !0); if (this.prev < i.finallyLoc) return handle(i.finallyLoc); } else if (c) { if (this.prev < i.catchLoc) return handle(i.catchLoc, !0); } else { if (!u) throw new Error("try statement without catch or finally"); if (this.prev < i.finallyLoc) return handle(i.finallyLoc); } } } }, abrupt: function abrupt(t, e) { for (var r = this.tryEntries.length - 1; r >= 0; --r) { var o = this.tryEntries[r]; if (o.tryLoc <= this.prev && n.call(o, "finallyLoc") && this.prev < o.finallyLoc) { var i = o; break; } } i && ("break" === t || "continue" === t) && i.tryLoc <= e && e <= i.finallyLoc && (i = null); var a = i ? i.completion : {}; return a.type = t, a.arg = e, i ? (this.method = "next", this.next = i.finallyLoc, y) : this.complete(a); }, complete: function complete(t, e) { if ("throw" === t.type) throw t.arg; return "break" === t.type || "continue" === t.type ? this.next = t.arg : "return" === t.type ? (this.rval = this.arg = t.arg, this.method = "return", this.next = "end") : "normal" === t.type && e && (this.next = e), y; }, finish: function finish(t) { for (var e = this.tryEntries.length - 1; e >= 0; --e) { var r = this.tryEntries[e]; if (r.finallyLoc === t) return this.complete(r.completion, r.afterLoc), resetTryEntry(r), y; } }, catch: function _catch(t) { for (var e = this.tryEntries.length - 1; e >= 0; --e) { var r = this.tryEntries[e]; if (r.tryLoc === t) { var n = r.completion; if ("throw" === n.type) { var o = n.arg; resetTryEntry(r); } return o; } } throw new Error("illegal catch attempt"); }, delegateYield: function delegateYield(e, r, n) { return this.delegate = { iterator: values(e), resultName: r, nextLoc: n }, "next" === this.method && (this.arg = t), y; } }, e; }
function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }
function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }
var AuthActions = {
  // Action to handle user sign-out
  signout: function signout() {
    return /*#__PURE__*/function () {
      var _ref = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee(state, actions) {
        return _regeneratorRuntime().wrap(function _callee$(_context) {
          while (1) switch (_context.prev = _context.next) {
            case 0:
              _context.prev = 0;
              _context.next = 3;
              return firebase.auth().signOut();
            case 3:
              console.log("Signing out...");
              actions.resetIdentity(); // Reset identity after sign out
              actions.navigateToHome(); // Navigate to home or another page
              // Reset other parts of the state as needed
              _context.next = 12;
              break;
            case 8:
              _context.prev = 8;
              _context.t0 = _context["catch"](0);
              console.error("Sign-out error:", _context.t0.message);
              actions.setError(_context.t0); // Handle errors
            case 12:
            case "end":
              return _context.stop();
          }
        }, _callee, null, [[0, 8]]);
      }));
      return function (_x, _x2) {
        return _ref.apply(this, arguments);
      };
    }();
  },
  // Action to update the user in the state
  setUser: function setUser(user) {
    return function (state) {
      console.log("Setting user:", user);
      return _objectSpread(_objectSpread({}, state), {}, {
        auth: _objectSpread(_objectSpread({}, state.auth), {}, {
          user: _objectSpread({}, user)
        })
      });
    };
  },
  // Action to handle authentication state changes
  userChanged: function userChanged(user) {
    return function (state) {
      console.log("User changed:", user);
      return _objectSpread(_objectSpread({}, state), {}, {
        auth: _objectSpread(_objectSpread({}, state.auth), {}, {
          user: user || {},
          authed: !!user,
          checked: true
        })
      });
    };
  },
  resetIdentity: function resetIdentity() {
    return function (state) {
      console.log("Resetting identity.");
      return _objectSpread(_objectSpread({}, state), {}, {
        auth: _objectSpread(_objectSpread({}, state.auth), {}, {
          user: {},
          error: {},
          fetchSignInMethodsComplete: false,
          hasIdentity: [],
          signupMessage: ""
        })
      });
    };
  },
  deleteUserProfileWithConfirmation: function deleteUserProfileWithConfirmation() {
    return /*#__PURE__*/function () {
      var _ref2 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee2(state, actions) {
        var confirmation, user;
        return _regeneratorRuntime().wrap(function _callee2$(_context2) {
          while (1) switch (_context2.prev = _context2.next) {
            case 0:
              confirmation = confirm("Are you sure you want to delete your profile? All data and stats will be irrecoverable.");
              if (!confirmation) {
                _context2.next = 16;
                break;
              }
              _context2.prev = 2;
              user = firebase.auth().currentUser;
              if (!user) {
                _context2.next = 10;
                break;
              }
              _context2.next = 7;
              return user.delete();
            case 7:
              console.log("User profile deleted successfully.");
              actions.resetIdentity(); // Reset identity after deletion
              actions.navigateToHome(); // Navigate to home or another page
              // Reset other parts of the state as needed
            case 10:
              _context2.next = 16;
              break;
            case 12:
              _context2.prev = 12;
              _context2.t0 = _context2["catch"](2);
              console.error("Error deleting user profile:", _context2.t0);
              actions.setError(_context2.t0); // Handle errors
            case 16:
            case "end":
              return _context2.stop();
          }
        }, _callee2, null, [[2, 12]]);
      }));
      return function (_x3, _x4) {
        return _ref2.apply(this, arguments);
      };
    }();
  },
  signin: function signin(_ref3) {
    var email = _ref3.email,
      password = _ref3.password;
    return /*#__PURE__*/function () {
      var _ref4 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee3(state, actions) {
        var userCredential;
        return _regeneratorRuntime().wrap(function _callee3$(_context3) {
          while (1) switch (_context3.prev = _context3.next) {
            case 0:
              console.log("Signin action called with state:", state);
              _context3.prev = 1;
              _context3.next = 4;
              return firebase.auth().signInWithEmailAndPassword(email, password);
            case 4:
              userCredential = _context3.sent;
              console.log("Signed in successfully:", userCredential.user);
              // ... additional logic after successful sign-in ...
              _context3.next = 12;
              break;
            case 8:
              _context3.prev = 8;
              _context3.t0 = _context3["catch"](1);
              console.error("Sign-in error:", _context3.t0);
              actions.setError(_context3.t0);
            case 12:
            case "end":
              return _context3.stop();
          }
        }, _callee3, null, [[1, 8]]);
      }));
      return function (_x5, _x6) {
        return _ref4.apply(this, arguments);
      };
    }();
  },
  // Add console log to setSignupMessage action
  setSignupMessage: function setSignupMessage(message) {
    return function (state, actions) {
      console.log("setSignupMessage action called with state:", state);
      return _objectSpread(_objectSpread({}, state), {}, {
        signupMessage: message
      });
    };
  },
  // In your actions object
  signup: function signup(_ref5) {
    var email = _ref5.email,
      password = _ref5.password;
    return /*#__PURE__*/function () {
      var _ref6 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee4(state, actions) {
        var userCredential;
        return _regeneratorRuntime().wrap(function _callee4$(_context4) {
          while (1) switch (_context4.prev = _context4.next) {
            case 0:
              _context4.prev = 0;
              if (!(password.length < 6)) {
                _context4.next = 3;
                break;
              }
              return _context4.abrupt("return", {
                success: false,
                message: "Password must be 6 characters or longer."
              });
            case 3:
              _context4.next = 5;
              return firebase.auth().createUserWithEmailAndPassword(email, password);
            case 5:
              userCredential = _context4.sent;
              console.log("Signed up successfully");
              // ... additional logic after successful sign-up ...

              // If successful, return a result indicating success
              return _context4.abrupt("return", {
                success: true,
                message: "Signed up successfully"
              });
            case 10:
              _context4.prev = 10;
              _context4.t0 = _context4["catch"](0);
              console.error("Sign-up error:", _context4.t0.message);
              // Use actions to handle other errors and return a corresponding result
              actions.setError(_context4.t0);
              return _context4.abrupt("return", {
                success: false,
                message: _context4.t0.message
              });
            case 15:
            case "end":
              return _context4.stop();
          }
        }, _callee4, null, [[0, 10]]);
      }));
      return function (_x7, _x8) {
        return _ref6.apply(this, arguments);
      };
    }();
  },
  // Action to update the hasIdentity property
  // Update the updateHasIdentity action to log the state
  updateHasIdentity: function updateHasIdentity(hasIdentity) {
    return function (state, actions) {
      console.log("updateHasIdentity action called with state:", state);
      return _objectSpread(_objectSpread({}, state), {}, {
        hasIdentity: hasIdentity
      });
    };
  },
  navigateToProfile: function navigateToProfile() {
    return function (state, actions) {
      console.log("Navigating to Profile page");
      return {
        currentPage: "profile"
      };
    };
  },
  navigateToLogin: function navigateToLogin() {
    return function (state, actions) {
      console.log("Navigating to Login page");
      return {
        currentPage: "login"
      };
    };
  },
  navigateToHome: function navigateToHome() {
    return function (state, actions) {
      console.log("Navigating to Home page");
      return {
        currentPage: "home"
      };
    };
  },
  navigateToSignup: function navigateToSignup() {
    return function (state, actions) {
      console.log("Navigating to Signup page");
      return {
        currentPage: "signup"
      };
    };
  },
  setError: function setError(error) {
    return function (state, actions) {
      console.error("Error:", error);
      return {
        error: error
      };
    };
  },
  setSignInMethods: function setSignInMethods(signInMethods) {
    return function (state, actions) {
      console.log("setSignInMethods action called with state:", state);
      return {
        auth: _objectSpread(_objectSpread({}, state.auth), {}, {
          hasIdentity: signInMethods,
          fetchSignInMethodsComplete: true
        })
      };
    };
  },
  fetchAndSetSignInMethods: function fetchAndSetSignInMethods(_ref7) {
    var email = _ref7.email;
    return /*#__PURE__*/function () {
      var _ref8 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee5(state, actions) {
        var signInMethods;
        return _regeneratorRuntime().wrap(function _callee5$(_context5) {
          while (1) switch (_context5.prev = _context5.next) {
            case 0:
              _context5.prev = 0;
              _context5.next = 3;
              return firebase.auth().fetchSignInMethodsForEmail(email);
            case 3:
              signInMethods = _context5.sent;
              // Call another action using the provided actions parameter
              console.log("signInMethods", signInMethods);
              actions.setSignInMethods(signInMethods);

              // Additional implementation...
              _context5.next = 12;
              break;
            case 8:
              _context5.prev = 8;
              _context5.t0 = _context5["catch"](0);
              console.error("Error:", _context5.t0);
              actions.setError(_context5.t0); // Use actions parameter to call setError
            case 12:
            case "end":
              return _context5.stop();
          }
        }, _callee5, null, [[0, 8]]);
      }));
      return function (_x9, _x10) {
        return _ref8.apply(this, arguments);
      };
    }();
  },
  resetPassword: function resetPassword(_ref9) {
    var email = _ref9.email;
    return /*#__PURE__*/function () {
      var _ref10 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee6(state, actions) {
        var auth;
        return _regeneratorRuntime().wrap(function _callee6$(_context6) {
          while (1) switch (_context6.prev = _context6.next) {
            case 0:
              auth = getAuth();
              _context6.prev = 1;
              _context6.next = 4;
              return sendPasswordResetEmail(auth, email);
            case 4:
              console.log("Password reset email sent successfully");
              // ... additional logic after password reset email sent ...
              _context6.next = 11;
              break;
            case 7:
              _context6.prev = 7;
              _context6.t0 = _context6["catch"](1);
              console.error("Reset password error:", _context6.t0.message);
              actions.setError(_context6.t0); // Use actions to call setError
            case 11:
            case "end":
              return _context6.stop();
          }
        }, _callee6, null, [[1, 7]]);
      }));
      return function (_x11, _x12) {
        return _ref10.apply(this, arguments);
      };
    }();
  },
  setEmail: function setEmail(email) {
    return function (state, actions) {
      console.log("setEmail action called with state:", state);
      return _objectSpread(_objectSpread({}, state), {}, {
        user: _objectSpread(_objectSpread({}, state.user), {}, {
          email: email
        })
      });
    };
  }

  // ...
};
var _default = exports.default = AuthActions;
},{}],"actions/Actions.js":[function(require,module,exports) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
function ownKeys(e, r) { var t = Object.keys(e); if (Object.getOwnPropertySymbols) { var o = Object.getOwnPropertySymbols(e); r && (o = o.filter(function (r) { return Object.getOwnPropertyDescriptor(e, r).enumerable; })), t.push.apply(t, o); } return t; }
function _objectSpread(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; r % 2 ? ownKeys(Object(t), !0).forEach(function (r) { _defineProperty(e, r, t[r]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function (r) { Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r)); }); } return e; }
function _defineProperty(obj, key, value) { key = _toPropertyKey(key); if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == _typeof(i) ? i : String(i); }
function _toPrimitive(t, r) { if ("object" != _typeof(t) || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != _typeof(i)) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
// Actions.js
var Actions = {
  setChangelogData: function setChangelogData(data) {
    return function (state) {
      console.debug("Setting changelog data:", data);
      return _objectSpread(_objectSpread({}, state), {}, {
        common: _objectSpread(_objectSpread({}, state.common), {}, {
          changelogData: data
        })
      });
    };
  },
  setSearchQuery: function setSearchQuery(query) {
    return function (state) {
      console.log("setSearchQuery", query, state);
      return _objectSpread(_objectSpread({}, state), {}, {
        common: _objectSpread(_objectSpread({}, state.common), {}, {
          searchQuery: query
        })
      });
    };
  },
  speciesView: {
    setLocalPage: function setLocalPage(page) {
      return {
        speciesView: {
          currentPage: page
        }
      };
    },
    getLocalPage: function getLocalPage(state) {
      return state.speciesView.currentPage || 1;
    }
  },
  setCurrentPage: function setCurrentPage(page) {
    return function (state) {
      return _objectSpread(_objectSpread({}, state), {}, {
        common: _objectSpread(_objectSpread({}, state.common), {}, {
          currentPage: page
        })
      });
    };
  },
  updateData: function updateData(dataKey) {
    return function (state) {
      return _objectSpread({}, state); // Update this action as needed
    };
  },
  setBlogData: function setBlogData(data) {
    return function (state) {
      console.debug("Setting blog data:", data);
      return _objectSpread(_objectSpread({}, state), {}, {
        common: _objectSpread(_objectSpread({}, state.common), {}, {
          blogData: data
        })
      });
    };
  },
  setSpeciesData: function setSpeciesData(data) {
    return function (state) {
      console.log("Updating species data in state", data);
      return _objectSpread(_objectSpread({}, state), {}, {
        common: _objectSpread(_objectSpread({}, state.common), {}, {
          speciesData: data
        })
      });
    };
  },
  setSpeciesCurrentPage: function setSpeciesCurrentPage(newPage) {
    return function (state) {
      console.log("Setting species current page to:", newPage);
      return {
        common: _objectSpread(_objectSpread({}, state.common), {}, {
          speciesCurrentPage: newPage
        })
      };
    };
  }

  // ... other non-auth actions ...
};
var _default = exports.default = Actions;
},{}],"state/AuthState.js":[function(require,module,exports) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var AuthState = {
  authed: false,
  checked: false,
  user: null,
  error: {},
  hasIdentity: [],
  signupMessage: null,
  fetchSignInMethodsComplete: false
};
var _default = exports.default = AuthState;
},{}],"state/State.js":[function(require,module,exports) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var State = {
  changelogData: [],
  blogData: [],
  speciesData: [],
  searchQuery: ""
};
var _default = exports.default = State;
},{}],"components/HomeView.js":[function(require,module,exports) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var HomeView = function HomeView(state, actions) {
  var heroImageUrl = "https://images.pexels.com/photos/1643402/pexels-photo-1643402.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1"; // Replace with your image URL

  return hyperapp.h("div", {
    class: "container home-view"
  }, [
  // Hero section with image as background and introductory text
  hyperapp.h("section", {
    class: "row hero py-5",
    style: {
      backgroundImage: "url(".concat(heroImageUrl, ")"),
      backgroundSize: "cover",
      backgroundPosition: "center bottom",
      position: "relative",
      height: "30vh"
    }
  }, [hyperapp.h("div", {
    class: "col-md-12 hero-haze",
    style: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(255, 255, 255, 0.8)"
    }
  }), hyperapp.h("div", {
    class: "col-md-12 hero-text-container text-center",
    style: {
      position: "relative",
      zIndex: 2
    }
  }, [hyperapp.h("h1", {
    class: "hero-title"
  }, "Discover the Natural World with ShroomDex"), hyperapp.h("p", {
    class: "hero-description"
  }, "Explore a vast database of fungi species, contribute to citizen science, and climb the ranks on our Leaderboard."), hyperapp.h("div", {
    class: "hero-buttons mt-4"
  }, [state.auth.authed ? hyperapp.h("button", {
    class: "btn btn-primary",
    onclick: function onclick() {
      return actions.navigate("leaderboard");
    }
  }, "Leaderboard") : hyperapp.h("button", {
    class: "btn btn-primary",
    onclick: function onclick() {
      return actions.navigate("login");
    }
  }, "Sign Up Now"), hyperapp.h("button", {
    class: "btn btn-secondary ms-2",
    onclick: function onclick() {
      return actions.navigate("detect");
    }
  }, "Start Detecting")])])]),
  // Additional content sections
  hyperapp.h("section", {
    class: "features py-5"
  }, [hyperapp.h("h2", {}, "Be a Part of Our Growing Community"), hyperapp.h("p", {}, "Join enthusiasts and experts alike in documenting and identifying species. Every discovery enriches our collective understanding and helps you rise through the ranks.")
  // Features or community highlights could go here
  ]), hyperapp.h("section", {
    class: "updates py-5"
  }, [hyperapp.h("h2", {}, "Stay Informed with Our Latest Updates"), hyperapp.h("p", {}, "Check out our Changelog for the latest features and enhancements. Our Blog is also a great resource for news, tutorials, and insights from the world of mycology."),
  // Links to the Changelog and Blog sections
  hyperapp.h("div", {
    class: "update-links mt-4"
  }, [hyperapp.h("button", {
    class: "btn btn-primary",
    onclick: function onclick() {
      return actions.navigate("changelog");
    }
  }, "View Changelog"), hyperapp.h("button", {
    class: "btn btn-secondary ms-2",
    onclick: function onclick() {
      return actions.navigate("blog");
    }
  }, "Read Our Blog")])])
  // ... more sections as needed ...
  ]);
};
var _default = exports.default = HomeView;
},{}],"components/ChangelogView.js":[function(require,module,exports) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
function _regeneratorRuntime() { "use strict"; /*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/facebook/regenerator/blob/main/LICENSE */ _regeneratorRuntime = function _regeneratorRuntime() { return e; }; var t, e = {}, r = Object.prototype, n = r.hasOwnProperty, o = Object.defineProperty || function (t, e, r) { t[e] = r.value; }, i = "function" == typeof Symbol ? Symbol : {}, a = i.iterator || "@@iterator", c = i.asyncIterator || "@@asyncIterator", u = i.toStringTag || "@@toStringTag"; function define(t, e, r) { return Object.defineProperty(t, e, { value: r, enumerable: !0, configurable: !0, writable: !0 }), t[e]; } try { define({}, ""); } catch (t) { define = function define(t, e, r) { return t[e] = r; }; } function wrap(t, e, r, n) { var i = e && e.prototype instanceof Generator ? e : Generator, a = Object.create(i.prototype), c = new Context(n || []); return o(a, "_invoke", { value: makeInvokeMethod(t, r, c) }), a; } function tryCatch(t, e, r) { try { return { type: "normal", arg: t.call(e, r) }; } catch (t) { return { type: "throw", arg: t }; } } e.wrap = wrap; var h = "suspendedStart", l = "suspendedYield", f = "executing", s = "completed", y = {}; function Generator() {} function GeneratorFunction() {} function GeneratorFunctionPrototype() {} var p = {}; define(p, a, function () { return this; }); var d = Object.getPrototypeOf, v = d && d(d(values([]))); v && v !== r && n.call(v, a) && (p = v); var g = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(p); function defineIteratorMethods(t) { ["next", "throw", "return"].forEach(function (e) { define(t, e, function (t) { return this._invoke(e, t); }); }); } function AsyncIterator(t, e) { function invoke(r, o, i, a) { var c = tryCatch(t[r], t, o); if ("throw" !== c.type) { var u = c.arg, h = u.value; return h && "object" == _typeof(h) && n.call(h, "__await") ? e.resolve(h.__await).then(function (t) { invoke("next", t, i, a); }, function (t) { invoke("throw", t, i, a); }) : e.resolve(h).then(function (t) { u.value = t, i(u); }, function (t) { return invoke("throw", t, i, a); }); } a(c.arg); } var r; o(this, "_invoke", { value: function value(t, n) { function callInvokeWithMethodAndArg() { return new e(function (e, r) { invoke(t, n, e, r); }); } return r = r ? r.then(callInvokeWithMethodAndArg, callInvokeWithMethodAndArg) : callInvokeWithMethodAndArg(); } }); } function makeInvokeMethod(e, r, n) { var o = h; return function (i, a) { if (o === f) throw new Error("Generator is already running"); if (o === s) { if ("throw" === i) throw a; return { value: t, done: !0 }; } for (n.method = i, n.arg = a;;) { var c = n.delegate; if (c) { var u = maybeInvokeDelegate(c, n); if (u) { if (u === y) continue; return u; } } if ("next" === n.method) n.sent = n._sent = n.arg;else if ("throw" === n.method) { if (o === h) throw o = s, n.arg; n.dispatchException(n.arg); } else "return" === n.method && n.abrupt("return", n.arg); o = f; var p = tryCatch(e, r, n); if ("normal" === p.type) { if (o = n.done ? s : l, p.arg === y) continue; return { value: p.arg, done: n.done }; } "throw" === p.type && (o = s, n.method = "throw", n.arg = p.arg); } }; } function maybeInvokeDelegate(e, r) { var n = r.method, o = e.iterator[n]; if (o === t) return r.delegate = null, "throw" === n && e.iterator.return && (r.method = "return", r.arg = t, maybeInvokeDelegate(e, r), "throw" === r.method) || "return" !== n && (r.method = "throw", r.arg = new TypeError("The iterator does not provide a '" + n + "' method")), y; var i = tryCatch(o, e.iterator, r.arg); if ("throw" === i.type) return r.method = "throw", r.arg = i.arg, r.delegate = null, y; var a = i.arg; return a ? a.done ? (r[e.resultName] = a.value, r.next = e.nextLoc, "return" !== r.method && (r.method = "next", r.arg = t), r.delegate = null, y) : a : (r.method = "throw", r.arg = new TypeError("iterator result is not an object"), r.delegate = null, y); } function pushTryEntry(t) { var e = { tryLoc: t[0] }; 1 in t && (e.catchLoc = t[1]), 2 in t && (e.finallyLoc = t[2], e.afterLoc = t[3]), this.tryEntries.push(e); } function resetTryEntry(t) { var e = t.completion || {}; e.type = "normal", delete e.arg, t.completion = e; } function Context(t) { this.tryEntries = [{ tryLoc: "root" }], t.forEach(pushTryEntry, this), this.reset(!0); } function values(e) { if (e || "" === e) { var r = e[a]; if (r) return r.call(e); if ("function" == typeof e.next) return e; if (!isNaN(e.length)) { var o = -1, i = function next() { for (; ++o < e.length;) if (n.call(e, o)) return next.value = e[o], next.done = !1, next; return next.value = t, next.done = !0, next; }; return i.next = i; } } throw new TypeError(_typeof(e) + " is not iterable"); } return GeneratorFunction.prototype = GeneratorFunctionPrototype, o(g, "constructor", { value: GeneratorFunctionPrototype, configurable: !0 }), o(GeneratorFunctionPrototype, "constructor", { value: GeneratorFunction, configurable: !0 }), GeneratorFunction.displayName = define(GeneratorFunctionPrototype, u, "GeneratorFunction"), e.isGeneratorFunction = function (t) { var e = "function" == typeof t && t.constructor; return !!e && (e === GeneratorFunction || "GeneratorFunction" === (e.displayName || e.name)); }, e.mark = function (t) { return Object.setPrototypeOf ? Object.setPrototypeOf(t, GeneratorFunctionPrototype) : (t.__proto__ = GeneratorFunctionPrototype, define(t, u, "GeneratorFunction")), t.prototype = Object.create(g), t; }, e.awrap = function (t) { return { __await: t }; }, defineIteratorMethods(AsyncIterator.prototype), define(AsyncIterator.prototype, c, function () { return this; }), e.AsyncIterator = AsyncIterator, e.async = function (t, r, n, o, i) { void 0 === i && (i = Promise); var a = new AsyncIterator(wrap(t, r, n, o), i); return e.isGeneratorFunction(r) ? a : a.next().then(function (t) { return t.done ? t.value : a.next(); }); }, defineIteratorMethods(g), define(g, u, "Generator"), define(g, a, function () { return this; }), define(g, "toString", function () { return "[object Generator]"; }), e.keys = function (t) { var e = Object(t), r = []; for (var n in e) r.push(n); return r.reverse(), function next() { for (; r.length;) { var t = r.pop(); if (t in e) return next.value = t, next.done = !1, next; } return next.done = !0, next; }; }, e.values = values, Context.prototype = { constructor: Context, reset: function reset(e) { if (this.prev = 0, this.next = 0, this.sent = this._sent = t, this.done = !1, this.delegate = null, this.method = "next", this.arg = t, this.tryEntries.forEach(resetTryEntry), !e) for (var r in this) "t" === r.charAt(0) && n.call(this, r) && !isNaN(+r.slice(1)) && (this[r] = t); }, stop: function stop() { this.done = !0; var t = this.tryEntries[0].completion; if ("throw" === t.type) throw t.arg; return this.rval; }, dispatchException: function dispatchException(e) { if (this.done) throw e; var r = this; function handle(n, o) { return a.type = "throw", a.arg = e, r.next = n, o && (r.method = "next", r.arg = t), !!o; } for (var o = this.tryEntries.length - 1; o >= 0; --o) { var i = this.tryEntries[o], a = i.completion; if ("root" === i.tryLoc) return handle("end"); if (i.tryLoc <= this.prev) { var c = n.call(i, "catchLoc"), u = n.call(i, "finallyLoc"); if (c && u) { if (this.prev < i.catchLoc) return handle(i.catchLoc, !0); if (this.prev < i.finallyLoc) return handle(i.finallyLoc); } else if (c) { if (this.prev < i.catchLoc) return handle(i.catchLoc, !0); } else { if (!u) throw new Error("try statement without catch or finally"); if (this.prev < i.finallyLoc) return handle(i.finallyLoc); } } } }, abrupt: function abrupt(t, e) { for (var r = this.tryEntries.length - 1; r >= 0; --r) { var o = this.tryEntries[r]; if (o.tryLoc <= this.prev && n.call(o, "finallyLoc") && this.prev < o.finallyLoc) { var i = o; break; } } i && ("break" === t || "continue" === t) && i.tryLoc <= e && e <= i.finallyLoc && (i = null); var a = i ? i.completion : {}; return a.type = t, a.arg = e, i ? (this.method = "next", this.next = i.finallyLoc, y) : this.complete(a); }, complete: function complete(t, e) { if ("throw" === t.type) throw t.arg; return "break" === t.type || "continue" === t.type ? this.next = t.arg : "return" === t.type ? (this.rval = this.arg = t.arg, this.method = "return", this.next = "end") : "normal" === t.type && e && (this.next = e), y; }, finish: function finish(t) { for (var e = this.tryEntries.length - 1; e >= 0; --e) { var r = this.tryEntries[e]; if (r.finallyLoc === t) return this.complete(r.completion, r.afterLoc), resetTryEntry(r), y; } }, catch: function _catch(t) { for (var e = this.tryEntries.length - 1; e >= 0; --e) { var r = this.tryEntries[e]; if (r.tryLoc === t) { var n = r.completion; if ("throw" === n.type) { var o = n.arg; resetTryEntry(r); } return o; } } throw new Error("illegal catch attempt"); }, delegateYield: function delegateYield(e, r, n) { return this.delegate = { iterator: values(e), resultName: r, nextLoc: n }, "next" === this.method && (this.arg = t), y; } }, e; }
function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }
function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }
// ChangelogView.js
var ChangelogView = function ChangelogView(state, actions) {
  var loadChangelogData = /*#__PURE__*/function () {
    var _ref = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee() {
      var response, contentType, data;
      return _regeneratorRuntime().wrap(function _callee$(_context) {
        while (1) switch (_context.prev = _context.next) {
          case 0:
            _context.prev = 0;
            _context.next = 3;
            return fetch("/data/changelog.json");
          case 3:
            response = _context.sent;
            console.log(response);
            if (response.ok) {
              _context.next = 7;
              break;
            }
            throw new Error("Network response was not ok");
          case 7:
            contentType = response.headers.get("content-type");
            if (!(!contentType || !contentType.includes("application/json"))) {
              _context.next = 10;
              break;
            }
            throw new Error("Response is not JSON");
          case 10:
            _context.next = 12;
            return response.json();
          case 12:
            data = _context.sent;
            actions.setChangelogData(data); // Update state with fetched data
            _context.next = 19;
            break;
          case 16:
            _context.prev = 16;
            _context.t0 = _context["catch"](0);
            console.error("Error fetching changelog:", _context.t0);
          case 19:
          case "end":
            return _context.stop();
        }
      }, _callee, null, [[0, 16]]);
    }));
    return function loadChangelogData() {
      return _ref.apply(this, arguments);
    };
  }();
  if (state.common.changelogData.length === 0) {
    loadChangelogData();
  }

  // Render the changelog view
  return hyperapp.h("div", {
    class: "container changelog-view my-4"
  }, [hyperapp.h("h1", {
    class: "text-center mb-4"
  }, "Changelog"),
  // Map over the changelog data in the state to create the view
  state.common.changelogData.map(function (entry) {
    return hyperapp.h("div", {
      class: "card mb-4"
    }, [hyperapp.h("div", {
      class: "card-header"
    }, [hyperapp.h("h3", {
      class: "mb-0"
    }, "Version ".concat(entry.version)), hyperapp.h("p", {
      class: "mb-0"
    }, entry.date)]), hyperapp.h("div", {
      class: "card-body"
    }, [hyperapp.h("ul", {
      class: "list-group"
    }, [entry.changes.map(function (change, index) {
      return hyperapp.h("li", {
        class: "list-group-item"
      }, [hyperapp.h("span", {
        class: "badge badge-primary"
      }, "Change ".concat(index + 1)), change]);
    })])])]);
  })]);
};
var _default = exports.default = ChangelogView;
},{}],"components/ProjectsView.js":[function(require,module,exports) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
function _regeneratorRuntime() { "use strict"; /*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/facebook/regenerator/blob/main/LICENSE */ _regeneratorRuntime = function _regeneratorRuntime() { return e; }; var t, e = {}, r = Object.prototype, n = r.hasOwnProperty, o = Object.defineProperty || function (t, e, r) { t[e] = r.value; }, i = "function" == typeof Symbol ? Symbol : {}, a = i.iterator || "@@iterator", c = i.asyncIterator || "@@asyncIterator", u = i.toStringTag || "@@toStringTag"; function define(t, e, r) { return Object.defineProperty(t, e, { value: r, enumerable: !0, configurable: !0, writable: !0 }), t[e]; } try { define({}, ""); } catch (t) { define = function define(t, e, r) { return t[e] = r; }; } function wrap(t, e, r, n) { var i = e && e.prototype instanceof Generator ? e : Generator, a = Object.create(i.prototype), c = new Context(n || []); return o(a, "_invoke", { value: makeInvokeMethod(t, r, c) }), a; } function tryCatch(t, e, r) { try { return { type: "normal", arg: t.call(e, r) }; } catch (t) { return { type: "throw", arg: t }; } } e.wrap = wrap; var h = "suspendedStart", l = "suspendedYield", f = "executing", s = "completed", y = {}; function Generator() {} function GeneratorFunction() {} function GeneratorFunctionPrototype() {} var p = {}; define(p, a, function () { return this; }); var d = Object.getPrototypeOf, v = d && d(d(values([]))); v && v !== r && n.call(v, a) && (p = v); var g = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(p); function defineIteratorMethods(t) { ["next", "throw", "return"].forEach(function (e) { define(t, e, function (t) { return this._invoke(e, t); }); }); } function AsyncIterator(t, e) { function invoke(r, o, i, a) { var c = tryCatch(t[r], t, o); if ("throw" !== c.type) { var u = c.arg, h = u.value; return h && "object" == _typeof(h) && n.call(h, "__await") ? e.resolve(h.__await).then(function (t) { invoke("next", t, i, a); }, function (t) { invoke("throw", t, i, a); }) : e.resolve(h).then(function (t) { u.value = t, i(u); }, function (t) { return invoke("throw", t, i, a); }); } a(c.arg); } var r; o(this, "_invoke", { value: function value(t, n) { function callInvokeWithMethodAndArg() { return new e(function (e, r) { invoke(t, n, e, r); }); } return r = r ? r.then(callInvokeWithMethodAndArg, callInvokeWithMethodAndArg) : callInvokeWithMethodAndArg(); } }); } function makeInvokeMethod(e, r, n) { var o = h; return function (i, a) { if (o === f) throw new Error("Generator is already running"); if (o === s) { if ("throw" === i) throw a; return { value: t, done: !0 }; } for (n.method = i, n.arg = a;;) { var c = n.delegate; if (c) { var u = maybeInvokeDelegate(c, n); if (u) { if (u === y) continue; return u; } } if ("next" === n.method) n.sent = n._sent = n.arg;else if ("throw" === n.method) { if (o === h) throw o = s, n.arg; n.dispatchException(n.arg); } else "return" === n.method && n.abrupt("return", n.arg); o = f; var p = tryCatch(e, r, n); if ("normal" === p.type) { if (o = n.done ? s : l, p.arg === y) continue; return { value: p.arg, done: n.done }; } "throw" === p.type && (o = s, n.method = "throw", n.arg = p.arg); } }; } function maybeInvokeDelegate(e, r) { var n = r.method, o = e.iterator[n]; if (o === t) return r.delegate = null, "throw" === n && e.iterator.return && (r.method = "return", r.arg = t, maybeInvokeDelegate(e, r), "throw" === r.method) || "return" !== n && (r.method = "throw", r.arg = new TypeError("The iterator does not provide a '" + n + "' method")), y; var i = tryCatch(o, e.iterator, r.arg); if ("throw" === i.type) return r.method = "throw", r.arg = i.arg, r.delegate = null, y; var a = i.arg; return a ? a.done ? (r[e.resultName] = a.value, r.next = e.nextLoc, "return" !== r.method && (r.method = "next", r.arg = t), r.delegate = null, y) : a : (r.method = "throw", r.arg = new TypeError("iterator result is not an object"), r.delegate = null, y); } function pushTryEntry(t) { var e = { tryLoc: t[0] }; 1 in t && (e.catchLoc = t[1]), 2 in t && (e.finallyLoc = t[2], e.afterLoc = t[3]), this.tryEntries.push(e); } function resetTryEntry(t) { var e = t.completion || {}; e.type = "normal", delete e.arg, t.completion = e; } function Context(t) { this.tryEntries = [{ tryLoc: "root" }], t.forEach(pushTryEntry, this), this.reset(!0); } function values(e) { if (e || "" === e) { var r = e[a]; if (r) return r.call(e); if ("function" == typeof e.next) return e; if (!isNaN(e.length)) { var o = -1, i = function next() { for (; ++o < e.length;) if (n.call(e, o)) return next.value = e[o], next.done = !1, next; return next.value = t, next.done = !0, next; }; return i.next = i; } } throw new TypeError(_typeof(e) + " is not iterable"); } return GeneratorFunction.prototype = GeneratorFunctionPrototype, o(g, "constructor", { value: GeneratorFunctionPrototype, configurable: !0 }), o(GeneratorFunctionPrototype, "constructor", { value: GeneratorFunction, configurable: !0 }), GeneratorFunction.displayName = define(GeneratorFunctionPrototype, u, "GeneratorFunction"), e.isGeneratorFunction = function (t) { var e = "function" == typeof t && t.constructor; return !!e && (e === GeneratorFunction || "GeneratorFunction" === (e.displayName || e.name)); }, e.mark = function (t) { return Object.setPrototypeOf ? Object.setPrototypeOf(t, GeneratorFunctionPrototype) : (t.__proto__ = GeneratorFunctionPrototype, define(t, u, "GeneratorFunction")), t.prototype = Object.create(g), t; }, e.awrap = function (t) { return { __await: t }; }, defineIteratorMethods(AsyncIterator.prototype), define(AsyncIterator.prototype, c, function () { return this; }), e.AsyncIterator = AsyncIterator, e.async = function (t, r, n, o, i) { void 0 === i && (i = Promise); var a = new AsyncIterator(wrap(t, r, n, o), i); return e.isGeneratorFunction(r) ? a : a.next().then(function (t) { return t.done ? t.value : a.next(); }); }, defineIteratorMethods(g), define(g, u, "Generator"), define(g, a, function () { return this; }), define(g, "toString", function () { return "[object Generator]"; }), e.keys = function (t) { var e = Object(t), r = []; for (var n in e) r.push(n); return r.reverse(), function next() { for (; r.length;) { var t = r.pop(); if (t in e) return next.value = t, next.done = !1, next; } return next.done = !0, next; }; }, e.values = values, Context.prototype = { constructor: Context, reset: function reset(e) { if (this.prev = 0, this.next = 0, this.sent = this._sent = t, this.done = !1, this.delegate = null, this.method = "next", this.arg = t, this.tryEntries.forEach(resetTryEntry), !e) for (var r in this) "t" === r.charAt(0) && n.call(this, r) && !isNaN(+r.slice(1)) && (this[r] = t); }, stop: function stop() { this.done = !0; var t = this.tryEntries[0].completion; if ("throw" === t.type) throw t.arg; return this.rval; }, dispatchException: function dispatchException(e) { if (this.done) throw e; var r = this; function handle(n, o) { return a.type = "throw", a.arg = e, r.next = n, o && (r.method = "next", r.arg = t), !!o; } for (var o = this.tryEntries.length - 1; o >= 0; --o) { var i = this.tryEntries[o], a = i.completion; if ("root" === i.tryLoc) return handle("end"); if (i.tryLoc <= this.prev) { var c = n.call(i, "catchLoc"), u = n.call(i, "finallyLoc"); if (c && u) { if (this.prev < i.catchLoc) return handle(i.catchLoc, !0); if (this.prev < i.finallyLoc) return handle(i.finallyLoc); } else if (c) { if (this.prev < i.catchLoc) return handle(i.catchLoc, !0); } else { if (!u) throw new Error("try statement without catch or finally"); if (this.prev < i.finallyLoc) return handle(i.finallyLoc); } } } }, abrupt: function abrupt(t, e) { for (var r = this.tryEntries.length - 1; r >= 0; --r) { var o = this.tryEntries[r]; if (o.tryLoc <= this.prev && n.call(o, "finallyLoc") && this.prev < o.finallyLoc) { var i = o; break; } } i && ("break" === t || "continue" === t) && i.tryLoc <= e && e <= i.finallyLoc && (i = null); var a = i ? i.completion : {}; return a.type = t, a.arg = e, i ? (this.method = "next", this.next = i.finallyLoc, y) : this.complete(a); }, complete: function complete(t, e) { if ("throw" === t.type) throw t.arg; return "break" === t.type || "continue" === t.type ? this.next = t.arg : "return" === t.type ? (this.rval = this.arg = t.arg, this.method = "return", this.next = "end") : "normal" === t.type && e && (this.next = e), y; }, finish: function finish(t) { for (var e = this.tryEntries.length - 1; e >= 0; --e) { var r = this.tryEntries[e]; if (r.finallyLoc === t) return this.complete(r.completion, r.afterLoc), resetTryEntry(r), y; } }, catch: function _catch(t) { for (var e = this.tryEntries.length - 1; e >= 0; --e) { var r = this.tryEntries[e]; if (r.tryLoc === t) { var n = r.completion; if ("throw" === n.type) { var o = n.arg; resetTryEntry(r); } return o; } } throw new Error("illegal catch attempt"); }, delegateYield: function delegateYield(e, r, n) { return this.delegate = { iterator: values(e), resultName: r, nextLoc: n }, "next" === this.method && (this.arg = t), y; } }, e; }
function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }
function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }
var ProjectsView = function ProjectsView(state, actions) {
  var pageSize = 16;

  // Function to load and randomize species data
  function loadSpeciesData() {
    return _loadSpeciesData.apply(this, arguments);
  } // Function to filter species based on search query
  function _loadSpeciesData() {
    _loadSpeciesData = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee() {
      var response, data;
      return _regeneratorRuntime().wrap(function _callee$(_context) {
        while (1) switch (_context.prev = _context.next) {
          case 0:
            console.log("Attempting to fetch species data");
            _context.prev = 1;
            _context.next = 4;
            return fetch("/data/projects.json");
          case 4:
            response = _context.sent;
            console.log("Fetch response received", response);
            if (response.ok) {
              _context.next = 8;
              break;
            }
            throw new Error("Network response was not ok");
          case 8:
            _context.next = 10;
            return response.json();
          case 10:
            data = _context.sent;
            console.log("Fetched species data", data);
            // Randomize the order of species data
            data = data.sort(function () {
              return 0.5 - Math.random();
            });
            _context.next = 15;
            return actions.setSpeciesData(data);
          case 15:
            console.log("Species data set in state", state.common);
            _context.next = 21;
            break;
          case 18:
            _context.prev = 18;
            _context.t0 = _context["catch"](1);
            console.error("Error fetching species data:", _context.t0);
          case 21:
          case "end":
            return _context.stop();
        }
      }, _callee, null, [[1, 18]]);
    }));
    return _loadSpeciesData.apply(this, arguments);
  }
  var filterSpecies = function filterSpecies(speciesData, query) {
    if (!query) return speciesData;
    return speciesData.filter(function (species) {
      return Object.values(species).some(function (value) {
        return value.toString().toLowerCase().includes(query.toLowerCase());
      });
    });
  };

  // Get filtered species data based on search query
  var filteredSpeciesData = filterSpecies(state.common.speciesData, state.common.searchQuery);

  // Calculate pagination for filtered data
  var totalPages = Math.ceil(filteredSpeciesData.length / pageSize);
  var currentPage = state.common.speciesCurrentPage || 1;
  if (state.common.searchQuery && currentPage !== 1) {
    currentPage = 1;
    actions.setSpeciesCurrentPage(1);
  }
  var startIndex = (currentPage - 1) * pageSize;
  var endIndex = Math.min(startIndex + pageSize, filteredSpeciesData.length);

  // Called when the component mounts or updates
  if (state.common.speciesData.length === 0) {
    loadSpeciesData();
  }

  // Update pagination handlers
  var handlePreviousClick = function handlePreviousClick() {
    var newPage = Math.max(1, currentPage - 1);
    actions.setSpeciesCurrentPage(newPage);
  };
  var handleNextClick = function handleNextClick() {
    var newPage = Math.min(totalPages, currentPage + 1);
    actions.setSpeciesCurrentPage(newPage);
  };
  return hyperapp.h("div", {
    class: "container species-view"
  }, [hyperapp.h("h1", {
    class: "mt-3"
  }, "Species"), hyperapp.h("div", {
    class: "row mb-3"
  }, [hyperapp.h("div", {
    class: "col-auto"
  }, [hyperapp.h("button", {
    class: "btn btn-outline-secondary",
    type: "button",
    onclick: loadSpeciesData
  }, "Shuffle"), hyperapp.h("small", {
    class: "text-muted ms-2"
  }, "(Shuffles results)")]), hyperapp.h("div", {
    class: "col"
  }, [hyperapp.h("input", {
    class: "form-control",
    type: "text",
    placeholder: "Search Species",
    oninput: function oninput(e) {
      actions.setSearchQuery(e.target.value);
      actions.setSpeciesCurrentPage(1); // Reset to page 1 on search
    }
  })])]), hyperapp.h("div", {
    class: "row g-1"
  }, [filteredSpeciesData.slice(startIndex, endIndex).map(function (species) {
    return hyperapp.h("div", {
      class: "col-md-3 mb-1"
    }, [hyperapp.h("div", {
      class: "card h-100"
    }, [hyperapp.h("img", {
      class: "card-img-top species-image",
      src: species.imageUrl || "placeholder-image-url.jpg",
      alt: species.commonName
    }), hyperapp.h("div", {
      class: "card-body d-flex flex-column"
    }, [hyperapp.h("h5", {
      class: "card-title"
    }, species.commonName), hyperapp.h("p", {
      class: "card-text flex-grow-1"
    }, "Scientific Name: ".concat(species.scientificName))])])]);
  })]), hyperapp.h("nav", {
    "aria-label": "Species pagination"
  }, [hyperapp.h("ul", {
    class: "pagination"
  }, [hyperapp.h("li", {
    class: "page-item ".concat(currentPage === 1 ? "disabled" : "")
  }, [hyperapp.h("a", {
    class: "page-link",
    href: "#",
    onclick: handlePreviousClick
  }, "Previous")]), hyperapp.h("li", {
    class: "page-item ".concat(currentPage === totalPages ? "disabled" : "")
  }, [hyperapp.h("a", {
    class: "page-link",
    href: "#",
    onclick: handleNextClick
  }, "Next")])])])]);
};
var _default = exports.default = ProjectsView;
},{}],"components/blog/BlogView.js":[function(require,module,exports) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
function _regeneratorRuntime() { "use strict"; /*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/facebook/regenerator/blob/main/LICENSE */ _regeneratorRuntime = function _regeneratorRuntime() { return e; }; var t, e = {}, r = Object.prototype, n = r.hasOwnProperty, o = Object.defineProperty || function (t, e, r) { t[e] = r.value; }, i = "function" == typeof Symbol ? Symbol : {}, a = i.iterator || "@@iterator", c = i.asyncIterator || "@@asyncIterator", u = i.toStringTag || "@@toStringTag"; function define(t, e, r) { return Object.defineProperty(t, e, { value: r, enumerable: !0, configurable: !0, writable: !0 }), t[e]; } try { define({}, ""); } catch (t) { define = function define(t, e, r) { return t[e] = r; }; } function wrap(t, e, r, n) { var i = e && e.prototype instanceof Generator ? e : Generator, a = Object.create(i.prototype), c = new Context(n || []); return o(a, "_invoke", { value: makeInvokeMethod(t, r, c) }), a; } function tryCatch(t, e, r) { try { return { type: "normal", arg: t.call(e, r) }; } catch (t) { return { type: "throw", arg: t }; } } e.wrap = wrap; var h = "suspendedStart", l = "suspendedYield", f = "executing", s = "completed", y = {}; function Generator() {} function GeneratorFunction() {} function GeneratorFunctionPrototype() {} var p = {}; define(p, a, function () { return this; }); var d = Object.getPrototypeOf, v = d && d(d(values([]))); v && v !== r && n.call(v, a) && (p = v); var g = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(p); function defineIteratorMethods(t) { ["next", "throw", "return"].forEach(function (e) { define(t, e, function (t) { return this._invoke(e, t); }); }); } function AsyncIterator(t, e) { function invoke(r, o, i, a) { var c = tryCatch(t[r], t, o); if ("throw" !== c.type) { var u = c.arg, h = u.value; return h && "object" == _typeof(h) && n.call(h, "__await") ? e.resolve(h.__await).then(function (t) { invoke("next", t, i, a); }, function (t) { invoke("throw", t, i, a); }) : e.resolve(h).then(function (t) { u.value = t, i(u); }, function (t) { return invoke("throw", t, i, a); }); } a(c.arg); } var r; o(this, "_invoke", { value: function value(t, n) { function callInvokeWithMethodAndArg() { return new e(function (e, r) { invoke(t, n, e, r); }); } return r = r ? r.then(callInvokeWithMethodAndArg, callInvokeWithMethodAndArg) : callInvokeWithMethodAndArg(); } }); } function makeInvokeMethod(e, r, n) { var o = h; return function (i, a) { if (o === f) throw new Error("Generator is already running"); if (o === s) { if ("throw" === i) throw a; return { value: t, done: !0 }; } for (n.method = i, n.arg = a;;) { var c = n.delegate; if (c) { var u = maybeInvokeDelegate(c, n); if (u) { if (u === y) continue; return u; } } if ("next" === n.method) n.sent = n._sent = n.arg;else if ("throw" === n.method) { if (o === h) throw o = s, n.arg; n.dispatchException(n.arg); } else "return" === n.method && n.abrupt("return", n.arg); o = f; var p = tryCatch(e, r, n); if ("normal" === p.type) { if (o = n.done ? s : l, p.arg === y) continue; return { value: p.arg, done: n.done }; } "throw" === p.type && (o = s, n.method = "throw", n.arg = p.arg); } }; } function maybeInvokeDelegate(e, r) { var n = r.method, o = e.iterator[n]; if (o === t) return r.delegate = null, "throw" === n && e.iterator.return && (r.method = "return", r.arg = t, maybeInvokeDelegate(e, r), "throw" === r.method) || "return" !== n && (r.method = "throw", r.arg = new TypeError("The iterator does not provide a '" + n + "' method")), y; var i = tryCatch(o, e.iterator, r.arg); if ("throw" === i.type) return r.method = "throw", r.arg = i.arg, r.delegate = null, y; var a = i.arg; return a ? a.done ? (r[e.resultName] = a.value, r.next = e.nextLoc, "return" !== r.method && (r.method = "next", r.arg = t), r.delegate = null, y) : a : (r.method = "throw", r.arg = new TypeError("iterator result is not an object"), r.delegate = null, y); } function pushTryEntry(t) { var e = { tryLoc: t[0] }; 1 in t && (e.catchLoc = t[1]), 2 in t && (e.finallyLoc = t[2], e.afterLoc = t[3]), this.tryEntries.push(e); } function resetTryEntry(t) { var e = t.completion || {}; e.type = "normal", delete e.arg, t.completion = e; } function Context(t) { this.tryEntries = [{ tryLoc: "root" }], t.forEach(pushTryEntry, this), this.reset(!0); } function values(e) { if (e || "" === e) { var r = e[a]; if (r) return r.call(e); if ("function" == typeof e.next) return e; if (!isNaN(e.length)) { var o = -1, i = function next() { for (; ++o < e.length;) if (n.call(e, o)) return next.value = e[o], next.done = !1, next; return next.value = t, next.done = !0, next; }; return i.next = i; } } throw new TypeError(_typeof(e) + " is not iterable"); } return GeneratorFunction.prototype = GeneratorFunctionPrototype, o(g, "constructor", { value: GeneratorFunctionPrototype, configurable: !0 }), o(GeneratorFunctionPrototype, "constructor", { value: GeneratorFunction, configurable: !0 }), GeneratorFunction.displayName = define(GeneratorFunctionPrototype, u, "GeneratorFunction"), e.isGeneratorFunction = function (t) { var e = "function" == typeof t && t.constructor; return !!e && (e === GeneratorFunction || "GeneratorFunction" === (e.displayName || e.name)); }, e.mark = function (t) { return Object.setPrototypeOf ? Object.setPrototypeOf(t, GeneratorFunctionPrototype) : (t.__proto__ = GeneratorFunctionPrototype, define(t, u, "GeneratorFunction")), t.prototype = Object.create(g), t; }, e.awrap = function (t) { return { __await: t }; }, defineIteratorMethods(AsyncIterator.prototype), define(AsyncIterator.prototype, c, function () { return this; }), e.AsyncIterator = AsyncIterator, e.async = function (t, r, n, o, i) { void 0 === i && (i = Promise); var a = new AsyncIterator(wrap(t, r, n, o), i); return e.isGeneratorFunction(r) ? a : a.next().then(function (t) { return t.done ? t.value : a.next(); }); }, defineIteratorMethods(g), define(g, u, "Generator"), define(g, a, function () { return this; }), define(g, "toString", function () { return "[object Generator]"; }), e.keys = function (t) { var e = Object(t), r = []; for (var n in e) r.push(n); return r.reverse(), function next() { for (; r.length;) { var t = r.pop(); if (t in e) return next.value = t, next.done = !1, next; } return next.done = !0, next; }; }, e.values = values, Context.prototype = { constructor: Context, reset: function reset(e) { if (this.prev = 0, this.next = 0, this.sent = this._sent = t, this.done = !1, this.delegate = null, this.method = "next", this.arg = t, this.tryEntries.forEach(resetTryEntry), !e) for (var r in this) "t" === r.charAt(0) && n.call(this, r) && !isNaN(+r.slice(1)) && (this[r] = t); }, stop: function stop() { this.done = !0; var t = this.tryEntries[0].completion; if ("throw" === t.type) throw t.arg; return this.rval; }, dispatchException: function dispatchException(e) { if (this.done) throw e; var r = this; function handle(n, o) { return a.type = "throw", a.arg = e, r.next = n, o && (r.method = "next", r.arg = t), !!o; } for (var o = this.tryEntries.length - 1; o >= 0; --o) { var i = this.tryEntries[o], a = i.completion; if ("root" === i.tryLoc) return handle("end"); if (i.tryLoc <= this.prev) { var c = n.call(i, "catchLoc"), u = n.call(i, "finallyLoc"); if (c && u) { if (this.prev < i.catchLoc) return handle(i.catchLoc, !0); if (this.prev < i.finallyLoc) return handle(i.finallyLoc); } else if (c) { if (this.prev < i.catchLoc) return handle(i.catchLoc, !0); } else { if (!u) throw new Error("try statement without catch or finally"); if (this.prev < i.finallyLoc) return handle(i.finallyLoc); } } } }, abrupt: function abrupt(t, e) { for (var r = this.tryEntries.length - 1; r >= 0; --r) { var o = this.tryEntries[r]; if (o.tryLoc <= this.prev && n.call(o, "finallyLoc") && this.prev < o.finallyLoc) { var i = o; break; } } i && ("break" === t || "continue" === t) && i.tryLoc <= e && e <= i.finallyLoc && (i = null); var a = i ? i.completion : {}; return a.type = t, a.arg = e, i ? (this.method = "next", this.next = i.finallyLoc, y) : this.complete(a); }, complete: function complete(t, e) { if ("throw" === t.type) throw t.arg; return "break" === t.type || "continue" === t.type ? this.next = t.arg : "return" === t.type ? (this.rval = this.arg = t.arg, this.method = "return", this.next = "end") : "normal" === t.type && e && (this.next = e), y; }, finish: function finish(t) { for (var e = this.tryEntries.length - 1; e >= 0; --e) { var r = this.tryEntries[e]; if (r.finallyLoc === t) return this.complete(r.completion, r.afterLoc), resetTryEntry(r), y; } }, catch: function _catch(t) { for (var e = this.tryEntries.length - 1; e >= 0; --e) { var r = this.tryEntries[e]; if (r.tryLoc === t) { var n = r.completion; if ("throw" === n.type) { var o = n.arg; resetTryEntry(r); } return o; } } throw new Error("illegal catch attempt"); }, delegateYield: function delegateYield(e, r, n) { return this.delegate = { iterator: values(e), resultName: r, nextLoc: n }, "next" === this.method && (this.arg = t), y; } }, e; }
function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }
function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }
// BlogView.js
var BlogView = function BlogView(state, actions) {
  var loadBlogData = /*#__PURE__*/function () {
    var _ref = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee() {
      var response, data;
      return _regeneratorRuntime().wrap(function _callee$(_context) {
        while (1) switch (_context.prev = _context.next) {
          case 0:
            _context.prev = 0;
            _context.next = 3;
            return fetch("/data/blog.json");
          case 3:
            response = _context.sent;
            if (response.ok) {
              _context.next = 6;
              break;
            }
            throw new Error("Network response was not ok");
          case 6:
            _context.next = 8;
            return response.json();
          case 8:
            data = _context.sent;
            actions.setBlogData(data); // Update state with fetched data
            _context.next = 15;
            break;
          case 12:
            _context.prev = 12;
            _context.t0 = _context["catch"](0);
            console.error("Error fetching blog:", _context.t0);
          case 15:
          case "end":
            return _context.stop();
        }
      }, _callee, null, [[0, 12]]);
    }));
    return function loadBlogData() {
      return _ref.apply(this, arguments);
    };
  }();
  if (state.common.blogData.length === 0) {
    loadBlogData();
  }

  // Render the latest blog view
  return hyperapp.h("div", {
    class: "container blog-view my-4"
  }, [hyperapp.h("h1", {
    class: "text-center mb-4"
  }, "Latest Blog Posts"), hyperapp.h("div", {
    class: "row"
  }, state.common.blogData.slice(0, 8).map(function (post, index) {
    return hyperapp.h("div", {
      class: "col-md-3 mb-4",
      key: index
    }, [hyperapp.h("div", {
      class: "card"
    }, [hyperapp.h("div", {
      class: "card-body"
    }, [hyperapp.h("h2", {
      class: "card-title"
    }, post.title), hyperapp.h("p", {
      class: "card-text"
    }, post.date), hyperapp.h("p", {
      class: "card-text"
    }, post.content)])])]);
  }))]);
};
var _default = exports.default = BlogView;
},{}],"components/NavBar.js":[function(require,module,exports) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var Navbar = function Navbar(state, actions) {
  return hyperapp.h("nav", {
    class: "navbar navbar-expand-lg navbar-light bg-light"
  }, [hyperapp.h("div", {
    class: "container-fluid"
  }, [hyperapp.h("a", {
    class: "navbar-brand",
    href: "#"
  }, "Joshua Wiedeman"), hyperapp.h("button", {
    class: "navbar-toggler",
    type: "button",
    "data-bs-toggle": "collapse",
    "data-bs-target": "#navbarNav",
    "aria-controls": "navbarNav",
    "aria-expanded": "false",
    "aria-label": "Toggle navigation"
  }, [hyperapp.h("span", {
    class: "navbar-toggler-icon"
  })]), hyperapp.h("div", {
    class: "collapse navbar-collapse",
    id: "navbarNav"
  }, [hyperapp.h("ul", {
    class: "navbar-nav me-auto mb-2 mb-lg-0"
  }, [hyperapp.h("li", {
    class: "nav-item"
  }, [hyperapp.h("a", {
    class: "nav-link",
    href: "#",
    onclick: function onclick() {
      return actions.navigate("home");
    }
  }, "Home")]), hyperapp.h("li", {
    class: "nav-item"
  }, [hyperapp.h("a", {
    class: "nav-link",
    href: "#",
    onclick: function onclick() {
      return actions.navigate("projects");
    }
  }, "Projects")]), hyperapp.h("li", {
    class: "nav-item"
  }, [hyperapp.h("a", {
    class: "nav-link",
    href: "#",
    onclick: function onclick() {
      return actions.navigate("blog");
    }
  }, "Blog")]), hyperapp.h("li", {
    class: "nav-item"
  }, [hyperapp.h("a", {
    class: "nav-link",
    href: "#",
    onclick: function onclick() {
      return actions.navigate("changelog");
    }
  }, "Changelog")])]),
  // Profile and Logout
  state.auth.authed ? hyperapp.h("div", {
    class: "d-flex"
  }, [hyperapp.h("a", {
    class: "nav-link",
    href: "#",
    onclick: function onclick() {
      return actions.navigate("profile");
    }
  }, "Profile"), hyperapp.h("a", {
    class: "nav-link",
    href: "#",
    onclick: function onclick() {
      return actions.signout();
    }
  }, "Logout")]) : hyperapp.h("a", {
    class: "nav-link",
    href: "#",
    onclick: function onclick() {
      return actions.navigate("login");
    }
  }, "Login")])])]);
};
var _default = exports.default = Navbar;
},{}],"components/IdentityForm.js":[function(require,module,exports) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
function _regeneratorRuntime() { "use strict"; /*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/facebook/regenerator/blob/main/LICENSE */ _regeneratorRuntime = function _regeneratorRuntime() { return e; }; var t, e = {}, r = Object.prototype, n = r.hasOwnProperty, o = Object.defineProperty || function (t, e, r) { t[e] = r.value; }, i = "function" == typeof Symbol ? Symbol : {}, a = i.iterator || "@@iterator", c = i.asyncIterator || "@@asyncIterator", u = i.toStringTag || "@@toStringTag"; function define(t, e, r) { return Object.defineProperty(t, e, { value: r, enumerable: !0, configurable: !0, writable: !0 }), t[e]; } try { define({}, ""); } catch (t) { define = function define(t, e, r) { return t[e] = r; }; } function wrap(t, e, r, n) { var i = e && e.prototype instanceof Generator ? e : Generator, a = Object.create(i.prototype), c = new Context(n || []); return o(a, "_invoke", { value: makeInvokeMethod(t, r, c) }), a; } function tryCatch(t, e, r) { try { return { type: "normal", arg: t.call(e, r) }; } catch (t) { return { type: "throw", arg: t }; } } e.wrap = wrap; var h = "suspendedStart", l = "suspendedYield", f = "executing", s = "completed", y = {}; function Generator() {} function GeneratorFunction() {} function GeneratorFunctionPrototype() {} var p = {}; define(p, a, function () { return this; }); var d = Object.getPrototypeOf, v = d && d(d(values([]))); v && v !== r && n.call(v, a) && (p = v); var g = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(p); function defineIteratorMethods(t) { ["next", "throw", "return"].forEach(function (e) { define(t, e, function (t) { return this._invoke(e, t); }); }); } function AsyncIterator(t, e) { function invoke(r, o, i, a) { var c = tryCatch(t[r], t, o); if ("throw" !== c.type) { var u = c.arg, h = u.value; return h && "object" == _typeof(h) && n.call(h, "__await") ? e.resolve(h.__await).then(function (t) { invoke("next", t, i, a); }, function (t) { invoke("throw", t, i, a); }) : e.resolve(h).then(function (t) { u.value = t, i(u); }, function (t) { return invoke("throw", t, i, a); }); } a(c.arg); } var r; o(this, "_invoke", { value: function value(t, n) { function callInvokeWithMethodAndArg() { return new e(function (e, r) { invoke(t, n, e, r); }); } return r = r ? r.then(callInvokeWithMethodAndArg, callInvokeWithMethodAndArg) : callInvokeWithMethodAndArg(); } }); } function makeInvokeMethod(e, r, n) { var o = h; return function (i, a) { if (o === f) throw new Error("Generator is already running"); if (o === s) { if ("throw" === i) throw a; return { value: t, done: !0 }; } for (n.method = i, n.arg = a;;) { var c = n.delegate; if (c) { var u = maybeInvokeDelegate(c, n); if (u) { if (u === y) continue; return u; } } if ("next" === n.method) n.sent = n._sent = n.arg;else if ("throw" === n.method) { if (o === h) throw o = s, n.arg; n.dispatchException(n.arg); } else "return" === n.method && n.abrupt("return", n.arg); o = f; var p = tryCatch(e, r, n); if ("normal" === p.type) { if (o = n.done ? s : l, p.arg === y) continue; return { value: p.arg, done: n.done }; } "throw" === p.type && (o = s, n.method = "throw", n.arg = p.arg); } }; } function maybeInvokeDelegate(e, r) { var n = r.method, o = e.iterator[n]; if (o === t) return r.delegate = null, "throw" === n && e.iterator.return && (r.method = "return", r.arg = t, maybeInvokeDelegate(e, r), "throw" === r.method) || "return" !== n && (r.method = "throw", r.arg = new TypeError("The iterator does not provide a '" + n + "' method")), y; var i = tryCatch(o, e.iterator, r.arg); if ("throw" === i.type) return r.method = "throw", r.arg = i.arg, r.delegate = null, y; var a = i.arg; return a ? a.done ? (r[e.resultName] = a.value, r.next = e.nextLoc, "return" !== r.method && (r.method = "next", r.arg = t), r.delegate = null, y) : a : (r.method = "throw", r.arg = new TypeError("iterator result is not an object"), r.delegate = null, y); } function pushTryEntry(t) { var e = { tryLoc: t[0] }; 1 in t && (e.catchLoc = t[1]), 2 in t && (e.finallyLoc = t[2], e.afterLoc = t[3]), this.tryEntries.push(e); } function resetTryEntry(t) { var e = t.completion || {}; e.type = "normal", delete e.arg, t.completion = e; } function Context(t) { this.tryEntries = [{ tryLoc: "root" }], t.forEach(pushTryEntry, this), this.reset(!0); } function values(e) { if (e || "" === e) { var r = e[a]; if (r) return r.call(e); if ("function" == typeof e.next) return e; if (!isNaN(e.length)) { var o = -1, i = function next() { for (; ++o < e.length;) if (n.call(e, o)) return next.value = e[o], next.done = !1, next; return next.value = t, next.done = !0, next; }; return i.next = i; } } throw new TypeError(_typeof(e) + " is not iterable"); } return GeneratorFunction.prototype = GeneratorFunctionPrototype, o(g, "constructor", { value: GeneratorFunctionPrototype, configurable: !0 }), o(GeneratorFunctionPrototype, "constructor", { value: GeneratorFunction, configurable: !0 }), GeneratorFunction.displayName = define(GeneratorFunctionPrototype, u, "GeneratorFunction"), e.isGeneratorFunction = function (t) { var e = "function" == typeof t && t.constructor; return !!e && (e === GeneratorFunction || "GeneratorFunction" === (e.displayName || e.name)); }, e.mark = function (t) { return Object.setPrototypeOf ? Object.setPrototypeOf(t, GeneratorFunctionPrototype) : (t.__proto__ = GeneratorFunctionPrototype, define(t, u, "GeneratorFunction")), t.prototype = Object.create(g), t; }, e.awrap = function (t) { return { __await: t }; }, defineIteratorMethods(AsyncIterator.prototype), define(AsyncIterator.prototype, c, function () { return this; }), e.AsyncIterator = AsyncIterator, e.async = function (t, r, n, o, i) { void 0 === i && (i = Promise); var a = new AsyncIterator(wrap(t, r, n, o), i); return e.isGeneratorFunction(r) ? a : a.next().then(function (t) { return t.done ? t.value : a.next(); }); }, defineIteratorMethods(g), define(g, u, "Generator"), define(g, a, function () { return this; }), define(g, "toString", function () { return "[object Generator]"; }), e.keys = function (t) { var e = Object(t), r = []; for (var n in e) r.push(n); return r.reverse(), function next() { for (; r.length;) { var t = r.pop(); if (t in e) return next.value = t, next.done = !1, next; } return next.done = !0, next; }; }, e.values = values, Context.prototype = { constructor: Context, reset: function reset(e) { if (this.prev = 0, this.next = 0, this.sent = this._sent = t, this.done = !1, this.delegate = null, this.method = "next", this.arg = t, this.tryEntries.forEach(resetTryEntry), !e) for (var r in this) "t" === r.charAt(0) && n.call(this, r) && !isNaN(+r.slice(1)) && (this[r] = t); }, stop: function stop() { this.done = !0; var t = this.tryEntries[0].completion; if ("throw" === t.type) throw t.arg; return this.rval; }, dispatchException: function dispatchException(e) { if (this.done) throw e; var r = this; function handle(n, o) { return a.type = "throw", a.arg = e, r.next = n, o && (r.method = "next", r.arg = t), !!o; } for (var o = this.tryEntries.length - 1; o >= 0; --o) { var i = this.tryEntries[o], a = i.completion; if ("root" === i.tryLoc) return handle("end"); if (i.tryLoc <= this.prev) { var c = n.call(i, "catchLoc"), u = n.call(i, "finallyLoc"); if (c && u) { if (this.prev < i.catchLoc) return handle(i.catchLoc, !0); if (this.prev < i.finallyLoc) return handle(i.finallyLoc); } else if (c) { if (this.prev < i.catchLoc) return handle(i.catchLoc, !0); } else { if (!u) throw new Error("try statement without catch or finally"); if (this.prev < i.finallyLoc) return handle(i.finallyLoc); } } } }, abrupt: function abrupt(t, e) { for (var r = this.tryEntries.length - 1; r >= 0; --r) { var o = this.tryEntries[r]; if (o.tryLoc <= this.prev && n.call(o, "finallyLoc") && this.prev < o.finallyLoc) { var i = o; break; } } i && ("break" === t || "continue" === t) && i.tryLoc <= e && e <= i.finallyLoc && (i = null); var a = i ? i.completion : {}; return a.type = t, a.arg = e, i ? (this.method = "next", this.next = i.finallyLoc, y) : this.complete(a); }, complete: function complete(t, e) { if ("throw" === t.type) throw t.arg; return "break" === t.type || "continue" === t.type ? this.next = t.arg : "return" === t.type ? (this.rval = this.arg = t.arg, this.method = "return", this.next = "end") : "normal" === t.type && e && (this.next = e), y; }, finish: function finish(t) { for (var e = this.tryEntries.length - 1; e >= 0; --e) { var r = this.tryEntries[e]; if (r.finallyLoc === t) return this.complete(r.completion, r.afterLoc), resetTryEntry(r), y; } }, catch: function _catch(t) { for (var e = this.tryEntries.length - 1; e >= 0; --e) { var r = this.tryEntries[e]; if (r.tryLoc === t) { var n = r.completion; if ("throw" === n.type) { var o = n.arg; resetTryEntry(r); } return o; } } throw new Error("illegal catch attempt"); }, delegateYield: function delegateYield(e, r, n) { return this.delegate = { iterator: values(e), resultName: r, nextLoc: n }, "next" === this.method && (this.arg = t), y; } }, e; }
function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }
function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }
// In IdentityForm.js
var IdentityForm = function IdentityForm(state, actions) {
  return hyperapp.h("div", {
    class: "container mt-4 d-flex justify-content-center",
    style: {
      maxWidth: "30%"
    }
  },
  // Limit the width to 30%
  [hyperapp.h("form", {
    class: "needs-validation",
    onsubmit: function () {
      var _onsubmit = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee(event) {
        var email;
        return _regeneratorRuntime().wrap(function _callee$(_context) {
          while (1) switch (_context.prev = _context.next) {
            case 0:
              event.preventDefault();
              email = event.target[0].value; // Use event.target[0] to access the first input field
              _context.next = 4;
              return actions.setUser({
                email: email
              });
            case 4:
              _context.prev = 4;
              _context.next = 7;
              return actions.fetchAndSetSignInMethods({
                email: email
              }, actions);
            case 7:
              _context.next = 13;
              break;
            case 9:
              _context.prev = 9;
              _context.t0 = _context["catch"](4);
              console.error("Error fetching sign-in methods:", _context.t0);
              actions.setError(_context.t0);
            case 13:
            case "end":
              return _context.stop();
          }
        }, _callee, null, [[4, 9]]);
      }));
      function onsubmit(_x) {
        return _onsubmit.apply(this, arguments);
      }
      return onsubmit;
    }()
  }, [hyperapp.h("div", {
    class: "mb-3"
  }, [hyperapp.h("label", {
    class: "form-label",
    for: "exampleInputEmail1"
  }, "Email address"), hyperapp.h("input", {
    type: "email",
    class: "form-control",
    id: "exampleInputEmail1",
    ariaDescribedby: "emailHelp",
    placeholder: "Email Address",
    required: true
  }), hyperapp.h("div", {
    id: "emailHelp",
    class: "form-text"
  }, "We'll never share your email with anyone else.")]), hyperapp.h("button", {
    type: "submit",
    class: "btn btn-primary"
  }, "Continue")])]);
};
var _default = exports.default = IdentityForm;
},{}],"components/SigninForm.js":[function(require,module,exports) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var SigninForm = function SigninForm(state, actions) {
  return hyperapp.h("div", {
    class: "container mt-4 d-flex justify-content-center",
    style: {
      maxWidth: "30%"
    }
  },
  // Limit the width to 30%
  [hyperapp.h("form", {
    class: "needs-validation",
    onsubmit: function onsubmit(event) {
      event.preventDefault();
      console.log(state);
      var email = state.auth.user.email; // Assuming email is stored in state.user.email
      var password = event.target[0].value; // Use event.target[0] to access the first input field
      actions.signin({
        email: email,
        password: password
      });
    }
  }, [hyperapp.h("div", {
    class: "mb-3 welcome-back-message"
  }, "Thank you for returning, please sign in below."), hyperapp.h("input", {
    type: "password",
    class: "form-control",
    placeholder: "Password",
    required: true
  }), hyperapp.h("button", {
    type: "submit",
    class: "btn btn-primary mt-3"
  }, "Sign In")])]);
};
var _default = exports.default = SigninForm;
},{}],"components/SignupForm.js":[function(require,module,exports) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
function _regeneratorRuntime() { "use strict"; /*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/facebook/regenerator/blob/main/LICENSE */ _regeneratorRuntime = function _regeneratorRuntime() { return e; }; var t, e = {}, r = Object.prototype, n = r.hasOwnProperty, o = Object.defineProperty || function (t, e, r) { t[e] = r.value; }, i = "function" == typeof Symbol ? Symbol : {}, a = i.iterator || "@@iterator", c = i.asyncIterator || "@@asyncIterator", u = i.toStringTag || "@@toStringTag"; function define(t, e, r) { return Object.defineProperty(t, e, { value: r, enumerable: !0, configurable: !0, writable: !0 }), t[e]; } try { define({}, ""); } catch (t) { define = function define(t, e, r) { return t[e] = r; }; } function wrap(t, e, r, n) { var i = e && e.prototype instanceof Generator ? e : Generator, a = Object.create(i.prototype), c = new Context(n || []); return o(a, "_invoke", { value: makeInvokeMethod(t, r, c) }), a; } function tryCatch(t, e, r) { try { return { type: "normal", arg: t.call(e, r) }; } catch (t) { return { type: "throw", arg: t }; } } e.wrap = wrap; var h = "suspendedStart", l = "suspendedYield", f = "executing", s = "completed", y = {}; function Generator() {} function GeneratorFunction() {} function GeneratorFunctionPrototype() {} var p = {}; define(p, a, function () { return this; }); var d = Object.getPrototypeOf, v = d && d(d(values([]))); v && v !== r && n.call(v, a) && (p = v); var g = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(p); function defineIteratorMethods(t) { ["next", "throw", "return"].forEach(function (e) { define(t, e, function (t) { return this._invoke(e, t); }); }); } function AsyncIterator(t, e) { function invoke(r, o, i, a) { var c = tryCatch(t[r], t, o); if ("throw" !== c.type) { var u = c.arg, h = u.value; return h && "object" == _typeof(h) && n.call(h, "__await") ? e.resolve(h.__await).then(function (t) { invoke("next", t, i, a); }, function (t) { invoke("throw", t, i, a); }) : e.resolve(h).then(function (t) { u.value = t, i(u); }, function (t) { return invoke("throw", t, i, a); }); } a(c.arg); } var r; o(this, "_invoke", { value: function value(t, n) { function callInvokeWithMethodAndArg() { return new e(function (e, r) { invoke(t, n, e, r); }); } return r = r ? r.then(callInvokeWithMethodAndArg, callInvokeWithMethodAndArg) : callInvokeWithMethodAndArg(); } }); } function makeInvokeMethod(e, r, n) { var o = h; return function (i, a) { if (o === f) throw new Error("Generator is already running"); if (o === s) { if ("throw" === i) throw a; return { value: t, done: !0 }; } for (n.method = i, n.arg = a;;) { var c = n.delegate; if (c) { var u = maybeInvokeDelegate(c, n); if (u) { if (u === y) continue; return u; } } if ("next" === n.method) n.sent = n._sent = n.arg;else if ("throw" === n.method) { if (o === h) throw o = s, n.arg; n.dispatchException(n.arg); } else "return" === n.method && n.abrupt("return", n.arg); o = f; var p = tryCatch(e, r, n); if ("normal" === p.type) { if (o = n.done ? s : l, p.arg === y) continue; return { value: p.arg, done: n.done }; } "throw" === p.type && (o = s, n.method = "throw", n.arg = p.arg); } }; } function maybeInvokeDelegate(e, r) { var n = r.method, o = e.iterator[n]; if (o === t) return r.delegate = null, "throw" === n && e.iterator.return && (r.method = "return", r.arg = t, maybeInvokeDelegate(e, r), "throw" === r.method) || "return" !== n && (r.method = "throw", r.arg = new TypeError("The iterator does not provide a '" + n + "' method")), y; var i = tryCatch(o, e.iterator, r.arg); if ("throw" === i.type) return r.method = "throw", r.arg = i.arg, r.delegate = null, y; var a = i.arg; return a ? a.done ? (r[e.resultName] = a.value, r.next = e.nextLoc, "return" !== r.method && (r.method = "next", r.arg = t), r.delegate = null, y) : a : (r.method = "throw", r.arg = new TypeError("iterator result is not an object"), r.delegate = null, y); } function pushTryEntry(t) { var e = { tryLoc: t[0] }; 1 in t && (e.catchLoc = t[1]), 2 in t && (e.finallyLoc = t[2], e.afterLoc = t[3]), this.tryEntries.push(e); } function resetTryEntry(t) { var e = t.completion || {}; e.type = "normal", delete e.arg, t.completion = e; } function Context(t) { this.tryEntries = [{ tryLoc: "root" }], t.forEach(pushTryEntry, this), this.reset(!0); } function values(e) { if (e || "" === e) { var r = e[a]; if (r) return r.call(e); if ("function" == typeof e.next) return e; if (!isNaN(e.length)) { var o = -1, i = function next() { for (; ++o < e.length;) if (n.call(e, o)) return next.value = e[o], next.done = !1, next; return next.value = t, next.done = !0, next; }; return i.next = i; } } throw new TypeError(_typeof(e) + " is not iterable"); } return GeneratorFunction.prototype = GeneratorFunctionPrototype, o(g, "constructor", { value: GeneratorFunctionPrototype, configurable: !0 }), o(GeneratorFunctionPrototype, "constructor", { value: GeneratorFunction, configurable: !0 }), GeneratorFunction.displayName = define(GeneratorFunctionPrototype, u, "GeneratorFunction"), e.isGeneratorFunction = function (t) { var e = "function" == typeof t && t.constructor; return !!e && (e === GeneratorFunction || "GeneratorFunction" === (e.displayName || e.name)); }, e.mark = function (t) { return Object.setPrototypeOf ? Object.setPrototypeOf(t, GeneratorFunctionPrototype) : (t.__proto__ = GeneratorFunctionPrototype, define(t, u, "GeneratorFunction")), t.prototype = Object.create(g), t; }, e.awrap = function (t) { return { __await: t }; }, defineIteratorMethods(AsyncIterator.prototype), define(AsyncIterator.prototype, c, function () { return this; }), e.AsyncIterator = AsyncIterator, e.async = function (t, r, n, o, i) { void 0 === i && (i = Promise); var a = new AsyncIterator(wrap(t, r, n, o), i); return e.isGeneratorFunction(r) ? a : a.next().then(function (t) { return t.done ? t.value : a.next(); }); }, defineIteratorMethods(g), define(g, u, "Generator"), define(g, a, function () { return this; }), define(g, "toString", function () { return "[object Generator]"; }), e.keys = function (t) { var e = Object(t), r = []; for (var n in e) r.push(n); return r.reverse(), function next() { for (; r.length;) { var t = r.pop(); if (t in e) return next.value = t, next.done = !1, next; } return next.done = !0, next; }; }, e.values = values, Context.prototype = { constructor: Context, reset: function reset(e) { if (this.prev = 0, this.next = 0, this.sent = this._sent = t, this.done = !1, this.delegate = null, this.method = "next", this.arg = t, this.tryEntries.forEach(resetTryEntry), !e) for (var r in this) "t" === r.charAt(0) && n.call(this, r) && !isNaN(+r.slice(1)) && (this[r] = t); }, stop: function stop() { this.done = !0; var t = this.tryEntries[0].completion; if ("throw" === t.type) throw t.arg; return this.rval; }, dispatchException: function dispatchException(e) { if (this.done) throw e; var r = this; function handle(n, o) { return a.type = "throw", a.arg = e, r.next = n, o && (r.method = "next", r.arg = t), !!o; } for (var o = this.tryEntries.length - 1; o >= 0; --o) { var i = this.tryEntries[o], a = i.completion; if ("root" === i.tryLoc) return handle("end"); if (i.tryLoc <= this.prev) { var c = n.call(i, "catchLoc"), u = n.call(i, "finallyLoc"); if (c && u) { if (this.prev < i.catchLoc) return handle(i.catchLoc, !0); if (this.prev < i.finallyLoc) return handle(i.finallyLoc); } else if (c) { if (this.prev < i.catchLoc) return handle(i.catchLoc, !0); } else { if (!u) throw new Error("try statement without catch or finally"); if (this.prev < i.finallyLoc) return handle(i.finallyLoc); } } } }, abrupt: function abrupt(t, e) { for (var r = this.tryEntries.length - 1; r >= 0; --r) { var o = this.tryEntries[r]; if (o.tryLoc <= this.prev && n.call(o, "finallyLoc") && this.prev < o.finallyLoc) { var i = o; break; } } i && ("break" === t || "continue" === t) && i.tryLoc <= e && e <= i.finallyLoc && (i = null); var a = i ? i.completion : {}; return a.type = t, a.arg = e, i ? (this.method = "next", this.next = i.finallyLoc, y) : this.complete(a); }, complete: function complete(t, e) { if ("throw" === t.type) throw t.arg; return "break" === t.type || "continue" === t.type ? this.next = t.arg : "return" === t.type ? (this.rval = this.arg = t.arg, this.method = "return", this.next = "end") : "normal" === t.type && e && (this.next = e), y; }, finish: function finish(t) { for (var e = this.tryEntries.length - 1; e >= 0; --e) { var r = this.tryEntries[e]; if (r.finallyLoc === t) return this.complete(r.completion, r.afterLoc), resetTryEntry(r), y; } }, catch: function _catch(t) { for (var e = this.tryEntries.length - 1; e >= 0; --e) { var r = this.tryEntries[e]; if (r.tryLoc === t) { var n = r.completion; if ("throw" === n.type) { var o = n.arg; resetTryEntry(r); } return o; } } throw new Error("illegal catch attempt"); }, delegateYield: function delegateYield(e, r, n) { return this.delegate = { iterator: values(e), resultName: r, nextLoc: n }, "next" === this.method && (this.arg = t), y; } }, e; }
function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }
function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }
var SignupForm = function SignupForm(state, actions) {
  return hyperapp.h("div", {
    class: "container mt-4 d-flex justify-content-center",
    style: {
      maxWidth: "30%"
    }
  },
  // Limit the width to 30%
  [hyperapp.h("form", {
    class: "needs-validation",
    onsubmit: function () {
      var _onsubmit = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee(event) {
        var email, password, result;
        return _regeneratorRuntime().wrap(function _callee$(_context) {
          while (1) switch (_context.prev = _context.next) {
            case 0:
              console.log("##", state);
              event.preventDefault();
              email = state.auth.user.email;
              password = event.target[2].value; // Use event.target[2] to access the third input field
              _context.next = 6;
              return actions.fetchAndSetSignInMethods({
                email: email
              }, actions);
            case 6:
              console.log("SignupForm onsubmit: Email:", email, "Password:", password);
              _context.next = 9;
              return actions.signup({
                email: email,
                password: password
              });
            case 9:
              result = _context.sent;
              console.log("SignupForm result from signup action:", result);
              if (!result.success) {
                // Handle failure
                actions.setSignupMessage(result.message);
                console.log("SignupForm handling failure:", result.message, state.auth);
              } else {
                // Handle success (e.g., redirect or update UI)
                console.log("SignupForm handling success");
                actions.setSignupMessage("");
              }
            case 12:
            case "end":
              return _context.stop();
          }
        }, _callee);
      }));
      function onsubmit(_x) {
        return _onsubmit.apply(this, arguments);
      }
      return onsubmit;
    }()
  }, [
  // Add a message at the top of the form
  hyperapp.h("p", {
    class: "mb-3 signup-thankyou-message"
  }, "Thank you for considering signing up with us! We value your privacy and won't spam you."), hyperapp.h("input", {
    type: "email",
    class: "form-control mb-3",
    name: "email",
    value: state.auth.user.email,
    readonly: true
  }), state.signupMessage && hyperapp.h("p", {
    class: "mb-3 text-danger password-message"
  }, state.signupMessage), hyperapp.h("input", {
    type: "password",
    class: "form-control mb-3",
    name: "password",
    placeholder: "Password",
    required: true
  }), hyperapp.h("button", {
    type: "submit",
    class: "btn btn-primary"
  }, "Create Account")])]);
};
var _default = exports.default = SignupForm;
},{}],"components/LoginForm.js":[function(require,module,exports) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _IdentityForm = _interopRequireDefault(require("./IdentityForm.js"));
var _SigninForm = _interopRequireDefault(require("./SigninForm.js"));
var _SignupForm = _interopRequireDefault(require("./SignupForm.js"));
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
// Import your SigninForm component
// Import your SignupForm component

var LoginForm = function LoginForm(state, actions) {
  var formComponent;
  console.log("LoginForm -- ", state);
  if (!state.auth.fetchSignInMethodsComplete) {
    // Show the IdentityForm if the fetchSignInMethods operation is not complete
    formComponent = (0, _IdentityForm.default)(state, actions);
  } else if (state.auth.hasIdentity.length > 0) {
    // Show the SigninForm if the user has an existing account
    formComponent = (0, _SigninForm.default)(state, actions);
  } else {
    // Show the SignupForm if the user doesn't have an existing account
    formComponent = (0, _SignupForm.default)(state, actions);
  }

  // Wrap the form component in a div with the class "login-container" to center it
  return hyperapp.h("div", {
    class: "login-container"
  }, [formComponent]);
};
var _default = exports.default = LoginForm;
},{"./IdentityForm.js":"components/IdentityForm.js","./SigninForm.js":"components/SigninForm.js","./SignupForm.js":"components/SignupForm.js"}],"components/ProfileView.js":[function(require,module,exports) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var ProfileView = function ProfileView(state, actions) {
  var user = state.auth.user; // Assuming user information is stored in state.auth.user

  // Function to delete the user profile with confirmation
  var deleteUserProfileWithConfirmation = function deleteUserProfileWithConfirmation() {
    // Show a confirmation alert before deleting the profile
    var confirmDelete = window.confirm("Are you sure you want to delete your profile? This action cannot be undone.");
    if (confirmDelete) {
      actions.auth.deleteUserProfile();
    }
  };
  return hyperapp.h("div", {
    class: "container profile-view my-5"
  }, [hyperapp.h("h2", {
    class: "text-center mb-4"
  }, "Profile"), hyperapp.h("div", {
    class: "card mb-3"
  }, [hyperapp.h("div", {
    class: "card-body"
  }, [hyperapp.h("h5", {
    class: "card-title"
  }, "Welcome, ".concat(user.displayName || user.email)), hyperapp.h("p", {
    class: "card-text"
  }, "User ID: ".concat(user.uid))])]),
  // Buttons Section
  hyperapp.h("div", {
    class: "d-flex flex-column flex-md-row justify-content-center gap-3"
  }, [hyperapp.h("button", {
    class: "btn btn-primary",
    onclick: function onclick() {
      return actions.editProfile();
    }
  }, "Edit Profile"), hyperapp.h("button", {
    class: "btn btn-danger",
    onclick: deleteUserProfileWithConfirmation
  }, "Delete Profile"), hyperapp.h("button", {
    class: "btn btn-secondary",
    onclick: actions.signout
  }, "Sign Out")]),
  // Warning Section for Delete Profile
  hyperapp.h("div", {
    class: "text-center mt-4"
  }, [hyperapp.h("p", {
    class: "text-danger"
  }, "Warning: Deleting your profile will result in permanent loss of your account and data.")])]);
};
var _default = exports.default = ProfileView;
},{}],"components/Footer.js":[function(require,module,exports) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var Footer = function Footer(state, actions) {
  // Function to load a random mushroom blurb, joke, or fact
  var loadRandomMushroomInfo = function loadRandomMushroomInfo() {
    var mushroomInfo = ["Did you know? Mushrooms are more closely related to animals than plants!", "Why did the mushroom get invited to the party? Because he's a fungi!", "Fact: The largest living organism on Earth is a mushroom mycelium in Oregon.", "Did you know? Mushrooms are more closely related to animals than plants!", "Why did the mushroom get invited to the party? Because he's a fungi!", "Fact: The largest living organism on Earth is a mushroom mycelium in Oregon.", "Mushrooms can be found in nearly every habitat on Earth, even in extreme conditions!", "Some mushrooms are bioluminescent and can glow in the dark.", "The spores of a mushroom are so tiny that they can be carried by the wind across continents.", "A single mushroom can release as many as 16 billion spores.", "The ancient Egyptians believed that mushrooms were the plant of immortality.", "Mushrooms have their own immune system.", "Truffles, one of the most expensive mushrooms, are actually a type of fungus that grows underground.", "In many cultures, mushrooms are considered a symbol of luck and prosperity.", "The Fly Agaric mushroom is commonly associated with fairy tales and is known for its iconic red and white spotted cap.", "There are over 10,000 known types of mushrooms, and scientists believe there are many more undiscovered.", "The world's most poisonous mushroom, the 'Death Cap,' can be lethal if ingested.", "Mushrooms are rich in antioxidants and can boost your immune system.", "Some mushrooms have been used for centuries in traditional medicine for their healing properties.", "Did you hear about the mushroom who won the talent show? He was a real fun-guy!", "The study of mushrooms is called mycology, and mycologists are scientists who specialize in it.", "More than 90% of a mushroom is made up of water.", "The famous 'Magic Mushroom,' also known as Psilocybe cubensis, contains psychedelic compounds.", "Mushrooms can grow incredibly fast, with some species doubling in size every day.", "The Portobello mushroom is a popular choice for vegetarian burger patties due to its meaty texture and flavor.", "Fungi play a crucial role in breaking down organic matter and recycling nutrients in ecosystems.", "The world's oldest mushroom, preserved in amber, is believed to be over 100 million years old.", "Mushrooms can be used to create natural dyes for fabrics and art.", "In Japan, matsutake mushrooms are highly prized and can sell for hundreds of dollars per kilogram.", "Some mushrooms are known for their unique shapes, such as the 'Lion's Mane' mushroom with its shaggy appearance.", "There is a variety of mushrooms called 'chanterelles' known for their fruity aroma.", "Mushrooms can be used to create natural dyes for fabrics and art.", "In Japan, matsutake mushrooms are highly prized and can sell for hundreds of dollars per kilogram.", "Some mushrooms are known for their unique shapes, such as the 'Lion's Mane' mushroom with its shaggy appearance.", "There is a variety of mushrooms called 'chanterelles' known for their fruity aroma.", "Mushrooms can be used to create natural dyes for fabrics and art."
    // Add more blurbs, jokes, or facts here
    ];
    // Randomly select one piece of information
    return mushroomInfo[Math.floor(Math.random() * mushroomInfo.length)];
  };

  // Get a random mushroom info for the current render
  var randomMushroomInfo = loadRandomMushroomInfo();
  return hyperapp.h("footer", {
    class: "footer mt-auto py-3 bg-light"
  }, [hyperapp.h("div", {
    class: "container"
  }, [hyperapp.h("div", {
    class: "d-flex justify-content-between"
  }, [
  // Left side: copyright, project name, and social links inline
  hyperapp.h("div", {
    class: "d-flex align-items-center"
  }, [hyperapp.h("span", {
    class: "text-muted"
  }, "© 2018 Joshua Wiedeman"), hyperapp.h("a", {
    href: "https://github.com/jwiedeman",
    class: "text-muted me-2 ms-2"
  }, "GitHub")]),
  // Right side: random mushroom blurb, joke, or fact
  hyperapp.h("div", {}, [hyperapp.h("span", {
    class: "text-muted"
  }, randomMushroomInfo)])])])]);
};
var _default = exports.default = Footer;
},{}],"script.js":[function(require,module,exports) {
"use strict";

var _AuthActions = _interopRequireDefault(require("./actions/AuthActions.js"));
var _Actions = _interopRequireDefault(require("./actions/Actions.js"));
var _AuthState = _interopRequireDefault(require("./state/AuthState.js"));
var _State = _interopRequireDefault(require("./state/State.js"));
var _HomeView = _interopRequireDefault(require("./components/HomeView.js"));
var _ChangelogView = _interopRequireDefault(require("./components/ChangelogView.js"));
var _ProjectsView = _interopRequireDefault(require("./components/ProjectsView.js"));
var _BlogView = _interopRequireDefault(require("./components/blog/BlogView.js"));
var _NavBar = _interopRequireDefault(require("./components/NavBar.js"));
var _LoginForm = _interopRequireDefault(require("./components/LoginForm.js"));
var _ProfileView = _interopRequireDefault(require("./components/ProfileView.js"));
var _Footer = _interopRequireDefault(require("./components/Footer.js"));
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
function ownKeys(e, r) { var t = Object.keys(e); if (Object.getOwnPropertySymbols) { var o = Object.getOwnPropertySymbols(e); r && (o = o.filter(function (r) { return Object.getOwnPropertyDescriptor(e, r).enumerable; })), t.push.apply(t, o); } return t; }
function _objectSpread(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; r % 2 ? ownKeys(Object(t), !0).forEach(function (r) { _defineProperty(e, r, t[r]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function (r) { Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r)); }); } return e; }
function _defineProperty(obj, key, value) { key = _toPropertyKey(key); if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == _typeof(i) ? i : String(i); }
function _toPrimitive(t, r) { if ("object" != _typeof(t) || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != _typeof(i)) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); } // Access Hyperapp's functions from the global `hyperapp` object
// Import actions and state
// Import components
// Import the required Firebase functions

var view = function view(state, actions) {
  return hyperapp.h("div", {
    class: "d-flex flex-column vh-100"
  }, [
  // Make sure the root element is a flex container
  (0, _NavBar.default)(state, actions), hyperapp.h("main",
  // Use 'main' for semantic purposes and to contain the page content
  {
    class: "flex-grow-1 content-container ".concat(state.currentPage !== "home" ? "mt-5" : "") // Add 'flex-grow-1' to fill available space and 'content-container' for your custom styles
  }, [!state.auth.checked ? hyperapp.h("div", {
    class: "loading"
  }, "Loading...") : state.currentPage === "profile" && state.auth.authed ? (0, _ProfileView.default)(state, actions) : state.currentPage === "login" && !state.auth.authed ? (0, _LoginForm.default)(state, actions) : state.currentPage === "signup" && !state.auth.authed ? (0, _LoginForm.default)(state, actions) : state.currentPage === "changelog" ? (0, _ChangelogView.default)(state, actions) : state.currentPage === "projects" ? (0, _ProjectsView.default)(state, actions) : state.currentPage === "blog" ? (0, _BlogView.default)(state, actions) : (0, _HomeView.default)(state, actions)]), (0, _Footer.default)() // This will now be correctly placed at the bottom
  ]);
};

// Initialize the Hyperapp application
var main = hyperapp.app({
  // Merge AuthState, Actions.state, and the new State
  auth: _AuthState.default,
  common: _State.default,
  currentPage: "home"
}, _objectSpread(_objectSpread(_objectSpread({}, _AuthActions.default), _Actions.default), {}, {
  // Add navigation actions here
  navigate: function navigate(page) {
    return function () {
      console.log("Navigating to page:", page);
      return {
        currentPage: page
      };
    };
  }
}), view, document.body);

// Firebase authentication state change listener
firebase.auth().onAuthStateChanged(function (user) {
  main.userChanged(user);
});
},{"./actions/AuthActions.js":"actions/AuthActions.js","./actions/Actions.js":"actions/Actions.js","./state/AuthState.js":"state/AuthState.js","./state/State.js":"state/State.js","./components/HomeView.js":"components/HomeView.js","./components/ChangelogView.js":"components/ChangelogView.js","./components/ProjectsView.js":"components/ProjectsView.js","./components/blog/BlogView.js":"components/blog/BlogView.js","./components/NavBar.js":"components/NavBar.js","./components/LoginForm.js":"components/LoginForm.js","./components/ProfileView.js":"components/ProfileView.js","./components/Footer.js":"components/Footer.js"}],"C:/Users/joshu/AppData/Roaming/npm/node_modules/parcel-bundler/src/builtins/hmr-runtime.js":[function(require,module,exports) {
var global = arguments[3];
var OVERLAY_ID = '__parcel__error__overlay__';
var OldModule = module.bundle.Module;
function Module(moduleName) {
  OldModule.call(this, moduleName);
  this.hot = {
    data: module.bundle.hotData,
    _acceptCallbacks: [],
    _disposeCallbacks: [],
    accept: function (fn) {
      this._acceptCallbacks.push(fn || function () {});
    },
    dispose: function (fn) {
      this._disposeCallbacks.push(fn);
    }
  };
  module.bundle.hotData = null;
}
module.bundle.Module = Module;
var checkedAssets, assetsToAccept;
var parent = module.bundle.parent;
if ((!parent || !parent.isParcelRequire) && typeof WebSocket !== 'undefined') {
  var hostname = "" || location.hostname;
  var protocol = location.protocol === 'https:' ? 'wss' : 'ws';
  var ws = new WebSocket(protocol + '://' + hostname + ':' + "60852" + '/');
  ws.onmessage = function (event) {
    checkedAssets = {};
    assetsToAccept = [];
    var data = JSON.parse(event.data);
    if (data.type === 'update') {
      var handled = false;
      data.assets.forEach(function (asset) {
        if (!asset.isNew) {
          var didAccept = hmrAcceptCheck(global.parcelRequire, asset.id);
          if (didAccept) {
            handled = true;
          }
        }
      });

      // Enable HMR for CSS by default.
      handled = handled || data.assets.every(function (asset) {
        return asset.type === 'css' && asset.generated.js;
      });
      if (handled) {
        console.clear();
        data.assets.forEach(function (asset) {
          hmrApply(global.parcelRequire, asset);
        });
        assetsToAccept.forEach(function (v) {
          hmrAcceptRun(v[0], v[1]);
        });
      } else if (location.reload) {
        // `location` global exists in a web worker context but lacks `.reload()` function.
        location.reload();
      }
    }
    if (data.type === 'reload') {
      ws.close();
      ws.onclose = function () {
        location.reload();
      };
    }
    if (data.type === 'error-resolved') {
      console.log('[parcel] ✨ Error resolved');
      removeErrorOverlay();
    }
    if (data.type === 'error') {
      console.error('[parcel] 🚨  ' + data.error.message + '\n' + data.error.stack);
      removeErrorOverlay();
      var overlay = createErrorOverlay(data);
      document.body.appendChild(overlay);
    }
  };
}
function removeErrorOverlay() {
  var overlay = document.getElementById(OVERLAY_ID);
  if (overlay) {
    overlay.remove();
  }
}
function createErrorOverlay(data) {
  var overlay = document.createElement('div');
  overlay.id = OVERLAY_ID;

  // html encode message and stack trace
  var message = document.createElement('div');
  var stackTrace = document.createElement('pre');
  message.innerText = data.error.message;
  stackTrace.innerText = data.error.stack;
  overlay.innerHTML = '<div style="background: black; font-size: 16px; color: white; position: fixed; height: 100%; width: 100%; top: 0px; left: 0px; padding: 30px; opacity: 0.85; font-family: Menlo, Consolas, monospace; z-index: 9999;">' + '<span style="background: red; padding: 2px 4px; border-radius: 2px;">ERROR</span>' + '<span style="top: 2px; margin-left: 5px; position: relative;">🚨</span>' + '<div style="font-size: 18px; font-weight: bold; margin-top: 20px;">' + message.innerHTML + '</div>' + '<pre>' + stackTrace.innerHTML + '</pre>' + '</div>';
  return overlay;
}
function getParents(bundle, id) {
  var modules = bundle.modules;
  if (!modules) {
    return [];
  }
  var parents = [];
  var k, d, dep;
  for (k in modules) {
    for (d in modules[k][1]) {
      dep = modules[k][1][d];
      if (dep === id || Array.isArray(dep) && dep[dep.length - 1] === id) {
        parents.push(k);
      }
    }
  }
  if (bundle.parent) {
    parents = parents.concat(getParents(bundle.parent, id));
  }
  return parents;
}
function hmrApply(bundle, asset) {
  var modules = bundle.modules;
  if (!modules) {
    return;
  }
  if (modules[asset.id] || !bundle.parent) {
    var fn = new Function('require', 'module', 'exports', asset.generated.js);
    asset.isNew = !modules[asset.id];
    modules[asset.id] = [fn, asset.deps];
  } else if (bundle.parent) {
    hmrApply(bundle.parent, asset);
  }
}
function hmrAcceptCheck(bundle, id) {
  var modules = bundle.modules;
  if (!modules) {
    return;
  }
  if (!modules[id] && bundle.parent) {
    return hmrAcceptCheck(bundle.parent, id);
  }
  if (checkedAssets[id]) {
    return;
  }
  checkedAssets[id] = true;
  var cached = bundle.cache[id];
  assetsToAccept.push([bundle, id]);
  if (cached && cached.hot && cached.hot._acceptCallbacks.length) {
    return true;
  }
  return getParents(global.parcelRequire, id).some(function (id) {
    return hmrAcceptCheck(global.parcelRequire, id);
  });
}
function hmrAcceptRun(bundle, id) {
  var cached = bundle.cache[id];
  bundle.hotData = {};
  if (cached) {
    cached.hot.data = bundle.hotData;
  }
  if (cached && cached.hot && cached.hot._disposeCallbacks.length) {
    cached.hot._disposeCallbacks.forEach(function (cb) {
      cb(bundle.hotData);
    });
  }
  delete bundle.cache[id];
  bundle(id);
  cached = bundle.cache[id];
  if (cached && cached.hot && cached.hot._acceptCallbacks.length) {
    cached.hot._acceptCallbacks.forEach(function (cb) {
      cb();
    });
    return true;
  }
}
},{}]},{},["C:/Users/joshu/AppData/Roaming/npm/node_modules/parcel-bundler/src/builtins/hmr-runtime.js","script.js"], null)
//# sourceMappingURL=/script.75da7f30.js.map