/**
 * phasematchjs v0.0.1a - 2013-05-15
 *  ENTER_DESCRIPTION 
 *
 * Copyright (c) 2013 Krister Shalm <kshalm@gmail.com>
 * Licensed GPLv3
 */
(function (root, factory) {
    if (typeof exports === 'object') {
        // Node.
        module.exports = factory(require('numeric'));
    } else if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['numeric'], factory);
    } else {
        // Browser globals (root is window)
        root.PhaseMatch = factory(root.numeric);
    }
}(this, function( numeric ) {

'use strict';
var PhaseMatch = { util: {} };

(function(){

  /** Used as a safe reference for `undefined` in pre ES5 environments */
  var undefined;

  /** Detect free variable `global`, from Node.js or Browserified code, and use it as `window` */
  var freeGlobal = typeof global == 'object' && global;
  if (freeGlobal.global === freeGlobal || freeGlobal.window === freeGlobal) {
    window = freeGlobal;
  }

  /** Used to generate unique IDs */
  var idCounter = 0;

  /** Used internally to indicate various things */
  var indicatorObject = {};

  /** Used to prefix keys to avoid issues with `__proto__` and properties on `Object.prototype` */
  var keyPrefix = +new Date + '';

  /** Used as the size when optimizations are enabled for large arrays */
  var largeArraySize = 200;

  /** Used to match empty string literals in compiled template source */
  var reEmptyStringLeading = /\b__p \+= '';/g,
      reEmptyStringMiddle = /\b(__p \+=) '' \+/g,
      reEmptyStringTrailing = /(__e\(.*?\)|\b__t\)) \+\n'';/g;

  /** Used to match HTML entities */
  var reEscapedHtml = /&(?:amp|lt|gt|quot|#39);/g;

  /**
   * Used to match ES6 template delimiters
   * http://people.mozilla.org/~jorendorff/es6-draft.html#sec-7.8.6
   */
  var reEsTemplate = /\$\{([^\\}]*(?:\\.[^\\}]*)*)\}/g;

  /** Used to match regexp flags from their coerced string values */
  var reFlags = /\w*$/;

  /** Used to match "interpolate" template delimiters */
  var reInterpolate = /<%=([\s\S]+?)%>/g;

  /** Used to ensure capturing order of template delimiters */
  var reNoMatch = /($^)/;

  /** Used to match HTML characters */
  var reUnescapedHtml = /[&<>"']/g;

  /** Used to match unescaped characters in compiled string literals */
  var reUnescapedString = /['\n\r\t\u2028\u2029\\]/g;

  /** Used to fix the JScript [[DontEnum]] bug */
  var shadowedProps = [
    'constructor', 'hasOwnProperty', 'isPrototypeOf', 'propertyIsEnumerable',
    'toLocaleString', 'toString', 'valueOf'
  ];

  /** Used to make template sourceURLs easier to identify */
  var templateCounter = 0;

  /** `Object#toString` result shortcuts */
  var argsClass = '[object Arguments]',
      arrayClass = '[object Array]',
      boolClass = '[object Boolean]',
      dateClass = '[object Date]',
      funcClass = '[object Function]',
      numberClass = '[object Number]',
      objectClass = '[object Object]',
      regexpClass = '[object RegExp]',
      stringClass = '[object String]';

  /** Used to identify object classifications that `_.clone` supports */
  var cloneableClasses = {};
  cloneableClasses[funcClass] = false;
  cloneableClasses[argsClass] = cloneableClasses[arrayClass] =
  cloneableClasses[boolClass] = cloneableClasses[dateClass] =
  cloneableClasses[numberClass] = cloneableClasses[objectClass] =
  cloneableClasses[regexpClass] = cloneableClasses[stringClass] = true;

  /** Used to determine if values are of the language type Object */
  var objectTypes = {
    'boolean': false,
    'function': true,
    'object': true,
    'number': false,
    'string': false,
    'undefined': false
  };

  /** Used to escape characters for inclusion in compiled string literals */
  var stringEscapes = {
    '\\': '\\',
    "'": "'",
    '\n': 'n',
    '\r': 'r',
    '\t': 't',
    '\u2028': 'u2028',
    '\u2029': 'u2029'
  };

  /*--------------------------------------------------------------------------*/

  /** Used for `Array` and `Object` method references */
  var arrayRef = Array(),
      objectRef = Object();

  /** Used to restore the original `_` reference in `noConflict` */
  var oldDash = window._;

  /** Used to detect if a method is native */
  var reNative = RegExp('^' +
    String(objectRef.valueOf)
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      .replace(/valueOf|for [^\]]+/g, '.+?') + '$'
  );

  /** Native method shortcuts */
  var ceil = Math.ceil,
      clearTimeout = window.clearTimeout,
      concat = arrayRef.concat,
      floor = Math.floor,
      hasOwnProperty = objectRef.hasOwnProperty,
      push = arrayRef.push,
      setTimeout = window.setTimeout,
      toString = objectRef.toString;

  /* Native method shortcuts for methods with the same name as other `lodash` methods */
  var nativeBind = reNative.test(nativeBind = toString.bind) && nativeBind,
      nativeIsArray = reNative.test(nativeIsArray = Array.isArray) && nativeIsArray,
      nativeIsFinite = window.isFinite,
      nativeIsNaN = window.isNaN,
      nativeKeys = reNative.test(nativeKeys = Object.keys) && nativeKeys,
      nativeMax = Math.max,
      nativeMin = Math.min,
      nativeRandom = Math.random,
      nativeSlice = arrayRef.slice;

  /** Detect various environments */
  var isIeOpera = reNative.test(window.attachEvent),
      isV8 = nativeBind && !/\n|true/.test(nativeBind + isIeOpera);

  /** Used to lookup a built-in constructor by [[Class]] */
  var ctorByClass = {};
  ctorByClass[arrayClass] = Array;
  ctorByClass[boolClass] = Boolean;
  ctorByClass[dateClass] = Date;
  ctorByClass[objectClass] = Object;
  ctorByClass[numberClass] = Number;
  ctorByClass[regexpClass] = RegExp;
  ctorByClass[stringClass] = String;

  /*--------------------------------------------------------------------------*/

  /**
   * Creates a `lodash` object, which wraps the given `value`, to enable method
   * chaining.
   *
   * In addition to Lo-Dash methods, wrappers also have the following `Array` methods:
   * `concat`, `join`, `pop`, `push`, `reverse`, `shift`, `slice`, `sort`, `splice`,
   * and `unshift`
   *
   * Chaining is supported in custom builds as long as the `value` method is
   * implicitly or explicitly included in the build.
   *
   * The chainable wrapper functions are:
   * `after`, `assign`, `bind`, `bindAll`, `bindKey`, `chain`, `compact`,
   * `compose`, `concat`, `countBy`, `createCallback`, `debounce`, `defaults`,
   * `defer`, `delay`, `difference`, `filter`, `flatten`, `forEach`, `forIn`,
   * `forOwn`, `functions`, `groupBy`, `initial`, `intersection`, `invert`,
   * `invoke`, `keys`, `map`, `max`, `memoize`, `merge`, `min`, `object`, `omit`,
   * `once`, `pairs`, `partial`, `partialRight`, `pick`, `pluck`, `push`, `range`,
   * `reject`, `rest`, `reverse`, `shuffle`, `slice`, `sort`, `sortBy`, `splice`,
   * `tap`, `throttle`, `times`, `toArray`, `union`, `uniq`, `unshift`, `unzip`,
   * `values`, `where`, `without`, `wrap`, and `zip`
   *
   * The non-chainable wrapper functions are:
   * `clone`, `cloneDeep`, `contains`, `escape`, `every`, `find`, `has`,
   * `identity`, `indexOf`, `isArguments`, `isArray`, `isBoolean`, `isDate`,
   * `isElement`, `isEmpty`, `isEqual`, `isFinite`, `isFunction`, `isNaN`,
   * `isNull`, `isNumber`, `isObject`, `isPlainObject`, `isRegExp`, `isString`,
   * `isUndefined`, `join`, `lastIndexOf`, `mixin`, `noConflict`, `parseInt`,
   * `pop`, `random`, `reduce`, `reduceRight`, `result`, `shift`, `size`, `some`,
   * `sortedIndex`, `runInContext`, `template`, `unescape`, `uniqueId`, and `value`
   *
   * The wrapper functions `first` and `last` return wrapped values when `n` is
   * passed, otherwise they return unwrapped values.
   *
   * @name _
   * @constructor
   * @category Chaining
   * @param {Mixed} value The value to wrap in a `lodash` instance.
   * @returns {Object} Returns a `lodash` instance.
   * @example
   *
   * var wrapped = _([1, 2, 3]);
   *
   * // returns an unwrapped value
   * wrapped.reduce(function(sum, num) {
   *   return sum + num;
   * });
   * // => 6
   *
   * // returns a wrapped value
   * var squares = wrapped.map(function(num) {
   *   return num * num;
   * });
   *
   * _.isArray(squares);
   * // => false
   *
   * _.isArray(squares.value());
   * // => true
   */
  function lodash() {
    // no operation performed
  }

  /**
   * An object used to flag environments features.
   *
   * @static
   * @memberOf _
   * @type Object
   */
  var support = lodash.support = {};

  (function() {
    var ctor = function() { this.x = 1; },
        props = [];

    ctor.prototype = { 'valueOf': 1, 'y': 1 };
    for (var prop in new ctor) { props.push(prop); }
    for (prop in arguments) { }

    /**
     * Detect if `arguments` objects are `Object` objects (all but Narwhal and Opera < 10.5).
     *
     * @memberOf _.support
     * @type Boolean
     */
    support.argsObject = arguments.constructor == Object && !(arguments instanceof Array);

    /**
     * Detect if an `arguments` object's [[Class]] is resolvable (all but Firefox < 4, IE < 9).
     *
     * @memberOf _.support
     * @type Boolean
     */
    support.argsClass = isArguments(arguments);

    /**
     * Detect if `prototype` properties are enumerable by default.
     *
     * Firefox < 3.6, Opera > 9.50 - Opera < 11.60, and Safari < 5.1
     * (if the prototype or a property on the prototype has been set)
     * incorrectly sets a function's `prototype` property [[Enumerable]]
     * value to `true`.
     *
     * @memberOf _.support
     * @type Boolean
     */
    support.enumPrototypes = ctor.propertyIsEnumerable('prototype');

    /**
     * Detect if `Function#bind` exists and is inferred to be fast (all but V8).
     *
     * @memberOf _.support
     * @type Boolean
     */
    support.fastBind = nativeBind && !isV8;

    /**
     * Detect if `arguments` object indexes are non-enumerable
     * (Firefox < 4, IE < 9, PhantomJS, Safari < 5.1).
     *
     * @memberOf _.support
     * @type Boolean
     */
    support.nonEnumArgs = prop != 0;

    /**
     * Detect if properties shadowing those on `Object.prototype` are non-enumerable.
     *
     * In IE < 9 an objects own properties, shadowing non-enumerable ones, are
     * made non-enumerable as well (a.k.a the JScript [[DontEnum]] bug).
     *
     * @memberOf _.support
     * @type Boolean
     */
    support.nonEnumShadows = !/valueOf/.test(props);

    /**
     * Detect lack of support for accessing string characters by index.
     *
     * IE < 8 can't access characters by index and IE 8 can only access
     * characters by index on string literals.
     *
     * @memberOf _.support
     * @type Boolean
     */
    support.unindexedChars = ('x'[0] + Object('x')[0]) != 'xx';

    /**
     * Detect if a DOM node's [[Class]] is resolvable (all but IE < 9)
     * and that the JS engine errors when attempting to coerce an object to
     * a string without a `toString` function.
     *
     * @memberOf _.support
     * @type Boolean
     */
    try {
      support.nodeClass = !(toString.call(document) == objectClass && !({ 'toString': 0 } + ''));
    } catch(e) {
      support.nodeClass = true;
    }
  }(1));

  /*--------------------------------------------------------------------------*/

  /**
   * The template used to create iterator functions.
   *
   * @private
   * @param {Object} data The data object used to populate the text.
   * @returns {String} Returns the interpolated text.
   */
  var iteratorTemplate = function(obj) {

    var __p = 'var index, iterable = ' +
    (obj.firstArg) +
    ', result = ' +
    (obj.init) +
    ';\nif (!iterable) return result;\n' +
    (obj.top) +
    ';\n';
     if (obj.arrays) {
    __p += 'var length = iterable.length; index = -1;\nif (' +
    (obj.arrays) +
    ') {  ';
     if (support.unindexedChars) {
    __p += '\n  if (isString(iterable)) {\n    iterable = iterable.split(\'\')\n  }  ';
     }
    __p += '\n  while (++index < length) {\n    ' +
    (obj.loop) +
    '\n  }\n}\nelse {  ';
      } else if (support.nonEnumArgs) {
    __p += '\n  var length = iterable.length; index = -1;\n  if (length && isArguments(iterable)) {\n    while (++index < length) {\n      index += \'\';\n      ' +
    (obj.loop) +
    '\n    }\n  } else {  ';
     }

     if (support.enumPrototypes) {
    __p += '\n  var skipProto = typeof iterable == \'function\';\n  ';
     }

     if (obj.useHas && obj.useKeys) {
    __p += '\n  var ownIndex = -1,\n      ownProps = objectTypes[typeof iterable] ? keys(iterable) : [],\n      length = ownProps.length;\n\n  while (++ownIndex < length) {\n    index = ownProps[ownIndex];\n    ';
     if (support.enumPrototypes) {
    __p += 'if (!(skipProto && index == \'prototype\')) {\n  ';
     }
    __p += 
    (obj.loop);
     if (support.enumPrototypes) {
    __p += '}\n';
     }
    __p += '  }  ';
     } else {
    __p += '\n  for (index in iterable) {';
        if (support.enumPrototypes || obj.useHas) {
    __p += '\n    if (';
          if (support.enumPrototypes) {
    __p += '!(skipProto && index == \'prototype\')';
     }      if (support.enumPrototypes && obj.useHas) {
    __p += ' && ';
     }      if (obj.useHas) {
    __p += 'hasOwnProperty.call(iterable, index)';
     }
    __p += ') {    ';
     }
    __p += 
    (obj.loop) +
    ';    ';
     if (support.enumPrototypes || obj.useHas) {
    __p += '\n    }';
     }
    __p += '\n  }    ';
     if (support.nonEnumShadows) {
    __p += '\n\n  var ctor = iterable.constructor;\n      ';
     for (var k = 0; k < 7; k++) {
    __p += '\n  index = \'' +
    (obj.shadowedProps[k]) +
    '\';\n  if (';
          if (obj.shadowedProps[k] == 'constructor') {
    __p += '!(ctor && ctor.prototype === iterable) && ';
          }
    __p += 'hasOwnProperty.call(iterable, index)) {\n    ' +
    (obj.loop) +
    '\n  }      ';
     }

     }

     }

     if (obj.arrays || support.nonEnumArgs) {
    __p += '\n}';
     }
    __p += 
    (obj.bottom) +
    ';\nreturn result';

    return __p
  };

  /** Reusable iterator options for `assign` and `defaults` */
  var defaultsIteratorOptions = {
    'args': 'object, source, guard',
    'top':
      'var args = arguments,\n' +
      '    argsIndex = 0,\n' +
      "    argsLength = typeof guard == 'number' ? 2 : args.length;\n" +
      'while (++argsIndex < argsLength) {\n' +
      '  iterable = args[argsIndex];\n' +
      '  if (iterable && objectTypes[typeof iterable]) {',
    'loop': "if (typeof result[index] == 'undefined') result[index] = iterable[index]",
    'bottom': '  }\n}'
  };

  /** Reusable iterator options shared by `each`, `forIn`, and `forOwn` */
  var eachIteratorOptions = {
    'args': 'collection, callback, thisArg',
    'top': "callback = callback && typeof thisArg == 'undefined' ? callback : lodash.createCallback(callback, thisArg)",
    'arrays': "typeof length == 'number'",
    'loop': 'if (callback(iterable[index], index, collection) === false) return result'
  };

  /** Reusable iterator options for `forIn` and `forOwn` */
  var forOwnIteratorOptions = {
    'top': 'if (!objectTypes[typeof iterable]) return result;\n' + eachIteratorOptions.top,
    'arrays': false
  };

  /*--------------------------------------------------------------------------*/

  /**
   * Creates a function optimized to search large arrays for a given `value`,
   * starting at `fromIndex`, using strict equality for comparisons, i.e. `===`.
   *
   * @private
   * @param {Array} array The array to search.
   * @param {Mixed} value The value to search for.
   * @returns {Boolean} Returns `true`, if `value` is found, else `false`.
   */
  function cachedContains(array) {
    var length = array.length,
        isLarge = length >= largeArraySize;

    if (isLarge) {
      var cache = {},
          index = -1;

      while (++index < length) {
        var key = keyPrefix + array[index];
        (cache[key] || (cache[key] = [])).push(array[index]);
      }
    }
    return function(value) {
      if (isLarge) {
        var key = keyPrefix + value;
        return  cache[key] && indexOf(cache[key], value) > -1;
      }
      return indexOf(array, value) > -1;
    }
  }

  /**
   * Used by `_.max` and `_.min` as the default `callback` when a given
   * `collection` is a string value.
   *
   * @private
   * @param {String} value The character to inspect.
   * @returns {Number} Returns the code unit of given character.
   */
  function charAtCallback(value) {
    return value.charCodeAt(0);
  }

  /**
   * Used by `sortBy` to compare transformed `collection` values, stable sorting
   * them in ascending order.
   *
   * @private
   * @param {Object} a The object to compare to `b`.
   * @param {Object} b The object to compare to `a`.
   * @returns {Number} Returns the sort order indicator of `1` or `-1`.
   */
  function compareAscending(a, b) {
    var ai = a.index,
        bi = b.index;

    a = a.criteria;
    b = b.criteria;

    // ensure a stable sort in V8 and other engines
    // http://code.google.com/p/v8/issues/detail?id=90
    if (a !== b) {
      if (a > b || typeof a == 'undefined') {
        return 1;
      }
      if (a < b || typeof b == 'undefined') {
        return -1;
      }
    }
    return ai < bi ? -1 : 1;
  }

  /**
   * Creates a function that, when called, invokes `func` with the `this` binding
   * of `thisArg` and prepends any `partialArgs` to the arguments passed to the
   * bound function.
   *
   * @private
   * @param {Function|String} func The function to bind or the method name.
   * @param {Mixed} [thisArg] The `this` binding of `func`.
   * @param {Array} partialArgs An array of arguments to be partially applied.
   * @param {Object} [idicator] Used to indicate binding by key or partially
   *  applying arguments from the right.
   * @returns {Function} Returns the new bound function.
   */
  function createBound(func, thisArg, partialArgs, indicator) {
    var isFunc = isFunction(func),
        isPartial = !partialArgs,
        key = thisArg;

    // juggle arguments
    if (isPartial) {
      var rightIndicator = indicator;
      partialArgs = thisArg;
    }
    else if (!isFunc) {
      if (!indicator) {
        throw new TypeError;
      }
      thisArg = func;
    }

    function bound() {
      // `Function#bind` spec
      // http://es5.github.com/#x15.3.4.5
      var args = arguments,
          thisBinding = isPartial ? this : thisArg;

      if (!isFunc) {
        func = thisArg[key];
      }
      if (partialArgs.length) {
        args = args.length
          ? (args = nativeSlice.call(args), rightIndicator ? args.concat(partialArgs) : partialArgs.concat(args))
          : partialArgs;
      }
      if (this instanceof bound) {
        // ensure `new bound` is an instance of `func`
        noop.prototype = func.prototype;
        thisBinding = new noop;
        noop.prototype = null;

        // mimic the constructor's `return` behavior
        // http://es5.github.com/#x13.2.2
        var result = func.apply(thisBinding, args);
        return isObject(result) ? result : thisBinding;
      }
      return func.apply(thisBinding, args);
    }
    return bound;
  }

  /**
   * Creates compiled iteration functions.
   *
   * @private
   * @param {Object} [options1, options2, ...] The compile options object(s).
   *  arrays - A string of code to determine if the iterable is an array or array-like.
   *  useHas - A boolean to specify using `hasOwnProperty` checks in the object loop.
   *  useKeys - A boolean to specify using `_.keys` for own property iteration.
   *  args - A string of comma separated arguments the iteration function will accept.
   *  top - A string of code to execute before the iteration branches.
   *  loop - A string of code to execute in the object loop.
   *  bottom - A string of code to execute after the iteration branches.
   * @returns {Function} Returns the compiled function.
   */
  function createIterator() {
    var data = {
      // data properties
      'shadowedProps': shadowedProps,
      // iterator options
      'arrays': 'isArray(iterable)',
      'bottom': '',
      'init': 'iterable',
      'loop': '',
      'top': '',
      'useHas': true,
      'useKeys': !!keys
    };

    // merge options into a template data object
    for (var object, index = 0; object = arguments[index]; index++) {
      for (var key in object) {
        data[key] = object[key];
      }
    }
    var args = data.args;
    data.firstArg = /^[^,]+/.exec(args)[0];

    // create the function factory
    var factory = Function(
        'hasOwnProperty, isArguments, isArray, isString, keys, ' +
        'lodash, objectTypes',
      'return function(' + args + ') {\n' + iteratorTemplate(data) + '\n}'
    );
    // return the compiled function
    return factory(
      hasOwnProperty, isArguments, isArray, isString, keys,
      lodash, objectTypes
    );
  }

  /**
   * Used by `template` to escape characters for inclusion in compiled
   * string literals.
   *
   * @private
   * @param {String} match The matched character to escape.
   * @returns {String} Returns the escaped character.
   */
  function escapeStringChar(match) {
    return '\\' + stringEscapes[match];
  }

  /**
   * Used by `escape` to convert characters to HTML entities.
   *
   * @private
   * @param {String} match The matched character to escape.
   * @returns {String} Returns the escaped character.
   */
  function escapeHtmlChar(match) {
    return htmlEscapes[match];
  }

  /**
   * Checks if `value` is a DOM node in IE < 9.
   *
   * @private
   * @param {Mixed} value The value to check.
   * @returns {Boolean} Returns `true` if the `value` is a DOM node, else `false`.
   */
  function isNode(value) {
    // IE < 9 presents DOM nodes as `Object` objects except they have `toString`
    // methods that are `typeof` "string" and still can coerce nodes to strings
    return typeof value.toString != 'function' && typeof (value + '') == 'string';
  }

  /**
   * A no-operation function.
   *
   * @private
   */
  function noop() {
    // no operation performed
  }

  /**
   * Slices the `collection` from the `start` index up to, but not including,
   * the `end` index.
   *
   * Note: This function is used, instead of `Array#slice`, to support node lists
   * in IE < 9 and to ensure dense arrays are returned.
   *
   * @private
   * @param {Array|Object|String} collection The collection to slice.
   * @param {Number} start The start index.
   * @param {Number} end The end index.
   * @returns {Array} Returns the new array.
   */
  function slice(array, start, end) {
    start || (start = 0);
    if (typeof end == 'undefined') {
      end = array ? array.length : 0;
    }
    var index = -1,
        length = end - start || 0,
        result = Array(length < 0 ? 0 : length);

    while (++index < length) {
      result[index] = array[start + index];
    }
    return result;
  }

  /**
   * Used by `unescape` to convert HTML entities to characters.
   *
   * @private
   * @param {String} match The matched character to unescape.
   * @returns {String} Returns the unescaped character.
   */
  function unescapeHtmlChar(match) {
    return htmlUnescapes[match];
  }

  /*--------------------------------------------------------------------------*/

  /**
   * Checks if `value` is an `arguments` object.
   *
   * @static
   * @memberOf _
   * @category Objects
   * @param {Mixed} value The value to check.
   * @returns {Boolean} Returns `true`, if the `value` is an `arguments` object, else `false`.
   * @example
   *
   * (function() { return _.isArguments(arguments); })(1, 2, 3);
   * // => true
   *
   * _.isArguments([1, 2, 3]);
   * // => false
   */
  function isArguments(value) {
    return toString.call(value) == argsClass;
  }
  // fallback for browsers that can't detect `arguments` objects by [[Class]]
  if (!support.argsClass) {
    isArguments = function(value) {
      return value ? hasOwnProperty.call(value, 'callee') : false;
    };
  }

  /**
   * Checks if `value` is an array.
   *
   * @static
   * @memberOf _
   * @category Objects
   * @param {Mixed} value The value to check.
   * @returns {Boolean} Returns `true`, if the `value` is an array, else `false`.
   * @example
   *
   * (function() { return _.isArray(arguments); })();
   * // => false
   *
   * _.isArray([1, 2, 3]);
   * // => true
   */
  var isArray = nativeIsArray || function(value) {
    return value ? (typeof value == 'object' && toString.call(value) == arrayClass) : false;
  };

  /**
   * A fallback implementation of `Object.keys` which produces an array of the
   * given object's own enumerable property names.
   *
   * @private
   * @type Function
   * @param {Object} object The object to inspect.
   * @returns {Array} Returns a new array of property names.
   */
  var shimKeys = createIterator({
    'args': 'object',
    'init': '[]',
    'top': 'if (!(objectTypes[typeof object])) return result',
    'loop': 'result.push(index)',
    'arrays': false
  });

  /**
   * Creates an array composed of the own enumerable property names of `object`.
   *
   * @static
   * @memberOf _
   * @category Objects
   * @param {Object} object The object to inspect.
   * @returns {Array} Returns a new array of property names.
   * @example
   *
   * _.keys({ 'one': 1, 'two': 2, 'three': 3 });
   * // => ['one', 'two', 'three'] (order is not guaranteed)
   */
  var keys = !nativeKeys ? shimKeys : function(object) {
    if (!isObject(object)) {
      return [];
    }
    if ((support.enumPrototypes && typeof object == 'function') ||
        (support.nonEnumArgs && object.length && isArguments(object))) {
      return shimKeys(object);
    }
    return nativeKeys(object);
  };

  /**
   * A function compiled to iterate `arguments` objects, arrays, objects, and
   * strings consistenly across environments, executing the `callback` for each
   * element in the `collection`. The `callback` is bound to `thisArg` and invoked
   * with three arguments; (value, index|key, collection). Callbacks may exit
   * iteration early by explicitly returning `false`.
   *
   * @private
   * @type Function
   * @param {Array|Object|String} collection The collection to iterate over.
   * @param {Function} [callback=identity] The function called per iteration.
   * @param {Mixed} [thisArg] The `this` binding of `callback`.
   * @returns {Array|Object|String} Returns `collection`.
   */
  var each = createIterator(eachIteratorOptions);

  /**
   * Used to convert characters to HTML entities:
   *
   * Though the `>` character is escaped for symmetry, characters like `>` and `/`
   * don't require escaping in HTML and have no special meaning unless they're part
   * of a tag or an unquoted attribute value.
   * http://mathiasbynens.be/notes/ambiguous-ampersands (under "semi-related fun fact")
   */
  var htmlEscapes = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  };

  /** Used to convert HTML entities to characters */
  var htmlUnescapes = {'&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&#x27;':"'"};

  /*--------------------------------------------------------------------------*/

  /**
   * Assigns own enumerable properties of source object(s) to the destination
   * object. Subsequent sources will overwrite property assignments of previous
   * sources. If a `callback` function is passed, it will be executed to produce
   * the assigned values. The `callback` is bound to `thisArg` and invoked with
   * two arguments; (objectValue, sourceValue).
   *
   * @static
   * @memberOf _
   * @type Function
   * @alias extend
   * @category Objects
   * @param {Object} object The destination object.
   * @param {Object} [source1, source2, ...] The source objects.
   * @param {Function} [callback] The function to customize assigning values.
   * @param {Mixed} [thisArg] The `this` binding of `callback`.
   * @returns {Object} Returns the destination object.
   * @example
   *
   * _.assign({ 'name': 'moe' }, { 'age': 40 });
   * // => { 'name': 'moe', 'age': 40 }
   *
   * var defaults = _.partialRight(_.assign, function(a, b) {
   *   return typeof a == 'undefined' ? b : a;
   * });
   *
   * var food = { 'name': 'apple' };
   * defaults(food, { 'name': 'banana', 'type': 'fruit' });
   * // => { 'name': 'apple', 'type': 'fruit' }
   */
  var assign = createIterator(defaultsIteratorOptions, {
    'top':
      defaultsIteratorOptions.top.replace(';',
        ';\n' +
        "if (argsLength > 3 && typeof args[argsLength - 2] == 'function') {\n" +
        '  var callback = lodash.createCallback(args[--argsLength - 1], args[argsLength--], 2);\n' +
        "} else if (argsLength > 2 && typeof args[argsLength - 1] == 'function') {\n" +
        '  callback = args[--argsLength];\n' +
        '}'
      ),
    'loop': 'result[index] = callback ? callback(result[index], iterable[index]) : iterable[index]'
  });

  /**
   * Creates a clone of `value`. If `deep` is `true`, nested objects will also
   * be cloned, otherwise they will be assigned by reference. If a `callback`
   * function is passed, it will be executed to produce the cloned values. If
   * `callback` returns `undefined`, cloning will be handled by the method instead.
   * The `callback` is bound to `thisArg` and invoked with one argument; (value).
   *
   * @static
   * @memberOf _
   * @category Objects
   * @param {Mixed} value The value to clone.
   * @param {Boolean} [deep=false] A flag to indicate a deep clone.
   * @param {Function} [callback] The function to customize cloning values.
   * @param {Mixed} [thisArg] The `this` binding of `callback`.
   * @param- {Array} [stackA=[]] Tracks traversed source objects.
   * @param- {Array} [stackB=[]] Associates clones with source counterparts.
   * @returns {Mixed} Returns the cloned `value`.
   * @example
   *
   * var stooges = [
   *   { 'name': 'moe', 'age': 40 },
   *   { 'name': 'larry', 'age': 50 }
   * ];
   *
   * var shallow = _.clone(stooges);
   * shallow[0] === stooges[0];
   * // => true
   *
   * var deep = _.clone(stooges, true);
   * deep[0] === stooges[0];
   * // => false
   *
   * _.mixin({
   *   'clone': _.partialRight(_.clone, function(value) {
   *     return _.isElement(value) ? value.cloneNode(false) : undefined;
   *   })
   * });
   *
   * var clone = _.clone(document.body);
   * clone.childNodes.length;
   * // => 0
   */
  function clone(value, deep, callback, thisArg, stackA, stackB) {
    var result = value;

    // allows working with "Collections" methods without using their `callback`
    // argument, `index|key`, for this method's `callback`
    if (typeof deep == 'function') {
      thisArg = callback;
      callback = deep;
      deep = false;
    }
    if (typeof callback == 'function') {
      callback = (typeof thisArg == 'undefined')
        ? callback
        : lodash.createCallback(callback, thisArg, 1);

      result = callback(result);
      if (typeof result != 'undefined') {
        return result;
      }
      result = value;
    }
    // inspect [[Class]]
    var isObj = isObject(result);
    if (isObj) {
      var className = toString.call(result);
      if (!cloneableClasses[className] || (!support.nodeClass && isNode(result))) {
        return result;
      }
      var isArr = isArray(result);
    }
    // shallow clone
    if (!isObj || !deep) {
      return isObj
        ? (isArr ? slice(result) : assign({}, result))
        : result;
    }
    var ctor = ctorByClass[className];
    switch (className) {
      case boolClass:
      case dateClass:
        return new ctor(+result);

      case numberClass:
      case stringClass:
        return new ctor(result);

      case regexpClass:
        return ctor(result.source, reFlags.exec(result));
    }
    // check for circular references and return corresponding clone
    stackA || (stackA = []);
    stackB || (stackB = []);

    var length = stackA.length;
    while (length--) {
      if (stackA[length] == value) {
        return stackB[length];
      }
    }
    // init cloned object
    result = isArr ? ctor(result.length) : {};

    // add array properties assigned by `RegExp#exec`
    if (isArr) {
      if (hasOwnProperty.call(value, 'index')) {
        result.index = value.index;
      }
      if (hasOwnProperty.call(value, 'input')) {
        result.input = value.input;
      }
    }
    // add the source value to the stack of traversed objects
    // and associate it with its clone
    stackA.push(value);
    stackB.push(result);

    // recursively populate clone (susceptible to call stack limits)
    (isArr ? forEach : forOwn)(value, function(objValue, key) {
      result[key] = clone(objValue, deep, callback, undefined, stackA, stackB);
    });

    return result;
  }

  /**
   * Iterates over `object`'s own and inherited enumerable properties, executing
   * the `callback` for each property. The `callback` is bound to `thisArg` and
   * invoked with three arguments; (value, key, object). Callbacks may exit iteration
   * early by explicitly returning `false`.
   *
   * @static
   * @memberOf _
   * @type Function
   * @category Objects
   * @param {Object} object The object to iterate over.
   * @param {Function} [callback=identity] The function called per iteration.
   * @param {Mixed} [thisArg] The `this` binding of `callback`.
   * @returns {Object} Returns `object`.
   * @example
   *
   * function Dog(name) {
   *   this.name = name;
   * }
   *
   * Dog.prototype.bark = function() {
   *   alert('Woof, woof!');
   * };
   *
   * _.forIn(new Dog('Dagny'), function(value, key) {
   *   alert(key);
   * });
   * // => alerts 'name' and 'bark' (order is not guaranteed)
   */
  var forIn = createIterator(eachIteratorOptions, forOwnIteratorOptions, {
    'useHas': false
  });

  /**
   * Iterates over an object's own enumerable properties, executing the `callback`
   * for each property. The `callback` is bound to `thisArg` and invoked with three
   * arguments; (value, key, object). Callbacks may exit iteration early by explicitly
   * returning `false`.
   *
   * @static
   * @memberOf _
   * @type Function
   * @category Objects
   * @param {Object} object The object to iterate over.
   * @param {Function} [callback=identity] The function called per iteration.
   * @param {Mixed} [thisArg] The `this` binding of `callback`.
   * @returns {Object} Returns `object`.
   * @example
   *
   * _.forOwn({ '0': 'zero', '1': 'one', 'length': 2 }, function(num, key) {
   *   alert(key);
   * });
   * // => alerts '0', '1', and 'length' (order is not guaranteed)
   */
  var forOwn = createIterator(eachIteratorOptions, forOwnIteratorOptions);

  /**
   * Performs a deep comparison between two values to determine if they are
   * equivalent to each other. If `callback` is passed, it will be executed to
   * compare values. If `callback` returns `undefined`, comparisons will be handled
   * by the method instead. The `callback` is bound to `thisArg` and invoked with
   * two arguments; (a, b).
   *
   * @static
   * @memberOf _
   * @category Objects
   * @param {Mixed} a The value to compare.
   * @param {Mixed} b The other value to compare.
   * @param {Function} [callback] The function to customize comparing values.
   * @param {Mixed} [thisArg] The `this` binding of `callback`.
   * @param- {Array} [stackA=[]] Tracks traversed `a` objects.
   * @param- {Array} [stackB=[]] Tracks traversed `b` objects.
   * @returns {Boolean} Returns `true`, if the values are equivalent, else `false`.
   * @example
   *
   * var moe = { 'name': 'moe', 'age': 40 };
   * var copy = { 'name': 'moe', 'age': 40 };
   *
   * moe == copy;
   * // => false
   *
   * _.isEqual(moe, copy);
   * // => true
   *
   * var words = ['hello', 'goodbye'];
   * var otherWords = ['hi', 'goodbye'];
   *
   * _.isEqual(words, otherWords, function(a, b) {
   *   var reGreet = /^(?:hello|hi)$/i,
   *       aGreet = _.isString(a) && reGreet.test(a),
   *       bGreet = _.isString(b) && reGreet.test(b);
   *
   *   return (aGreet || bGreet) ? (aGreet == bGreet) : undefined;
   * });
   * // => true
   */
  function isEqual(a, b, callback, thisArg, stackA, stackB) {
    // used to indicate that when comparing objects, `a` has at least the properties of `b`
    var whereIndicator = callback === indicatorObject;
    if (typeof callback == 'function' && !whereIndicator) {
      callback = lodash.createCallback(callback, thisArg, 2);
      var result = callback(a, b);
      if (typeof result != 'undefined') {
        return !!result;
      }
    }
    // exit early for identical values
    if (a === b) {
      // treat `+0` vs. `-0` as not equal
      return a !== 0 || (1 / a == 1 / b);
    }
    var type = typeof a,
        otherType = typeof b;

    // exit early for unlike primitive values
    if (a === a &&
        (!a || (type != 'function' && type != 'object')) &&
        (!b || (otherType != 'function' && otherType != 'object'))) {
      return false;
    }
    // exit early for `null` and `undefined`, avoiding ES3's Function#call behavior
    // http://es5.github.com/#x15.3.4.4
    if (a == null || b == null) {
      return a === b;
    }
    // compare [[Class]] names
    var className = toString.call(a),
        otherClass = toString.call(b);

    if (className == argsClass) {
      className = objectClass;
    }
    if (otherClass == argsClass) {
      otherClass = objectClass;
    }
    if (className != otherClass) {
      return false;
    }
    switch (className) {
      case boolClass:
      case dateClass:
        // coerce dates and booleans to numbers, dates to milliseconds and booleans
        // to `1` or `0`, treating invalid dates coerced to `NaN` as not equal
        return +a == +b;

      case numberClass:
        // treat `NaN` vs. `NaN` as equal
        return (a != +a)
          ? b != +b
          // but treat `+0` vs. `-0` as not equal
          : (a == 0 ? (1 / a == 1 / b) : a == +b);

      case regexpClass:
      case stringClass:
        // coerce regexes to strings (http://es5.github.com/#x15.10.6.4)
        // treat string primitives and their corresponding object instances as equal
        return a == String(b);
    }
    var isArr = className == arrayClass;
    if (!isArr) {
      // unwrap any `lodash` wrapped values
      if (hasOwnProperty.call(a, '__wrapped__ ') || hasOwnProperty.call(b, '__wrapped__')) {
        return isEqual(a.__wrapped__ || a, b.__wrapped__ || b, callback, thisArg, stackA, stackB);
      }
      // exit for functions and DOM nodes
      if (className != objectClass || (!support.nodeClass && (isNode(a) || isNode(b)))) {
        return false;
      }
      // in older versions of Opera, `arguments` objects have `Array` constructors
      var ctorA = !support.argsObject && isArguments(a) ? Object : a.constructor,
          ctorB = !support.argsObject && isArguments(b) ? Object : b.constructor;

      // non `Object` object instances with different constructors are not equal
      if (ctorA != ctorB && !(
            isFunction(ctorA) && ctorA instanceof ctorA &&
            isFunction(ctorB) && ctorB instanceof ctorB
          )) {
        return false;
      }
    }
    // assume cyclic structures are equal
    // the algorithm for detecting cyclic structures is adapted from ES 5.1
    // section 15.12.3, abstract operation `JO` (http://es5.github.com/#x15.12.3)
    stackA || (stackA = []);
    stackB || (stackB = []);

    var length = stackA.length;
    while (length--) {
      if (stackA[length] == a) {
        return stackB[length] == b;
      }
    }
    var size = 0;
    result = true;

    // add `a` and `b` to the stack of traversed objects
    stackA.push(a);
    stackB.push(b);

    // recursively compare objects and arrays (susceptible to call stack limits)
    if (isArr) {
      length = a.length;
      size = b.length;

      // compare lengths to determine if a deep comparison is necessary
      result = size == a.length;
      if (!result && !whereIndicator) {
        return result;
      }
      // deep compare the contents, ignoring non-numeric properties
      while (size--) {
        var index = length,
            value = b[size];

        if (whereIndicator) {
          while (index--) {
            if ((result = isEqual(a[index], value, callback, thisArg, stackA, stackB))) {
              break;
            }
          }
        } else if (!(result = isEqual(a[size], value, callback, thisArg, stackA, stackB))) {
          break;
        }
      }
      return result;
    }
    // deep compare objects using `forIn`, instead of `forOwn`, to avoid `Object.keys`
    // which, in this case, is more costly
    forIn(b, function(value, key, b) {
      if (hasOwnProperty.call(b, key)) {
        // count the number of properties.
        size++;
        // deep compare each property value.
        return (result = hasOwnProperty.call(a, key) && isEqual(a[key], value, callback, thisArg, stackA, stackB));
      }
    });

    if (result && !whereIndicator) {
      // ensure both objects have the same number of properties
      forIn(a, function(value, key, a) {
        if (hasOwnProperty.call(a, key)) {
          // `size` will be `-1` if `a` has more properties than `b`
          return (result = --size > -1);
        }
      });
    }
    return result;
  }

  /**
   * Checks if `value` is a function.
   *
   * @static
   * @memberOf _
   * @category Objects
   * @param {Mixed} value The value to check.
   * @returns {Boolean} Returns `true`, if the `value` is a function, else `false`.
   * @example
   *
   * _.isFunction(_);
   * // => true
   */
  function isFunction(value) {
    return typeof value == 'function';
  }
  // fallback for older versions of Chrome and Safari
  if (isFunction(/x/)) {
    isFunction = function(value) {
      return typeof value == 'function' && toString.call(value) == funcClass;
    };
  }

  /**
   * Checks if `value` is the language type of Object.
   * (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
   *
   * @static
   * @memberOf _
   * @category Objects
   * @param {Mixed} value The value to check.
   * @returns {Boolean} Returns `true`, if the `value` is an object, else `false`.
   * @example
   *
   * _.isObject({});
   * // => true
   *
   * _.isObject([1, 2, 3]);
   * // => true
   *
   * _.isObject(1);
   * // => false
   */
  function isObject(value) {
    // check if the value is the ECMAScript language type of Object
    // http://es5.github.com/#x8
    // and avoid a V8 bug
    // http://code.google.com/p/v8/issues/detail?id=2291
    return value ? objectTypes[typeof value] : false;
  }

  /**
   * Checks if `value` is a string.
   *
   * @static
   * @memberOf _
   * @category Objects
   * @param {Mixed} value The value to check.
   * @returns {Boolean} Returns `true`, if the `value` is a string, else `false`.
   * @example
   *
   * _.isString('moe');
   * // => true
   */
  function isString(value) {
    return typeof value == 'string' || toString.call(value) == stringClass;
  }

  /*--------------------------------------------------------------------------*/

  /**
   * Iterates over a `collection`, executing the `callback` for each element in
   * the `collection`. The `callback` is bound to `thisArg` and invoked with three
   * arguments; (value, index|key, collection). Callbacks may exit iteration early
   * by explicitly returning `false`.
   *
   * @static
   * @memberOf _
   * @alias each
   * @category Collections
   * @param {Array|Object|String} collection The collection to iterate over.
   * @param {Function} [callback=identity] The function called per iteration.
   * @param {Mixed} [thisArg] The `this` binding of `callback`.
   * @returns {Array|Object|String} Returns `collection`.
   * @example
   *
   * _([1, 2, 3]).forEach(alert).join(',');
   * // => alerts each number and returns '1,2,3'
   *
   * _.forEach({ 'one': 1, 'two': 2, 'three': 3 }, alert);
   * // => alerts each number value (order is not guaranteed)
   */
  function forEach(collection, callback, thisArg) {
    if (callback && typeof thisArg == 'undefined' && isArray(collection)) {
      var index = -1,
          length = collection.length;

      while (++index < length) {
        if (callback(collection[index], index, collection) === false) {
          break;
        }
      }
    } else {
      each(collection, callback, thisArg);
    }
    return collection;
  }

  /*--------------------------------------------------------------------------*/

  /**
   * Creates a function that, when called, invokes `func` with the `this`
   * binding of `thisArg` and prepends any additional `bind` arguments to those
   * passed to the bound function.
   *
   * @static
   * @memberOf _
   * @category Functions
   * @param {Function} func The function to bind.
   * @param {Mixed} [thisArg] The `this` binding of `func`.
   * @param {Mixed} [arg1, arg2, ...] Arguments to be partially applied.
   * @returns {Function} Returns the new bound function.
   * @example
   *
   * var func = function(greeting) {
   *   return greeting + ' ' + this.name;
   * };
   *
   * func = _.bind(func, { 'name': 'moe' }, 'hi');
   * func();
   * // => 'hi moe'
   */
  function bind(func, thisArg) {
    // use `Function#bind` if it exists and is fast
    // (in V8 `Function#bind` is slower except when partially applied)
    return support.fastBind || (nativeBind && arguments.length > 2)
      ? nativeBind.call.apply(nativeBind, arguments)
      : createBound(func, thisArg, nativeSlice.call(arguments, 2));
  }

  /**
   * Produces a callback bound to an optional `thisArg`. If `func` is a property
   * name, the created callback will return the property value for a given element.
   * If `func` is an object, the created callback will return `true` for elements
   * that contain the equivalent object properties, otherwise it will return `false`.
   *
   * Note: All Lo-Dash methods, that accept a `callback` argument, use `_.createCallback`.
   *
   * @static
   * @memberOf _
   * @category Functions
   * @param {Mixed} [func=identity] The value to convert to a callback.
   * @param {Mixed} [thisArg] The `this` binding of the created callback.
   * @param {Number} [argCount=3] The number of arguments the callback accepts.
   * @returns {Function} Returns a callback function.
   * @example
   *
   * var stooges = [
   *   { 'name': 'moe', 'age': 40 },
   *   { 'name': 'larry', 'age': 50 }
   * ];
   *
   * // wrap to create custom callback shorthands
   * _.createCallback = _.wrap(_.createCallback, function(func, callback, thisArg) {
   *   var match = /^(.+?)__([gl]t)(.+)$/.exec(callback);
   *   return !match ? func(callback, thisArg) : function(object) {
   *     return match[2] == 'gt' ? object[match[1]] > match[3] : object[match[1]] < match[3];
   *   };
   * });
   *
   * _.filter(stooges, 'age__gt45');
   * // => [{ 'name': 'larry', 'age': 50 }]
   *
   * // create mixins with support for "_.pluck" and "_.where" callback shorthands
   * _.mixin({
   *   'toLookup': function(collection, callback, thisArg) {
   *     callback = _.createCallback(callback, thisArg);
   *     return _.reduce(collection, function(result, value, index, collection) {
   *       return (result[callback(value, index, collection)] = value, result);
   *     }, {});
   *   }
   * });
   *
   * _.toLookup(stooges, 'name');
   * // => { 'moe': { 'name': 'moe', 'age': 40 }, 'larry': { 'name': 'larry', 'age': 50 } }
   */
  function createCallback(func, thisArg, argCount) {
    if (func == null) {
      return identity;
    }
    var type = typeof func;
    if (type != 'function') {
      if (type != 'object') {
        return function(object) {
          return object[func];
        };
      }
      var props = keys(func);
      return function(object) {
        var length = props.length,
            result = false;
        while (length--) {
          if (!(result = isEqual(object[props[length]], func[props[length]], indicatorObject))) {
            break;
          }
        }
        return result;
      };
    }
    if (typeof thisArg != 'undefined') {
      if (argCount === 1) {
        return function(value) {
          return func.call(thisArg, value);
        };
      }
      if (argCount === 2) {
        return function(a, b) {
          return func.call(thisArg, a, b);
        };
      }
      if (argCount === 4) {
        return function(accumulator, value, index, collection) {
          return func.call(thisArg, accumulator, value, index, collection);
        };
      }
      return function(value, index, collection) {
        return func.call(thisArg, value, index, collection);
      };
    }
    return func;
  }

  /*--------------------------------------------------------------------------*/

  /**
   * This function returns the first argument passed to it.
   *
   * @static
   * @memberOf _
   * @category Utilities
   * @param {Mixed} value Any value.
   * @returns {Mixed} Returns `value`.
   * @example
   *
   * var moe = { 'name': 'moe' };
   * moe === _.identity(moe);
   * // => true
   */
  function identity(value) {
    return value;
  }

  /*--------------------------------------------------------------------------*/

  lodash.assign = assign;
  lodash.bind = bind;
  lodash.createCallback = createCallback;
  lodash.forEach = forEach;
  lodash.forIn = forIn;
  lodash.forOwn = forOwn;
  lodash.keys = keys;

  lodash.each = forEach;
  lodash.extend = assign;

  /*--------------------------------------------------------------------------*/

  // add functions that return unwrapped values when chaining
  lodash.clone = clone;
  lodash.identity = identity;
  lodash.isArguments = isArguments;
  lodash.isArray = isArray;
  lodash.isEqual = isEqual;
  lodash.isFunction = isFunction;
  lodash.isObject = isObject;
  lodash.isString = isString;

  /*--------------------------------------------------------------------------*/

  /**
   * The semantic version number.
   *
   * @static
   * @memberOf _
   * @type String
   */
  lodash.VERSION = '1.2.1';

  /*--------------------------------------------------------------------------*/

;lodash.extend(PhaseMatch.util, lodash);}());
var nm = Math.pow(10, -9);
var um = Math.pow(10, -6);
var lightspeed =  2.99792458 * Math.pow(10, 8);

