subtle.js
=========

jQuery without jQuery and some more helpful functions

[![npm](https://img.shields.io/npm/v/opusonline-subtle.js.svg)](https://npmjs.org/package/opusonline-subtle.js)
[![npm downloads](https://img.shields.io/npm/dm/opusonline-subtle.js.svg)](https://npmjs.org/package/opusonline-subtle.js)

Highlights:
* Supports even IE9!
* `$()` and `$$()` element selectors
* Convinient methods: `on`, `off`, `once`, and `trigger`
* `$.getListeners(element)`
* Event delegation for vanilla Javascript
* `$.extend` and `$.merge` for different use cases
* Bulk functions `$.properties`, `$.attributes`, and `$.style`
* `$.ready` and `$.fetch`

Heavily inspired by:
* [Bliss.js](https://blissfuljs.com/) by Lea Veriou
* [min.js](https://github.com/remy/min.js) by Remy Sharp
* [bling.js](https://gist.github.com/paulirish/12fb951a8b893a454b32) by Paul Irish

# Browser Support

Works in *all browsers* and *IE >= 9*, but only if `WeakMap`, `Promise`, and `URL` are polyfilled.
https://polyfill.io/v3/polyfill.min.js?features=Promise%2CURL%2CWeakMap

`Promise` and `URL` are only used in `$.ready`, `$.fetch`, `$.getScript`, and `$.defer`. If you don't use them, you don't need those polyfills.

Without any polyfill, it works in all evergreen browers and not in IE.

If *IE >= 11* is enough, then only `Promise` and `URL` need polyfills.

### Side Note

Polyfills for [`Element.matches`](https://developer.mozilla.org/en-US/docs/Web/API/Element/matches), [`Element.closest`](https://developer.mozilla.org/en-US/docs/Web/API/Element/closest), [`NodeList.forEach`](https://developer.mozilla.org/en-US/docs/Web/API/NodeList/forEach), [`CustomEvent`](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent/CustomEvent), and [`DOMException`](https://developer.mozilla.org/en-US/docs/Web/API/DOMException) are included if they don't exist.

# Installation

Install with [yarn](https://yarnpkg.com/): `yarn add opusonline-subtle.js`

# Usage

### Examples

```javascript
$$('#section a').on('click', function(event) {
    event.preventDefault();
});

$.style($('#section > h1'), {
    color: 'red',
    fontSize: '24pt',
    backgroundColor: 'black'
});

$('#section').find('p').forEach(…);

var test = {foo: {bar: 1}}; // runs smoothly even if test is undefined or empty or whatever
if ($.deep(test, 'foo.bar') === 1) {
    …
}

var testClone = $.clone(test);
testClone.foo.bar = 2;
log(test.foo.bar); // 1

var deferred = $.defer();
setTimeout(function() {
    deferred.resolve(true);
}, 5000);
deferred.then(…);

$.getScript('/scripts/polyfill.js', navigator.userAgent.indexOf('MSIE') > -1).then(function() {
    haveFun();
});
```

# Methods

## $(selector: String) => element|null

Returns DOM element if exists, else `null`.

## element.find(selector: String) => NodeList

Returns a NodeList that is iteratable with `forEach` and has a `length` property. It really only retrieves child elements from the given element (See https://developer.mozilla.org/en-US/docs/Web/API/Element/querySelectorAll#User_notes). `:scope` is automatically injected if not used already.
Good to know: if `find` returns an empty list you can still call `forEach`.

```javascript
$('#selector').find('> p').forEach(…);
```

## $$(selector: String) => NodeList

Returns a NodeList that is iteratable with `forEach` and has a `length` property.

## element.on(event, callback, [options]), element.off([event], [callback]), element.trigger(event), element.once(event, callback, [options]) => element

Event assigning on element(s). Classnames are supported.
_Good to know:_ You can still use `addEventListener` and `removeEventListener`.
_Goody_: `on`, `off`, etc. are added to [`EventTarget`](https://developer.mozilla.org/de/docs/Web/API/EventTarget) which is the base not only for elements, but also for objects like `XMLHttpRequest`, `FileReader`, and others.

```javascript
var elements = $$('#selector a');
elements.on('click.test', doStuff);
elements.trigger('click');
elements.off('.test');

elements.on({'focusin': onFocus, 'focusout': onBlur});

elements.on('canHazData', function(event) {
    log(event.detail); // {'foo': 'bar'}
});

elements.trigger('canHazData', {'foo': 'bar'});

window.on('scroll', nonBlockingFunction, {'passive': true}); // silently ignored if not supported (IE)
```
## $.on(element, event, callback, [options]), $.off(element, [event], [callback]), $.trigger(element, event), $.once(element, event, callback, [options]) => element

Same as `element.on()` but another syntax.
`element` can be an array of elements.

## $.getListeners(element) => Object

Returns a list of event listeners for given element.
_Good to know:_ Events added with `addEventListener` and `removeEventListener` are also considered.

```javascript
$('#test').on('click.test', function(){});
$.getListeners($('#test'));
// {
//     'click': [
//         {
//             'type': 'click',
//             'listener': function(){},
//             'handler': null,
//             'useCapture': false,
//             'classNames': ['test'],
//             'once': false
//         }
//     ]
// }
```

## $.publish(), $.subscribe(), $.unsubscribe() => EventTarget

Convenient Pub/Sub event pattern on global scope.

```javascript
$.subscribe('foo', function(event) {
    log(event.detail); // "bar"
});

$.publish('foo', 'bar'); // triggers CustomEvent with detail = 'bar'

$.unsubscribe('foo');
```

## $.delegated(selector: String, callback)

This is my idea of using event delegation. That means, event handlers can already be added to a parent element like `document`, before the actual element is even added to the DOM.

```javascript
$('ul').on('click', $.delegated('li > a', function(event) {
    event.preventDefault();
    doStuff(this); // this = a / event.delegateTarget = ul
}));
```

## $.deep(object, properties: String) => value|undefined

Safely use multi-level objects without screwing up your app.

```javascript
var test = {'foo': {'bar': 'baz'}};

$.deep(undef, 'foo.bar'); // undefined
$.deep(test, 'meh'); // undefined
$.deep(test, 'foo'); // {'bar': 'baz'}
$.deep(test, 'foo.bar'); // 'baz'
$.deep(test, 'foo.meh'); // undefined
```

## $.extend(target, source, [deep = false]) and $.merge(target, source, [deep = false]) => target

This is both sugar and confusing at the same time. Bear with me!
`Extend` simply takes a value from the source and adds it to the target. If it aleady exists, it gets replaced!
_Good to know:_ getter and setter are not invoked in contrast to [`Object.assign`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/assign)!

```javascript
var target = {a: {b: 1, c: 2}};
var source = {a: {d: 2, c: 3}};

$.extend(target, source); // {a: {d: 2, c: 3}} - target.a is replaced with source.a!!!
```

Now `$.merge` comes into play.

```javascript
var target = {a: {b: 1, c: 2}};
var source = {a: {d: 2, c: 3}};

$.merge(target, source); // {a: {b: 1, c: 3, d: 2}} - it merges source.a to target.a
```

Have you noticed the 3rd parameter `deep`? This makes sense for multi-level objects. If `deep` is `true`, a real clone is created.

```javascript
var test = {'foo': {'bar': 'baz'}};
var extended = $.extend({}, test); // {'foo': {'bar': 'baz'}}
var extendedDeep = $.extend({}, test, true); // {'foo': {'bar': 'baz'}}

test.foo.bar = 'changed!';

log(extended.foo.bar); // 'changed!'
log(extendedDeep.foo.bar); // still 'baz'
```

## $.clone(object) => Object

Guess what? This makes a deep copy of the original object including class prototypes. It can be even used on special objects like `Date`s or `RegExp`.
_Good to know:_ clone is a deep extend.

```javascript
var test = {'foo': {'bar': 'baz'}};
var clone = $.clone(test);

test.foo.bar = 'changed!';

log(clone.foo.bar); // still 'baz'

function MyClass(message) {
    this.number = 1;
}
var a = new MyClass();
var b = $.clone(a);

a.number = 5;

log(b.number); // still 1 !!!
```

## $.noop() => Function

Noop stands for no operation. This is simply an empty function.

## $.type(object) => String

Returns the base type name of the given object.

```javascript
$.type('hello world!'); // String
$.type(1); // Number
$.type(true); // Boolean
$.type(function() {}); // Function
$.type(new Date()); // Date
$.type(/abc/); // RegEx
$.type(null); // Null
$.type(undefined); // Undefined
$.type(document); // HTMLDocument
$.type(new Uint8Array(1)); // Uint8Array
```

## $.properties(element, properties, [whitelist]) => element

Set properties to an existing element or object. Works basically the same way as `$.extend` does, but has some nice extra features.
Similar jQuery method: [`jQuery.fn.prop`](https://api.jquery.com/prop)

```javascript
$.properties($('button.next'), {
    'textContent': 'Next Step',
    'disabled': false,
    'onclick': function() { MyApp.next() }
});

$.properties($('#new').style, $('#old').style, ['color', 'backgroundColor', 'fontSize']);
$.properties($('#new').style, $('#old').style, /color/i);
$.properties($('#new').style, $('#old').style, function(property) {
    if (property.indexOf('color') > -1) {
        return true;
    }
    return false;
});
```

## $.attributes(element, attributes, [whitelist]) => element

Works the same way as `$.properties` BUT attributes are added with [`Element.setAttribute`](https://developer.mozilla.org/en-US/docs/Web/API/Element/setAttribute) method.
Similar jQuery method: [`jQuery.fn.attr`](https://api.jquery.com/attr)

## $.style(element, styles, [whitelist]) => element

Works the same way as `$.properties` and `$.attributes`.
Similar jQuery method: [`jQuery.fn.css`](https://api.jquery.com/css)

```javascript
$.style($('#h1'), {
    'color': '#abc',
    'fontSize': '24pt',
    'textTransform': 'uppercase'
});

$.style($('#new'), $('#old').style, ['color', 'backgroundColor', 'fontSize']);
```

## $.each(obj = Object|Array, callback, [context]) => Boolean

You might already know it from [`jQuery.each`](https://api.jquery.com/jQuery.each/) BUT there's one main difference! The callback parameter order is changed in the same way as [`Array.forEach`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/forEach)! The first callback parameter is the current value. This allows to easily walk through object entries.
_Good to know:_ The loop can be stopped by returning false.

```javascript
var test = {'a': {'count': 1}, 'b': {'count': 2}, 'c': {'count': 3}, 'd': {'count': 4}, 'e': {'count': 5}};
var sum = 0;
$.each(test, function(entry) {
    sum += entry.count;
});
var search = -1;
$.each([1, 2, 3, 4, 5], function(value, index) {
    if (value === 4) {
        search = index;
        return false;
    }
});
```

## $.spliceInPlace(array, item) => array

A convenient method to remove all item ocurrencies from a given array [in place](https://en.wikipedia.org/wiki/In-place_algorithm).

```javascript
var A = {'letter': 'a'};
var B = {'letter': 'b'};
var C = {'letter': 'c'};
var lookup = [A, B, C];
// instead of
lookup.splice(lookup.indexOf(B), 1);
// you can do
$.spliceInPlace(lookup, B);
```

## $.isPrimitive(anything) => Boolean

```javascript
$.isPrimitive(100); // true
$.isPrimitive(new Number(100)); // false

var str = 'string';
var strObject = new String('string');
$.type(str); // String
$.type(strObject); // String
$.isPrimitive(str); // true
$.isPrimitive(strObject); // false!!!
```

## $.ready([callback]) => Promise

Promise that resolves whenever `DOMContentLoaded` is true. The callback gets fired, but you can also use it the Promise way.

```javascript
$.ready(function init() {
    // page is fully loaded, start your app
});

Promise.all([
    $.ready(),
    fetch('/analytics.php')
]).then(function() {
    // work done, start playing
});
```

## $.params(object) => String

Serializing an object. Needed for `$.fetch`.

```javascript
$.params({'foo':'a b c'}); // foo=a%20b%20c
$.params({'data': [1, 2, 3, {'foo': 'bar'}]}); // data%5B0%5D=1&data%5B1%5D=2&data%5B2%5D=3&data%5B3%5D%5Bfoo%5D=bar
```

## $.fetch(url: String, [options]) => Promise

`$.fetch` is the equivalent of modern javascript [`fetch`](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch) but since it's using XMLHttpRequest under the hood, some goodies are provided.

*options Object:*
* `method` (String): GET, POST, PUT, DELETE, OPTIONS, HEAD, whatever is possible; defaults to `GET`
* `params` (Object|URLSearchParams): serialized to URL query
* `headers` (Object): key value pairs that will getbe set as request headers
* `user` and `password` (String): add user and password to host in URL for authentication
* `cache` (Boolean): enforce a fresh response; appends _=<timestamp>; defaults to `false`
* `body` (String|Blob|BufferSource|FormData|URLSearchParams|ReadableStream): payload sent as POST or PUT
* `type` (String): `json`; only 'json' is supported; `body` can be an Object or JSON String.
* `signal` (AbortSignal): [Abort pattern](https://developer.mozilla.org/en-US/docs/Web/API/AbortController) used in `fetch`; when `$.fetch` is aborted it throws a `DOMException` with name `AbortError`; Attention: add polyfill for older browsers (e.g. https://polyfill.io/v3/polyfill.min.js?features=AbortController)
* all XHR settings like `onload`, `onreadystatechange`, `onerror`, `onabort`, `ontimeout`, `overrideMimeType`, `upload` Object, `timeout`, `withCredentials`, etc.

*resolve* holds the `xhr` object with `xhr.response` as the desired response content.

*reject* is an `Error` object that has status = xhr.status, message = xhr.statusText and the `xhr` object set or it is a `DOMException` for Network, Timeout, and Abort Errors with the `xhr` object.

```javascript
$.fetch('/data')
    .then(function(xhr) {
        log(xhr.responseURL); // full absolute URL like https://example.com/data
        log(xhr.status, xhr.statusText); // hopefully it's 200 OK
        log(xhr.response); // the actual response
        log(xhr.getAllResponseHeaders());
        log(xhr.getResponseHeader('content-type'));
    })
    .catch(function(error) {
        log(error.status); // same as xhr.status, e.g. 404
        log(error.message); // same as xhr.statusText, e.g. Not Found
        log(error.xhr); // the full xhr object
        log(error.xhr.responseURL);
    });

var postData = {foo: 'bar'};
$.fetch('/data', {'method': 'POST', 'body': postData}).then(…).catch(…); // postData object is serialized with $.params()
$.fetch('/data', {'method': 'PUT', 'body': postData}).then(…).catch(…);

$.fetch('/data', {'method': 'POST', 'type': 'json', 'body': postData}).then(…).catch(…);
$.fetch('/data', {'method': 'POST', 'headers': {'content-type': 'application/json'}, 'body': JSON.parse(postData)}).then(…).catch(…); // same as above

var queryParams = {'q': 'dev', 'page': 2};
$.fetch('/search', {'params': queryParams, 'cache': false}).then(…).catch(…); // queryParams object is serialized with $.params() and appended to url, e.g. https://myserver/sarch?q=dev&page=2&_=1586807957258

$.fetch('https://myserver.com/private/data', {'user': 'u', 'password': 'pass'}).then(…).catch(…); // https://u:pass@myserver.com/private/data

$.fetch('/data', {'onload': function(event) { // use xhr.onload as success callback
    var response = event.target.response;
}}).then(…).catch(…);

$.fetch('/data', {'onprogress': function(event) { // use xhr.onload as success callback
    var progress = event.loaded / event.total;
    log(progress);
}}).then(…).catch(…);

var data = new FormData();
var file = new Blob(['Demo'], {'type': 'text/plain'});
data.append('file', file, 'demo.txt');
$.fetch('/upload', {'method': 'POST', 'body': data, 'upload': {'onprogress': function(event) {
    var uploadProgress = event.loaded / event.total;
    log(uploadProgress);
}}});

$('myForm').on('submit', function(event) {
    event.preventDefault();
    var form = this;
    $.fetch('/settings', {'method': 'POST', 'body': form}).then(…).catch(…); // HTMLFormElement will be sent as FormData
});

var controller = new AbortController();
$.fetch('/bigData', {'signal': controller.signal}).then(…).catch(function(error) {
    if (error.name === 'AbortError') {
        …
    }
});
controller.abort();
```

## $.getJSON(url: String, [options]) => Promise

This is `$.fetch`, but the loaded serialized JSON String is parsed. Throws an error if JSON is malformed. `options` Object is exactly the same as for `$.fetch`.

```javascript
$.getJSON('/data.json')
    .then(function(data) {
        log(data.foo);
    })
    .catch(function(error) {
        log(error.name); // SyntaxError
        log(error.message); // Unexpected token… or whatever
    });
```

## $.getScript(url: String, [condition: Boolean]) => Promise

Loads a script and resolves when script can be used.
Optional condition reads: if <condition> then load else skip.

```javascript
var url = "https://cdnjs.cloudflare.com/ajax/libs/es5-shim/4.3.1/es5-sham.min.js";
$.getScript(url, !Array.prototype.forEach).then(…).catch(…);
```

## $.defer() => Promise

Gorgious Lea Verou worked this out. See http://lea.verou.me/2016/12/resolve-promises-externally-with-this-one-weird-trick/

```javascript
var deferred = $.defer();
//
deferred.then(function(done) {
    // party!
});

deferred.resolve(true); // parameter is optional
```

## $.debounced(fn, wait: Milliseconds, immediate: Boolean)

My optimized version of debounced function. [Read here why you need this!](https://davidwalsh.name/javascript-debounce-function)
Immediate is `false` by default. If `true`, `fn` is called at the first trigger instead of the last.

```javascript
window.on('resize', $.debounced(updateChart, 250));
```