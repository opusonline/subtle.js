/*!
 * subtle.js
 * jQuery without jQuery and some more helpful functions
 *
 * author: Stefan Benicke <stefan.benicke@gmail.com>
 * version: 1.0.0
 */
// https://github.com/remy/min.js/blob/master/src/%24.js
// https://gist.github.com/paulirish/12fb951a8b893a454b32
// http://blissfuljs.com/
// subtle js
window.$ = (function (document, window, $, undefined) {
    // Node covers all elements, but also the document objects
    var _nodeProto = (EventTarget || Node).prototype;
    var _nodeListProto = NodeList.prototype;
    var _elementProto = Element.prototype;
    var _objToString = Object.prototype.toString;
    var _listeners = new WeakMap();
    var _original = {
        'addEventListener': _nodeProto.addEventListener,
        'removeEventListener': _nodeProto.removeEventListener
    };
    var _ready;
    var _dummy;
    var _scopeSelector = false;
    var _passiveSupported = getPassiveSupport();

    try {
        _dummy = new EventTarget();
    } catch (e) {
        _dummy = document.createElement('i'); // note: createElement requires a string in Firefox
    }
    try {
        document.querySelector(':scope');
        _scopeSelector = true;
    } catch (e) {
    }

    // https://developer.mozilla.org/en-US/docs/Web/API/Element/matches
    if (!_elementProto.matches) {
        _elementProto.matches = _elementProto.msMatchesSelector || _elementProto.webkitMatchesSelector;
    }

    // https://developer.mozilla.org/en-US/docs/Web/API/Element/closest
    if (!_elementProto.closest) {
        _elementProto.closest = function (selector) {
            var element = this;
            if (!document.documentElement.contains(element)) {
                return null;
            }
            do {
                if (element.matches(selector)) {
                    return element;
                }
                element = element.parentElement || element.parentNode;
            } while (element !== null && element.nodeType === Node.ELEMENT_NODE);
            return null;
        };
    }

    if (!_nodeListProto.forEach) {
        _nodeListProto.forEach = Array.prototype.forEach;
    }

    // https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent/CustomEvent
    if (typeof window.CustomEvent !== 'function') {
        window.CustomEvent = function CustomEvent (type, params) {
            var event;
            params = params || {'bubbles': false, 'cancelable': false, 'detail': null};
            event = document.createEvent('CustomEvent');
            event.initCustomEvent(type, params.bubbles, params.cancelable, params.detail);
            return event;
        }
    }

    if (typeof window.DOMException === 'undefined') {
        var domex_name_to_code = {
            'IndexSizeError': {'code': 1, 'type': 'INDEX_SIZE_ERR'},
            'DOMStringSizeError': {'code': 2, 'type': 'DOMSTRING_SIZE_ERR'},
            'HierarchyRequestError': {'code': 3, 'type': 'HIERARCHY_REQUEST_ERR'},
            'WrongDocumentError': {'code': 4, 'type': 'WRONG_DOCUMENT_ERR'},
            'InvalidCharacterError': {'code': 5, 'type': 'INVALID_CHARACTER_ERR'},
            'NoDataAllowedError': {'code': 6, 'type': 'NO_DATA_ALLOWED_ERR'},
            'NoModificationAllowedError': {'code': 7, 'type': 'NO_MODIFICATION_ALLOWED_ERR'},
            'NotFoundError': {'code': 8, 'type': 'NOT_FOUND_ERR'},
            'NotSupportedError': {'code': 9, 'type': 'NOT_SUPPORTED_ERR'},
            'InuseAttributeError': {'code': 10, 'type': 'INUSE_ATTRIBUTE_ERR'},
            'InvalidStateError': {'code': 11, 'type': 'INVALID_STATE_ERR'},
            'SyntaxError': {'code': 12, 'type': 'SYNTAX_ERR'},
            'InvalidModificationError': {'code': 13, 'type': 'INVALID_MODIFICATION_ERR'},
            'NamespaceError': {'code': 14, 'type': 'NAMESPACE_ERR'},
            'InvalidAccessError': {'code': 15, 'type': 'INVALID_ACCESS_ERR'},
            'ValidationError': {'code': 16, 'type': 'VALIDATION_ERR'},
            'TypeMismatchError': {'code': 17, 'type': 'TYPE_MISMATCH_ERR'},
            'SecurityError': {'code': 18, 'type': 'SECURITY_ERR'},
            'NetworkError': {'code': 19, 'type': 'NETWORK_ERR'},
            'AbortError': {'code': 20, 'type': 'ABORT_ERR'},
            'URLMismatchError': {'code': 21, 'type': 'URL_MISMATCH_ERR'},
            'QuotaExceededError': {'code': 22, 'type': 'QUOTA_EXCEEDED_ERR'},
            'TimeoutError': {'code': 23, 'type': 'TIMEOUT_ERR'},
            'InvalidNodeTypeError': {'code': 24, 'type': 'INVALID_NODE_TYPE_ERR'},
            'DataCloneError': {'code': 25, 'type': 'DATA_CLONE_ERR'}
        };
        function DOMException(message, name) {
            if (!(this instanceof DOMException)) {
                throw new TypeError('Failed to construct \'DOMException\': Please use the \'new\' operator, this DOM object constructor cannot be called as a function.');
            }
            var entry = domex_name_to_code[name];
            this.code = entry ? entry.code : 0;
            this.name = $.type(name) === 'String' ? name : 'Error';
            this.message = $.type(message) === 'String' ? message : '';
        }
        DOMException.prototype = Object.create(Error.prototype);
        Object.defineProperty(DOMException.prototype, 'constructor', {
            'value': DOMException,
            'writable': true,
            'configurable': true
        });
        Object.keys(domex_name_to_code).forEach(function (name) {
            var entry = domex_name_to_code[name];
            DOMException[entry.type] = DOMException.prototype[entry.type] = entry.code;
        });
        window.DOMException = DOMException;
    }

    // .on(type(s), fn, capture)
    // .on(type(s), fn, {passive: true})
    // .on(type(s), fn)
    // .on({types: fn, types: fn})
    window.on = _nodeProto.on = function (types, fn, capture) {
        var listeners, captureValue;
        var self = this;
        if (getOnceValue(capture)) {
            return self.once(types, fn, capture);
        }
        if ($.type(types) === 'Object') {
            $.each(types, function (fn, type) {
                self.on(type, fn);
            });
            return self;
        }
        if (!_listeners.has(self)) {
            listeners = {};
            _listeners.set(self, listeners);
        } else {
            listeners = _listeners.get(self);
        }
        captureValue = getCaptureValue(capture);
        types.trim().split(/\s+/).forEach(function (type) {
            var classNames, events;
            if (type.indexOf('.') > -1) {
                type = type.split('.');
                classNames = type.slice(1);
                type = type[0];
            }
            events = listeners[type];
            if (!events) {
                listeners[type] = events = [];
            }
            if (eventExists(events, fn, captureValue)) {
                return;
            }
            events.push({
                'type': type,
                'listener': fn,
                'handler': null,
                'useCapture': captureValue,
                'classNames': classNames,
                'once': false
            });
            _original.addEventListener.call(self, type, fn, (!_passiveSupported ? captureValue : capture));
        });
        return self;
    };

    window.once = _nodeProto.once = function (types, fn, capture) {
        var listeners, captureValue;
        var self = this;
        if ($.type(types) === 'Object') {
            $.each(types, function (fn, type) {
                self.once(type, fn);
            });
            return self;
        }
        if (!_listeners.has(self)) {
            listeners = {};
            _listeners.set(self, listeners);
        } else {
            listeners = _listeners.get(self);
        }
        captureValue = getCaptureValue(capture);
        types.trim().split(/\s+/).forEach(function (type) {
            var classNames, handler, events;
            if (type.indexOf('.') > -1) {
                type = type.split('.');
                classNames = type.slice(1);
                type = type[0];
            }
            events = listeners[type];
            if (!events) {
                listeners[type] = events = [];
            }
            if (eventExists(events, fn, captureValue)) {
                return;
            }
            handler = function (event) {
                self.off(type, fn, capture);
                fn.call(self, event);
            };
            events.push({
                'type': type,
                'listener': fn,
                'handler': handler,
                'useCapture': captureValue,
                'classNames': classNames,
                'once': true
            });
            _original.addEventListener.call(self, type, handler, (!_passiveSupported ? captureValue : capture));
        });
        return self;
    };

    // .off(type(s), fn, capture)
    // .off(type(s), fn, {passive: true})
    // .off(type(s), fn)
    // .off(type.className)
    // .off(.className)
    // .off()
    window.off = _nodeProto.off = function (types, fn, capture) {
        var listeners, changed;
        var self = this;
        var types_type = $.type(types);
        if (!_listeners.has(self)) {
            return self;
        }
        listeners = _listeners.get(self);
        if (types === undefined) {
            $.each(listeners, function (entries, type) {
                $.each(entries, function (entry) {
                    _original.removeEventListener.call(self, type, (entry.handler || entry.listener), entry.useCapture);
                });
            });
            _listeners.delete(self);
            return self;
        }
        if (types_type === 'Object') {
            $.each(types, function (fn, type) {
                self.off(type, fn);
            });
            return self;
        }
        if (types_type !== 'String') {
            return self;
        }
        changed = [];
        capture = getCaptureValue(capture);
        types.trim().split(/\s+/).forEach(function (type) {
            var classNames, removeEvents, events;
            if (type.indexOf('.') > -1) {
                type = type.split('.');
                classNames = type.slice(1);
                type = type[0];
            }
            removeEvents = function (entry, i, events) {
                if (!entry) {
                    return;
                }
                if (Array.isArray(classNames) && classNames.length > 0 && !classNames.every(function (className) {
                    return this.includes(className)
                }, entry.classNames)) {
                    return;
                }
                if (fn !== undefined && entry.listener !== fn) {
                    return;
                }
                if (entry.useCapture !== capture) {
                    return;
                }
                _original.removeEventListener.call(self, entry.type, (entry.handler || entry.listener), entry.useCapture);
                events[i] = null;
                changed.push(entry.type);
            };
            if (type !== '') {
                events = listeners[type];
                if (!events) {
                    return;
                }
                $.each(events, removeEvents);
            } else {
                $.each(listeners, function (types) {
                    if (!types) {
                        return;
                    }
                    $.each(types, removeEvents);
                });
            }
        });
        if (changed.length > 0) {
            $.each(changed, function (type) {
                var events = listeners[type];
                if (!events) {
                    return;
                }
                $.spliceInPlace(events, null);
                if (events.length === 0) {
                    delete listeners[type];
                }
            });
            if (Object.keys(listeners).length === 0) {
                _listeners.delete(self);
            }
        }
        return self;
    };

    _elementProto.find = function (selector) {
        // https://johnresig.com/blog/thoughts-on-queryselectorall/
        // https://developer.mozilla.org/en-US/docs/Web/API/Element/querySelectorAll
        // make use of '> a' :D
        var cssSelector;
        var self = this;
        var regex = /^\s*:scope\b/i;
        if ($.type(selector) === 'String') {
            if (_scopeSelector) {
                if (regex.test(selector) === false) {
                    selector = ':scope ' + selector;
                }
            } else {
                cssSelector = $.getCSSSelector(self);
                if (regex.test(selector)) {
                    selector = selector.replace(regex, cssSelector);
                } else {
                    selector = cssSelector + ' ' + selector;
                }
            }
        }
        return self.querySelectorAll(selector || null);
    };

    _nodeListProto.on = function (type, fn, capture) {
        this.forEach(function (element) {
            element.on(type, fn, capture);
        });
        return this;
    };

    _nodeListProto.once = function (type, fn, capture) {
        this.forEach(function (element) {
            element.once(type, fn, capture);
        });
        return this;
    };

    _nodeListProto.off = function (type, fn, capture) {
        this.forEach(function (element) {
            element.off(type, fn, capture);
        });
        return this;
    };

    window.trigger = _nodeProto.trigger = function (type, data) {
        var event;
        if (data !== undefined) {
            event = new CustomEvent(type, {'bubbles': true, 'cancelable': true, 'detail': data});
            event.data = event.detail;
        } else {
            event = createNewEvent(type, true, true);
        }
        this.dispatchEvent(event);
        return this;
    };

    _nodeListProto.trigger = function (event, data) {
        this.forEach(function (el) {
            el.trigger(event, data);
        });
        return this;
    };

    _nodeProto.addEventListener = function hijackAddEventListener(type, fn, capture) {
        var result, listeners, events;
        var self = this;
        var captureValue = getCaptureValue(capture);
        if (captureValue) {
            self.once(type, fn, capture);
            return result;
        }
        result = _original.addEventListener.call(self, type, fn, capture);
        if (!_listeners.has(self)) {
            listeners = {};
            _listeners.set(self, listeners);
        } else {
            listeners = _listeners.get(self);
        }
        events = listeners[type];
        if (!events) {
            listeners[type] = events = [];
        }
        if (eventExists(events, fn, captureValue)) {
            return result;
        }
        events.push({
            'type': type,
            'listener': fn,
            'handler': null,
            'useCapture': captureValue,
            'classNames': undefined,
            'once': false
        });
        return result;
    };

    _nodeProto.removeEventListener = function hijackRemoveEventListener(type, fn, capture) {
        var listeners, events, captureValue, changed;
        var self = this;
        var result = _original.removeEventListener.call(self, type, fn, capture);
        if (!_listeners.has(self)) {
            return result;
        }
        listeners = _listeners.get(self);
        events = listeners[type];
        if (!events) {
            return result;
        }
        captureValue = getCaptureValue(capture);
        $.each(events, function (entry, i, events) {
            if (entry.listener === fn && entry.useCapture === captureValue) {
                events[i] = null;
                changed = true;
                return false;
            }
        });
        if (changed) {
            $.spliceInPlace(events, null);
            if (events.length === 0) {
                delete listeners[type];
            }
            if (Object.keys(listeners).length === 0) {
                _listeners.delete(self);
            }
        }
        return result;
    };

    $ = function (selector, context) {
        // context is just for my old scripts! new scripts should use .find(…)
        var nodes;
        if (context) {
            nodes = context.find(selector);
            return nodes.length > 0 ? nodes[0] : null;
        }
        return document.querySelector(selector || null);
    };

    window.$$ = function (selector, context) {
        if (context) {
            return context.find(selector);
        }
        return document.querySelectorAll(selector || null);
    };

    // http://blissfuljs.com/docs.html

    $.noop = function () {
    };

    $.properties = function (element, properties, whitelist) {
        var prop;
        var whitelistType = $.type(whitelist);
        if (whitelistType === 'Array') {
            whitelist.forEach(function (prop) {
                if (properties.hasOwnProperty(prop)) {
                    element[prop] = properties[prop];
                }
            });
            return element;
        }
        for (prop in properties) {
            if (properties.hasOwnProperty(prop)) {
                if (whitelist) {
                    if (whitelistType === 'RegExp' && !whitelist.test(prop) ||
                        whitelistType === 'Function' && !whitelist.call(properties, prop)) {
                        continue;
                    }
                }
                element[prop] = properties[prop];
            }
        }
        return element;
    };

    $.attributes = function (element, attributes, whitelist) {
        var attr, value;
        var whitelistType = $.type(whitelist);
        if (whitelistType === 'Array') {
            whitelist.forEach(function (attr) {
                var value;
                if (attributes.hasOwnProperty(attr)) {
                    value = attributes[attr];
                    if (value === null) {
                        element.removeAttribute(attr);
                    } else {
                        element.setAttribute(attr, value);
                    }
                }
            });
            return element;
        }
        for (attr in attributes) {
            if (attributes.hasOwnProperty(attr)) {
                if (whitelist) {
                    if (whitelistType === 'RegExp' && !whitelist.test(attr) ||
                        whitelistType === 'Function' && !whitelist.call(attributes, attr)) {
                        continue;
                    }
                }
                value = attributes[attr];
                if (value === null) {
                    element.removeAttribute(attr);
                } else {
                    element.setAttribute(attr, value);
                }
            }
        }
        return element;
    };

    $.style = function (element, styles, whitelist) {
        var prop, value;
        var style = element.style;
        var whitelistType = $.type(whitelist);
        if (whitelistType === 'Array') {
            whitelist.forEach(function (prop) {
                var value;
                if (styles.hasOwnProperty(prop)) {
                    value = styles[prop];
                    if (prop in style) {
                        if (value === null) {
                            value = ''; // IE bug
                        }
                        style[prop] = value;
                    } else {
                        if (value === null || value === '') {
                            style.removeProperty(prop);
                        } else {
                            style.setProperty(prop, value);
                        }
                    }
                }
            });
            return element;
        }
        for (prop in styles) {
            if (whitelist) {
                if (whitelistType === 'RegExp' && !whitelist.test(prop) ||
                    whitelistType === 'Function' && !whitelist.call(styles, prop)) {
                    continue;
                }
            }
            value = styles[prop];
            if (prop in style) {
                // camelCase versions
                if (value === null) {
                    value = ''; // IE bug
                }
                style[prop] = value;
            }
            else {
                // This way we can set CSS Variables too and use normal property names
                if (value === null || value === '') {
                    style.removeProperty(prop);
                } else {
                    style.setProperty(prop, value);
                }
            }
        }
        return element;
    };

    $.type = function (obj) {
        var type = (_objToString.call(obj).match(/^\[object\s+(.*?)\]$/)[1] || '');
        if (type === 'Number' && isNaN(obj)) {
            return 'NaN';
        }
        return type;
    };

    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/forEach
    // callback(currentValue[, index[, array]]) - callback(currentValue[, key[, object]])
    $.each = function (obj, callback, context) {
        var key, n;
        if (typeof obj !== 'object') {
            throw new TypeError('Invalid object: ' + obj);
        }
        if (typeof callback !== 'function') {
            throw new TypeError('Invalid callback: ' + callback);
        }
        if (Array.isArray(obj)) {
            for (key = 0, n = obj.length; key < n; key++) {
                if (callback.call(context, obj[key], key, obj) === false) {
                    return false;
                }
            }
        } else {
            for (key in obj) {
                if (obj.hasOwnProperty(key)) {
                    if (callback.call(context, obj[key], key, obj) === false) {
                        return false;
                    }
                }
            }
        }
        return true;
    };

    $.spliceInPlace = function (array, item) {
        // remove all item ocurrencies from array
        var i, j, n;
        if (!Array.isArray(array)) {
            throw new TypeError('Invalid array: ' + array);
        }
        j = 0;
        n = array.length;
        for (i = 0; i < n; i++) {
            if (array[i] !== item) {
                if (j < i) {
                    array[j] = array[i];
                }
                j++;
            }
        }
        if (j !== n) {
            array.length = j;
        }
        return array;
    };


    // http://2ality.com/2012/08/underscore-extend.html
    // Object.assign invokes getters/setters => target[key] = source[key];
    // https://github.com/LeaVerou/bliss/blob/master/bliss.shy.js#L32
    // https://github.com/unclechu/node-deep-extend/blob/master/lib/deep-extend.js
    // https://www.webreflection.co.uk/blog/2015/10/06/how-to-copy-objects-in-javascript
    // https://github.com/WebReflection/cloner/blob/master/src/cloner.js
    $.extend = function (target, source, deep) {
        var properties;
        if (typeof source !== 'object' || source === null) {
            return target;
        }
        properties = Object.getOwnPropertyNames(source);
        if (typeof Object.getOwnPropertySymbols === 'function') {
            properties = properties.concat(Object.getOwnPropertySymbols(source));
        }
        if (deep === true) {
            // deep copy
            properties.forEach(function (key) {
                var descriptor, new_value, target_descriptor;
                var value = source[key];
                var type = $.type(value);
                if (value === target) { // recursion prevention
                    return;
                }
                if ($.type(source) === 'Array' && key === 'length') { // jQuery does this
                    return;
                }
                descriptor = Object.getOwnPropertyDescriptor(source, key);
                if (descriptor && (descriptor.get || descriptor.set)) {
                    if (target.hasOwnProperty(key)) {
                        delete target[key];
                    }
                    Object.defineProperty(target, key, descriptor);
                    return;
                }
                if (type === 'Object') {
                    new_value = $.extend({}, value, true);
                } else if (type === 'Array') {
                    new_value = $.extend([], value, true);
                    // } else if ($.isPrimitive(value)) {
                    //     new_value = value;
                } else {
                    new_value = value;//$.clone(value);
                }
                if (descriptor && target.hasOwnProperty(key)) {
                    target_descriptor = Object.getOwnPropertyDescriptor(target, key);
                    if (target_descriptor && (target_descriptor.writable !== descriptor.writable || target_descriptor.configurable !== descriptor.configurable || target_descriptor.enumerable !== descriptor.enumerable)) {
                        delete target[key];
                    }
                }
                if (descriptor && (!descriptor.writable || !descriptor.configurable || !descriptor.enumerable)) {
                    Object.defineProperty(target, key, {
                        'value': new_value,
                        'writable': descriptor.writable,
                        'configurable': descriptor.configurable,
                        'enumerable': descriptor.enumerable
                    });
                } else {
                    target[key] = new_value;
                }
            });
        } else {
            // Shallow copy
            // Object.defineProperties(target, Object.getOwnPropertyDescriptors(source));
            properties.forEach(function (key) {
                Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key));
            });
        }
        return target;
    };

    // https://www.tutorialspoint.com/difference-between-extend-assign-and-merge-in-lodash-library
    $.merge = function (target, source, deep) {
        var properties;
        if (typeof source !== 'object' || source === null) {
            return target;
        }
        properties = Object.getOwnPropertyNames(source);
        if (typeof Object.getOwnPropertySymbols === 'function') {
            properties = properties.concat(Object.getOwnPropertySymbols(source));
        }
        properties.forEach(function (key) {
            var descriptor, new_value, target_descriptor;
            var value = source[key];
            var type = $.type(value);
            if (value === target) { // recursion prevention
                return;
            }
            if ($.type(source) === 'Array' && key === 'length') { // jQuery does this
                return;
            }
            descriptor = Object.getOwnPropertyDescriptor(source, key);
            if (descriptor && (descriptor.get || descriptor.set)) {
                if (target.hasOwnProperty(key)) {
                    delete target[key];
                }
                Object.defineProperty(target, key, descriptor);
                return;
            }
            if (deep === true) {
                if (type === 'Object') {
                    new_value = $.merge({}, value, true);
                    if (target.hasOwnProperty(key) && $.type(target[key]) === 'Object') {
                        new_value = $.merge(target[key], new_value);
                    }
                } else if (type === 'Array') {
                    new_value = $.merge([], value, true);
                    if (target.hasOwnProperty(key) && $.type(target[key]) === 'Array') {
                        new_value = $.merge(target[key], new_value);
                    }
                    // } else if ($.isPrimitive(value)) {
                    //     new_value = value;
                } else {
                    new_value = value;//$.clone(value);
                }
            } else {
                if (type === 'Object' && target.hasOwnProperty(key) && $.type(target[key]) === 'Object') {
                    $.merge(target[key], value);
                    return;
                } else if (type === 'Array' && target.hasOwnProperty(key) && $.type(target[key]) === 'Array') {
                    $.merge(target[key], value);
                    return;
                }
            }
            if (descriptor && target.hasOwnProperty(key)) {
                target_descriptor = Object.getOwnPropertyDescriptor(target, key);
                if (target_descriptor && (target_descriptor.writable !== descriptor.writable || target_descriptor.configurable !== descriptor.configurable || target_descriptor.enumerable !== descriptor.enumerable)) {
                    delete target[key];
                }
            }
            if (descriptor && (!descriptor.writable || !descriptor.configurable || !descriptor.enumerable)) {
                Object.defineProperty(target, key, {
                    'value': (deep === true ? new_value : value),
                    'writable': descriptor.writable,
                    'configurable': descriptor.configurable,
                    'enumerable': descriptor.enumerable
                });
            } else {
                target[key] = (deep === true ? new_value : value);
            }
        });
        return target;
    };

    // http://2ality.com/2012/08/underscore-extend.html
    // http://2ality.com/2011/12/subtyping-builtins.html
    // https://github.com/unclechu/node-deep-extend/blob/master/lib/deep-extend.js
    $.clone = function (obj) {
        if (obj instanceof Date) {
            return new Date(obj.getTime());
        }
        if (obj instanceof RegExp) {
            return new RegExp(obj);
        }
        return $.extend(Object.create(Object.getPrototypeOf(obj)), obj, true);
    };

    // https://stackoverflow.com/questions/31538010/test-if-a-variable-is-a-primitive-rather-than-an-object
    $.isPrimitive = function (test) {
        return (test !== Object(test));
    };

    // https://remysharp.com/2014/11/19/my-five-promise-patterns#cold-calling
    $.coldCall = function (fn) {
        return function () {
            if (typeof fn === 'function') {
                return fn();
            }
        };
    };

    // inspired by https://github.com/furf/jquery-etc
    $.deep = function (obj, prop) {
        var props, n, i;
        try {
            props = prop.replace(/^\./, '').replace(/\[(["']?)([^\1]+?)\1?\]/g, '.$2').split('.');
            n = props.length;
            i = 0;
            while (i < n) {
                obj = obj[props[i++]];
            }
            return obj;
        } catch (e) {
        }
        return void 0;
    },


    // http://blissfuljs.com/docs.html#fn-ready
    $.ready = function (callback) {
        if (!_ready) {
            _ready = true; // prevent new promise init recursion
            _ready = new Promise($.ready);
        }
        if (typeof callback === 'function') {
            if (document.readyState !== 'loading') {
                setTimeout(callback);
            } else {
                document.once('DOMContentLoaded', $.coldCall(callback));
            }
        }
        return _ready;
    };

    $.params = function (obj, searchParams) {
        // https://github.com/LeaVerou/bliss/issues/161
        // https://github.com/angular/angular/issues/7370
        var isSearchParams = $.type(searchParams) === 'URLSearchParams';
        var result = isSearchParams ? null : [];
        var serialize = function (value, key) {
            var type = $.type(value);
            if (type === 'Object' || type === 'Array') {
                $.each(value, function (sub_value, sub_key) {
                    serialize(sub_value, key + '[' + sub_key + ']');
                });
                return;
            }
            if (isSearchParams) {
                searchParams.append(key, value);
            } else {
                result.push(encodeURIComponent(key) + '=' + encodeURIComponent(value));
            }
        };
        $.each(obj, serialize);
        return isSearchParams ? searchParams.toString() : result.join('&');
    };

    // http://blissfuljs.com/docs.html#fn-fetch
    // attention! uses body not data
    // https://developer.mozilla.org/en-US/docs/Learn/HTML/Forms/Sending_forms_through_JavaScript
    $.fetch = function (url, options) {
        if (!url) {
            throw new TypeError('URL parameter is mandatory and cannot be ' + url);
        }
        if (options === undefined) options = {};
        var env = $.merge({
            'url': new URL(url, window.location.origin),
            'params': null,
            'body': null,
            'method': 'GET',
            'headers': {},
            'signal': null
        }, options);

        env.method = env.method.toUpperCase();

        if ($.type(env.signal) === 'AbortSignal' && env.signal.aborted) {
            return Promise.reject(new DOMException('The user aborted a request', 'AbortError'));
        }
        if ($.type(env.params) === 'Object') {
            env.url.search += (env.url.search === '' ? '?' : '&') + $.params(env.params);
        }
        if ($.type(env.params) === 'URLSearchParams') {
            env.url.search += (env.url.search === '' ? '?' : '&') + env.params.toString();
        }
        if (env.cache === false) {
            env.url.search += (env.url.search === '' ? '?' : '&') + '_=' + Date.now();
        }
        var xhr = new XMLHttpRequest();
        xhr.open(env.method, env.url.href, true, env.user, env.password);
        $.each(options, function (option, key) {
            if (key === 'upload') {
                if (xhr.upload && typeof option === 'object') {
                    $.extend(xhr.upload, option);
                }
            } else if (key in xhr) {
                try {
                    xhr[key] = option;
                }
                catch (e) {
                    self.console && console.error(e);
                }
            }
        });
        var headerKeys = Object.keys(env.headers).map(function (key) {
            return key.toLowerCase();
        });
        if (env.method === 'POST' || env.method === 'PUT') {
            if ($.type(env.body) === 'Object') {
                if (env.type === 'json') {
                    env.body = JSON.stringify(env.body);
                } else {
                    env.body = $.params(env.body);
                }
            }
            else if ($.type(env.body) === 'HTMLFormElement') {
                env.body = new FormData(env.body);
            }
            // TODO https://stackoverflow.com/questions/25695778/sending-xmlhttprequest-with-formdata - binary better as multipart form data
            // https://github.com/LeaVerou/bliss/issues/208
            if (headerKeys.indexOf('content-type') === -1 && ['String', 'URLSearchParams'].indexOf($.type(env.body)) > -1) {
                if (env.type === 'json') {
                    xhr.setRequestHeader('Content-type', 'application/json');
                } else {
                    xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
                }
            }
        }
        for (var header in env.headers) {
            if (env.headers[header] !== undefined) {
                xhr.setRequestHeader(header, env.headers[header]);
            }
        }
        return new Promise(function (resolve, reject) {
            var clearSignal = $.noop;
            if ($.type(env.signal) === 'AbortSignal') {
                if (env.signal.aborted) {
                    reject(new DOMException('The user aborted a request', 'AbortError'));
                    return;
                }
                env.signal.on('abort', xhr.abort);
                clearSignal = function () {
                    if (env.signal && xhr) {
                        env.signal.off();
                        env.signal = null;
                    }
                };
            } else {
                env.signal = null;
            }

            xhr.addEventListener('load', function () {
                clearSignal();
                if (xhr.status >= 200 && xhr.status < 300 || xhr.status === 304) {
                    resolve(xhr);
                }
                else {
                    reject(Object.defineProperty($.extend(new Error(xhr.statusText), {'xhr': xhr}), 'status', {
                        'enumerable': true,
                        'get': function() {
                            return this.xhr.status;
                        }
                    }));
                }
            });
            xhr.addEventListener('error', function () {
                clearSignal();
                reject($.extend(new DOMExcpetion('Request network error', 'NetworkError'), {'xhr': xhr}));
            });
            xhr.addEventListener('timeout', function () {
                clearSignal();
                reject($.extend(new DOMException('Request timeout', 'TimeoutError'), {'xhr': xhr}));
            });
            xhr.addEventListener('abort',  function () {
                clearSignal();
                reject($.extend(new DOMException('The user aborted a request', 'AbortError'), {'xhr': xhr}));
            });

            xhr.send(env.method === 'POST' || env.method === 'PUT' ? env.body : null);
        });
    };

    $.getJSON = function (url, options) {
        // Attention: No accessible errors for malformed responses if responseType = 'json'! - https://github.com/youtube/spfjs/issues/317
        var opts = $.extend(options || {}, {
            'responseType': ''
        });
        return $.fetch(url, opts)
            .then(function (xhr) {
                return JSON.parse(xhr.response);
            });
    };

    // http://blissfuljs.com/docs.html#fn-include
    // to avoid cache, use ?_=<timestamp>
    $.getScript = function (url, condition) {
        if (condition !== true) {
            return Promise.resolve();
        }
        return new Promise(function (resolve, reject) {
            var script = document.createElement('script');
            $.properties(script, {
                'async': true,
                'onload': function () {
                    script.parentNode && script.parentNode.removeChild(script);
                    resolve();
                },
                'onerror': function () {
                    script.parentNode && script.parentNode.removeChild(script);
                    reject();
                },
                'src': url
            });
            document.head.appendChild(script);
        });
    };

    // http://lea.verou.me/2016/12/resolve-promises-externally-with-this-one-weird-trick/
    $.defer = function () {
        var _resolve, _reject;
        var promise = new Promise(function (resolve, reject) {
            _resolve = resolve;
            _reject = reject;
        });
        promise.resolve = _resolve;
        promise.reject = _reject;
        return promise;
    };

    // https://gist.github.com/nmsdvid/8807205
    // https://davidwalsh.name/javascript-debounce-function
    $.debounced = function (func, wait, immediate) {
        var timeout;
        var cancel = function () {
            clearTimeout(timeout);
            timeout = null;
        };
        var later = function (context, args) {
            timeout = null;
            func.apply(context, args);
        };
        var debounced = function () {
            var context = this;
            var args = arguments;
            var callNow = immediate && !timeout;
            clearTimeout(timeout);
            timeout = !immediate ? setTimeout(later, wait, context, args) : setTimeout(cancel, wait);
            if (callNow) {
                func.apply(context, args);
            }
        };
        debounced.cancel = cancel;
        return debounced;
    };

    // https://github.com/remy/min.js/blob/master/src/delegate.js
    // https://github.com/whatwg/dom/issues/162
    // https://github.com/madrobby/zepto/blob/master/src/event.js#L201
    // Attention: non bubbling events! focus use focusin, blur use focusout, mouseenter use moueover, mouseleave use mouseout
    // $('ul').on('click', $.delegated('li > a', e => console.log(e)));
    // $('#test').on('click', $.delegated('> div', e => console.log(e)));
    $.delegated = function (selector, fn) {
        var elementSelector;
        return function (event) {
            // var target;
            // var self = this;
            // var isString = $.type(selector) === 'String';
            // var id = self.id || 'delegated_id_' + ('' + Math.random()).substr(2);
            // var modifiedSelector = isString ? '#' + id + ' ' + selector : selector; // make sure to find only children of self
            // var needsId = !self.id;
            // if (needsId) {
            //     self.setAttribute('id', id);
            //     try {
            //         target = event.target.closest(modifiedSelector);
            //     } finally {
            //         self.removeAttribute('id');
            //     }
            // } else {
            //     target = event.target.closest(modifiedSelector);
            // }
            // if (target) {
            //     event.delegateTarget = self;
            //     fn.call(target, event);
            // }
            //-----
            var modifiedSelector, target;
            var self = this;
            if (elementSelector === undefined || document.querySelector(elementSelector) !== self) {
                elementSelector = $.getCSSSelector(self);
            }
            modifiedSelector = elementSelector + ' ' + selector;
            target = event.target.closest(modifiedSelector);
            if (target) {
                event.delegateTarget = self;
                fn.call(target, event);
            }
            //-----
            // var i, n;
            // var self = this;
            // var target = event.target;
            // var nodes = self.find(selector);
            // for (i = 0, n = nodes.length; i < n; i++) {
            //     if (nodes[i].contains(target)) {
            //         event.delegateTarget = self;
            //         // event.currentTarget = nodes[i]; // read-only unfortunately
            //         return fn.call(nodes[i], event);
            //     }
            // }
        };
    };

    // https://github.com/tylerjpeterson/get-selector/blob/master/index.js
    $.getCSSSelector = function(element) {
        var i, t, s, doc, body;
        if (!(typeof element === 'object' && Node.prototype.isPrototypeOf(element))) {
            return false;
        }
        if (element === document) {
            return 'html';
        }
        s = [];
        doc = element.ownerDocument.documentElement;
        body = element.ownerDocument.body;

        while (element.parentNode) {
            if (element.id) {
                s.unshift('#' + element.id);
                break;
            } else {
                if (element === doc || element === body) {
                    s.unshift(element.tagName.toLowerCase());
                } else {
                    t = element.tagName.toLowerCase();
                    for (i = 1; element.previousElementSibling; i++) {
                        element = element.previousElementSibling;
                    }
                    s.unshift(t + ':nth-child(' + i + ')');
                }
                element = element.parentNode;
            }
        }
        return s.join(' > ');
    };

    $.on = function (element, event, fn, capture) {
        if (Array.isArray(element)) {
            element.forEach(function (element) {
                $.on(element, event, fn, capture);
            });
            return $;
        }
        if (_nodeProto.isPrototypeOf(element) || _nodeListProto.isPrototypeOf(element)) {
            element.on(event, fn, capture);
        }
        return $;
    };

    $.once = function (element, event, fn, capture) {
        if (Array.isArray(element)) {
            element.forEach(function (element) {
                $.once(element, event, fn, capture);
            });
            return $;
        }
        if (_nodeProto.isPrototypeOf(element) || _nodeListProto.isPrototypeOf(element)) {
            element.once(event, fn, capture);
        }
        return $;
    };

    $.off = function (element, event, fn, capture) {
        if (Array.isArray(element)) {
            element.forEach(function (element) {
                $.off(element, event, fn, capture);
            });
            return $;
        }
        if (_nodeProto.isPrototypeOf(element) || _nodeListProto.isPrototypeOf(element)) {
            element.off(event, fn, capture);
        }
        return $;
    };

    $.trigger = function (element, type, data) {
        var event;
        if (data !== undefined) {
            event = new CustomEvent(type, {'bubbles': true, 'cancelable': true, 'detail': data});
            event.data = event.detail;
        } else {
            event = createNewEvent(type, true, true);
        }
        if (Array.isArray(element)) {
            element.forEach(function (element) {
                if (_nodeProto.isPrototypeOf(element)) {
                    element.dispatchEvent(this);
                }
            }, event);
        } else {
            if (_nodeProto.isPrototypeOf(element)) {
                element.dispatchEvent(event);
            }
        }
        return $;
    };

    $.getListeners = function (element) {
        if (element === undefined) {
            return;
        }
        if (!_listeners.has(element)) {
            return {};
        }
        return _listeners.get(element);
    };

    $.subscribe = _nodeProto.on.bind(_dummy);
    $.unsubscribe = _nodeProto.off.bind(_dummy);
    $.publish = _nodeProto.trigger.bind(_dummy);

    function getCaptureValue(capture) {
        var type = typeof capture;
        if (type === 'object') {
            return !!capture.capture;
        }
        if (type === 'boolean') {
            return capture;
        }
        return false;
    }

    function getOnceValue(capture) {
        if (typeof capture === 'object') {
            return !!capture.once;
        }
        return false;
    }

    function eventExists(events, fn, capture) {
        return events.some(function (entry) {
            return entry.listener === fn && entry.useCapture === capture;
        });
    }

    function createNewEvent(type, bubbles, cancelable) {
        var event;
        if (typeof window.Event === 'function') {
            event = new Event(type, {'bubbles': bubbles, 'cancelable': cancelable});
        } else {
            event = document.createEvent('Event');
            event.initEvent(type, bubbles, cancelable);
        }
        return event;
    }

    function getPassiveSupport() {
        // https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener#Safely_detecting_option_support
        var supported = false;
        var options = {};
        Object.defineProperty(options, 'passive', {
            'get': function () {
                supported = true;
                return false;
            }
        });
        try {
            window.addEventListener('test', null, options);
            window.removeEventListener('test', null, options);
        } catch (e) {
        }
        return supported;
    }

    return $;

})(document, this);