PhaseMatch.constants = {
    // user accessible constants
    um: um,
    nm: nm,
    c: lightspeed
};
function sq( x ){
    return x * x;
}

(function(){

    //Implementation of Nelder-Mead Simplex Linear Optimizer
    //  TODO: Robust Unit Test of 2D Function Optimizations
    //  TODO: Extend to support functions beyond the 2D Space

    function Simplex(vertices) {
        this.vertices = vertices;
        this.centroid = null;
        this.reflect_point = null; //Reflection point, updated on each iteration
        this.reflect_cost = null;
        this.expand_point = null;
        this.expand_cost = null;
        this.contract_point = null;
        this.contract_cost = null;
    }

    //sort the vertices of Simplex by their objective value as defined by objFunc
    Simplex.prototype.sortByCost = function (objFunc) {
        this.vertices.sort(function (a, b) {
            var a_cost = objFunc(a), b_cost = objFunc(b);
                
            if (a_cost < b_cost) {
                return -1;
            } else if (a_cost > b_cost) {
                return 1;
            } else {
                return 0;
            }
        });
    };

    //find the centroid of the simplex (ignoring the vertex with the worst objective value)
    Simplex.prototype.updateCentroid = function (objFunc) {
        this.sortByCost(objFunc); //vertices must be in order of best..worst

        var centroid_n = this.vertices.length - 1, centroid_sum = 0, i;
        for (i = 0; i < centroid_n; i += 1) {
            centroid_sum += this.vertices[i];
        }
        
        this.centroid = centroid_sum / centroid_n;
    };

    Simplex.prototype.updateReflectPoint = function (objFunc) {
        var worst_point = this.vertices[this.vertices.length - 1];
        this.reflect_point = this.centroid + (this.centroid - worst_point); // 1*(this.centroid - worst_point), 1 removed to make jslint happy
        this.reflect_cost = objFunc(this.reflect_point);
    };

    Simplex.prototype.updateExpandPoint = function (objFunc) {
        var worst_point = this.vertices[this.vertices.length - 1];
        this.expand_point = this.centroid + 2 * (this.centroid - worst_point);
        this.expand_cost = objFunc(this.expand_point);
    };

    Simplex.prototype.updateContractPoint = function (objFunc) {
        var worst_point = this.vertices[this.vertices.length - 1];
        this.contract_point = this.centroid + 0.5 * (this.centroid - worst_point);
        this.contract_cost = objFunc(this.contract_point);
    };

    //assumes sortByCost has been called prior!
    Simplex.prototype.getVertexCost = function (objFunc, option) {
        if (option === 'worst') {
            return objFunc(this.vertices[this.vertices.length - 1]);
        } else if (option === 'secondWorst') {
            return objFunc(this.vertices[this.vertices.length - 2]);
        } else if (option === 'best') {
            return objFunc(this.vertices[0]);
        }
    };

    Simplex.prototype.reflect = function () {    
        this.vertices[this.vertices.length - 1] = this.reflect_point; //replace the worst vertex with the reflect vertex
    };

    Simplex.prototype.expand = function () {
        this.vertices[this.vertices.length - 1] = this.expand_point; //replace the worst vertex with the expand vertex
    };

    Simplex.prototype.contract = function () {    
        this.vertices[this.vertices.length - 1] = this.contract_point; //replace the worst vertex with the contract vertex
    };

    Simplex.prototype.reduce = function () {    
        var best_x = this.vertices[0],  a;
        for (a = 1; a < this.vertices.length; a += 1) {
            this.vertices[a] = best_x + 0.5 * (this.vertices[a] - best_x); //0.1 + 0.5(0.1-0.1)
        }
    };

    function NM(objFunc, x0, numIters) {

        //This is our Simplex object that will mutate based on the behavior of the objective function objFunc
        var S = new Simplex([x0, x0 + 1, x0 + 2]), itr, x;

        for (itr = 0; itr < numIters; itr += 1) {
            
            S.updateCentroid(objFunc); //needs to know which objFunc to hand to sortByCost
            S.updateReflectPoint(objFunc);

            x = S.vertices[0];
            
            if (S.reflect_cost < S.getVertexCost(objFunc, 'secondWorst') && S.reflect_cost > S.getVertexCost(objFunc, 'best')) {
                S.reflect();
            } else if (S.reflect_cost < S.getVertexCost(objFunc, 'best')) { //new point is better than previous best: expand

                S.updateExpandPoint(objFunc);
               
                if (S.expand_cost < S.reflect_cost) {
                    S.expand();
                } else {           
                    S.reflect();
                }
            } else { //new point was worse than all current points: contract

                S.updateContractPoint(objFunc);

                if (S.contract_cost < S.getVertexCost(objFunc, 'worst')) {
                    S.contract();
                } else {                
                    S.reduce();            
                }
            }
        }

        return x;
    }

    PhaseMatch.nelderMead = NM;

})();


