/**
 * Module Dependencies
 */

var isGenFn = require('is-es6-generator-function');
var isPromise = require('is-promise');
var isStream = require('is-stream');
var sliced = require('manage-arguments');
var asyncSettle = require('async-settle');
var asyncDone = require('async-done');
var dezalgo = require('dezalgo');
var co = require('co');
var noop = function(){};

/**
 * Export `wrapped`
 */

module.exports = wrapped;

/**
 * Wrap a function to support
 * sync, async, and gen functions.
 *
 * @param {Function} fn
 * @return {Function}
 * @api public
 */

function wrapped(fn, settle) {
  function wrap() {
    var args = sliced(arguments);
    var last = args[args.length - 1];
    var ctx = this;

    // done
    var done = dezalgo(typeof last == 'function' ? args.pop() : noop);
    var asyncRun = settle ? asyncSettle : asyncDone

    // nothing
    if (!fn) {
      return done.apply(ctx, [null].concat(args));
    }

    // async
    if (fn.length > args.length) {
      // fn = bindify(fn, ctx, args);
      return asyncRun(fn, done);
    }

    // generator
    if (isGenFn(fn)) {
      return asyncRun(function () {
        return co.apply(ctx, [fn].concat(args.concat(done)));
      }, done);
    }

    // sync
    return sync(fn, done, asyncRun).apply(ctx, args);
  }

  return wrap;
}

/**
 * Wrap a synchronous function execution.
 *
 * @param {Function} fn
 * @param {Function} done
 * @return {Function}
 * @api private
 */

function sync (fn, done, asyncRun) {
  return function () {
    var ret;

    try {
      ret = fn.apply(this, arguments);
    } catch (err) {
      return done(err)
    }

    if (isPromise(ret) || isStream(ret)) {
      return asyncRun(function () {
        return ret;
      }, done);
    }
    done(ret instanceof Error ? ret : null, ret)
  }
}

/**
 * Bind multiple parameters to function
 * with context
 */

function bindify (fn, thisArg, args) {
  return fn.bind.apply(fn, [thisArg].concat(args));
}
