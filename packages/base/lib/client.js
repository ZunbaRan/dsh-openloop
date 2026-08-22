window.__ModuleLoader__.load({
	id: "@openloop/dsh-base",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let react_jsx_runtime = require("react/jsx-runtime");
		//#region ../../node_modules/.pnpm/@deepseek-ai+cosmokit@1.8.2/node_modules/@deepseek-ai/cosmokit/lib/index.js
		/** Return true when a value is `null` or `undefined`. */
		function isNullable(value) {
			return value === null || value === void 0;
		}
		/** Return true for non-array object values. */
		function isPlainObject(data) {
			return data && typeof data === "object" && !Array.isArray(data);
		}
		/** Filter object entries and return a new object. */
		function filterKeys(object, filter) {
			return Object.fromEntries(Object.entries(object).filter(([key, value]) => filter(key, value)));
		}
		/** Map object values while preserving the original key set. */
		function mapValues(object, transform) {
			return Object.fromEntries(Object.entries(object).map(([key, value]) => [key, transform(value, key)]));
		}
		/** Pick selected keys from an object, optionally including `undefined` values. */
		function pick(source, keys, forced) {
			if (!keys) return { ...source };
			const result = {};
			for (const key of keys) if (forced || source[key] !== void 0) result[key] = source[key];
			return result;
		}
		/** Test values using `instanceof` with a `toStringTag` fallback. */
		function is(type, value) {
			if (arguments.length === 1) return (value) => is(type, value);
			return type in globalThis && value instanceof globalThis[type] || Object.prototype.toString.call(value).slice(8, -1) === type;
		}
		function isArrayBufferLike(value) {
			return is("ArrayBuffer", value) || is("SharedArrayBuffer", value);
		}
		function isArrayBufferSource(value) {
			return isArrayBufferLike(value) || ArrayBuffer.isView(value);
		}
		/** Binary source detection and base64/hex conversion helpers. */
		var Binary;
		(function(Binary) {
			Binary.is = isArrayBufferLike;
			Binary.isSource = isArrayBufferSource;
			function fromSource(source) {
				if (ArrayBuffer.isView(source)) return source.buffer.slice(source.byteOffset, source.byteOffset + source.byteLength);
				else return source;
			}
			Binary.fromSource = fromSource;
			function toBase64(source) {
				source = fromSource(source);
				if (typeof Buffer !== "undefined") return Buffer.from(source).toString("base64");
				let binary = "";
				const bytes = new Uint8Array(source);
				for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
				return btoa(binary);
			}
			Binary.toBase64 = toBase64;
			function fromBase64(source) {
				if (typeof Buffer !== "undefined") return fromSource(Buffer.from(source, "base64"));
				return Uint8Array.from(atob(source), (c) => c.charCodeAt(0));
			}
			Binary.fromBase64 = fromBase64;
			function toHex(source) {
				source = fromSource(source);
				if (typeof Buffer !== "undefined") return Buffer.from(source).toString("hex");
				return Array.from(new Uint8Array(source), (byte) => byte.toString(16).padStart(2, "0")).join("");
			}
			Binary.toHex = toHex;
			function fromHex(source) {
				if (typeof Buffer !== "undefined") return fromSource(Buffer.from(source, "hex"));
				const hex = source.length % 2 === 0 ? source : source.slice(0, source.length - 1);
				const buffer = [];
				for (let i = 0; i < hex.length; i += 2) buffer.push(parseInt(`${hex[i]}${hex[i + 1]}`, 16));
				return Uint8Array.from(buffer).buffer;
			}
			Binary.fromHex = fromHex;
		})(Binary || (Binary = {}));
		Binary.fromBase64;
		Binary.toBase64;
		Binary.fromHex;
		Binary.toHex;
		/** Deep-clone common JavaScript values while preserving prototypes and cycles. */
		function clone(source, refs = /* @__PURE__ */ new Map()) {
			if (!source || typeof source !== "object") return source;
			if (is("Date", source)) return new Date(source.valueOf());
			if (is("RegExp", source)) return new RegExp(source.source, source.flags);
			if (isArrayBufferLike(source)) return source.slice(0);
			if (ArrayBuffer.isView(source)) return source.buffer.slice(source.byteOffset, source.byteOffset + source.byteLength);
			const cached = refs.get(source);
			if (cached) return cached;
			if (Array.isArray(source)) {
				const result = [];
				refs.set(source, result);
				source.forEach((value, index) => {
					result[index] = Reflect.apply(clone, null, [value, refs]);
				});
				return result;
			}
			const result = Object.create(Object.getPrototypeOf(source));
			refs.set(source, result);
			for (const key of Reflect.ownKeys(source)) {
				const descriptor = { ...Reflect.getOwnPropertyDescriptor(source, key) };
				if ("value" in descriptor) descriptor.value = Reflect.apply(clone, null, [descriptor.value, refs]);
				Reflect.defineProperty(result, key, descriptor);
			}
			return result;
		}
		/** Deeply compare arrays, dates, regexps, buffers, and plain object fields. */
		function deepEqual(a, b, strict) {
			if (a === b) return true;
			if (!strict && isNullable(a) && isNullable(b)) return true;
			if (typeof a !== typeof b) return false;
			if (typeof a !== "object") return false;
			if (!a || !b) return false;
			function check(test, then) {
				return test(a) ? test(b) ? then(a, b) : false : test(b) ? false : void 0;
			}
			return check(Array.isArray, (a, b) => a.length === b.length && a.every((item, index) => deepEqual(item, b[index]))) ?? check(is("Date"), (a, b) => a.valueOf() === b.valueOf()) ?? check(is("RegExp"), (a, b) => a.source === b.source && a.flags === b.flags) ?? check(isArrayBufferLike, (a, b) => {
				if (a.byteLength !== b.byteLength) return false;
				const viewA = new Uint8Array(a);
				const viewB = new Uint8Array(b);
				for (let i = 0; i < viewA.length; i++) if (viewA[i] !== viewB[i]) return false;
				return true;
			}) ?? Object.keys({
				...a,
				...b
			}).every((key) => deepEqual(a[key], b[key], strict));
		}
		/** Time constants plus parsing and formatting helpers. */
		var Time;
		(function(Time) {
			Time.millisecond = 1;
			Time.second = 1e3;
			Time.minute = Time.second * 60;
			Time.hour = Time.minute * 60;
			Time.day = Time.hour * 24;
			Time.week = Time.day * 7;
			let timezoneOffset = (/* @__PURE__ */ new Date()).getTimezoneOffset();
			function setTimezoneOffset(offset) {
				timezoneOffset = offset;
			}
			Time.setTimezoneOffset = setTimezoneOffset;
			function getTimezoneOffset() {
				return timezoneOffset;
			}
			Time.getTimezoneOffset = getTimezoneOffset;
			function getDateNumber(date = /* @__PURE__ */ new Date(), offset) {
				if (typeof date === "number") date = new Date(date);
				if (offset === void 0) offset = timezoneOffset;
				return Math.floor((date.valueOf() / Time.minute - offset) / 1440);
			}
			Time.getDateNumber = getDateNumber;
			function fromDateNumber(value, offset) {
				const date = new Date(value * Time.day);
				if (offset === void 0) offset = timezoneOffset;
				return new Date(+date + offset * Time.minute);
			}
			Time.fromDateNumber = fromDateNumber;
			const numeric = /\d+(?:\.\d+)?/.source;
			const timeRegExp = new RegExp(`^${[
				"w(?:eek(?:s)?)?",
				"d(?:ay(?:s)?)?",
				"h(?:our(?:s)?)?",
				"m(?:in(?:ute)?(?:s)?)?",
				"s(?:ec(?:ond)?(?:s)?)?"
			].map((unit) => `(${numeric}${unit})?`).join("")}$`);
			function parseTime(source) {
				const capture = timeRegExp.exec(source);
				if (!capture) return 0;
				return (parseFloat(capture[1]) * Time.week || 0) + (parseFloat(capture[2]) * Time.day || 0) + (parseFloat(capture[3]) * Time.hour || 0) + (parseFloat(capture[4]) * Time.minute || 0) + (parseFloat(capture[5]) * Time.second || 0);
			}
			Time.parseTime = parseTime;
			function parseDate(date) {
				const parsed = parseTime(date);
				if (parsed) date = Date.now() + parsed;
				else if (/^\d{1,2}(:\d{1,2}){1,2}$/.test(date)) date = `${(/* @__PURE__ */ new Date()).toLocaleDateString()}-${date}`;
				else if (/^\d{1,2}-\d{1,2}-\d{1,2}(:\d{1,2}){1,2}$/.test(date)) date = `${(/* @__PURE__ */ new Date()).getFullYear()}-${date}`;
				return date ? new Date(date) : /* @__PURE__ */ new Date();
			}
			Time.parseDate = parseDate;
			function format(ms) {
				const abs = Math.abs(ms);
				if (abs >= Time.day - Time.hour / 2) return Math.round(ms / Time.day) + "d";
				else if (abs >= Time.hour - Time.minute / 2) return Math.round(ms / Time.hour) + "h";
				else if (abs >= Time.minute - Time.second / 2) return Math.round(ms / Time.minute) + "m";
				else if (abs >= Time.second) return Math.round(ms / Time.second) + "s";
				return ms + "ms";
			}
			Time.format = format;
			function toDigits(source, length = 2) {
				return source.toString().padStart(length, "0");
			}
			Time.toDigits = toDigits;
			function template(template, time = /* @__PURE__ */ new Date()) {
				return template.replace("yyyy", time.getFullYear().toString()).replace("yy", time.getFullYear().toString().slice(2)).replace("MM", toDigits(time.getMonth() + 1)).replace("dd", toDigits(time.getDate())).replace("hh", toDigits(time.getHours())).replace("mm", toDigits(time.getMinutes())).replace("ss", toDigits(time.getSeconds())).replace("SSS", toDigits(time.getMilliseconds(), 3));
			}
			Time.template = template;
		})(Time || (Time = {}));
		//#endregion
		//#region ../../node_modules/.pnpm/@deepseek-ai+schemastery@3.18.1/node_modules/@deepseek-ai/schemastery/lib/index.mjs
		const kSchema = Symbol.for("schemastery");
		const kValidationError = Symbol.for("ValidationError");
		globalThis.__schemastery_index__ ??= 0;
		globalThis.__schemastery_refs__ = void 0;
		var ValidationError = class extends TypeError {
			options;
			name = "ValidationError";
			constructor(message, options) {
				let prefix = "$";
				for (const segment of options.path || []) if (typeof segment === "string") prefix += "." + segment;
				else if (typeof segment === "number") prefix += "[" + segment + "]";
				else if (typeof segment === "symbol") prefix += `[Symbol(${segment.toString()})]`;
				if (prefix.startsWith(".")) prefix = prefix.slice(1);
				super((prefix === "$" ? "" : `${prefix} `) + message);
				this.options = options;
			}
			static is(error) {
				return !!error?.[kValidationError];
			}
		};
		Object.defineProperty(ValidationError.prototype, kValidationError, { value: true });
		const Schema = function(options) {
			const schema = function(data, options = {}) {
				return Schema.resolve(data, schema, options)[0];
			};
			if (options.refs) {
				const refs = mapValues(options.refs, (options) => new Schema(options));
				const getRef = (uid) => refs[uid];
				for (const key in refs) {
					const options = refs[key];
					options.sKey = getRef(options.sKey);
					options.inner = getRef(options.inner);
					options.list = options.list && options.list.map(getRef);
					options.dict = options.dict && mapValues(options.dict, getRef);
				}
				return refs[options.uid];
			}
			Object.assign(schema, options);
			if (typeof schema.callback === "string") try {
				schema.callback = new Function("return " + schema.callback)();
			} catch {}
			Object.defineProperty(schema, "uid", { value: globalThis.__schemastery_index__++ });
			Object.setPrototypeOf(schema, Schema.prototype);
			schema.meta ||= {};
			schema.toString = schema.toString.bind(schema);
			return schema;
		};
		Schema.prototype = Object.create(Function.prototype);
		Schema.prototype[kSchema] = true;
		Object.defineProperty(Schema.prototype, "~standard", { get() {
			return {
				version: 1,
				vendor: "schemastery",
				validate: (value) => {
					try {
						return { value: Schema.resolve(value, this, {})[0] };
					} catch (error) {
						if (ValidationError.is(error)) return { issues: [{
							message: error.message,
							path: error.options.path
						}] };
						throw error;
					}
				}
			};
		} });
		Schema.ValidationError = ValidationError;
		Schema.prototype.toJSON = function toJSON() {
			if (globalThis.__schemastery_refs__) {
				globalThis.__schemastery_refs__[this.uid] ??= JSON.parse(JSON.stringify({ ...this }));
				return this.uid;
			}
			globalThis.__schemastery_refs__ = { [this.uid]: { ...this } };
			globalThis.__schemastery_refs__[this.uid] = JSON.parse(JSON.stringify({ ...this }));
			const result = {
				uid: this.uid,
				refs: globalThis.__schemastery_refs__
			};
			globalThis.__schemastery_refs__ = void 0;
			return result;
		};
		Schema.prototype.set = function set(key, value) {
			this.dict[key] = value;
			return this;
		};
		Schema.prototype.push = function push(value) {
			this.list.push(value);
			return this;
		};
		function mergeDesc(original, messages) {
			const result = typeof original === "string" ? { "": original } : { ...original };
			for (const locale in messages) {
				const value = messages[locale];
				if (value?.$description || value?.$desc) result[locale] = value.$description || value.$desc;
				else if (typeof value === "string") result[locale] = value;
			}
			return result;
		}
		function getInner(value) {
			return value?.$value ?? value?.$inner;
		}
		function extractKeys(data) {
			return filterKeys(data ?? {}, (key) => !key.startsWith("$"));
		}
		Schema.prototype.i18n = function i18n(messages) {
			const schema = Schema(this);
			const desc = mergeDesc(schema.meta.description, messages);
			if (Object.keys(desc).length) schema.meta.description = desc;
			if (schema.dict) schema.dict = mapValues(schema.dict, (inner, key) => {
				return inner.i18n(mapValues(messages, (data) => getInner(data)?.[key] ?? data?.[key]));
			});
			if (schema.list) schema.list = schema.list.map((inner, index) => {
				return inner.i18n(mapValues(messages, (data = {}) => {
					if (Array.isArray(getInner(data))) return getInner(data)[index];
					if (Array.isArray(data)) return data[index];
					return extractKeys(data);
				}));
			});
			if (schema.inner) schema.inner = schema.inner.i18n(mapValues(messages, (data) => {
				if (getInner(data)) return getInner(data);
				return extractKeys(data);
			}));
			if (schema.sKey) schema.sKey = schema.sKey.i18n(mapValues(messages, (data) => data?.$key));
			return schema;
		};
		Schema.prototype.extra = function extra(key, value) {
			const schema = Schema(this);
			schema.meta = {
				...schema.meta,
				[key]: value
			};
			return schema;
		};
		for (const key of [
			"required",
			"disabled",
			"collapse",
			"hidden",
			"loose"
		]) Object.assign(Schema.prototype, { [key](value = true) {
			const schema = Schema(this);
			schema.meta = {
				...schema.meta,
				[key]: value
			};
			return schema;
		} });
		Schema.prototype.deprecated = function deprecated() {
			const schema = Schema(this);
			schema.meta.badges ||= [];
			schema.meta.badges.push({
				text: "deprecated",
				type: "danger"
			});
			return schema;
		};
		Schema.prototype.experimental = function experimental() {
			const schema = Schema(this);
			schema.meta.badges ||= [];
			schema.meta.badges.push({
				text: "experimental",
				type: "warning"
			});
			return schema;
		};
		Schema.prototype.pattern = function pattern(regexp) {
			const schema = Schema(this);
			const pattern = pick(regexp, ["source", "flags"]);
			schema.meta = {
				...schema.meta,
				pattern
			};
			return schema;
		};
		Schema.prototype.simplify = function simplify(value) {
			if (deepEqual(value, this.meta.default, this.type === "dict")) return null;
			if (isNullable(value)) return value;
			if (this.type === "object" || this.type === "dict") {
				const result = {};
				for (const key in value) {
					const item = (this.type === "object" ? this.dict[key] : this.inner)?.simplify(value[key]);
					if (this.type === "dict" || !isNullable(item)) result[key] = item;
				}
				if (deepEqual(result, this.meta.default, this.type === "dict")) return null;
				return result;
			} else if (this.type === "array" || this.type === "tuple") {
				const result = [];
				value.forEach((value, index) => {
					const schema = this.type === "array" ? this.inner : this.list[index];
					const item = schema ? schema.simplify(value) : value;
					result.push(item);
				});
				return result;
			} else if (this.type === "intersect") {
				const result = {};
				for (const item of this.list) Object.assign(result, item.simplify(value));
				return result;
			} else if (this.type === "union") for (const schema of this.list) try {
				Schema.resolve(value, schema, {});
				return schema.simplify(value);
			} catch {}
			return value;
		};
		Schema.prototype.toString = function toString(inline) {
			return formatters[this.type]?.(this, inline) ?? `Schema<${this.type}>`;
		};
		Schema.prototype.role = function role(role, extra) {
			const schema = Schema(this);
			schema.meta = {
				...schema.meta,
				role,
				extra
			};
			return schema;
		};
		for (const key of [
			"default",
			"link",
			"comment",
			"description",
			"max",
			"min",
			"step"
		]) Object.assign(Schema.prototype, { [key](value) {
			const schema = Schema(this);
			schema.meta = {
				...schema.meta,
				[key]: value
			};
			return schema;
		} });
		const resolvers = {};
		Schema.extend = function extend(type, resolve) {
			resolvers[type] = resolve;
		};
		Schema.resolve = function resolve(data, schema, options = {}, strict = false) {
			if (!schema) return [data];
			if (options.ignore?.(data, schema)) return [data];
			if (isNullable(data) && schema.type !== "lazy") {
				if (schema.meta.required) throw new ValidationError(`missing required value`, options);
				let current = schema;
				let fallback = schema.meta.default;
				while (current?.type === "intersect" && isNullable(fallback)) {
					current = current.list[0];
					fallback = current?.meta.default;
				}
				if (isNullable(fallback)) return [data];
				data = clone(fallback);
			}
			const callback = resolvers[schema.type];
			if (!callback) throw new ValidationError(`unsupported type "${schema.type}"`, options);
			try {
				return callback(data, schema, options, strict);
			} catch (error) {
				if (!schema.meta.loose) throw error;
				return [schema.meta.default];
			}
		};
		Schema.from = function from(source) {
			if (isNullable(source)) return Schema.any();
			else if ([
				"string",
				"number",
				"boolean"
			].includes(typeof source)) return Schema.const(source).required();
			else if (source[kSchema]) return source;
			else if (typeof source === "function") switch (source) {
				case String: return Schema.string().required();
				case Number: return Schema.number().required();
				case Boolean: return Schema.boolean().required();
				case Function: return Schema.function().required();
				default: return Schema.is(source).required();
			}
			else throw new TypeError(`cannot infer schema from ${source}`);
		};
		Schema.lazy = function lazy(builder) {
			const toJSON = () => {
				if (!schema.inner[kSchema]) {
					schema.inner = schema.builder();
					schema.inner.meta = {
						...schema.meta,
						...schema.inner.meta
					};
				}
				return schema.inner.toJSON();
			};
			const schema = new Schema({
				type: "lazy",
				builder,
				inner: { toJSON }
			});
			return schema;
		};
		Schema.natural = function natural() {
			return Schema.number().step(1).min(0);
		};
		Schema.percent = function percent() {
			return Schema.number().step(.01).min(0).max(1).role("slider");
		};
		Schema.date = function date() {
			return Schema.union([Schema.is(Date), Schema.transform(Schema.string().role("datetime"), (value, options) => {
				const date = new Date(value);
				if (isNaN(+date)) throw new ValidationError(`invalid date "${value}"`, options);
				return date;
			}, true)]);
		};
		Schema.regExp = function regExp(flag = "") {
			return Schema.union([Schema.is(RegExp), Schema.transform(Schema.string().role("regexp", { flag }), (value, options) => {
				try {
					return new RegExp(value, flag);
				} catch (e) {
					throw new ValidationError(e.message, options);
				}
			}, true)]);
		};
		Schema.arrayBuffer = function arrayBuffer(encoding) {
			return Schema.union([
				Schema.is(ArrayBuffer),
				Schema.is(SharedArrayBuffer),
				Schema.transform(Schema.any(), (value, options) => {
					if (Binary.isSource(value)) return Binary.fromSource(value);
					throw new ValidationError(`expected ArrayBufferSource but got ${value}`, options);
				}, true),
				...encoding ? [Schema.transform(Schema.string(), (value, options) => {
					try {
						return encoding === "base64" ? Binary.fromBase64(value) : Binary.fromHex(value);
					} catch (e) {
						throw new ValidationError(e.message, options);
					}
				}, true)] : []
			]);
		};
		Schema.extend("lazy", (data, schema, options, strict) => {
			if (!schema.inner[kSchema]) {
				schema.inner = schema.builder();
				schema.inner.meta = {
					...schema.meta,
					...schema.inner.meta
				};
			}
			return Schema.resolve(data, schema.inner, options, strict);
		});
		Schema.extend("any", (data) => {
			return [data];
		});
		Schema.extend("never", (data, _, options) => {
			throw new ValidationError(`expected nullable but got ${data}`, options);
		});
		Schema.extend("const", (data, { value }, options) => {
			if (deepEqual(data, value)) return [value];
			throw new ValidationError(`expected ${value} but got ${data}`, options);
		});
		function checkWithinRange(data, meta, description, options, skipMin = false) {
			const { max = Infinity, min = -Infinity } = meta;
			if (data > max) throw new ValidationError(`expected ${description} <= ${max} but got ${data}`, options);
			if (data < min && !skipMin) throw new ValidationError(`expected ${description} >= ${min} but got ${data}`, options);
		}
		Schema.extend("string", (data, { meta }, options) => {
			if (typeof data !== "string") throw new ValidationError(`expected string but got ${data}`, options);
			if (meta.pattern) {
				const regexp = new RegExp(meta.pattern.source, meta.pattern.flags);
				if (!regexp.test(data)) throw new ValidationError(`expect string to match regexp ${regexp}`, options);
			}
			checkWithinRange(data.length, meta, "string length", options);
			return [data];
		});
		function decimalShift(data, digits) {
			const str = data.toString();
			if (str.includes("e")) return data * Math.pow(10, digits);
			const index = str.indexOf(".");
			if (index === -1) return data * Math.pow(10, digits);
			const frac = str.slice(index + 1);
			const integer = str.slice(0, index);
			if (frac.length <= digits) return +(integer + frac.padEnd(digits, "0"));
			return +(integer + frac.slice(0, digits) + "." + frac.slice(digits));
		}
		function isMultipleOf(data, min, step) {
			step = Math.abs(step);
			if (!/^\d+\.\d+$/.test(step.toString())) return (data - min) % step === 0;
			const index = step.toString().indexOf(".");
			const digits = step.toString().slice(index + 1).length;
			return Math.abs(decimalShift(data, digits) - decimalShift(min, digits)) % decimalShift(step, digits) === 0;
		}
		Schema.extend("number", (data, { meta }, options) => {
			if (typeof data !== "number") throw new ValidationError(`expected number but got ${data}`, options);
			checkWithinRange(data, meta, "number", options);
			const { step } = meta;
			if (step && !isMultipleOf(data, meta.min ?? 0, step)) throw new ValidationError(`expected number multiple of ${step} but got ${data}`, options);
			return [data];
		});
		Schema.extend("boolean", (data, _, options) => {
			if (typeof data === "boolean") return [data];
			throw new ValidationError(`expected boolean but got ${data}`, options);
		});
		Schema.extend("bitset", (data, { bits, meta }, options) => {
			let value = 0, keys = [];
			if (typeof data === "number") {
				value = data;
				for (const key in bits) if (data & bits[key]) keys.push(key);
			} else if (Array.isArray(data)) {
				keys = data;
				for (const key of keys) {
					if (typeof key !== "string") throw new ValidationError(`expected string but got ${key}`, options);
					if (key in bits) value |= bits[key];
				}
			} else throw new ValidationError(`expected number or array but got ${data}`, options);
			if (value === meta.default) return [value];
			return [value, keys];
		});
		Schema.extend("function", (data, _, options) => {
			if (typeof data === "function") return [data];
			throw new ValidationError(`expected function but got ${data}`, options);
		});
		Schema.extend("is", (data, { constructor }, options) => {
			if (typeof constructor === "function") {
				if (data instanceof constructor) return [data];
				throw new ValidationError(`expected ${constructor.name} but got ${data}`, options);
			} else {
				if (isNullable(data)) throw new ValidationError(`expected ${constructor} but got ${data}`, options);
				let prototype = Object.getPrototypeOf(data);
				while (prototype) {
					if (prototype.constructor?.name === constructor) return [data];
					prototype = Object.getPrototypeOf(prototype);
				}
				throw new ValidationError(`expected ${constructor} but got ${data}`, options);
			}
		});
		function property(data, key, schema, options) {
			try {
				const [value, adapted] = Schema.resolve(data[key], schema, {
					...options,
					path: [...options.path || [], key]
				});
				if (adapted !== void 0) data[key] = adapted;
				return value;
			} catch (e) {
				if (!options?.autofix) throw e;
				delete data[key];
				return schema.meta.default;
			}
		}
		Schema.extend("array", (data, { inner, meta }, options) => {
			if (!Array.isArray(data)) throw new ValidationError(`expected array but got ${data}`, options);
			checkWithinRange(data.length, meta, "array length", options, !isNullable(inner.meta.default));
			return [data.map((_, index) => property(data, index, inner, options))];
		});
		Schema.extend("dict", (data, { inner, sKey }, options, strict) => {
			if (!isPlainObject(data)) throw new ValidationError(`expected object but got ${data}`, options);
			const result = {};
			for (const key in data) {
				let rKey;
				try {
					rKey = Schema.resolve(key, sKey, options)[0];
				} catch (error) {
					if (strict) continue;
					throw error;
				}
				result[rKey] = property(data, key, inner, options);
				data[rKey] = data[key];
				if (key !== rKey) delete data[key];
			}
			return [result];
		});
		Schema.extend("tuple", (data, { list }, options, strict) => {
			if (!Array.isArray(data)) throw new ValidationError(`expected array but got ${data}`, options);
			const result = list.map((inner, index) => property(data, index, inner, options));
			if (strict) return [result];
			result.push(...data.slice(list.length));
			return [result];
		});
		function merge(result, data) {
			for (const key in data) {
				if (key in result) continue;
				result[key] = data[key];
			}
		}
		Schema.extend("object", (data, { dict }, options, strict) => {
			if (!isPlainObject(data)) throw new ValidationError(`expected object but got ${data}`, options);
			const result = {};
			for (const key in dict) {
				const value = property(data, key, dict[key], options);
				if (!isNullable(value) || key in data) result[key] = value;
			}
			if (!strict) merge(result, data);
			return [result];
		});
		Schema.extend("union", (data, { list, toString }, options, strict) => {
			const messages = [];
			for (const inner of list) try {
				return Schema.resolve(data, inner, options, strict);
			} catch (error) {
				messages.push(error);
			}
			throw new ValidationError(`expected ${toString()} but got ${JSON.stringify(data)}`, options);
		});
		Schema.extend("intersect", (data, { list, toString }, options, strict) => {
			if (!list.length) return [data];
			let result;
			for (const inner of list) {
				const value = Schema.resolve(data, inner, options, true)[0];
				if (isNullable(value)) continue;
				if (isNullable(result)) result = value;
				else if (typeof result !== typeof value) throw new ValidationError(`expected ${toString()} but got ${JSON.stringify(data)}`, options);
				else if (typeof value === "object") merge(result ??= {}, value);
				else if (result !== value) throw new ValidationError(`expected ${toString()} but got ${JSON.stringify(data)}`, options);
			}
			if (!strict && isPlainObject(data)) merge(result, data);
			return [result];
		});
		Schema.extend("transform", (data, { inner, callback, preserve }, options) => {
			const [result, adapted = data] = Schema.resolve(data, inner, options, true);
			if (preserve) return [callback(result)];
			else return [callback(result), callback(adapted)];
		});
		const formatters = {};
		function defineMethod(name, keys, format) {
			formatters[name] = format;
			Object.assign(Schema, { [name](...args) {
				const schema = new Schema({ type: name });
				keys.forEach((key, index) => {
					switch (key) {
						case "sKey":
							schema.sKey = args[index] ?? Schema.string();
							break;
						case "inner":
							schema.inner = Schema.from(args[index]);
							break;
						case "list":
							schema.list = args[index].map(Schema.from);
							break;
						case "dict":
							schema.dict = mapValues(args[index], Schema.from);
							break;
						case "bits":
							schema.bits = {};
							for (const key in args[index]) {
								if (typeof args[index][key] !== "number") continue;
								schema.bits[key] = args[index][key];
							}
							break;
						case "callback": {
							const callback = schema.callback = args[index];
							callback["toJSON"] ||= () => callback.toString();
							break;
						}
						case "constructor": {
							const constructor = schema.constructor = args[index];
							if (typeof constructor === "function") constructor["toJSON"] ||= () => constructor["name"];
							break;
						}
						default: schema[key] = args[index];
					}
				});
				if (name === "object" || name === "dict") schema.meta.default = {};
				else if (name === "array" || name === "tuple") schema.meta.default = [];
				else if (name === "bitset") schema.meta.default = 0;
				return schema;
			} });
		}
		defineMethod("is", ["constructor"], ({ constructor }) => {
			if (typeof constructor === "function") return constructor.name;
			else return constructor;
		});
		defineMethod("any", [], () => "any");
		defineMethod("never", [], () => "never");
		defineMethod("const", ["value"], ({ value }) => typeof value === "string" ? JSON.stringify(value) : value);
		defineMethod("string", [], () => "string");
		defineMethod("number", [], () => "number");
		defineMethod("boolean", [], () => "boolean");
		defineMethod("bitset", ["bits"], () => "bitset");
		defineMethod("function", [], () => "function");
		defineMethod("array", ["inner"], ({ inner }) => `${inner.toString(true)}[]`);
		defineMethod("dict", ["inner", "sKey"], ({ inner, sKey }) => `{ [key: ${sKey.toString()}]: ${inner.toString()} }`);
		defineMethod("tuple", ["list"], ({ list }) => `[${list.map((inner) => inner.toString()).join(", ")}]`);
		defineMethod("object", ["dict"], ({ dict }) => {
			if (Object.keys(dict).length === 0) return "{}";
			return `{ ${Object.entries(dict).map(([key, inner]) => {
				return `${key}${inner.meta.required ? "" : "?"}: ${inner.toString()}`;
			}).join(", ")} }`;
		});
		defineMethod("union", ["list"], ({ list }, inline) => {
			const result = list.map(({ toString: format }) => format()).join(" | ");
			return inline ? `(${result})` : result;
		});
		defineMethod("intersect", ["list"], ({ list }) => {
			return `${list.map((inner) => inner.toString(true)).join(" & ")}`;
		});
		defineMethod("transform", [
			"inner",
			"callback",
			"preserve"
		], ({ inner }, isInner) => inner.toString(isInner));
		//#endregion
		//#region src/presets.generated.ts
		const OPENLOOP_PRESET_IDS = [
			"linear",
			"vercel",
			"notion",
			"claude",
			"apple",
			"figma",
			"binance",
			"slack"
		];
		const OPENLOOP_PRESETS = {
			"linear": {
				"light": {
					"surface": "oklch(1 0 0)",
					"surface-muted": "oklch(0.965 0.003 285)",
					"surface-subtle": "oklch(0.985 0.002 285)",
					"border": "oklch(0.895 0.008 285)",
					"border-muted": "oklch(0.948 0.007 285)",
					"border-strong": "oklch(0.587 0.009 285)",
					"foreground": "oklch(0.21 0.006 285)",
					"muted-foreground": "oklch(0.46 0.014 285)",
					"foreground-subtle": "oklch(0.335 0.005 285)",
					"foreground-strong": "oklch(0.21 0.006 285)",
					"selection": "oklch(0.94 0.035 260)",
					"selection-foreground": "oklch(0.34 0.12 260)",
					"focus-ring": "oklch(0.58 0.19 260)",
					"primary": "oklch(0.57 0.2 260)",
					"primary-foreground": "oklch(0.985 0 0)",
					"success": "oklch(0.46 0.15 150)",
					"success-background": "oklch(0.96 0.03 150)",
					"success-border": "oklch(0.83 0.07 150)",
					"warning": "oklch(0.48 0.13 65)",
					"warning-background": "oklch(0.965 0.035 85)",
					"warning-border": "oklch(0.84 0.08 80)",
					"error": "oklch(0.52 0.2 27)",
					"error-background": "oklch(0.96 0.025 25)",
					"error-border": "oklch(0.84 0.075 25)",
					"info": "oklch(0.49 0.15 240)",
					"info-background": "oklch(0.96 0.025 240)",
					"info-border": "oklch(0.84 0.07 240)",
					"chart-1": "oklch(0.58 0.19 260)",
					"chart-2": "oklch(0.57 0.16 162)",
					"chart-3": "oklch(0.64 0.17 70)",
					"chart-4": "oklch(0.57 0.21 25)",
					"chart-5": "oklch(0.57 0.22 303)",
					"chart-6": "oklch(0.6 0.15 210)",
					"chart-7": "oklch(0.65 0.18 330)",
					"chart-8": "oklch(0.75 0.15 95)",
					"chart-seq-1": "oklch(0.94 0.04 260)",
					"chart-seq-2": "oklch(0.84 0.08 260)",
					"chart-seq-3": "oklch(0.73 0.13 260)",
					"chart-seq-4": "oklch(0.62 0.17 260)",
					"chart-seq-5": "oklch(0.51 0.2 260)",
					"delta-up": "var(--ocix-success)",
					"delta-down": "var(--ocix-error)",
					"delta-flat": "var(--ocix-muted-foreground)",
					"primary-tint": "oklch(0.68 0.16 260)",
					"primary-shade": "oklch(0.5 0.19 260)",
					"radius-sm": "8px",
					"radius-md": "12px",
					"radius-lg": "16px",
					"shadow-1": "none",
					"shadow-2": "none"
				},
				"dark": {
					"surface": "oklch(0.205 0.006 285)",
					"surface-muted": "oklch(0.265 0.008 285)",
					"surface-subtle": "oklch(0.235 0.007 285)",
					"border": "oklch(0.36 0.012 285)",
					"border-muted": "oklch(0.282 0.010 285)",
					"border-strong": "oklch(0.625 0.014 285)",
					"foreground": "oklch(0.95 0.005 285)",
					"muted-foreground": "oklch(0.72 0.015 286)",
					"foreground-subtle": "oklch(0.835 0.004 285)",
					"foreground-strong": "oklch(0.95 0.005 285)",
					"selection": "oklch(0.3 0.07 260)",
					"selection-foreground": "oklch(0.9 0.05 260)",
					"focus-ring": "oklch(0.72 0.16 260)",
					"primary": "oklch(0.7 0.17 260)",
					"primary-foreground": "oklch(0.18 0.01 260)",
					"success": "oklch(0.74 0.15 150)",
					"success-background": "oklch(0.27 0.045 150)",
					"success-border": "oklch(0.43 0.08 150)",
					"warning": "oklch(0.8 0.14 75)",
					"warning-background": "oklch(0.28 0.045 85)",
					"warning-border": "oklch(0.45 0.075 85)",
					"error": "oklch(0.72 0.18 25)",
					"error-background": "oklch(0.27 0.045 25)",
					"error-border": "oklch(0.45 0.085 25)",
					"info": "oklch(0.74 0.13 240)",
					"info-background": "oklch(0.27 0.04 240)",
					"info-border": "oklch(0.45 0.075 240)",
					"chart-1": "oklch(0.72 0.15 260)",
					"chart-2": "oklch(0.76 0.14 162)",
					"chart-3": "oklch(0.82 0.15 75)",
					"chart-4": "oklch(0.74 0.18 25)",
					"chart-5": "oklch(0.75 0.18 303)",
					"chart-6": "oklch(0.72 0.13 210)",
					"chart-7": "oklch(0.75 0.16 330)",
					"chart-8": "oklch(0.84 0.14 95)",
					"chart-seq-1": "oklch(0.32 0.05 260)",
					"chart-seq-2": "oklch(0.44 0.09 260)",
					"chart-seq-3": "oklch(0.56 0.13 260)",
					"chart-seq-4": "oklch(0.68 0.15 260)",
					"chart-seq-5": "oklch(0.8 0.13 260)",
					"delta-up": "var(--ocix-success)",
					"delta-down": "var(--ocix-error)",
					"delta-flat": "var(--ocix-muted-foreground)",
					"primary-tint": "oklch(0.78 0.13 260)",
					"primary-shade": "oklch(0.62 0.17 260)",
					"radius-sm": "8px",
					"radius-md": "12px",
					"radius-lg": "16px",
					"shadow-1": "none",
					"shadow-2": "none"
				}
			},
			"vercel": {
				"light": {
					"surface": "#ffffff",
					"surface-muted": "#fafafa",
					"surface-subtle": "#f5f5f5",
					"border": "#ebebeb",
					"border-muted": "oklch(0.970 0 285)",
					"border-strong": "oklch(0.609 0 285)",
					"foreground": "#171717",
					"muted-foreground": "#888888",
					"foreground-subtle": "oklch(0.416 0 285)",
					"foreground-strong": "oklch(0.205 0 285)",
					"selection": "#171717",
					"selection-foreground": "#fafafa",
					"focus-ring": "#0070f3",
					"primary": "#171717",
					"primary-foreground": "#fafafa",
					"success": "#0f9d58",
					"success-background": "#e6f4ec",
					"success-border": "#b7e2c8",
					"warning": "#ab570a",
					"warning-background": "#ffefcf",
					"warning-border": "#f5d9a0",
					"error": "#c50000",
					"error-background": "#f7d4d6",
					"error-border": "#eeb9bc",
					"info": "#0070f3",
					"info-background": "#d3e5ff",
					"info-border": "#a9ccf7",
					"chart-1": "#0070f3",
					"chart-2": "#50e3c2",
					"chart-3": "#7928ca",
					"chart-4": "#ff0080",
					"chart-5": "#f9cb28",
					"chart-6": "#eb367f",
					"chart-7": "#3291ff",
					"chart-8": "#a1a1a1",
					"chart-seq-1": "#d3e5ff",
					"chart-seq-2": "#a9ccf7",
					"chart-seq-3": "#6fa8f5",
					"chart-seq-4": "#3291ff",
					"chart-seq-5": "#0761d1",
					"delta-up": "#0f9d58",
					"delta-down": "#c50000",
					"delta-flat": "#888888",
					"primary-tint": "#4d4d4d",
					"primary-shade": "#000000",
					"radius-sm": "6px",
					"radius-md": "8px",
					"radius-lg": "12px",
					"shadow-1": "0 1px 1px rgb(0 0 0 / 0.05), 0 2px 2px rgb(0 0 0 / 0.1)",
					"shadow-2": "0 2px 2px rgb(0 0 0 / 0.1), 0 8px 16px -4px rgb(0 0 0 / 0.1)"
				},
				"dark": {
					"surface": "#0a0a0a",
					"surface-muted": "#111111",
					"surface-subtle": "#1a1a1a",
					"border": "#262626",
					"border-muted": "oklch(0.207 0 285)",
					"border-strong": "oklch(0.573 0 285)",
					"foreground": "#ededed",
					"muted-foreground": "#a1a1a1",
					"foreground-subtle": "oklch(0.828 0 285)",
					"foreground-strong": "oklch(0.946 0 285)",
					"selection": "#fafafa",
					"selection-foreground": "#171717",
					"focus-ring": "#3291ff",
					"primary": "#fafafa",
					"primary-foreground": "#171717",
					"success": "#3fb950",
					"success-background": "#12261a",
					"success-border": "#1f5335",
					"warning": "#d29922",
					"warning-background": "#2a1f0d",
					"warning-border": "#5c4413",
					"error": "#f85149",
					"error-background": "#2d1114",
					"error-border": "#6e2828",
					"info": "#3291ff",
					"info-background": "#0d2038",
					"info-border": "#1c4a8c",
					"chart-1": "oklch(0.72 0.15 260)",
					"chart-2": "oklch(0.76 0.14 162)",
					"chart-3": "oklch(0.82 0.15 75)",
					"chart-4": "oklch(0.74 0.18 25)",
					"chart-5": "oklch(0.75 0.18 303)",
					"chart-6": "oklch(0.72 0.13 210)",
					"chart-7": "oklch(0.75 0.16 330)",
					"chart-8": "oklch(0.84 0.14 95)",
					"chart-seq-1": "#0d2038",
					"chart-seq-2": "#123a6e",
					"chart-seq-3": "#1c5cb8",
					"chart-seq-4": "#3291ff",
					"chart-seq-5": "#7ab8ff",
					"delta-up": "#3fb950",
					"delta-down": "#f85149",
					"delta-flat": "#a1a1a1",
					"primary-tint": "#ffffff",
					"primary-shade": "#d4d4d4",
					"radius-sm": "6px",
					"radius-md": "8px",
					"radius-lg": "12px",
					"shadow-1": "none",
					"shadow-2": "none"
				}
			},
			"notion": {
				"light": {
					"surface": "#ffffff",
					"surface-muted": "#f6f5f4",
					"surface-subtle": "#fafaf9",
					"border": "#e5e3df",
					"border-muted": "oklch(0.958 0.005 84.6)",
					"border-strong": "oklch(0.602 0.007 84.6)",
					"foreground": "#1a1a1a",
					"muted-foreground": "#787671",
					"foreground-subtle": "oklch(0.392 0 84.6)",
					"foreground-strong": "oklch(0.218 0 84.6)",
					"selection": "#ebe9f8",
					"selection-foreground": "#3a2a99",
					"focus-ring": "#5645d4",
					"primary": "#5645d4",
					"primary-foreground": "#ffffff",
					"success": "#1aae39",
					"success-background": "#e3f5e8",
					"success-border": "#bfe6cc",
					"warning": "#dd5b00",
					"warning-background": "#fdeee0",
					"warning-border": "#f5d3b3",
					"error": "#e03131",
					"error-background": "#fbe5e5",
					"error-border": "#f2c2c2",
					"info": "#0075de",
					"info-background": "#e3f0fb",
					"info-border": "#bdd9f2",
					"chart-1": "#7b3ff2",
					"chart-2": "#0075de",
					"chart-3": "#2a9d99",
					"chart-4": "#1aae39",
					"chart-5": "#dd5b00",
					"chart-6": "#ff64c8",
					"chart-7": "#f5d75e",
					"chart-8": "#523410",
					"chart-seq-1": "#e6e0f5",
					"chart-seq-2": "#c5b8ea",
					"chart-seq-3": "#9d88dc",
					"chart-seq-4": "#7b3ff2",
					"chart-seq-5": "#5a2fd6",
					"delta-up": "#1aae39",
					"delta-down": "#e03131",
					"delta-flat": "#787671",
					"primary-tint": "#6e5ce0",
					"primary-shade": "#4534b3",
					"radius-sm": "8px",
					"radius-md": "12px",
					"radius-lg": "16px",
					"shadow-1": "0 1px 2px rgb(15 15 15 / 0.04)",
					"shadow-2": "0 4px 12px rgb(15 15 15 / 0.08)"
				},
				"dark": {
					"surface": "#191919",
					"surface-muted": "#202020",
					"surface-subtle": "#2c2c2c",
					"border": "#2f2f2f",
					"border-muted": "oklch(0.259 0 84.6)",
					"border-strong": "oklch(0.577 0 84.6)",
					"foreground": "rgb(255 255 255 / 0.87)",
					"muted-foreground": "rgb(255 255 255 / 0.46)",
					"foreground-subtle": "oklch(0.758 0.003 84.6)",
					"foreground-strong": "oklch(0.97 0 84.6)",
					"selection": "#3d3480",
					"selection-foreground": "#d9d4ff",
					"focus-ring": "#8b80f9",
					"primary": "#8b80f9",
					"primary-foreground": "#1a1a1a",
					"success": "#4dab9a",
					"success-background": "#1c2b26",
					"success-border": "#2c4a40",
					"warning": "#e0703a",
					"warning-background": "#2e211a",
					"warning-border": "#57391f",
					"error": "#df5452",
					"error-background": "#2e1b1b",
					"error-border": "#592c2c",
					"info": "#529cca",
					"info-background": "#1a2530",
					"info-border": "#2c4358",
					"chart-1": "#9b7ff5",
					"chart-2": "#529cca",
					"chart-3": "#3fbfb2",
					"chart-4": "#4cc36a",
					"chart-5": "#e0703a",
					"chart-6": "#ff7fd2",
					"chart-7": "#f5d75e",
					"chart-8": "#a8998a",
					"chart-seq-1": "#2c2647",
					"chart-seq-2": "#4a3f7d",
					"chart-seq-3": "#6a5cb5",
					"chart-seq-4": "#8b80f9",
					"chart-seq-5": "#b3aaff",
					"delta-up": "#4cc36a",
					"delta-down": "#df5452",
					"delta-flat": "rgb(255 255 255 / 0.46)",
					"primary-tint": "#a399ff",
					"primary-shade": "#6e62d9",
					"radius-sm": "8px",
					"radius-md": "12px",
					"radius-lg": "16px",
					"shadow-1": "none",
					"shadow-2": "none"
				}
			},
			"claude": {
				"light": {
					"surface": "#faf9f5",
					"surface-muted": "#f5f0e8",
					"surface-subtle": "#efe9de",
					"border": "#e6dfd8",
					"border-muted": "oklch(0.945 0.010 67.7)",
					"border-strong": "oklch(0.585 0.014 67.7)",
					"foreground": "#141413",
					"muted-foreground": "#6c6a64",
					"foreground-subtle": "oklch(0.358 0.001 67.7)",
					"foreground-strong": "oklch(0.191 0.002 67.7)",
					"selection": "#f0dcd2",
					"selection-foreground": "#8c4a30",
					"focus-ring": "#cc785c",
					"primary": "#cc785c",
					"primary-foreground": "#ffffff",
					"success": "#5db872",
					"success-background": "#e8f4ea",
					"success-border": "#c4e2cc",
					"warning": "#d4a017",
					"warning-background": "#faf3dd",
					"warning-border": "#ead9a3",
					"error": "#c64545",
					"error-background": "#f7e6e6",
					"error-border": "#e5bdbd",
					"info": "#5db8a6",
					"info-background": "#e5f3f0",
					"info-border": "#bfe0d8",
					"chart-1": "#cc785c",
					"chart-2": "#5db8a6",
					"chart-3": "#e8a55a",
					"chart-4": "#5db872",
					"chart-5": "#c64545",
					"chart-6": "#8e8b82",
					"chart-7": "#a9583e",
					"chart-8": "#6c6a64",
					"chart-seq-1": "#f0dcd2",
					"chart-seq-2": "#e4b7a3",
					"chart-seq-3": "#d79075",
					"chart-seq-4": "#cc785c",
					"chart-seq-5": "#a9583e",
					"delta-up": "#5db872",
					"delta-down": "#c64545",
					"delta-flat": "#6c6a64",
					"primary-tint": "#d9907a",
					"primary-shade": "#a9583e",
					"radius-sm": "8px",
					"radius-md": "12px",
					"radius-lg": "16px",
					"shadow-1": "0 1px 3px rgb(20 20 19 / 0.08)",
					"shadow-2": "0 1px 3px rgb(20 20 19 / 0.08)"
				},
				"dark": {
					"surface": "#181715",
					"surface-muted": "#1f1e1b",
					"surface-subtle": "#252320",
					"border": "#33302b",
					"border-muted": "oklch(0.258 0.008 67.7)",
					"border-strong": "oklch(0.613 0.011 67.7)",
					"foreground": "#faf9f5",
					"muted-foreground": "#a09d96",
					"foreground-subtle": "oklch(0.839 0.004 67.7)",
					"foreground-strong": "oklch(0.982 0.005 67.7)",
					"selection": "#4a342a",
					"selection-foreground": "#f0c8b4",
					"focus-ring": "#d97757",
					"primary": "#d97757",
					"primary-foreground": "#181715",
					"success": "#6fc784",
					"success-background": "#1d2b20",
					"success-border": "#33502f",
					"warning": "#e0b23a",
					"warning-background": "#2b2415",
					"warning-border": "#54471f",
					"error": "#d96666",
					"error-background": "#2e1d1d",
					"error-border": "#592e2e",
					"info": "#74c4b3",
					"info-background": "#1a2925",
					"info-border": "#2e4a42",
					"chart-1": "#d97757",
					"chart-2": "#74c4b3",
					"chart-3": "#e8a55a",
					"chart-4": "#6fc784",
					"chart-5": "#d96666",
					"chart-6": "#a09d96",
					"chart-7": "#c98a6f",
					"chart-8": "#8e8b82",
					"chart-seq-1": "#4a342a",
					"chart-seq-2": "#7a5340",
					"chart-seq-3": "#b06a4c",
					"chart-seq-4": "#d97757",
					"chart-seq-5": "#e8a187",
					"delta-up": "#6fc784",
					"delta-down": "#d96666",
					"delta-flat": "#a09d96",
					"primary-tint": "#e5957c",
					"primary-shade": "#b86444",
					"radius-sm": "8px",
					"radius-md": "12px",
					"radius-lg": "16px",
					"shadow-1": "none",
					"shadow-2": "none"
				}
			},
			"apple": {
				"light": {
					"surface": "#ffffff",
					"surface-muted": "#f5f5f7",
					"surface-subtle": "#fafafc",
					"border": "#e0e0e0",
					"border-muted": "oklch(0.953 0 286)",
					"border-strong": "oklch(0.603 0 286)",
					"foreground": "#1d1d1f",
					"muted-foreground": "#7a7a7a",
					"foreground-subtle": "oklch(0.406 0 286)",
					"foreground-strong": "oklch(0.232 0.004 286)",
					"selection": "#e3effc",
					"selection-foreground": "#0053b8",
					"focus-ring": "#0071e3",
					"primary": "#0066cc",
					"primary-foreground": "#ffffff",
					"success": "#34c759",
					"success-background": "#e6f7ea",
					"success-border": "#c2e9cc",
					"warning": "#ff9500",
					"warning-background": "#fff2e0",
					"warning-border": "#ffddb0",
					"error": "#ff3b30",
					"error-background": "#ffe9e8",
					"error-border": "#ffc7c4",
					"info": "#0066cc",
					"info-background": "#e3effc",
					"info-border": "#bcd9f5",
					"chart-1": "#0071e3",
					"chart-2": "#30d158",
					"chart-3": "#ff9f0a",
					"chart-4": "#ff453a",
					"chart-5": "#af52de",
					"chart-6": "#64d2ff",
					"chart-7": "#ffd60a",
					"chart-8": "#8e8e93",
					"chart-seq-1": "#e3effc",
					"chart-seq-2": "#bcd9f5",
					"chart-seq-3": "#83bcf0",
					"chart-seq-4": "#4d9de8",
					"chart-seq-5": "#0071e3",
					"delta-up": "#34c759",
					"delta-down": "#ff3b30",
					"delta-flat": "#7a7a7a",
					"primary-tint": "#0071e3",
					"primary-shade": "#0053b8",
					"radius-sm": "11px",
					"radius-md": "18px",
					"radius-lg": "24px",
					"shadow-1": "none",
					"shadow-2": "none"
				},
				"dark": {
					"surface": "#000000",
					"surface-muted": "#1c1c1e",
					"surface-subtle": "#2c2c2e",
					"border": "#38383a",
					"border-muted": "oklch(0.171 0.003 286)",
					"border-strong": "oklch(0.638 0.004 286)",
					"foreground": "#ffffff",
					"muted-foreground": "rgb(235 235 245 / 0.6)",
					"foreground-subtle": "oklch(0.823 0 286)",
					"foreground-strong": "oklch(1 0 286)",
					"selection": "#0a3a6e",
					"selection-foreground": "#bfe0ff",
					"focus-ring": "#0a84ff",
					"primary": "#0a84ff",
					"primary-foreground": "#ffffff",
					"success": "#30d158",
					"success-background": "#0e2415",
					"success-border": "#1d4a28",
					"warning": "#ff9f0a",
					"warning-background": "#2b1f0a",
					"warning-border": "#573d13",
					"error": "#ff453a",
					"error-background": "#2e1210",
					"error-border": "#5e2622",
					"info": "#0a84ff",
					"info-background": "#0a1f33",
					"info-border": "#144066",
					"chart-1": "#0a84ff",
					"chart-2": "#30d158",
					"chart-3": "#ff9f0a",
					"chart-4": "#ff453a",
					"chart-5": "#bf5af2",
					"chart-6": "#64d2ff",
					"chart-7": "#ffd60a",
					"chart-8": "#98989d",
					"chart-seq-1": "#0a1f33",
					"chart-seq-2": "#103a61",
					"chart-seq-3": "#1763a6",
					"chart-seq-4": "#0a84ff",
					"chart-seq-5": "#5eb2ff",
					"delta-up": "#30d158",
					"delta-down": "#ff453a",
					"delta-flat": "rgb(235 235 245 / 0.6)",
					"primary-tint": "#409cff",
					"primary-shade": "#0066cc",
					"radius-sm": "11px",
					"radius-md": "18px",
					"radius-lg": "24px",
					"shadow-1": "none",
					"shadow-2": "none"
				}
			},
			"figma": {
				"light": {
					"surface": "#ffffff",
					"surface-muted": "#f7f7f5",
					"surface-subtle": "#fafafa",
					"border": "#e6e6e6",
					"border-muted": "oklch(0.962 0 285)",
					"border-strong": "oklch(0.509 0 285)",
					"foreground": "#000000",
					"muted-foreground": "#5a5a5a",
					"foreground-subtle": "oklch(0.234 0 285)",
					"foreground-strong": "oklch(0 0 285)",
					"selection": "#e9e2fb",
					"selection-foreground": "#1e1e1e",
					"focus-ring": "#0d99ff",
					"primary": "#000000",
					"primary-foreground": "#ffffff",
					"success": "#1ea64a",
					"success-background": "#e4f5ea",
					"success-border": "#bfe6cd",
					"warning": "#b88a00",
					"warning-background": "#fff6d9",
					"warning-border": "#f0e0a0",
					"error": "#f24e1e",
					"error-background": "#fde8e2",
					"error-border": "#f7c4b5",
					"info": "#0d99ff",
					"info-background": "#e3f2ff",
					"info-border": "#bfe0f7",
					"chart-1": "#0d99ff",
					"chart-2": "#f24e1e",
					"chart-3": "#ff7262",
					"chart-4": "#a259ff",
					"chart-5": "#1abcfe",
					"chart-6": "#0acf83",
					"chart-7": "#ff3d8b",
					"chart-8": "#ffcd29",
					"chart-seq-1": "#e3f2ff",
					"chart-seq-2": "#bfe0f7",
					"chart-seq-3": "#7cc2ff",
					"chart-seq-4": "#3aa9ff",
					"chart-seq-5": "#0d99ff",
					"delta-up": "#1ea64a",
					"delta-down": "#f24e1e",
					"delta-flat": "#5a5a5a",
					"primary-tint": "#333333",
					"primary-shade": "#000000",
					"radius-sm": "9999px",
					"radius-md": "24px",
					"radius-lg": "32px",
					"shadow-1": "0 4px 16px rgb(0 0 0 / 0.06)",
					"shadow-2": "0 4px 16px rgb(0 0 0 / 0.06)"
				},
				"dark": {
					"surface": "#1e1e1e",
					"surface-muted": "#2c2c2c",
					"surface-subtle": "#383838",
					"border": "#3d3d3d",
					"border-muted": "oklch(0.298 0 285)",
					"border-strong": "oklch(0.648 0 285)",
					"foreground": "#ffffff",
					"muted-foreground": "rgb(255 255 255 / 0.7)",
					"foreground-subtle": "oklch(0.896 0 285)",
					"foreground-strong": "oklch(1 0 285)",
					"selection": "#1c3a52",
					"selection-foreground": "#bfe0f7",
					"focus-ring": "#0d99ff",
					"primary": "#0d99ff",
					"primary-foreground": "#ffffff",
					"success": "#0acf83",
					"success-background": "#0f2a1f",
					"success-border": "#1d5238",
					"warning": "#ffcd29",
					"warning-background": "#2b250e",
					"warning-border": "#57501c",
					"error": "#ff7262",
					"error-background": "#2e1713",
					"error-border": "#5e2c24",
					"info": "#0d99ff",
					"info-background": "#0f2433",
					"info-border": "#1d4a66",
					"chart-1": "oklch(0.72 0.15 260)",
					"chart-2": "oklch(0.76 0.14 162)",
					"chart-3": "oklch(0.82 0.15 75)",
					"chart-4": "oklch(0.74 0.18 25)",
					"chart-5": "oklch(0.75 0.18 303)",
					"chart-6": "oklch(0.72 0.13 210)",
					"chart-7": "oklch(0.75 0.16 330)",
					"chart-8": "oklch(0.84 0.14 95)",
					"chart-seq-1": "#0f2433",
					"chart-seq-2": "#173d5c",
					"chart-seq-3": "#1f5c8c",
					"chart-seq-4": "#0d99ff",
					"chart-seq-5": "#66c2ff",
					"delta-up": "#0acf83",
					"delta-down": "#ff7262",
					"delta-flat": "rgb(255 255 255 / 0.7)",
					"primary-tint": "#3aa9ff",
					"primary-shade": "#087acc",
					"radius-sm": "9999px",
					"radius-md": "24px",
					"radius-lg": "32px",
					"shadow-1": "none",
					"shadow-2": "none"
				}
			},
			"binance": {
				"light": {
					"surface": "#ffffff",
					"surface-muted": "#fafafa",
					"surface-subtle": "#f5f5f5",
					"border": "#eaecef",
					"border-muted": "oklch(0.971 0.004 258.3)",
					"border-strong": "oklch(0.617 0.005 258.3)",
					"foreground": "#181a20",
					"muted-foreground": "#707a8a",
					"foreground-subtle": "oklch(0.398 0.009 258.3)",
					"foreground-strong": "oklch(0.218 0.012 258.3)",
					"selection": "#fdf3d0",
					"selection-foreground": "#7a5c00",
					"focus-ring": "#f0b90b",
					"primary": "#fcd535",
					"primary-foreground": "#181a20",
					"success": "#0ecb81",
					"success-background": "#e0f8ee",
					"success-border": "#b3ecd4",
					"warning": "#f0b90b",
					"warning-background": "#fdf3d0",
					"warning-border": "#f5e2a0",
					"error": "#f6465d",
					"error-background": "#fee7ea",
					"error-border": "#f9c0c8",
					"info": "#3b82f6",
					"info-background": "#e6effd",
					"info-border": "#c2d6f8",
					"chart-1": "#fcd535",
					"chart-2": "#0ecb81",
					"chart-3": "#f6465d",
					"chart-4": "#3b82f6",
					"chart-5": "#2dbdb6",
					"chart-6": "#929aa5",
					"chart-7": "#f0b90b",
					"chart-8": "#5e6673",
					"chart-seq-1": "#fdf3d0",
					"chart-seq-2": "#f9e58f",
					"chart-seq-3": "#f5d95c",
					"chart-seq-4": "#fcd535",
					"chart-seq-5": "#f0b90b",
					"delta-up": "#0ecb81",
					"delta-down": "#f6465d",
					"delta-flat": "#929aa5",
					"primary-tint": "#fddc5c",
					"primary-shade": "#f0b90b",
					"radius-sm": "6px",
					"radius-md": "8px",
					"radius-lg": "12px",
					"shadow-1": "none",
					"shadow-2": "none"
				},
				"dark": {
					"surface": "#0b0e11",
					"surface-muted": "#1e2329",
					"surface-subtle": "#2b3139",
					"border": "#2b3139",
					"border-muted": "oklch(0.236 0.014 258.3)",
					"border-strong": "oklch(0.595 0.019 258.3)",
					"foreground": "#eaecef",
					"muted-foreground": "#929aa5",
					"foreground-subtle": "oklch(0.813 0.003 258.3)",
					"foreground-strong": "oklch(0.942 0.005 258.3)",
					"selection": "#3a3a1f",
					"selection-foreground": "#fcd535",
					"focus-ring": "#fcd535",
					"primary": "#fcd535",
					"primary-foreground": "#181a20",
					"success": "#0ecb81",
					"success-background": "#0f2a1f",
					"success-border": "#1c4d38",
					"warning": "#f0b90b",
					"warning-background": "#2b240e",
					"warning-border": "#544a1c",
					"error": "#f6465d",
					"error-background": "#2e151a",
					"error-border": "#5c2630",
					"info": "#3b82f6",
					"info-background": "#14233d",
					"info-border": "#24406b",
					"chart-1": "oklch(0.72 0.15 260)",
					"chart-2": "oklch(0.76 0.14 162)",
					"chart-3": "oklch(0.82 0.15 75)",
					"chart-4": "oklch(0.74 0.18 25)",
					"chart-5": "oklch(0.75 0.18 303)",
					"chart-6": "oklch(0.72 0.13 210)",
					"chart-7": "oklch(0.75 0.16 330)",
					"chart-8": "oklch(0.84 0.14 95)",
					"chart-seq-1": "#3a3a1f",
					"chart-seq-2": "#6b5d1f",
					"chart-seq-3": "#a38712",
					"chart-seq-4": "#fcd535",
					"chart-seq-5": "#ffe17a",
					"delta-up": "#0ecb81",
					"delta-down": "#f6465d",
					"delta-flat": "#929aa5",
					"primary-tint": "#fddc5c",
					"primary-shade": "#f0b90b",
					"radius-sm": "6px",
					"radius-md": "8px",
					"radius-lg": "12px",
					"shadow-1": "none",
					"shadow-2": "none"
				}
			},
			"slack": {
				"light": {
					"surface": "#ffffff",
					"surface-muted": "#f8f8f8",
					"surface-subtle": "#f0f0f0",
					"border": "#dddddd",
					"border-muted": "oklch(0.949 0 255.5)",
					"border-strong": "oklch(0.596 0 255.5)",
					"foreground": "#1d1c1d",
					"muted-foreground": "#616061",
					"foreground-subtle": "oklch(0.359 0.002 255.5)",
					"foreground-strong": "oklch(0.228 0.002 255.5)",
					"selection": "#e8dceb",
					"selection-foreground": "#4a154b",
					"focus-ring": "#1264a3",
					"primary": "#4a154b",
					"primary-foreground": "#ffffff",
					"success": "#007a5a",
					"success-background": "#e0f2ec",
					"success-border": "#b8e0d2",
					"warning": "#ecb22e",
					"warning-background": "#fdf6e0",
					"warning-border": "#f0e0a8",
					"error": "#e01e5a",
					"error-background": "#fbe4ec",
					"error-border": "#f2bdcf",
					"info": "#1264a3",
					"info-background": "#e3eef7",
					"info-border": "#bcd4e8",
					"chart-1": "#36c5f0",
					"chart-2": "#2bac76",
					"chart-3": "#ecb22e",
					"chart-4": "#e01e5a",
					"chart-5": "#4a154b",
					"chart-6": "#1264a3",
					"chart-7": "#1d9bd1",
					"chart-8": "#616061",
					"chart-seq-1": "#e8dceb",
					"chart-seq-2": "#c9a8d1",
					"chart-seq-3": "#a56bb5",
					"chart-seq-4": "#7c3f88",
					"chart-seq-5": "#4a154b",
					"delta-up": "#2bac76",
					"delta-down": "#e01e5a",
					"delta-flat": "#616061",
					"primary-tint": "#611f64",
					"primary-shade": "#350d36",
					"radius-sm": "8px",
					"radius-md": "12px",
					"radius-lg": "16px",
					"shadow-1": "0 1px 3px rgb(29 28 29 / 0.13)",
					"shadow-2": "0 4px 12px rgb(29 28 29 / 0.12)"
				},
				"dark": {
					"surface": "#1a1d21",
					"surface-muted": "#222529",
					"surface-subtle": "#2c2f33",
					"border": "#3b3e42",
					"border-muted": "oklch(0.296 0.007 255.5)",
					"border-strong": "oklch(0.588 0.009 255.5)",
					"foreground": "#d1d2d3",
					"muted-foreground": "#ababad",
					"foreground-subtle": "oklch(0.803 0.001 255.5)",
					"foreground-strong": "oklch(0.863 0.002 255.5)",
					"selection": "#4a2b4d",
					"selection-foreground": "#e3c4e8",
					"focus-ring": "#1d9bd1",
					"primary": "#7c2d82",
					"primary-foreground": "#ffffff",
					"success": "#2bac76",
					"success-background": "#14261d",
					"success-border": "#254d37",
					"warning": "#ecb22e",
					"warning-background": "#2b250f",
					"warning-border": "#54491d",
					"error": "#e01e5a",
					"error-background": "#2e1420",
					"error-border": "#5c2438",
					"info": "#1d9bd1",
					"info-background": "#12222e",
					"info-border": "#20445c",
					"chart-1": "oklch(0.72 0.15 260)",
					"chart-2": "oklch(0.76 0.14 162)",
					"chart-3": "oklch(0.82 0.15 75)",
					"chart-4": "oklch(0.74 0.18 25)",
					"chart-5": "oklch(0.75 0.18 303)",
					"chart-6": "oklch(0.72 0.13 210)",
					"chart-7": "oklch(0.75 0.16 330)",
					"chart-8": "oklch(0.84 0.14 95)",
					"chart-seq-1": "#4a2b4d",
					"chart-seq-2": "#6b3a70",
					"chart-seq-3": "#8f4a96",
					"chart-seq-4": "#b05fb8",
					"chart-seq-5": "#d18cd8",
					"delta-up": "#2bac76",
					"delta-down": "#e01e5a",
					"delta-flat": "#ababad",
					"primary-tint": "#9b3fa3",
					"primary-shade": "#5e1f63",
					"radius-sm": "8px",
					"radius-md": "12px",
					"radius-lg": "16px",
					"shadow-1": "none",
					"shadow-2": "none"
				}
			}
		};
		Schema.object({ allowLoopbackOrigins: Schema.array(Schema.string()).default([]) });
		const DEFAULT_OPENLOOP_SETTINGS = {
			preset: "linear",
			appearance: "system"
		};
		const OPENLOOP_GLOBAL_TOKENS = {
			"font-sans": "system-ui, -apple-system, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, \"PingFang SC\", \"Hiragino Sans GB\", \"Microsoft YaHei\", sans-serif",
			"type-display": "24px / 32px / 600 / -0.02em / tabular-nums",
			"type-title": "18px / 1.3 / 650 / -0.02em",
			"type-label": "13px / 1.4 / 600 / 0",
			"type-meta": "12px / 1.5 / 500 / 0",
			"type-micro": "11px / 1.45 / 500 / 0.01em",
			"space-1": "4px",
			"space-2": "8px",
			"space-3": "12px",
			"space-4": "16px",
			"space-5": "24px"
		};
		const PRESET_META = [
			{
				id: "linear",
				name: "Linear",
				character: "冷静、产品化"
			},
			{
				id: "vercel",
				name: "Vercel",
				character: "极简、高对比"
			},
			{
				id: "notion",
				name: "Notion",
				character: "柔和、文档感"
			},
			{
				id: "claude",
				name: "Claude",
				character: "温暖、自然"
			},
			{
				id: "apple",
				name: "Apple",
				character: "清澈、精致"
			},
			{
				id: "figma",
				name: "Figma",
				character: "鲜明、创作感"
			},
			{
				id: "binance",
				name: "Binance",
				character: "数据、交易感"
			},
			{
				id: "slack",
				name: "Slack",
				character: "协作、活力"
			}
		];
		function decodeOpenLoopSettings(value) {
			if (!value || typeof value !== "object") return void 0;
			const record = value;
			return {
				preset: OPENLOOP_PRESET_IDS.includes(record.preset) ? record.preset : "linear",
				appearance: record.appearance === "light" || record.appearance === "dark" || record.appearance === "system" ? record.appearance : "system"
			};
		}
		function resolvePalette(settings, systemDark) {
			const appearance = settings.appearance === "system" ? systemDark ? "dark" : "light" : settings.appearance;
			return {
				appearance,
				values: OPENLOOP_PRESETS[settings.preset][appearance]
			};
		}
		function paletteVariables(settings, systemDark) {
			const { values } = resolvePalette(settings, systemDark);
			return Object.fromEntries(Object.entries(values).map(([key, value]) => [`--openloop-${key}`, value]));
		}
		//#endregion
		//#region src/client.tsx
		const STORAGE_KEY = "openloop.visuals.v1";
		const CHANGE_EVENT = "openloop-visual-settings-change";
		function loadStoredSettings() {
			if (typeof localStorage === "undefined") return DEFAULT_OPENLOOP_SETTINGS;
			try {
				return decodeOpenLoopSettings(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null")) ?? DEFAULT_OPENLOOP_SETTINGS;
			} catch {
				return DEFAULT_OPENLOOP_SETTINGS;
			}
		}
		function createOpenLoopSettingsScope() {
			let value = loadStoredSettings();
			let snapshot = {
				status: "ready",
				value,
				base: DEFAULT_OPENLOOP_SETTINGS,
				user: value,
				revision: 0,
				writable: true,
				mode: "host"
			};
			const listeners = /* @__PURE__ */ new Set();
			const publish = () => {
				const next = loadStoredSettings();
				if (next.preset === value.preset && next.appearance === value.appearance) return;
				value = next;
				snapshot = {
					...snapshot,
					value,
					user: value,
					revision: snapshot.revision + 1
				};
				for (const listener of listeners) listener();
			};
			const onChange = () => publish();
			const onStorage = (event) => {
				if (event.key === STORAGE_KEY) publish();
			};
			return {
				getSnapshot: () => snapshot,
				subscribe(listener) {
					listeners.add(listener);
					if (listeners.size === 1) {
						window.addEventListener(CHANGE_EVENT, onChange);
						window.addEventListener("storage", onStorage);
					}
					return () => {
						listeners.delete(listener);
						if (listeners.size === 0) {
							window.removeEventListener(CHANGE_EVENT, onChange);
							window.removeEventListener("storage", onStorage);
						}
					};
				},
				async set(field, nextValue) {
					const next = decodeOpenLoopSettings({
						...value,
						[field]: nextValue
					}) ?? value;
					localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
					publish();
					window.dispatchEvent(new Event(CHANGE_EVENT));
				},
				async unset(field) {
					const next = {
						...value,
						[field]: DEFAULT_OPENLOOP_SETTINGS[field]
					};
					localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
					publish();
					window.dispatchEvent(new Event(CHANGE_EVENT));
				}
			};
		}
		function systemIsDark() {
			if (typeof document === "undefined") return false;
			return document.body.hasAttribute("data-ds-dark-theme") || matchMedia("(prefers-color-scheme: dark)").matches;
		}
		function useOpenLoopVisualTheme(scope) {
			const snapshot = (0, react.useSyncExternalStore)(scope.subscribe, scope.getSnapshot, scope.getSnapshot);
			const [dark, setDark] = (0, react.useState)(systemIsDark);
			(0, react.useEffect)(() => {
				const update = () => setDark(systemIsDark());
				const observer = new MutationObserver(update);
				observer.observe(document.body, {
					attributes: true,
					attributeFilter: ["data-ds-dark-theme"]
				});
				const media = matchMedia("(prefers-color-scheme: dark)");
				media.addEventListener("change", update);
				return () => {
					observer.disconnect();
					media.removeEventListener("change", update);
				};
			}, []);
			const settings = snapshot.value ?? DEFAULT_OPENLOOP_SETTINGS;
			const resolved = resolvePalette(settings, dark);
			return {
				settings,
				snapshot,
				preset: settings.preset,
				appearance: resolved.appearance,
				palette: resolved.values,
				values: resolved.values,
				global: OPENLOOP_GLOBAL_TOKENS,
				style: paletteVariables(settings, dark)
			};
		}
		const page = {
			display: "grid",
			gap: 24,
			padding: "4px 2px 28px",
			color: "var(--dsw-alias-label-primary)"
		};
		const heading = {
			margin: 0,
			fontSize: 24,
			lineHeight: 1.25,
			letterSpacing: "-0.025em"
		};
		const copy = {
			margin: "6px 0 0",
			color: "var(--dsw-alias-label-caption)",
			fontSize: 14,
			lineHeight: 1.55
		};
		const grid = {
			display: "grid",
			gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
			gap: 12
		};
		const segment = {
			display: "inline-flex",
			gap: 4,
			padding: 4,
			borderRadius: 12,
			background: "var(--dsw-alias-bg-layer-2)",
			border: "1px solid var(--dsw-alias-border-l2)"
		};
		const appearanceOptions = [
			{
				id: "system",
				zh: "跟随 DSH",
				en: "Follow DSH"
			},
			{
				id: "light",
				zh: "浅色",
				en: "Light"
			},
			{
				id: "dark",
				zh: "深色",
				en: "Dark"
			}
		];
		function OpenLoopVisualSettingsPage({ scope }) {
			const { settings, snapshot } = useOpenLoopVisualTheme(scope);
			const zh = typeof navigator !== "undefined" && navigator.language.toLowerCase().startsWith("zh");
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: page,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("header", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", {
						style: heading,
						children: zh ? "OpenLoop 视觉" : "OpenLoop Visuals"
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						style: copy,
						children: zh ? "仅控制 Declarative、Show Widget 与 HTML Artifact，不修改 DSH 全局主题。" : "Controls Declarative, Show Widget, and HTML Artifact only. The DSH theme remains untouched."
					})] }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", { children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
							style: {
								margin: "0 0 4px",
								fontSize: 16
							},
							children: zh ? "明暗模式" : "Appearance"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							style: {
								...copy,
								marginBottom: 12
							},
							children: zh ? "跟随 DSH 会随当前界面自动切换；也可以固定为浅色或深色。" : "Follow DSH switches automatically, or choose a fixed appearance."
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							style: segment,
							role: "radiogroup",
							"aria-label": zh ? "明暗模式" : "Appearance",
							children: appearanceOptions.map((option) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								role: "radio",
								"aria-checked": settings.appearance === option.id,
								onClick: () => void scope.set("appearance", option.id),
								style: {
									border: 0,
									borderRadius: 9,
									padding: "8px 13px",
									cursor: "pointer",
									color: settings.appearance === option.id ? "var(--dsw-alias-label-primary)" : "var(--dsw-alias-label-caption)",
									background: settings.appearance === option.id ? "var(--dsw-alias-bg-layer-1)" : "transparent",
									boxShadow: settings.appearance === option.id ? "0 1px 3px rgb(0 0 0 / 12%)" : "none",
									font: "inherit"
								},
								children: zh ? option.zh : option.en
							}, option.id))
						})
					] }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", { children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
							style: {
								margin: "0 0 4px",
								fontSize: 16
							},
							children: zh ? "风格预设" : "Style preset"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							style: {
								...copy,
								marginBottom: 12
							},
							children: zh ? "八套色板来自 OpenLoop OCIX Style v2，选择会立即同步到三套组件。" : "Eight palettes from OpenLoop OCIX Style v2. Changes apply to all three surfaces immediately."
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							style: grid,
							role: "radiogroup",
							"aria-label": zh ? "风格预设" : "Style preset",
							children: PRESET_META.map((meta) => {
								const selected = settings.preset === meta.id;
								const p = resolvePalette({
									preset: meta.id,
									appearance: settings.appearance
								}, document.body.hasAttribute("data-ds-dark-theme") || matchMedia("(prefers-color-scheme: dark)").matches).values;
								return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
									type: "button",
									role: "radio",
									"aria-checked": selected,
									onClick: () => void scope.set("preset", meta.id),
									style: {
										textAlign: "left",
										cursor: "pointer",
										padding: 12,
										borderRadius: 14,
										border: `1px solid ${selected ? p.primary : p.border}`,
										outline: selected ? `1px solid ${p.primary}` : "none",
										background: p.surface,
										color: p.foreground,
										font: "inherit"
									},
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
											style: {
												display: "flex",
												height: 42,
												alignItems: "center",
												gap: 8,
												padding: 7,
												overflow: "hidden",
												borderRadius: 9,
												border: `1px solid ${p.border}`,
												background: p["surface-muted"]
											},
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												"aria-hidden": true,
												style: {
													width: 28,
													alignSelf: "stretch",
													borderRadius: 7,
													background: p.primary
												}
											}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
												style: {
													flex: 1,
													display: "grid",
													gap: 6
												},
												children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { style: {
													height: 6,
													width: "74%",
													borderRadius: 99,
													background: p.foreground,
													opacity: .7
												} }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { style: {
													height: 6,
													width: "48%",
													borderRadius: 99,
													background: p["muted-foreground"],
													opacity: .65
												} })]
											})]
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
											style: {
												display: "flex",
												justifyContent: "space-between",
												gap: 8,
												marginTop: 9,
												fontSize: 13,
												fontWeight: 650
											},
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: meta.name }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												"aria-hidden": true,
												style: { color: p.primary },
												children: selected ? "✓" : ""
											})]
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
											style: {
												display: "flex",
												alignItems: "center",
												gap: 5,
												marginTop: 6
											},
											children: [[
												1,
												2,
												3,
												4
											].map((i) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												"aria-hidden": true,
												style: {
													width: 8,
													height: 8,
													borderRadius: 99,
													background: p[`chart-${i}`]
												}
											}, i)), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												style: {
													marginLeft: 3,
													color: p["muted-foreground"],
													fontSize: 11
												},
												children: zh ? meta.character : meta.character.split("、").join(" · ")
											})]
										})
									]
								}, meta.id);
							})
						}),
						snapshot.status !== "ready" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							style: copy,
							children: snapshot.status === "loading" ? zh ? "正在读取设置…" : "Loading settings…" : zh ? "当前连接不支持持久化设置。" : "Persistent settings are unavailable for this connection."
						})
					] })
				]
			});
		}
		//#endregion
		//#region src/client/index.tsx
		const name = "openloop-dsh-base";
		const inject = ["slots"];
		function apply(ctx) {
			const scope = createOpenLoopSettingsScope();
			const VisualSettings = () => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(OpenLoopVisualSettingsPage, { scope });
			ctx.slots.inject("settings.section", () => ctx.slots.register({
				name: "settings.section",
				id: "openloop-visuals",
				order: 12,
				label: () => "OpenLoop Visuals"
			}, VisualSettings));
		}
		//#endregion
		exports.DEFAULT_OPENLOOP_SETTINGS = DEFAULT_OPENLOOP_SETTINGS;
		exports.OPENLOOP_GLOBAL_TOKENS = OPENLOOP_GLOBAL_TOKENS;
		exports.OPENLOOP_PRESETS = OPENLOOP_PRESETS;
		exports.OPENLOOP_PRESET_IDS = OPENLOOP_PRESET_IDS;
		exports.OpenLoopVisualSettingsPage = OpenLoopVisualSettingsPage;
		exports.PRESET_META = PRESET_META;
		exports.apply = apply;
		exports.createOpenLoopSettingsScope = createOpenLoopSettingsScope;
		exports.inject = inject;
		exports.name = name;
		exports.paletteVariables = paletteVariables;
		exports.resolvePalette = resolvePalette;
		exports.useOpenLoopVisualTheme = useOpenLoopVisualTheme;
		return module.exports;
	}
});