(function(){

    /*
    Copyright (c) 2012 Juan Mellado

    Permission is hereby granted, free of charge, to any person obtaining a copy
    of this software and associated documentation files (the "Software"), to deal
    in the Software without restriction, including without limitation the rights
    to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
    copies of the Software, and to permit persons to whom the Software is
    furnished to do so, subject to the following conditions:

    The above copyright notice and this permission notice shall be included in
    all copies or substantial portions of the Software.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
    IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
    FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
    AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
    LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
    OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
    THE SOFTWARE.
    */

    /*
    References:
    - "Numerical Recipes in C - Second Edition"
      http://www.nr.com/
    */

    var pythag = function(a, b){
      var at = Math.abs(a), bt = Math.abs(b), ct;

      if (at > bt){
        ct = bt / at;
        return at * Math.sqrt(1.0 + ct * ct);
      }
        
      if (0.0 === bt){
        return 0.0;
      }

      ct = at / bt;
      return bt * Math.sqrt(1.0 + ct * ct);
    };

    var sign = function(a, b){
      return b >= 0.0? Math.abs(a): -Math.abs(a);
    };

    PhaseMatch.svdcmp = function(a, m, n, w, v){
      var flag, i, its, j, jj, k, l, nm,
          anorm = 0.0, c, f, g = 0.0, h, s, scale = 0.0, x, y, z, rv1 = [];
          
      //Householder reduction to bidiagonal form
      for (i = 0; i < n; ++ i){
        l = i + 1;
        rv1[i] = scale * g;
        g = s = scale = 0.0;
        if (i < m){
          for (k = i; k < m; ++ k){
            scale += Math.abs( a[k][i] );
          }
          if (0.0 !== scale){
            for (k = i; k < m; ++ k){
              a[k][i] /= scale;
              s += a[k][i] * a[k][i];
            }
            f = a[i][i];
            g = -sign( Math.sqrt(s), f );
            h = f * g - s;
            a[i][i] = f - g;
            for (j = l; j < n; ++ j){
              for (s = 0.0, k = i; k < m; ++ k){
                s += a[k][i] * a[k][j];
              }
              f = s / h;
              for (k = i; k < m; ++ k){
                a[k][j] += f * a[k][i];
              }
            }
            for (k = i; k < m; ++ k){
              a[k][i] *= scale;
            }
          }
        }
        w[i] = scale * g;
        g = s = scale = 0.0;
        if ( (i < m) && (i !== n - 1) ){
          for (k = l; k < n; ++ k){
            scale += Math.abs( a[i][k] );
          }
          if (0.0 !== scale){
            for (k = l; k < n; ++ k){
              a[i][k] /= scale;
              s += a[i][k] * a[i][k];
            }
            f = a[i][l];
            g = -sign( Math.sqrt(s), f );
            h = f * g - s;
            a[i][l] = f - g;
            for (k = l; k < n; ++ k){
              rv1[k] = a[i][k] / h;
            }
            for (j = l; j < m; ++ j){
              for (s = 0.0, k = l; k < n; ++ k){
                s += a[j][k] * a[i][k];
              }
              for (k = l; k < n; ++ k){
                a[j][k] += s * rv1[k];
              }
            }
            for (k = l; k < n; ++ k){
              a[i][k] *= scale;
            }
          }
        }
        anorm = Math.max(anorm, ( Math.abs( w[i] ) + Math.abs( rv1[i] ) ) );
      }

      //Acumulation of right-hand transformation
      for (i = n - 1; i >= 0; -- i){
        if (i < n - 1){
          if (0.0 !== g){
            for (j = l; j < n; ++ j){
              v[j][i] = ( a[i][j] / a[i][l] ) / g;
            }
            for (j = l; j < n; ++ j){
              for (s = 0.0, k = l; k < n; ++ k){
                s += a[i][k] * v[k][j];
              }
              for (k = l; k < n; ++ k){
                v[k][j] += s * v[k][i];
              }
            }
          }
          for (j = l; j < n; ++ j){
            v[i][j] = v[j][i] = 0.0;
          }
        }
        v[i][i] = 1.0;
        g = rv1[i];
        l = i;
      }

      //Acumulation of left-hand transformation
      for (i = Math.min(n, m) - 1; i >= 0; -- i){
        l = i + 1;
        g = w[i];
        for (j = l; j < n; ++ j){
          a[i][j] = 0.0;
        }
        if (0.0 !== g){
          g = 1.0 / g;
          for (j = l; j < n; ++ j){
            for (s = 0.0, k = l; k < m; ++ k){
              s += a[k][i] * a[k][j];
            }
            f = (s / a[i][i]) * g;
            for (k = i; k < m; ++ k){
              a[k][j] += f * a[k][i];
            }
          }
          for (j = i; j < m; ++ j){
            a[j][i] *= g;
          }
        }else{
            for (j = i; j < m; ++ j){
              a[j][i] = 0.0;
            }
        }
        ++ a[i][i];
      }

      //Diagonalization of the bidiagonal form
      for (k = n - 1; k >= 0; -- k){
        for (its = 1; its <= 30; ++ its){
          flag = true;
          for (l = k; l >= 0; -- l){
            nm = l - 1;
            if ( Math.abs( rv1[l] ) + anorm === anorm ){
              flag = false;
              break;
            }
            if ( Math.abs( w[nm] ) + anorm === anorm ){
              break;
            }
          }
          if (flag){
            c = 0.0;
            s = 1.0;
            for (i = l; i <= k; ++ i){
              f = s * rv1[i];
              if ( Math.abs(f) + anorm === anorm ){
                break;
              }
              g = w[i];
              h = pythag(f, g);
              w[i] = h;
              h = 1.0 / h;
              c = g * h;
              s = -f * h;
              for (j = 1; j <= m; ++ j){
                y = a[j][nm];
                z = a[j][i];
                a[j][nm] = y * c + z * s;
                a[j][i] = z * c - y * s;
              }
            }
          }

          //Convergence
          z = w[k];
          if (l === k){
            if (z < 0.0){
              w[k] = -z;
              for (j = 0; j < n; ++ j){
                v[j][k] = -v[j][k];
              }
            }
            break;
          }

          if (30 === its){
            return false;
          }

          //Shift from bottom 2-by-2 minor
          x = w[l];
          nm = k - 1;
          y = w[nm];
          g = rv1[nm];
          h = rv1[k];
          f = ( (y - z) * (y + z) + (g - h) * (g + h) ) / (2.0 * h * y);
          g = pythag( f, 1.0 );
          f = ( (x - z) * (x + z) + h * ( (y / (f + sign(g, f) ) ) - h) ) / x;

          //Next QR transformation
          c = s = 1.0;
          for (j = l; j <= nm; ++ j){
            i = j + 1;
            g = rv1[i];
            y = w[i];
            h = s * g;
            g = c * g;
            z = pythag(f, h);
            rv1[j] = z;
            c = f / z;
            s = h / z;
            f = x * c + g * s;
            g = g * c - x * s;
            h = y * s;
            y *= c;
            for (jj = 0; jj < n; ++ jj){
              x = v[jj][j];
              z = v[jj][i];
              v[jj][j] = x * c + z * s;
              v[jj][i] = z * c - x * s;
            }
            z = pythag(f, h);
            w[j] = z;
            if (0.0 !== z){
              z = 1.0 / z;
              c = f * z;
              s = h * z;
            }
            f = c * g + s * y;
            x = c * y - s * g;
            for (jj = 0; jj < m; ++ jj){
              y = a[jj][j];
              z = a[jj][i];
              a[jj][j] = y * c + z * s;
              a[jj][i] = z * c - y * s;
            }
          }
          rv1[l] = 0.0;
          rv1[k] = f;
          w[k] = x;
        }
      }

      return true;
    };
})();
/**
 * BBO indicies. This is a test object that returns the index of refraction
 * for BBO. Eventually this will be called from the crystal database, but 
 * it is useful to have here for now.
 * @class BBO
 * @param {Array} temp [description]
 */
