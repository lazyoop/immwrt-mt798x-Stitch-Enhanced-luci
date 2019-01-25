(function(window, document, undefined) {
	/* Object.assign polyfill for IE */
	if (typeof Object.assign !== 'function') {
		Object.defineProperty(Object, 'assign', {
			value: function assign(target, varArgs) {
				if (target == null)
					throw new TypeError('Cannot convert undefined or null to object');

				var to = Object(target);

				for (var index = 1; index < arguments.length; index++)
					if (arguments[index] != null)
						for (var nextKey in arguments[index])
							if (Object.prototype.hasOwnProperty.call(arguments[index], nextKey))
								to[nextKey] = arguments[index][nextKey];

				return to;
			},
			writable: true,
			configurable: true
		});
	}

	/*
	 * Class declaration and inheritance helper
	 */

	var toCamelCase = function(s) {
		return s.replace(/(?:^|[\. -])(.)/g, function(m0, m1) { return m1.toUpperCase() });
	};

	var superContext = null, Class = Object.assign(function() {}, {
		extend: function(properties) {
			var props = {
				__base__: { value: this.prototype },
				__name__: { value: properties.__name__ || 'anonymous' }
			};

			var ClassConstructor = function() {
				if (!(this instanceof ClassConstructor))
					throw new TypeError('Constructor must not be called without "new"');

				if (Object.getPrototypeOf(this).hasOwnProperty('__init__')) {
					if (typeof(this.__init__) != 'function')
						throw new TypeError('Class __init__ member is not a function');

					this.__init__.apply(this, arguments)
				}
				else {
					this.super('__init__', arguments);
				}
			};

			for (var key in properties)
				if (!props[key] && properties.hasOwnProperty(key))
					props[key] = { value: properties[key], writable: true };

			ClassConstructor.prototype = Object.create(this.prototype, props);
			ClassConstructor.prototype.constructor = ClassConstructor;
			Object.assign(ClassConstructor, this);
			ClassConstructor.displayName = toCamelCase(props.__name__.value + 'Class');

			return ClassConstructor;
		},

		singleton: function(properties /*, ... */) {
			return Class.extend(properties)
				.instantiate(Class.prototype.varargs(arguments, 1));
		},

		instantiate: function(args) {
			return new (Function.prototype.bind.apply(this,
				Class.prototype.varargs(args, 0, null)))();
		},

		call: function(self, method) {
			if (typeof(this.prototype[method]) != 'function')
				throw new ReferenceError(method + ' is not defined in class');

			return this.prototype[method].apply(self, self.varargs(arguments, 1));
		},

		isSubclass: function(_class) {
			return (_class != null &&
			        typeof(_class) == 'function' &&
			        _class.prototype instanceof this);
		},

		prototype: {
			varargs: function(args, offset /*, ... */) {
				return Array.prototype.slice.call(arguments, 2)
					.concat(Array.prototype.slice.call(args, offset));
			},

			super: function(key, callArgs) {
				for (superContext = Object.getPrototypeOf(superContext ||
				                                          Object.getPrototypeOf(this));
				     superContext && !superContext.hasOwnProperty(key);
				     superContext = Object.getPrototypeOf(superContext)) { }

				if (!superContext)
					return null;

				var res = superContext[key];

				if (arguments.length > 1) {
					if (typeof(res) != 'function')
						throw new ReferenceError(key + ' is not a function in base class');

					if (typeof(callArgs) != 'object')
						callArgs = this.varargs(arguments, 1);

					res = res.apply(this, callArgs);
				}

				superContext = null;

				return res;
			},

			toString: function() {
				var s = '[' + this.constructor.displayName + ']', f = true;
				for (var k in this) {
					if (this.hasOwnProperty(k)) {
						s += (f ? ' {\n' : '') + '  ' + k + ': ' + typeof(this[k]) + '\n';
						f = false;
					}
				}
				return s + (f ? '' : '}');
			}
		}
	});


	/*
	 * HTTP Request helper
	 */

	Headers = Class.extend({
		__name__: 'LuCI.XHR.Headers',
		__init__: function(xhr) {
			var hdrs = this.headers = {};
			xhr.getAllResponseHeaders().split(/\r\n/).forEach(function(line) {
				var m = /^([^:]+):(.*)$/.exec(line);
				if (m != null)
					hdrs[m[1].trim().toLowerCase()] = m[2].trim();
			});
		},

		has: function(name) {
			return this.headers.hasOwnProperty(String(name).toLowerCase());
		},

		get: function(name) {
			var key = String(name).toLowerCase();
			return this.headers.hasOwnProperty(key) ? this.headers[key] : null;
		}
	});

	Response = Class.extend({
		__name__: 'LuCI.XHR.Response',
		__init__: function(xhr, url, duration) {
			this.ok = (xhr.status >= 200 && xhr.status <= 299);
			this.status = xhr.status;
			this.statusText = xhr.statusText;
			this.responseText = xhr.responseText;
			this.headers = new Headers(xhr);
			this.duration = duration;
			this.url = url;
			this.xhr = xhr;
		},

		json: function() {
			return JSON.parse(this.responseText);
		},

		text: function() {
			return this.responseText;
		}
	});

	Request = Class.singleton({
		__name__: 'LuCI.Request',

		interceptors: [],

		request: function(target, options) {
			var state = { xhr: new XMLHttpRequest(), url: target, start: Date.now() },
			    opt = Object.assign({}, options, state),
			    content = null,
			    contenttype = null,
			    callback = this.handleReadyStateChange;

			return new Promise(function(resolveFn, rejectFn) {
				opt.xhr.onreadystatechange = callback.bind(opt, resolveFn, rejectFn);
				opt.method = String(opt.method || 'GET').toUpperCase();

				if ('query' in opt) {
					var q = (opt.query != null) ? Object.keys(opt.query).map(function(k) {
						if (opt.query[k] != null) {
							var v = (typeof(opt.query[k]) == 'object')
								? JSON.stringify(opt.query[k])
								: String(opt.query[k]);

							return '%s=%s'.format(encodeURIComponent(k), encodeURIComponent(v));
						}
						else {
							return encodeURIComponent(k);
						}
					}).join('&') : '';

					if (q !== '') {
						switch (opt.method) {
						case 'GET':
						case 'HEAD':
						case 'OPTIONS':
							opt.url += ((/\?/).test(opt.url) ? '&' : '?') + q;
							break;

						default:
							if (content == null) {
								content = q;
								contenttype = 'application/x-www-form-urlencoded';
							}
						}
					}
				}

				if (!opt.cache)
					opt.url += ((/\?/).test(opt.url) ? '&' : '?') + (new Date()).getTime();

				if (!/^(?:[^/]+:)?\/\//.test(opt.url))
					opt.url = location.protocol + '//' + location.host + opt.url;

				if ('username' in opt && 'password' in opt)
					opt.xhr.open(opt.method, opt.url, true, opt.username, opt.password);
				else
					opt.xhr.open(opt.method, opt.url, true);

				opt.xhr.responseType = 'text';
				opt.xhr.overrideMimeType('application/octet-stream');

				if ('timeout' in opt)
					opt.xhr.timeout = +opt.timeout;

				if ('credentials' in opt)
					opt.xhr.withCredentials = !!opt.credentials;

				if (opt.content != null) {
					switch (typeof(opt.content)) {
					case 'function':
						content = opt.content(xhr);
						break;

					case 'object':
						content = JSON.stringify(opt.content);
						contenttype = 'application/json';
						break;

					default:
						content = String(opt.content);
					}
				}

				if ('headers' in opt)
					for (var header in opt.headers)
						if (opt.headers.hasOwnProperty(header)) {
							if (header.toLowerCase() != 'content-type')
								opt.xhr.setRequestHeader(header, opt.headers[header]);
							else
								contenttype = opt.headers[header];
						}

				if (contenttype != null)
					opt.xhr.setRequestHeader('Content-Type', contenttype);

				try {
					opt.xhr.send(content);
				}
				catch (e) {
					rejectFn.call(opt, e);
				}
			});
		},

		handleReadyStateChange: function(resolveFn, rejectFn, ev) {
			var xhr = this.xhr;

			if (xhr.readyState !== 4)
				return;

			if (xhr.status === 0 && xhr.statusText === '') {
				rejectFn.call(this, new Error('XHR request aborted by browser'));
			}
			else {
				var response = new Response(
					xhr, xhr.responseURL || this.url, Date.now() - this.start);

				Promise.all(Request.interceptors.map(function(fn) { return fn(response) }))
					.then(resolveFn.bind(this, response))
					.catch(rejectFn.bind(this));
			}

			try {
				xhr.abort();
			}
			catch(e) {}
		},

		get: function(url, options) {
			return this.request(url, Object.assign({ method: 'GET' }, options));
		},

		post: function(url, data, options) {
			return this.request(url, Object.assign({ method: 'POST', content: data }, options));
		},

		addInterceptor: function(interceptorFn) {
			if (typeof(interceptorFn) == 'function')
				this.interceptors.push(interceptorFn);
			return interceptorFn;
		},

		removeInterceptor: function(interceptorFn) {
			var oldlen = this.interceptors.length, i = oldlen;
			while (i--)
				if (this.interceptors[i] === interceptorFn)
					this.interceptors.splice(i, 1);
			return (this.interceptors.length < oldlen);
		},

		poll: Class.singleton({
			__name__: 'LuCI.Request.Poll',

			queue: [],

			add: function(interval, url, options, callback) {
				if (isNaN(interval) || interval <= 0)
					throw new TypeError('Invalid poll interval');

				var e = {
					interval: interval,
					url: url,
					options: options,
					callback: callback
				};

				this.queue.push(e);
				return e;
			},

			remove: function(entry) {
				var oldlen = this.queue.length, i = oldlen;

				while (i--)
					if (this.queue[i] === entry) {
						delete this.queue[i].running;
						this.queue.splice(i, 1);
					}

				if (!this.queue.length)
					this.stop();

				return (this.queue.length < oldlen);
			},

			start: function() {
				if (!this.queue.length || this.active())
					return false;

				this.tick = 0;
				this.timer = window.setInterval(this.step, 1000);
				this.step();
				document.dispatchEvent(new CustomEvent('poll-start'));
				return true;
			},

			stop: function() {
				if (!this.active())
					return false;

				document.dispatchEvent(new CustomEvent('poll-stop'));
				window.clearInterval(this.timer);
				delete this.timer;
				delete this.tick;
				return true;
			},

			step: function() {
				Request.poll.queue.forEach(function(e) {
					if ((Request.poll.tick % e.interval) != 0)
						return;

					if (e.running)
						return;

					var opts = Object.assign({}, e.options,
						{ timeout: e.interval * 1000 - 5 });

					e.running = true;
					Request.request(e.url, opts)
						.then(function(res) {
							if (!e.running || !Request.poll.active())
								return;

							try {
								e.callback(res, res.json(), res.duration);
							}
							catch (err) {
								e.callback(res, null, res.duration);
							}
						})
						.finally(function() { delete e.running });
				});

				Request.poll.tick = (Request.poll.tick + 1) % Math.pow(2, 32);
			},

			active: function() {
				return (this.timer != null);
			}
		})
	});


	var dummyElem = null,
	    domParser = null,
	    originalCBIInit = null,
	    classes = {};

	LuCI = Class.extend({
		__name__: 'LuCI',
		__init__: function(env) {
			Object.assign(this.env, env);

			document.addEventListener('DOMContentLoaded', this.setupDOM.bind(this));

			document.addEventListener('poll-start', function(ev) {
				document.querySelectorAll('[id^="xhr_poll_status"]').forEach(function(e) {
					e.style.display = (e.id == 'xhr_poll_status_off') ? 'none' : '';
				});
			});

			document.addEventListener('poll-stop', function(ev) {
				document.querySelectorAll('[id^="xhr_poll_status"]').forEach(function(e) {
					e.style.display = (e.id == 'xhr_poll_status_on') ? 'none' : '';
				});
			});

			originalCBIInit = window.cbi_init;
			window.cbi_init = function() {};
		},

		error: function(type, fmt /*, ...*/) {
			var e = null,
			    msg = fmt ? String.prototype.format.apply(fmt, this.varargs(arguments, 2)) : null,
			    stack = null;

			if (type instanceof Error) {
				e = type;
				stack = (e.stack || '').split(/\n/);

				if (msg)
					e.message = msg + ': ' + e.message;
			}
			else {
				e = new (window[type || 'Error'] || Error)(msg || 'Unspecified error');
				e.name = type || 'Error';

				try { throw new Error('stacktrace') }
				catch (e2) { stack = (e2.stack || '').split(/\n/) }

				/* IE puts the exception message into the first line */
				if (stack[0] == 'Error: stacktrace')
					stack.shift();

				/* Pop L.error() invocation from stack */
				stack.shift();
			}

			/* Append shortened & beautified stacktrace to message */
			e.message += '\n' + stack.join('\n')
				.replace(/(.*?)@(.+):(\d+):(\d+)/g, '  at $1 ($2:$3:$4)');

			if (window.console && console.debug)
				console.debug(e);

			throw e;
		},

		bind: function(fn, self /*, ... */) {
			return Function.prototype.bind.apply(fn, this.varargs(arguments, 2, self));
		},

		/* Class require */
		require: function(name, from) {
			var L = this, url = null, from = from || [];

			/* Class already loaded */
			if (classes[name] != null) {
				/* Circular dependency */
				if (from.indexOf(name) != -1)
					L.error('DependencyError',
						'Circular dependency: class "%s" depends on "%s"',
						name, from.join('" which depends on "'));

				return classes[name];
			}

			document.querySelectorAll('script[src$="/luci.js"]').forEach(function(s) {
				url = '%s/%s.js'.format(
					s.getAttribute('src').replace(/\/luci\.js$/, ''),
					name.replace(/\./g, '/'));
			});

			if (url == null)
				L.error('InternalError', 'Cannot find url of luci.js');

			from = [ name ].concat(from);

			var compileClass = function(res) {
				if (!res.ok)
					L.error('NetworkError',
						'HTTP error %d while loading class file "%s"', res.status, url);

				var source = res.text(),
				    reqmatch = /(?:^|\n)[ \t]*(?:["']require[ \t]+(\S+)(?:[ \t]+as[ \t]+([a-zA-Z_]\S*))?["']);/g,
				    depends = [],
				    args = '';

				/* find require statements in source */
				for (var m = reqmatch.exec(source); m; m = reqmatch.exec(source)) {
					var dep = m[1], as = m[2] || dep.replace(/[^a-zA-Z0-9_]/g, '_');
					depends.push(L.require(dep, from));
					args += ', ' + as;
				}

				/* load dependencies and instantiate class */
				return Promise.all(depends).then(function(instances) {
					try {
						_factory = eval(
							'(function(window, document, L%s) { %s })\n\n//# sourceURL=%s\n'
								.format(args, source, res.url));
					}
					catch (error) {
						L.error('SyntaxError', '%s\n  in %s:%s',
							error.message, res.url, error.lineNumber || '?');
					}

					_factory.displayName = toCamelCase(name + 'ClassFactory');
					_class = _factory.apply(_factory, [window, document, L].concat(instances));

					if (!Class.isSubclass(_class))
					    L.error('TypeError', '"%s" factory yields invalid constructor', name);

					if (_class.displayName == 'AnonymousClass')
						_class.displayName = toCamelCase(name + 'Class');

					var ptr = Object.getPrototypeOf(L),
					    parts = name.split(/\./),
					    instance = new _class();

					for (var i = 0; ptr && i < parts.length - 1; i++)
						ptr = ptr[parts[i]];

					if (!ptr)
						L.error('DependencyError',
							'Parent "%s" for class "%s" is missing',
							parts.slice(0, i).join('.'), name);

					classes[name] = ptr[parts[i]] = instance;

					return instance;
				});
			};

			/* Request class file */
			classes[name] = Request.get(url, { cache: true }).then(compileClass);

			return classes[name];
		},

		/* DOM setup */
		setupDOM: function(ev) {
			Promise.all([
				L.require('ui')
			]).then(function() {
				Request.addInterceptor(function(res) {
					if (res.status != 403 || res.headers.get('X-LuCI-Login-Required') != 'yes')
						return;

					Request.poll.stop();

					L.ui.showModal(_('Session expired'), [
						E('div', { class: 'alert-message warning' },
							_('A new login is required since the authentication session expired.')),
						E('div', { class: 'right' },
							E('div', {
								class: 'btn primary',
								click: function() {
									var loc = window.location;
									window.location = loc.protocol + '//' + loc.host + loc.pathname + loc.search;
								}
							}, _('To login…')))
					]);

					L.error('AuthenticationError', 'Session expired');
				});

				originalCBIInit();
				Request.poll.start();

				document.dispatchEvent(new CustomEvent('luci-loaded'));
			}).catch(function(error) {
				alert('LuCI class loading error:\n' + error);
			});
		},

		env: {},

		/* URL construction helpers */
		path: function(prefix, parts) {
			var url = [ prefix || '' ];

			for (var i = 0; i < parts.length; i++)
				if (/^(?:[a-zA-Z0-9_.%,;-]+\/)*[a-zA-Z0-9_.%,;-]+$/.test(parts[i]))
					url.push('/', parts[i]);

			if (url.length === 1)
				url.push('/');

			return url.join('');
		},

		url: function() {
			return this.path(this.env.scriptname, arguments);
		},

		resource: function() {
			return this.path(this.env.resource, arguments);
		},

		location: function() {
			return this.path(this.env.scriptname, this.env.requestpath);
		},


		/* HTTP resource fetching */
		get: function(url, args, cb) {
			return this.poll(null, url, args, cb, false);
		},

		post: function(url, args, cb) {
			return this.poll(null, url, args, cb, true);
		},

		poll: function(interval, url, args, cb, post) {
			if (interval !== null && interval <= 0)
				interval = this.env.pollinterval;

			var data = post ? { token: this.env.token } : null,
			    method = post ? 'POST' : 'GET';

			if (!/^(?:\/|\S+:\/\/)/.test(url))
				url = this.url(url);

			if (args != null)
				data = Object.assign(data || {}, args);

			if (interval !== null)
				return Request.poll.add(interval, url, { method: method, query: data }, cb);
			else
				return Request.request(url, { method: method, query: data })
					.then(function(res) {
						var json = null;
						if (/^application\/json\b/.test(res.headers.get('Content-Type')))
							try { json = res.json() } catch(e) {}
						cb(res.xhr, json, res.duration);
					});
		},

		stop: function(entry) { return Request.poll.remove(entry) },
		halt: function() { return Request.poll.stop() },
		run: function() { return Request.poll.start() },

		/* DOM manipulation */
		dom: Class.singleton({
			__name__: 'LuCI.DOM',

			elem: function(e) {
				return (e != null && typeof(e) == 'object' && 'nodeType' in e);
			},

			parse: function(s) {
				var elem;

				try {
					domParser = domParser || new DOMParser();
					elem = domParser.parseFromString(s, 'text/html').body.firstChild;
				}
				catch(e) {}

				if (!elem) {
					try {
						dummyElem = dummyElem || document.createElement('div');
						dummyElem.innerHTML = s;
						elem = dummyElem.firstChild;
					}
					catch (e) {}
				}

				return elem || null;
			},

			matches: function(node, selector) {
				var m = this.elem(node) ? node.matches || node.msMatchesSelector : null;
				return m ? m.call(node, selector) : false;
			},

			parent: function(node, selector) {
				if (this.elem(node) && node.closest)
					return node.closest(selector);

				while (this.elem(node))
					if (this.matches(node, selector))
						return node;
					else
						node = node.parentNode;

				return null;
			},

			append: function(node, children) {
				if (!this.elem(node))
					return null;

				if (Array.isArray(children)) {
					for (var i = 0; i < children.length; i++)
						if (this.elem(children[i]))
							node.appendChild(children[i]);
						else if (children !== null && children !== undefined)
							node.appendChild(document.createTextNode('' + children[i]));

					return node.lastChild;
				}
				else if (typeof(children) === 'function') {
					return this.append(node, children(node));
				}
				else if (this.elem(children)) {
					return node.appendChild(children);
				}
				else if (children !== null && children !== undefined) {
					node.innerHTML = '' + children;
					return node.lastChild;
				}

				return null;
			},

			content: function(node, children) {
				if (!this.elem(node))
					return null;

				while (node.firstChild)
					node.removeChild(node.firstChild);

				return this.append(node, children);
			},

			attr: function(node, key, val) {
				if (!this.elem(node))
					return null;

				var attr = null;

				if (typeof(key) === 'object' && key !== null)
					attr = key;
				else if (typeof(key) === 'string')
					attr = {}, attr[key] = val;

				for (key in attr) {
					if (!attr.hasOwnProperty(key) || attr[key] == null)
						continue;

					switch (typeof(attr[key])) {
					case 'function':
						node.addEventListener(key, attr[key]);
						break;

					case 'object':
						node.setAttribute(key, JSON.stringify(attr[key]));
						break;

					default:
						node.setAttribute(key, attr[key]);
					}
				}
			},

			create: function() {
				var html = arguments[0],
				    attr = arguments[1],
				    data = arguments[2],
				    elem;

				if (!(attr instanceof Object) || Array.isArray(attr))
					data = attr, attr = null;

				if (Array.isArray(html)) {
					elem = document.createDocumentFragment();
					for (var i = 0; i < html.length; i++)
						elem.appendChild(this.create(html[i]));
				}
				else if (this.elem(html)) {
					elem = html;
				}
				else if (html.charCodeAt(0) === 60) {
					elem = this.parse(html);
				}
				else {
					elem = document.createElement(html);
				}

				if (!elem)
					return null;

				this.attr(elem, attr);
				this.append(elem, data);

				return elem;
			}
		}),

		Class: Class,
		Request: Request
	});

	XHR = Class.extend({
		__name__: 'LuCI.XHR',
		__init__: function() {
			if (window.console && console.debug)
				console.debug('Direct use XHR() is deprecated, please use L.Request instead');
		},

		_response: function(cb, res, json, duration) {
			if (this.active)
				cb(res, json, duration);
			delete this.active;
		},

		get: function(url, data, callback, timeout) {
			this.active = true;
			L.get(url, data, this._response.bind(this, callback), timeout);
		},

		post: function(url, data, callback, timeout) {
			this.active = true;
			L.post(url, data, this._response.bind(this, callback), timeout);
		},

		cancel: function() { delete this.active },
		busy: function() { return (this.active === true) },
		abort: function() {},
		send_form: function() { L.error('InternalError', 'Not implemented') },
	});

	XHR.get = function() { return window.L.get.apply(window.L, arguments) };
	XHR.post = function() { return window.L.post.apply(window.L, arguments) };
	XHR.poll = function() { return window.L.poll.apply(window.L, arguments) };
	XHR.stop = Request.poll.remove.bind(Request.poll);
	XHR.halt = Request.poll.stop.bind(Request.poll);
	XHR.run = Request.poll.start.bind(Request.poll);
	XHR.running = Request.poll.active.bind(Request.poll);

	window.XHR = XHR;
	window.LuCI = LuCI;
})(window, document);
