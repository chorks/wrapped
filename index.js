/**
 * Module Dependencies
 */

var isGenFn = require('is-es6-generator-function');
var isPromise = require('is-promise');
var sliced = require('manage-arguments');
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

function wrapped(fn) {
  function wrap() {
    var args = sliced(arguments);
    var last = args[args.length - 1];
    var ctx = this;

    // done
    var done = dezalgo(typeof last == 'function' ? args.pop() : noop);

    // nothing
    if (!fn) {
      return done.apply(ctx, [null].concat(args));
    }

    // async
    if (fn.length > args.length) {
      fn = bindify(fn, ctx, args);
      return asyncDone(fn, done);
    }

    // generator
    if (isGenFn(fn)) {
      return asyncDone(function () {
        return co.apply(ctx, [fn].concat(args.concat(done)));
      }, done);
    }

    // sync
    return sync(fn, done).apply(ctx, args);
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

function sync(fn, done) {
  return function () {
    var ret;

    try {
      ret = fn.apply(this, arguments);
    } catch (err) {
      return done(err);
    }

    if (isPromise(ret)) {
      return asyncDone(function () {
        return ret;
      }, done);
    } else {
      ret instanceof Error ? done(ret) : done(null, ret);
    }
  }
}

/**
 * Bind multiple parameters to function
 * with context
 */

function bindify (fn, thisArg, args) {
  return fn.bind.apply(fn, [thisArg].concat(args))
}