// PhaseMatch.BBO = function BBO (temp) {
//     //Selmeir coefficients for nx, ny, nz
//     this.temp = temp;
//     // this.lambda = lambda
// };

// PhaseMatch.BBO.prototype  = {
//     indicies:function(lambda){
//         lambda = lambda * Math.pow(10,6); //Convert for Sellmeir Coefficients
//         var no = Math.sqrt(2.7359 + 0.01878/ (sq(lambda) - 0.01822) - 0.01354*sq(lambda));
//         var ne = Math.sqrt(2.3753 + 0.01224 / (sq(lambda) - 0.01667) - 0.01516*sq(lambda));

//         return [no, no, ne];
//     }
// };


/*
 * calc_delK()
 * Gets the index of refraction depending on phasematching type
 * All angles in radians.
 * P is SPDC Properties object
 */

 PhaseMatch.calc_delK = function calc_delK (P){

    var n_p = P.n_p;
    var n_s = P.n_s;
    var n_i = P.n_i;
    // console.log("going into calc_delK");
    // console.log("Index of refraction inside calc_delk", P.lambda_s, n_s, n_i, n_p);
    // Directions of the signal and idler photons in the pump coordinates
    var Ss = [Math.sin(P.theta_s)*Math.cos(P.phi_s), Math.sin(P.theta_s)*Math.sin(P.phi_s), Math.cos(P.theta_s)];
    var Si = [Math.sin(P.theta_i)*Math.cos(P.phi_i), Math.sin(P.theta_i)*Math.sin(P.phi_i), Math.cos(P.theta_i)];
    // console.log("SS, SI", Ss, Si);
    // console.log("");

    var delKx = (2*Math.PI*((n_s*Ss[0]/P.lambda_s) + n_i*Si[0]/P.lambda_i));
    var delKy = (2*Math.PI*((n_s*Ss[1]/P.lambda_s) + n_i*Si[1]/P.lambda_i));
    var delKz = (2*Math.PI*(n_p/P.lambda_p - (n_s*Ss[2]/P.lambda_s) - n_i*Si[2]/P.lambda_i));
    delKz = delKz - 2*Math.PI/P.poling_period;

    return [delKx, delKy, delKz];

};

/*
 * calc_delK()
 * Gets the index of refraction depending on phasematching type
 * All angles in radians.
 * P is SPDC Properties object
 */

 PhaseMatch.calc_delK_w = function calc_delK_w (P, w_p){
    var con = PhaseMatch.constants;

    var n_s = P.n_s;
    var n_i = P.n_i;
    // console.log("going into calc_delK");
    // console.log("Index of refraction inside calc_delk", P.lambda_s, n_s, n_i, n_p);
    // Directions of the signal and idler photons in the pump coordinates
    var Ss = [Math.sin(P.theta_s)*Math.cos(P.phi_s), Math.sin(P.theta_s)*Math.sin(P.phi_s), Math.cos(P.theta_s)];
    var Si = [Math.sin(P.theta_i)*Math.cos(P.phi_i), Math.sin(P.theta_i)*Math.sin(P.phi_i), Math.cos(P.theta_i)];
    // console.log("SS, SI", Ss, Si);
    // console.log("");

    var delKx = (2*Math.PI*((n_s*Ss[0]/P.lambda_s) + n_i*Si[0]/P.lambda_i));
    var delKy = (2*Math.PI*((n_s*Ss[1]/P.lambda_s) + n_i*Si[1]/P.lambda_i));
    var delKz = w_p/con.c - (2*Math.PI*((n_s*Ss[2]/P.lambda_s) + n_i*Si[2]/P.lambda_i));
    delKz = delKz -2*Math.PI/P.poling_period;

    return [delKx, delKy, delKz];

};

/*
 * optimum_idler()
 * Analytically calcualte optimum idler photon wavelength
 * All angles in radians.
 */
PhaseMatch.optimum_idler = function optimum_idler(P){

    var delKpp = P.lambda_s/P.poling_period;

    var arg = sq(P.n_s) + sq(P.n_p*P.lambda_s/P.lambda_p);    
    arg += -2*P.n_s*P.n_p*(P.lambda_s/P.lambda_p)*Math.cos(P.theta_s) - 2*P.n_p*P.lambda_s/P.lambda_p*delKpp;
    arg += 2*P.n_s*Math.cos(P.theta_s)*delKpp + sq(delKpp);
    arg = Math.sqrt(arg);

    var arg2 = P.n_s*Math.sin(P.theta_s)/arg;

    var theta_i = Math.asin(arg2);
    // return theta_i;
    P.theta_i = theta_i;
    //Update the index of refraction for the idler
    P.S_i = P.calc_Coordinate_Transform(P.theta, P.phi, P.theta_i, P.phi_i);
    P.n_i = P.calc_Index_PMType(P.lambda_i, P.Type, P.S_i, "idler");
};

/*
 * optimum_signal()
 * Analytically calcualte optimum signal photon wavelength
 * All angles in radians.
 */
PhaseMatch.optimum_signal = function optimum_signal(P){
    var delKpp = P.lambda_i/P.poling_period;

    var arg = sq(P.n_i) + sq(P.n_p*P.lambda_i/P.lambda_p);    
    arg -= 2*P.n_i*P.n_p*(P.lambda_i/P.lambda_p)*Math.cos(P.theta_i) - 2*P.n_p*P.lambda_i/P.lambda_p*delKpp;
    arg += 2*P.n_i*Math.cos(P.theta_i)*delKpp + sq(delKpp);
    arg = Math.sqrt(arg);

    var arg2 = P.n_i*Math.sin(P.theta_i)/arg;

    var theta_s = Math.asin(arg2);

    P.theta_s = theta_s;
    //Update the index of refraction for the signal
    P.S_s = P.calc_Coordinate_Transform(P.theta, P.phi, P.theta_s, P.phi_s);
    P.n_s = P.calc_Index_PMType(P.lambda_s, P.Type, P.S_s, "signal");
};



/*
 * phasematch()
 * Gets the index of refraction depending on phasematching type
 * P is SPDC Properties object
 */
PhaseMatch.phasematch = function phasematch (P){
    var con = PhaseMatch.constants;
    var lambda_p = P.lambda_p; //store the original lambda_p
    var n_p = P.n_p;

    P.lambda_p =1/(1/P.lambda_s + 1/P.lambda_i);
    P.n_p = P.calc_Index_PMType(P.lambda_p, P.Type, P.S_p, "pump");

    // var w_p = 2*Math.PI *con.c * (P.n_s/P.lambda_s + P.n_i/P.lambda_i);

    var delK = PhaseMatch.calc_delK(P);
    // var delK = PhaseMatch.calc_delK_w(P, w_p);
    
    P.lambda_p = lambda_p; //set back to the original lambda_p
    P.n_p = n_p;

    // P.calc_Index_PMType(P.lambda_p, P.Type, P.S_p, "pump");
    var arg = P.L/2*(delK[2]);

    //More advanced calculation of phasematching in the z direction. Don't need it now.

    // var l_range = linspace(0,L,apodization+1)
    // A = Math.exp(-sq((l_range - L/2))/2/sq(apodization_FWHM))


    // PMz = 0
    // for m in range(apodization):
    //  delL = Math.abs(l_range[m+1] - l_range[m])
    //  PMz = PMz + A[m]*1j*(Math.exp(1j*delKz*l_range[m]) - Math.exp(1j*delKz*l_range[m+1]))/delKz/(delL) #* Math.exp(1j*delKz*delL/2)

    // PMz = PMz/(apodization)#/L/delKz

    // PMz_ref = Math.sin(arg)/arg * Math.exp(-1j*arg)

    // norm = Math.max(Math.absolute(PMz_ref)) / Math.max(Math.absolute(PMz))
    // PMz = PMz*norm 

    // Phasematching along z dir
    var PMz = Math.sin(arg)/arg; //* Math.exp(1j*arg)
    var PMz_real = 0;
    var PMz_imag = 0;
    if (P.useguassianapprox){
        // console.log('approx');
        PMz_real = Math.exp(-0.193*sq(arg));
        PMz_imag = 0;
    }
    else{
        PMz_real =  PMz * Math.cos(arg);
        PMz_imag = PMz * Math.sin(arg);
    }

    // Phasematching along transverse directions
    // np.exp(-.5*(delKx**2 + delKy**2)*W**2)
    var PMt = Math.exp(-0.5*(sq(delK[0]) + sq(delK[1]))*sq(P.W));

    // Calculate the Pump spectrum
    // convert pump bandwidth from FWHM to standard deviation
    // p_bw = p_bw / 2.35482;
    // var w_s = 2*Math.PI*con.c *P.n_s/P.lambda_s;
    // var w_i = 2*Math.PI*con.c *P.n_i/P.lambda_i;

    var p_bw = 2*Math.PI*con.c/sq(lambda_p) *P.p_bw; //* n_p; //convert from wavelength to w 
    p_bw = p_bw /(2 * Math.sqrt(2*Math.log(2))); //convert from FWHM
    // var alpha = Math.exp(-sq(((w_s - P.wbar_s)+(w_i - P.wbar_i))/(2*p_bw)));
    // var alpha = Math.exp(-1*sq(2*Math.PI*con.c*( ( P.n_s/P.lambda_s + P.n_i/P.lambda_i +1/P.poling_period - P.n_p/P.lambda_p) )/(p_bw)));
    var alpha = Math.exp(-1*sq(2*Math.PI*con.c*( ( 1/P.lambda_s + 1/P.lambda_i - 1/P.lambda_p) )/(2*p_bw)));

    // var alpha = Math.exp(-1*sq(2*Math.PI*con.c*( ( 1/P.lambda_s + 1/P.lambda_i +1/P.poling_period - 1/P.lambda_p) )/(p_bw)));

    // var alpha = 1;
    // PMt = 1;
    // PMz_real = 1;
    // PMz_imag = 0;

    
    //return the real and imaginary parts of Phase matching function
    return [alpha*PMt* PMz_real, alpha*PMt* PMz_imag];
    // return [(delK[2]), 0];
};

/*
 * phasematch()
 * Gets the index of refraction depending on phasematching type
 * P is SPDC Properties object
 */
PhaseMatch.phasematch_Int_Phase = function phasematch_Int_Phase(P){
    
    // PM is a complex array. First element is real part, second element is imaginary.
    // var PM = PhaseMatch.phasematch(P, P.crystal, P.Type, P.lambda_p, P.p_bw, P.W, P.lambda_s, P.lambda_i, P.L, P.theta, P.phi, P.theta_s, P.theta_i, P.phi_s, P.phi_i, P.poling_period, P.phase, P.apodization ,P.apodization_FWHM);
    var PM = PhaseMatch.phasematch(P);

    // var PMInt = sq(PM[0]) + sq(PM[1])

    if (P.phase){
        var PMang = Math.atan2(PM[1],PM[0]) + Math.PI;
        // need to figure out an elegant way to apodize the phase. Leave out for now
        // var x = PMInt<0.01
        // var AP = PMInt
        // var AP[x] = 0.
        // var x = PMInt >0
        // var AP[x] = 1.

        // PM = PMang * AP;
    } else {
        // console.log  ("calculating Intensity")
        PM = sq(PM[0]) + sq(PM[1]);
    }
    // console.log(PM)
    return PM;
};

/*
 * calc_HOM_JSA()
 * Calculates the HOM interference for a particular point
 * P is SPDC Properties object
 * delT is the time delay between signal and idler
 */
PhaseMatch.calc_HOM = function calc_HOM(P, delT){
    var con = PhaseMatch.constants;

    var THETA1 = PhaseMatch.phasematch(P);

    // first make copies of the parameters
    var lambda_s = P.lambda_s;
    var lambda_i = P.lambda_i;
    var theta_s = P.theta_s;
    var theta_i = P.theta_i;
    var S_s = P.S_s;
    var S_i = P.S_i;
    var n_s = P.n_s;
    var n_i = P.n_i;

    // Now swap the signal and idler 
    P.lambda_s = lambda_i;
    P.lambda_i = lambda_s;
    P.theta_i = theta_s;

    P.S_i = P.calc_Coordinate_Transform(P.theta, P.phi, P.theta_i, P.phi_i);
    P.n_i = P.calc_Index_PMType(P.lambda_i, P.Type, P.S_i, "idler"); 

    //calculate the new optimum signal angle
    PhaseMatch.optimum_signal(P);

    // Calculate the phasematching function with signal/idler swapped
    var THETA2 = PhaseMatch.phasematch(P);

    // Now reset all of the values of P
    P.lambda_s = lambda_s;
    P.lambda_i = lambda_i;
    P.theta_s = theta_s;
    P.theta_i = theta_i;
    P.S_s = S_s;
    P.S_i = S_i;
    P.n_s = n_s;
    P.n_i = n_i;


    //Oscillations due to the time difference
    var arg = 2*Math.PI*con.c *(1/P.lambda_s - 1/P.lambda_i)*delT;
    var Tosc_real = Math.cos(arg);
    var Tosc_imag = Math.sin(arg);

    // arg2 = THETA2*Tosc. Split calculation to handle complex numbers
    var arg2_real = Tosc_real*THETA2[0] - Tosc_imag*THETA2[1];
    var arg2_imag = Tosc_real*THETA2[1] + Tosc_imag*THETA2[0];

    var PM_real = (THETA1[0] - arg2_real)/Math.sqrt(2);
    var PM_imag = (THETA1[1] - arg2_imag)/Math.sqrt(2);

    var PMint = sq(PM_real)+sq(PM_imag);
    return PMint;
};

/*
 * calc_HOM_JSA()
 * Calculates the Joint Spectra Amplitude of the HOM at a particluar time delay
 * P is SPDC Properties object
 * ls_start ... li_stop are the signal/idler wavelength ranges to calculate over
 * delT is the time delay between signal and idler
 */
PhaseMatch.calc_HOM_JSA = function calc_HOM_JSA(props, ls_start, ls_stop, li_start, li_stop, delT, dim){
    var con = PhaseMatch.constants;
    var P = PhaseMatch.deepcopy(props);
    var lambda_s = new Float64Array(dim);
    var lambda_i = new Float64Array(dim);

    var i;
    lambda_s = numeric.linspace(ls_start, ls_stop, dim);
    lambda_i = numeric.linspace(li_stop, li_start, dim); 

    var N = dim * dim;
    var THETA1_real = new Float64Array( N );
    var THETA1_imag = new Float64Array( N );
    var THETA2_real  = new Float64Array( N ); // The transposed version of THETA1
    var THETA2_imag  = new Float64Array( N ); 
    var Tosc_real = new Float64Array( N ); // Real/Imag components of phase shift
    var Tosc_imag = new Float64Array( N );
    var ARG = 0;

    var PM = new Float64Array( N );

    
    for (i=0; i<N; i++){
        var index_s = i % dim;
        var index_i = Math.floor(i / dim);

        //First calculate PM(ws,wi)
        P.lambda_s = lambda_s[index_s];
        P.lambda_i = lambda_i[index_i];
        P.n_s = P.calc_Index_PMType(P.lambda_s, P.Type, P.S_s, "signal");
        PhaseMatch.optimum_idler(P); //Need to find the optimum idler.
        
        var PMtmp = PhaseMatch.phasematch(P);
        THETA1_real[i] = PMtmp[0];
        THETA1_imag[i] = PMtmp[1];

        //Next calculate PM(wi,ws)
        P.lambda_s = lambda_i[index_i];
        P.lambda_i = lambda_s[index_s];
        P.n_s = P.calc_Index_PMType(P.lambda_s, P.Type, P.S_s, "signal");
        PhaseMatch.optimum_idler(P); //Need to find the optimum idler.
        
        PMtmp = PhaseMatch.phasematch(P);
        THETA2_real[i] = PMtmp[0];
        THETA2_imag[i] = PMtmp[1];

        // THETA2_real[(dim -1 - index_s) * dim + (dim - 1 -index_s)] = PMtmp[0]; //Transpose
        // THETA2_imag[(dim -1 - index_s) * dim + (dim - 1 -index_s)] = PMtmp[1];

        ARG = 2*Math.PI*con.c *(1/lambda_s[index_s] - 1/lambda_i[index_i])*delT;
        Tosc_real[i] = Math.cos(ARG);
        Tosc_imag[i] = Math.sin(ARG);
        // Tosc_real[i] = 1;
        // Tosc_imag[i] = 0;
    }

    // THETA2_real = PhaseMatch.AntiTranspose(THETA1_real,dim);
    // THETA2_imag = PhaseMatch.AntiTranspose(THETA1_imag,dim);

    for (i=0; i<N; i++){
        // arg2 = THETA2*Tosc. Split calculation to handle complex numbers
        var arg2_real = Tosc_real[i]*THETA2_real[i] - Tosc_imag[i]*THETA2_imag[i];
        var arg2_imag = Tosc_real[i]*THETA2_imag[i] + Tosc_imag[i]*THETA2_real[i];

        var PM_real = (THETA1_real[i] - arg2_real)/Math.sqrt(2);
        var PM_imag = (THETA1_imag[i] - arg2_imag)/Math.sqrt(2);

        PM[i] = sq(PM_real) + sq(PM_imag);
    }

    return PM;
};

//  PhaseMatch.calc_HOM_JSA = function calc_HOM_JSA(props, ls_start, ls_stop, li_start, li_stop, delT, dim){
//     var con = PhaseMatch.constants;
//     var P = PhaseMatch.deepcopy(props);
//     var lambda_s = new Float64Array(dim);
//     var lambda_i = new Float64Array(dim);

//     var i;
//     lambda_s = numeric.linspace(ls_start, ls_stop, dim);
//     lambda_i = numeric.linspace(li_stop, li_start, dim); 

//     var N = dim * dim;
//     var THETA1_real = new Float64Array( N );
//     var THETA1_imag = new Float64Array( N );
//     var THETA2_real  = new Float64Array( N ); // The transposed version of THETA1
//     var THETA2_imag  = new Float64Array( N ); 
//     var Tosc_real = new Float64Array( N ); // Real/Imag components of phase shift
//     var Tosc_imag = new Float64Array( N );
//     var ARG = 0;

//     var PM = new Float64Array( N );

    
//     for (i=0; i<N; i++){
//         var index_s = i % dim;
//         var index_i = Math.floor(i / dim);

//         P.lambda_s = lambda_s[index_s];
//         P.lambda_i = lambda_i[index_i];
//         P.n_s = P.calc_Index_PMType(P.lambda_s, P.Type, P.S_s, "signal");

//         PhaseMatch.optimum_idler(P); //Need to find the optimum idler.
//         P.calc_wbar();
        
//         var PMtmp = PhaseMatch.phasematch(P);
//         THETA1_real[i] = PMtmp[0];
//         THETA1_imag[i] = PMtmp[1];

//         // THETA2_real[(dim -1 - index_s) * dim + (dim - 1 -index_s)] = PMtmp[0]; //Transpose
//         // THETA2_imag[(dim -1 - index_s) * dim + (dim - 1 -index_s)] = PMtmp[1];

//         ARG = 2*Math.PI*con.c *(1/P.lambda_s - 1/P.lambda_i)*delT;
//         Tosc_real[i] = Math.cos(ARG);
//         Tosc_imag[i] = Math.sin(ARG);
//         // Tosc_real[i] = 1;
//         // Tosc_imag[i] = 0;
//     }

//     THETA2_real = PhaseMatch.AntiTranspose(THETA1_real,dim);
//     THETA2_imag = PhaseMatch.AntiTranspose(THETA1_imag,dim);

//     for (i=0; i<N; i++){
//         // arg2 = THETA2*Tosc. Split calculation to handle complex numbers
//         var arg2_real = Tosc_real[i]*THETA2_real[i] - Tosc_imag[i]*THETA2_imag[i];
//         var arg2_imag = Tosc_real[i]*THETA2_imag[i] + Tosc_imag[i]*THETA2_real[i];

//         var PM_real = (THETA1_real[i] - arg2_real)/Math.sqrt(2);
//         var PM_imag = (THETA1_imag[i] - arg2_imag)/Math.sqrt(2);

//         PM[i] = sq(PM_real) + sq(PM_imag);
//     }

//     return PM;
// };


/*
 * calc_HOM_scan()
 * Calculates the HOM probability of coincidences over range of times.
 * P is SPDC Properties object
 * delT is the time delay between signal and idler
 */
PhaseMatch.calc_HOM_scan = function calc_HOM_scan(P, t_start, t_stop, ls_start, ls_stop, li_start, li_stop, dim){

    var delT = new Float64Array(dim);
    var HOM_values = new Float64Array(dim);
    var npts = 50;  //number of points to pass to the calc_HOM_JSA

    var i;
    delT = numeric.linspace(t_start, t_stop, dim);
    HOM_values = numeric.linspace(t_start, t_stop, dim); 
    var PM_JSA = new Float64Array(npts*npts);

    // Calculate normalization
    var norm = new Float64Array(npts*npts);
    norm = PhaseMatch.calcJSA(P,ls_start, ls_stop, li_start,li_stop, npts);
    var N = PhaseMatch.Sum(norm);

    for (i=0; i<dim; i++){
        PM_JSA = PhaseMatch.calc_HOM_JSA(P, ls_start, ls_stop, li_start, li_stop, delT[i], npts);
        var total = PhaseMatch.Sum(PM_JSA)/N/2;
        HOM_values[i] = total;
    }

    return HOM_values;
    
};

PhaseMatch.Sum = function Sum(A){
    var total=0;
    var l = A.length;
    for(var i=0; i<l; i++) { 
        total += A[i]; 
    }
    return total;
};

PhaseMatch.Transpose = function Transpose(A, dim){
    var Trans = new Float64Array(dim*dim);
    var l = A.length;
    for(var i=0; i<l; i++) { 
        var index_c = i % dim;
        var index_r = Math.floor(i / dim);
        //swap rows with columns
        Trans[index_c * dim + index_r] = A[i];

    }
    return Trans;
};

PhaseMatch.AntiTranspose = function Transpose(A, dim){
    var Trans = new Float64Array(dim*dim);
    var l = A.length;
    for(var i=0; i<l; i++) { 
        var index_c = i % dim;
        var index_r = Math.floor(i / dim);
        //swap rows with columns
        Trans[(dim -1 - index_c) * dim + (dim - 1 -index_r)] = A[i];

    }
    return Trans;
};

PhaseMatch.autorange_lambda = function autorange_lambda(props, threshold){
    var P = PhaseMatch.deepcopy(props);
    //eliminates sinc side lobes which cause problems.
    P.useguassianapprox = true;

    var lambda_limit = function(lambda_s){
        P.lambda_s = lambda_s;
        P.n_s = P.calc_Index_PMType(lambda_s, P.Type, P.S_s, "signal");
        P.lambda_i = 1/(1/P.lambda_p - 1/lambda_s);
        PhaseMatch.optimum_idler(P);

        var PM = PhaseMatch.phasematch_Int_Phase(P);
        // console.log(P.lambda_p/1e-9, P.lambda_s/1e-9, P.lambda_i/1e-9, PM)
        return Math.abs(PM - threshold);
    };

    var guess = P.lambda_s - 1e-9;
    var ans = PhaseMatch.nelderMead(lambda_limit, guess, 50);
    var ans2 = 1/(1/props.lambda_p - 1/ans);

    var l1 = Math.min(ans, ans2);
    var l2 = Math.max(ans, ans2);
    // console.log(P.lambda_p/1e-9, l1/1e-9, l2/1e-9, P.p_bw/1e-9);

    var dif = (l2-l1);

    //Now try to find sensible limits. We want to make sure the range of values isn't too big,
    //but also ensure that if the pump bandwidth is small, that the resulting JSA is visible.
    //This is important for calculating things like the Hong-Ou-Mandel.
    var difmax = 20e-9 * P.lambda_p/775e-9 * P.p_bw/1e-9 ;
    
    if (difmax>35e-9){
        difmax = 35e-9;
    }

    if (dif>difmax){
        dif = difmax;
    }
    // console.log("diff = ", dif/1e-9, difmax/1e-9);
    
    var la = 1/(1/l1 + 1/l2)*2 - 3 * dif;
    var lb = 1/(1/l1 + 1/l2)*2 + 3 * dif;

    la = 1500e-9;
    lb = 1600e-9;

    console.log(la/1e-9, lb/1e-9);
    // l1 = l1 -2*dif;
    // l2 = l2 + 2*dif;
    return [la,lb];
};


(function(){

    var con = PhaseMatch.constants;
    var spdcDefaults = {
        lambda_p: 775 * con.nm,
        lambda_s: 1500 * con.nm,
        lambda_i: 1600 * con.nm,
        Type: [
            "o -> o + o", 
            "e -> o + o", 
            "e -> e + o", 
            "e -> o + e"
        ],
        theta: 19.8371104525 * Math.PI / 180,
        phi: 0,
        theta_s: 0, // * Math.PI / 180,
        theta_i: 0,
        phi_s: 0,
        phi_i: 0,
        poling_period: 1000000,
        L: 2000 * con.um,
        W: 500 * con.um,
        p_bw: 1 * con.nm,
        phase: false,
        apodization: 1,
        apodization_FWHM: 1000 * con.um
    };

    /**
     * SPDCprop
     */
    var SPDCprop = function( cfg ){
        this.init( cfg || spdcDefaults );
    };

    SPDCprop.prototype = {

        init:function(){
            var con = PhaseMatch.constants;
            this.lambda_p = 775 * con.nm;
            this.lambda_s = 1550 * con.nm;
            this.lambda_i = 1/(1/this.lambda_p - 1/this.lambda_s);
            this.Types = ["Type 0:   o -> o + o", "Type 1:   e -> o + o", "Type 2:   e -> e + o", "Type 2:   e -> o + e"];
            this.Type = this.Types[2];
            this.theta = 90 *Math.PI / 180;
            // this.theta = 19.2371104525 *Math.PI / 180;
            this.phi = 0;
            this.theta_s = 0 * Math.PI / 180;
            this.theta_i = this.theta_s;
            this.phi_s = 0;
            this.phi_i = this.phi_s + Math.PI;
            this.L = 2000 * con.um;
            this.W = 500* con.um;
            this.p_bw = 6 * con.nm;
            this.phase = false;
            this.autocalctheta = false;
            this.autocalcpp = true;
            this.poling_period = 1000000;
            this.apodization = 1;
            this.apodization_FWHM = 1000 * con.um;
            this.useguassianapprox = false;
            this.crystalNames = PhaseMatch.CrystalDBKeys;
            this.crystal = PhaseMatch.CrystalDB[this.crystalNames[1]];
            this.temp = 20;
            //Other functions that do not need to be included in the default init
            this.S_p = this.calc_Coordinate_Transform(this.theta, this.phi, 0, 0);
            this.S_s = this.calc_Coordinate_Transform(this.theta, this.phi, this.theta_s, this.phi_s);
            this.S_i = this.calc_Coordinate_Transform(this.theta, this.phi, this.theta_i, this.phi_i);

            this.n_p = this.calc_Index_PMType(this.lambda_p, this.Type, this.S_p, "pump");
            this.n_s = this.calc_Index_PMType(this.lambda_s, this.Type, this.S_s, "signal");
            this.n_i = this.calc_Index_PMType(this.lambda_i, this.Type, this.S_i, "idler");

            this.msg = "";

            // this.wbar_pump = 2*Math.PI*con.c/this.lambda_p * this.n_p;
            // this.wbar_s = 2*Math.PI*con.c/(2*this.lambda_p) * this.calc_Index_PMType(2*this.lambda_p, this.Type, this.S_s, "signal");
            // this.wbar_i = 2*Math.PI*con.c/(2*this.lambda_p) * this.calc_Index_PMType(2*this.lambda_p, this.Type, this.S_s, "idler");

            // wbar = 2*pi*con.c *n_p0/pump
//     wbar_s =  2*pi*con.c *n_s0/(2*pump)
//     wbar_i = 2*pi*con.c *n_i0/(2*pump)


        },
            // this.autocalcTheta = false;
            // this.calc_theta= function(){
            //     //unconstrained minimization
            //     if this.autocalcTheta{}
            //     return this.theta = answer
            // }
        calc_Coordinate_Transform : function (theta, phi, theta_s, phi_s){
            //Should save some calculation time by defining these variables.
            var SIN_THETA = Math.sin(theta);
            var COS_THETA = Math.cos(theta);
            var SIN_THETA_S = Math.sin(theta_s);
            var COS_THETA_S = Math.cos(theta_s);
            var SIN_PHI = Math.sin(phi);
            var COS_PHI = Math.cos(phi);
            var SIN_PHI_S = Math.sin(phi_s);
            var COS_PHI_S = Math.cos(phi_s);


            var S_x = SIN_THETA_S*COS_PHI_S;
            var S_y = SIN_THETA_S*SIN_PHI_S;
            var S_z = COS_THETA_S;

            // Transform from the lambda_p coordinates to crystal coordinates
            var SR_x = COS_THETA*COS_PHI*S_x - SIN_PHI*S_y + SIN_THETA*COS_PHI*S_z;
            var SR_y = COS_THETA*SIN_PHI*S_x + COS_PHI*S_y + SIN_THETA*SIN_PHI*S_z;
            var SR_z = -SIN_THETA*S_x                      + COS_THETA*S_z;
            
            // Normalambda_ize the unit vector
            // @TODO: When theta = 0, Norm goes to infinity. This messes up the rest of the calculations. In this
            // case I think the correct behaviour is for Norm = 1 ?
            var Norm =  Math.sqrt(sq(S_x) + sq(S_y) + sq(S_z));
            var Sx = SR_x/(Norm);
            var Sy = SR_y/(Norm);
            var Sz = SR_z/(Norm);

            return [Sx, Sy, Sz];
        },

        calc_Index_PMType : function (lambda, Type, S, photon){
            var ind = this.crystal.indicies(lambda, this.temp);

            var nx = ind[0];
            var ny = ind[1];
            var nz = ind[2];

            var Sx = S[0];
            var Sy = S[1];
            var Sz = S[2];

            var B = sq(Sx) * (1/sq(ny) + 1/sq(nz)) + sq(Sy) *(1/sq(nx) + 1/sq(nz)) + sq(Sz) *(1/sq(nx) + 1/sq(ny));
            var C = sq(Sx) / (sq(ny) * sq(nz)) + sq(Sy) /(sq(nx) * sq(nz)) + sq(Sz) / (sq(nx) * sq(ny));
            var D = sq(B) - 4 * C;

            var nslow = Math.sqrt(2/ (B + Math.sqrt(D)));
            var nfast = Math.sqrt(2/ (B - Math.sqrt(D)));
            //nfast = o, nslow = e

            var n = 1;

            switch (Type){
                case "Type 0:   o -> o + o":
                    n = nfast;
                break;
                case "Type 1:   e -> o + o":
                    if (photon === "pump") { n = nslow;}
                    else { n = nfast;}
                break;
                case "Type 2:   e -> e + o":
                    if (photon === "idler") { n = nfast;}
                    else {n = nslow;}
                break;
                case "Type 2:   e -> o + e":
                    if (photon === "signal") { n = nfast;}
                    else {n = nslow;}
                break;
                default:
                    throw "Error: bad PMType specified";
            }

            // switch (Type){
            //     case this.Types[0]:
            //         n = nfast;
            //     break;
            //     case this.Types[1]:
            //         if (photon === "pump") { n = nslow;}
            //         else { n = nfast;}
            //     break;
            //     case this.Types[2]:
            //         if (photon === "idler") { n = nfast;}
            //         else {n = nslow;}
            //     break;
            //     case this.Types[3]:
            //         if (photon === "signal") { n = nfast;}
            //         else {n = nslow;}
            //     break;
            //     default:
            //         throw "Error: bad PMType specified";
            // }

            return n ;
        },

        set_crystal : function (k){
            this.crystal = PhaseMatch.CrystalDB[k];
            var ind = this.crystal.indicies(this.lambda_p, this.temp);
        },

        calc_wbar : function (){
            // this.wbar_s = 2*Math.PI*con.c/(2*this.lambda_p) * this.calc_Index_PMType(2*this.lambda_p, this.Type, this.S_s, "signal");
            // this.wbar_i = 2*Math.PI*con.c/(2*this.lambda_p) * this.calc_Index_PMType(2*this.lambda_p, this.Type, this.S_s, "idler");
        },


        set: function( name, val ){

            // set the value
            this[ name ] = val;

            switch ( name ){

                case 'theta':
                case 'phi':
                case 'theta_s':
                case 'phi_s':

                    // update rotation object
                    this.S.set( this.theta, this.phi, this.theta_s, this.phi_s );
                break;
            }

            // for chaining calls
            return this;
        }
    };

    PhaseMatch.SPDCprop = SPDCprop;

    //
    // @TODO: Jasper suggests moving these into the props object
    // itself ( thereby making this a more object oriented approach )
    // 
    // Ex: props.auto_calc_Theta();
    // 
    // inside functions you just need to change:
    // function auto_calc_Theta( props )
    // to
    // function auto_calc_Theta(){
    //     var props = this;
    //     ...
    // }
    // 
    PhaseMatch.auto_calc_Theta = function auto_calc_Theta(props){
        var min_delK = function(x){
            if (x>Math.PI/2 || x<0){return 1e12;}
            props.theta = x;
            PhaseMatch.updateallangles(props);
            // props.S_p = props.calc_Coordinate_Transform(props.theta, props.phi, 0, 0);
            // props.S_s = props.calc_Coordinate_Transform(props.theta, props.phi, props.theta_s, props.phi_s);
            // props.S_i = props.calc_Coordinate_Transform(props.theta, props.phi, props.theta_i, props.phi_i);

            // props.n_p = props.calc_Index_PMType(props.lambda_p, props.Type, props.S_p, "pump");
            // props.n_s = props.calc_Index_PMType(props.lambda_s, props.Type, props.S_s, "signal");
            // props.n_i = props.calc_Index_PMType(props.lambda_i, props.Type, props.S_i, "idler");

            var delK =  PhaseMatch.calc_delK(props);
            // console.log("in the function", delK)
            return Math.sqrt(sq(delK[0]) + sq(delK[1]) + sq(delK[2]) );
        };

        var guess = Math.PI/8;
        var startTime = new Date();

        var ans = PhaseMatch.nelderMead(min_delK, guess, 1000);
        // var ans = numeric.uncmin(min_delK, [guess]).solution[0];
        var endTime = new Date();
        

        var timeDiff = (endTime - startTime)/1000;
        // console.log("Theta autocalc = ", timeDiff);
        props.theta = ans;
    };

    PhaseMatch.calc_poling_period = function calc_poling_period(props){
        PhaseMatch.optimum_idler(props);
        PhaseMatch.updateallangles(props);
        console.log("theta_s = ", props.theta_s*180/Math.PI, props.theta_i*180/Math.PI);
        //very large number. Eliminates previous values of poling period from calculation.
        props.poling_period = 1e12; 
        var delK = PhaseMatch.calc_delK(props);
        props.poling_period = 2*Math.PI/delK[2];
        console.log("poling period ", props.poling_period);
        
    };

    PhaseMatch.brute_force_theta_i = function brute_force_theta_i(props){
        var min_PM = function(x){
            if (x>Math.PI/2 || x<0){return 1e12;}
            props.theta_i = x;

            props.S_i = props.calc_Coordinate_Transform(props.theta, props.phi, props.theta_i, props.phi_i);
            props.n_i = props.calc_Index_PMType(props.lambda_i, props.Type, props.S_i, "idler");

            var PMtmp =  PhaseMatch.phasematch_Int_Phase(props);
            return 1-PMtmp;
        };

        //Initial guess
        PhaseMatch.optimum_idler(props);
        var guess = props.theta_i;
        // var startTime = new Date();

        var ans = PhaseMatch.nelderMead(min_PM, guess, 25);
    };

    PhaseMatch.deepcopy = function deepcopy(props){
        var P = new PhaseMatch.SPDCprop();
        P.crystal = props.crystal;
        P.lambda_p = PhaseMatch.util.clone(props.lambda_p,true);
        P.lambda_s = PhaseMatch.util.clone(props.lambda_s,true);
        P.lambda_i = PhaseMatch.util.clone(props.lambda_i,true);
        P.Type = PhaseMatch.util.clone(props.Type,true);
        P.theta = PhaseMatch.util.clone(props.theta,true);
        P.phi = PhaseMatch.util.clone(props.phi,true);
        P.theta_s = PhaseMatch.util.clone(props.theta_s,true);
        P.theta_i = PhaseMatch.util.clone(props.theta_i,true);
        P.phi_s = PhaseMatch.util.clone(props.phi_s,true);
        P.phi_i = PhaseMatch.util.clone(props.phi_i,true);
        P.poling_period = PhaseMatch.util.clone(props.poling_period,true);
        P.L = PhaseMatch.util.clone(props.L,true);
        P.W = PhaseMatch.util.clone(props.W,true);
        P.p_bw = PhaseMatch.util.clone(props.p_bw,true);
        P.phase = PhaseMatch.util.clone(props.phase,true);
        P.apodization = PhaseMatch.util.clone(props.apodization,true);
        P.apodization_FWHM = PhaseMatch.util.clone(props.apodization_FWHM,true);
        P.S_p = PhaseMatch.util.clone(props.S_p,true);
        P.S_s = PhaseMatch.util.clone(props.S_s,true);
        P.S_i = PhaseMatch.util.clone(props.S_i,true);
        P.n_p = PhaseMatch.util.clone(props.n_p,true);
        P.n_s = PhaseMatch.util.clone(props.n_s,true);
        P.n_i = PhaseMatch.util.clone(props.n_i,true);
        
        return P;
    };

    PhaseMatch.updateallangles = function updateallangles(props){
        // console.log("old pump index", props.n_p);
        props.S_p = props.calc_Coordinate_Transform(props.theta, props.phi, 0, 0);
        props.S_s = props.calc_Coordinate_Transform(props.theta, props.phi, props.theta_s, props.phi_s);

        props.n_p = props.calc_Index_PMType(props.lambda_p, props.Type, props.S_p, "pump");
        props.n_s = props.calc_Index_PMType(props.lambda_s, props.Type, props.S_s, "signal");
        // console.log("new pump index", props.n_p);

        PhaseMatch.optimum_idler(props);
        // props.S_i = props.calc_Coordinate_Transform(props.theta, props.phi, props.theta_i, props.phi_i);

       
        // props.n_i = props.calc_Index_PMType(props.lambda_i, props.Type, props.S_i, "idler");

    };

})();


PhaseMatch.calcJSA = function calcJSA(props, ls_start, ls_stop, li_start, li_stop, dim){

    var P = PhaseMatch.deepcopy(props);
    PhaseMatch.updateallangles(P);

    var lambda_s = new Float64Array(dim);
    var lambda_i = new Float64Array(dim);

    var i;
    lambda_s = numeric.linspace(ls_start, ls_stop, dim);
    lambda_i = numeric.linspace(li_stop, li_start, dim); 

    var N = dim * dim;
    var PM = new Float64Array( N );

    var maxpm = 0;
    
    for (i=0; i<N; i++){
        var index_s = i % dim;
        var index_i = Math.floor(i / dim);

        P.lambda_s = lambda_s[index_s];
        P.lambda_i = lambda_i[index_i];
        
        P.n_s = P.calc_Index_PMType(P.lambda_s, P.Type, P.S_s, "signal");

        PhaseMatch.optimum_idler(P); //Need to find the optimum idler for each angle.
        
        PM[i] = PhaseMatch.phasematch_Int_Phase(P);

        if (PM[i]>maxpm){maxpm = PM[i];}
    }
    
    // console.log("max pm value = ", maxpm);
    console.log("");
    // console.log("HOM dip = ",PhaseMatch.calc_HOM_JSA(P, 0e-15));
    
    return PM;

};

PhaseMatch.calcXY = function calcXY(props, x_start, x_stop, y_start, y_stop, dim){

    var P = PhaseMatch.deepcopy(props);

    var X = new Float64Array(dim);
    var Y = new Float64Array(dim);

    var i;
    X = numeric.linspace(x_start, x_stop, dim);
    Y = numeric.linspace(y_start, y_stop, dim); 

    var N = dim * dim;
    var PM = new Float64Array( N );
    
    var startTime = new Date();
    for (i=0; i<N; i++){
        var index_x = i % dim;
        var index_y = Math.floor(i / dim);

        P.theta_s = Math.asin(Math.sqrt(sq(X[index_x]) + sq(Y[index_y])));
        P.phi_s = Math.atan2(Y[index_y],X[index_x]);

        // if (X[index_x] < 0){ P.phi_s += Math.PI;}
        // if (P.phi_s<0){ P.phi_s += 2*Math.PI;}

        // console.log(P.theta_s /Math.PI * 180, P.phi_s /Math.PI * 180);
        P.phi_i = (P.phi_s + Math.PI);
        
        P.S_s = P.calc_Coordinate_Transform(P.theta, P.phi, P.theta_s, P.phi_s);
        // P.S_i = P.calc_Coordinate_Transform(P.theta, P.phi, P.theta_i, P.phi_i);
        P.n_s = P.calc_Index_PMType(P.lambda_s, P.Type, P.S_s, "signal");

        // PhaseMatch.optimum_idler(P); //Need to find the optimum idler for each angle.
        // PhaseMatch.brute_force_theta_i(P); //use a search. could be time consuming.

        //calculate the correct idler angle analytically.
        PhaseMatch.optimum_idler(P);

        // P.calc_wbar();
        
        PM[i] = PhaseMatch.phasematch_Int_Phase(P);
        // PM[i] = PhaseMatch.calc_delK(P);

    }
    var endTime = new Date();
    var timeDiff = (endTime - startTime);
    return PM;

};

PhaseMatch.calc_lambda_s_vs_theta_s = function calc_lambda_s_vs_theta_s(props, l_start, l_stop, t_start, t_stop, dim){

    var P = PhaseMatch.deepcopy(props);

    var lambda_s = new Float64Array(dim);
    var theta_s = new Float64Array(dim);

    var i;
    lambda_s = numeric.linspace(l_start, l_stop, dim);
    theta_s = numeric.linspace(t_stop, t_start, dim); 

    var N = dim * dim;
    var PM = new Float64Array( N );
    
    var startTime = new Date();
    for (i=0; i<N; i++){
        var index_s = i % dim;
        var index_i = Math.floor(i / dim);

        P.lambda_s = lambda_s[index_s];
        P.theta_s = theta_s[index_i];
        P.lambda_i = 1/(1/P.lambda_p - 1/P.lambda_s);
        
        P.S_s = P.calc_Coordinate_Transform(P.theta, P.phi, P.theta_s, P.phi_s);
        P.n_s = P.calc_Index_PMType(P.lambda_s, P.Type, P.S_s, "signal");

        PhaseMatch.optimum_idler(P); //Need to find the optimum idler for each angle.
        // P.calc_wbar();

        PM[i] = PhaseMatch.phasematch_Int_Phase(P);
        // PM[i] = PhaseMatch.calc_delK(P);

    }
    var endTime = new Date();
    var timeDiff = (endTime - startTime);
    return PM;

};

PhaseMatch.calc_theta_phi = function calc_theta_phi(props, t_start, t_stop, p_start, p_stop, dim){

    var P = PhaseMatch.deepcopy(props);
    var theta = new Float64Array(dim);
    var phi = new Float64Array(dim);

    var i;
    theta = numeric.linspace(t_start, t_stop, dim);
    phi = numeric.linspace(p_start, p_stop, dim); 

    var N = dim * dim;
    var PM = new Float64Array( N );
    
    for (i=0; i<N; i++){
        var index_x = i % dim;
        var index_y = Math.floor(i / dim);

        P.theta = theta[index_x];
        P.phi = phi[index_y];
        
        P.S_p = P.calc_Coordinate_Transform(P.theta, P.phi, 0, 0);
        P.n_p = P.calc_Index_PMType(P.lambda_p, P.Type, P.S_p, "pump");

        P.S_s = P.calc_Coordinate_Transform(P.theta, P.phi, P.theta_s, P.phi_s);
        P.n_s = P.calc_Index_PMType(P.lambda_s, P.Type, P.S_s, "signal");

        //calcualte the correct idler angle analytically.
        PhaseMatch.optimum_idler(P);
        // P.calc_wbar();

        PM[i] = PhaseMatch.phasematch_Int_Phase(P);

    }
    return PM;

};


/**
 * BBO indicies. 
 */
PhaseMatch.BBO = function BBO () {
    //Selmeir coefficients for nx, ny, nz
    this.temp = 20;
    this.name = "BBO Ref 1";
    this.info = "";
};

PhaseMatch.BBO.prototype  = {
    indicies:function(lambda, temp){
        lambda = lambda * Math.pow(10,6); //Convert for Sellmeir Coefficients
        var no = Math.sqrt(2.7359 + 0.01878/ (sq(lambda) - 0.01822) - 0.01354*sq(lambda));
        var ne = Math.sqrt(2.3753 + 0.01224 / (sq(lambda) - 0.01667) - 0.01516*sq(lambda));

        return [no, no, ne];
    }
};


/**
 * KTP indicies.
 */
PhaseMatch.KTP = function KTP () {
    //Selmeir coefficients for nx, ny, nz
    this.temp = 20;
    this.name = "KTP";
    this.info = "H. Vanherzeele, J. D. Bierlein, F. C. Zumsteg, Appl. Opt., 27, 3314 (1988)";
};

PhaseMatch.KTP.prototype  = {
    indicies:function(lambda, temp){
        lambda = lambda * Math.pow(10,6); //Convert for Sellmeir Coefficients

        var nx= Math.sqrt(2.10468 + 0.89342*sq(lambda)/(sq(lambda)-0.04438)-0.01036*sq(lambda)); 
        var ny= Math.sqrt(2.14559 + 0.87629*sq(lambda)/(sq(lambda)-0.0485)-0.01173*sq(lambda));
        var nz= Math.sqrt(1.9446 + 1.3617*sq(lambda)/(sq(lambda)-0.047)-0.01491* sq(lambda));

        var dnx= 1.1e-5;
        var dny= 1.3e-5;
        var dnz= 1.6e-5;

        nx = nx + (temp -20.0)*dnx;
        ny = ny + (temp -20.0)*dny;
        nz = nz + (temp -20.0)*dnz;

        // var no = Math.sqrt(2.7359 + 0.01878/ (sq(lambda) - 0.01822) - 0.01354*sq(lambda));
        // var ne = Math.sqrt(2.3753 + 0.01224 / (sq(lambda) - 0.01667) - 0.01516*sq(lambda));

        return [nx, ny, nz];
    }
};


/**
* Create the Crystal DB
**/

// var BBO = new PhaseMatch.BBO();
// var KTP = new PhaseMatch.KTP();
PhaseMatch.CrystalDB = {"BBO Ref 1": new PhaseMatch.BBO(), 
                        "KTP": new PhaseMatch.KTP()};

PhaseMatch.CrystalDBKeys = [];

for(var k in PhaseMatch.CrystalDB){
    PhaseMatch.CrystalDBKeys.push(k);
}

// class KTP(Crystal):
//     Name = "KTP"
//     CrystalType = "Biaxial"
//     CrystalClass = "Unknown"
//     MinLambda = 0.35*nm
//     MaxLambda = 4.5*nm
//     # Temp = 70.
//     def Index(self,Lambda,theta):
//         # H. Vanherzeele, J. D. Bierlein, F. C. Zumsteg, Appl. Opt., 27,
// #       3314 (1988)

//         Lambda=Lambda*10**6

//         # nx = ( 2.1146 + 0.89188/(1 - (0.20861/Lambda)**2) - (0.01320*Lambda**2) )**.5
//         # ny = ( 2.1518 + 0.87862/(1 - (0.21801/Lambda)**2) - (0.01327*Lambda**2) )**.5
//         # nz = ( 2.3136 + 1.00012/(1 - (0.23831/Lambda)**2) - (0.01679*Lambda**2) )**.5
//         #http://www.redoptronics.com/KTP-crystal.html
//         nx=(2.10468 + 0.89342*Lambda**2/(Lambda**2-0.04438)-0.01036*Lambda**2)**.5 
//         ny=(2.14559 + 0.87629*Lambda**2/(Lambda**2-0.0485)-0.01173*Lambda**2)**.5
//         nz=(1.9446 + 1.3617*Lambda**2/(Lambda**2-0.047)-0.01491*Lambda**2)**.5

//         dnx=1.1 *10**(-5)
//         dny=1.3 *10**(-5)
//         dnz=1.6 *10**(-5)

//         nx = nx + (self.Temp -20.)*dnx
//         ny = ny + (self.Temp -20.)*dny
//         nz = nz + (self.Temp -20.)*dnz

//         # http://www.castech-us.com/casktp.htm
//         # nx=(3.0065+0.03901/(Lambda**2-0.04251)-0.01327*Lambda**2)**.5
//         # ny=(3.0333+0.04154/(Lambda**2-0.04547)-0.01408*Lambda**2)**.5
//         # nz=(3.0065+0.05694/(Lambda**2-0.05658)-0.01682*Lambda**2)**.5
//         return nx, ny, nz


// class LiNbO3(Crystal):
//     Name = "LiNbO3"
//     CrystalType = "NegativeUniaxial"
//     CrystalClass = "class_3m"
//     MinLambda = 0.4*nm
//     MaxLambda = 3.4*nm
//     # Temp = 70.

//     def Index(self,Lambda,theta):
//         # H. Vanherzeele, J. D. Bierlein, F. C. Zumsteg, Appl. Opt., 27,
// #       3314 (1988)

//         Lambda=Lambda*10**6

//         nx = ( 4.9048 - 0.11768/(0.04750 - Lambda**2) - 0.027169*Lambda**2 )**.5
//         ny = nx
//         nz = ( 4.5820 - 0.099169/(0.044432 - Lambda**2) -  0.021950*Lambda**2 )**.5

//         # nx = np.sqrt( 1 + 2.6734*Lambda**2/(Lambda**2-0.01764) + 1.2290*Lambda**2/(Lambda**2-0.05914) + 12.614*Lambda**2/(Lambda**2-474.60) )
//         # ny = nx
//         # nz = np.sqrt( 1 + 2.9804*Lambda**2/(Lambda**2-0.02047) + 0.5981*Lambda**2/(Lambda**2-0.0666) + 8.9543*Lambda**2/(Lambda**2-416.08) )

        
//         # nx = nx + (self.Temp -20.)*dnx
//         # ny = ny + (self.Temp -20.)*dny
//         # nz = nz + (self.Temp -20.)*dnz

//         return nx, ny, nz





return PhaseMatch;
}));