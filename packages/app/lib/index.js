import { n as createPbEventReader, o as __commonJSMin, r as createPbEventWriter, s as __require, t as createEventRecorder } from "./event-log-BXAbL1aZ.js";
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { createServer } from "node:net";
import { Context, Service } from "@deepseek-ai/cordis";
import { readFile, readdir, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
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
//#region src/pb-client.ts
var PbRequestError = class extends Error {
	status;
	constructor(status, message) {
		super(message);
		this.name = "PbRequestError";
		this.status = status;
	}
};
function createPbClient(baseUrl, credentials) {
	let token = null;
	const auth = async () => {
		const res = await fetch(`${baseUrl}/api/collections/_superusers/auth-with-password`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				identity: credentials.email,
				password: credentials.password
			})
		});
		const payload = await res.json().catch(() => ({}));
		if (!res.ok || typeof payload.token !== "string") throw new PbRequestError(res.status, `pocketbase superuser auth failed (${res.status}): ${String(payload.message ?? "no token in response")}`);
		token = payload.token;
		return token;
	};
	const rawRequest = async (method, path, body, useToken) => {
		const headers = {};
		if (useToken !== null) headers.Authorization = useToken;
		if (body !== void 0) headers["Content-Type"] = "application/json";
		const init = {
			method,
			headers
		};
		if (body !== void 0) init.body = JSON.stringify(body);
		return fetch(`${baseUrl}${path}`, init);
	};
	const describeFailure = async (res, method, path) => {
		const payload = await res.json().catch(() => ({}));
		const detail = payload.message !== void 0 ? `: ${String(payload.message)}` : "";
		const fieldErrors = payload.data !== void 0 && typeof payload.data === "object" && payload.data !== null ? ` (${JSON.stringify(payload.data).slice(0, 200)})` : "";
		return `pocketbase ${method} ${path} failed (${res.status})${detail}${fieldErrors}`;
	};
	return { async request(method, path, body) {
		if (token === null) await auth();
		let res = await rawRequest(method, path, body, token);
		if (res.status === 401) {
			token = await auth();
			res = await rawRequest(method, path, body, token);
		}
		if (!res.ok) throw new PbRequestError(res.status, await describeFailure(res, method, path));
		if (res.status === 204) return void 0;
		const text = await res.text();
		return text.length === 0 ? void 0 : JSON.parse(text);
	} };
}
//#endregion
//#region src/pb-process.ts
/**
* PocketBase 进程管理（MVP 验证车，APP_PLATFORM_DESIGN §4.1/§4.2）：
* - 二进制定位链：OPENLOOP_PB_BIN 环境变量 → `<DSH_HOME>/cache/pocketbase/<version>/pocketbase`
*   （不存在则从 GitHub releases 下载 pin 版本，系统 unzip 解压）
* - 数据落 `<DSH_HOME>/data/openloop-app/pb_data/`（DSH_HOME 级，跨 profile 共享——
*   与 mcp.json 同级语义：boards/tiles 是用户数据，不该绑定单个 profile）
* - superuser 凭据一次性生成存 `<DSH_HOME>/data/openloop-app/.superuser.json`（0600），
*   只在插件进程内使用；Agent / 前端永远拿不到（门面隔离 + 凭据不回显）
* - 启动顺序：superuser upsert（建库）→ 空闲端口探测 → serve → /api/health 轮询就绪
* - stop()：SIGTERM → 3s 宽限 → SIGKILL（cordis dispose 钩子调用）
*/
/** pin 版本（验证车：升级需重验 superuser CLI / collections API 形态） */
const PB_VERSION = "v0.39.10";
const PB_VERSION_NUM = PB_VERSION.replace(/^v/, "");
const SUPERUSER_EMAIL = "openloop@local.app";
const noopLogger = {
	info: () => {},
	warn: () => {},
	error: () => {}
};
function resolveDshHome(override) {
	return override ?? process.env.DSH_HOME ?? join(homedir(), ".dsh");
}
/** 平台 → GitHub asset 名（不支持的平台返回 undefined，错误消息指引手动路径） */
function pbAssetName() {
	const platform = process.platform;
	const arch = process.arch;
	if (platform === "darwin" && arch === "arm64") return `pocketbase_${PB_VERSION_NUM}_darwin_arm64.zip`;
	if (platform === "darwin" && arch === "x64") return `pocketbase_${PB_VERSION_NUM}_darwin_amd64.zip`;
	if (platform === "linux" && arch === "arm64") return `pocketbase_${PB_VERSION_NUM}_linux_arm64.zip`;
	if (platform === "linux" && arch === "x64") return `pocketbase_${PB_VERSION_NUM}_linux_amd64.zip`;
}
function pbDownloadUrl(asset) {
	return `https://github.com/pocketbase/pocketbase/releases/download/${PB_VERSION}/${asset}`;
}
/** 运行子命令直到退出；非零退出码抛错（stderr 并入错误消息——面向用户可诊断） */
function runBin(bin, args, timeoutMs = 3e4) {
	return new Promise((resolve, reject) => {
		const child = spawn(bin, args, { stdio: [
			"ignore",
			"pipe",
			"pipe"
		] });
		let stdout = "";
		let stderr = "";
		const timer = setTimeout(() => {
			child.kill("SIGKILL");
			reject(/* @__PURE__ */ new Error(`pocketbase ${args[0]} timed out after ${timeoutMs}ms`));
		}, timeoutMs);
		child.stdout.on("data", (d) => {
			stdout += String(d);
		});
		child.stderr.on("data", (d) => {
			stderr += String(d);
		});
		child.on("error", (err) => {
			clearTimeout(timer);
			reject(err);
		});
		child.on("close", (code) => {
			clearTimeout(timer);
			resolve({
				code: code ?? -1,
				stdout,
				stderr
			});
		});
	});
}
/** 二进制定位：覆盖路径 → 缓存命中 → 下载解压（系统 unzip） */
async function ensureBinary(dshHome, override, logger) {
	if (override !== void 0 && override.length > 0) {
		if (!existsSync(override)) throw new Error(`OPENLOOP_PB_BIN points to a missing file: ${override}`);
		return override;
	}
	const cacheDir = join(dshHome, "cache", "pocketbase", PB_VERSION);
	const bin = join(cacheDir, "pocketbase");
	if (existsSync(bin)) return bin;
	const asset = pbAssetName();
	if (asset === void 0) throw new Error(`no prebuilt PocketBase asset for ${process.platform}/${process.arch}. Download ${PB_VERSION} manually, place the binary anywhere and set OPENLOOP_PB_BIN=<path>.`);
	mkdirSync(cacheDir, { recursive: true });
	const zipPath = join(cacheDir, asset);
	logger.info(`downloading PocketBase ${PB_VERSION} (${asset})…`);
	const response = await fetch(pbDownloadUrl(asset));
	if (!response.ok || response.body === null) throw new Error(`failed to download PocketBase (${response.status}). Check network access to github.com, or set OPENLOOP_PB_BIN to a local binary.`);
	const bytes = new Uint8Array(await response.arrayBuffer());
	writeFileSync(zipPath, bytes);
	const unzip = await runBin("unzip", [
		"-o",
		zipPath,
		"-d",
		cacheDir
	]);
	if (unzip.code !== 0 || !existsSync(bin)) throw new Error(`failed to unzip ${zipPath} (unzip exit ${unzip.code}: ${unzip.stderr.trim().slice(0, 200)}). Unzip it manually and ensure ${bin} exists.`);
	chmodSync(bin, 493);
	logger.info(`PocketBase binary ready at ${bin}`);
	return bin;
}
/** superuser 凭据：读已有或生成随机密码（不回显给任何消费方） */
function ensureCredentials(dataRoot) {
	const credPath = join(dataRoot, ".superuser.json");
	if (existsSync(credPath)) try {
		const parsed = JSON.parse(readFileSync(credPath, "utf8"));
		if (typeof parsed.email === "string" && typeof parsed.password === "string" && parsed.password.length >= 16) return parsed;
	} catch {}
	const credentials = {
		email: SUPERUSER_EMAIL,
		password: randomBytes(24).toString("hex")
	};
	writeFileSync(credPath, JSON.stringify(credentials), { mode: 384 });
	return credentials;
}
/** 探测一个空闲 TCP 端口（listen 0 取随机 → 立即释放；存在与 serve 之间的竞态窗口，失败由调用方重试语义兜底） */
async function findFreePort() {
	return new Promise((resolve, reject) => {
		const server = createServer();
		server.on("error", reject);
		server.listen(0, "127.0.0.1", () => {
			const address = server.address();
			const port = typeof address === "object" && address !== null ? address.port : 0;
			server.close(() => {
				port > 0 ? resolve(port) : reject(/* @__PURE__ */ new Error("failed to allocate a free port"));
			});
		});
	});
}
async function waitHealthy(baseUrl, timeoutMs, logger) {
	const deadline = Date.now() + timeoutMs;
	while (Date.now() < deadline) {
		try {
			if ((await fetch(`${baseUrl}/api/health`)).ok) return;
		} catch {}
		await new Promise((r) => setTimeout(r, 250));
	}
	throw new Error(`PocketBase did not become healthy within ${timeoutMs}ms (${baseUrl}/api/health)`);
}
/**
* 启动 PocketBase：superuser upsert（建库）→ 空闲端口 → serve → 健康就绪。
* 数据目录由调用方管理（dshHome 默认解析也在此导出供门面/路由复用）。
*/
async function startPocketBase(options = {}) {
	const logger = options.logger ?? noopLogger;
	const dshHome = resolveDshHome(options.dshHome);
	const dataRoot = join(dshHome, "data", "openloop-app");
	const dataDir = join(dataRoot, "pb_data");
	mkdirSync(dataDir, { recursive: true });
	const bin = await ensureBinary(dshHome, options.binPath, logger);
	const credentials = ensureCredentials(dataRoot);
	const upsert = await runBin(bin, [
		"superuser",
		"upsert",
		credentials.email,
		credentials.password,
		"--dir",
		dataDir
	]);
	if (upsert.code !== 0) throw new Error(`pocketbase superuser upsert failed (exit ${upsert.code}): ${(upsert.stderr || upsert.stdout).trim().slice(0, 300)}`);
	const port = await findFreePort();
	const baseUrl = `http://127.0.0.1:${port}`;
	const child = spawn(bin, [
		"serve",
		"--http",
		`127.0.0.1:${port}`,
		"--dir",
		dataDir
	], { stdio: [
		"ignore",
		"ignore",
		"pipe"
	] });
	let stderrTail = "";
	child.stderr?.on("data", (d) => {
		const text = String(d);
		stderrTail = (stderrTail + text).slice(-2e3);
		logger.warn(`pocketbase: ${text.trim()}`);
	});
	let exited = false;
	let onExit = options.onExit;
	child.on("exit", (code) => {
		logger.info(`pocketbase exited (code ${code ?? "null"})`);
		if (!exited) {
			exited = true;
			onExit?.(code ?? null);
		}
	});
	const stop = async () => {
		onExit = void 0;
		if (child.exitCode !== null || child.signalCode !== null) return;
		await new Promise((resolve) => {
			const killTimer = setTimeout(() => {
				child.kill("SIGKILL");
			}, 3e3);
			child.on("exit", () => {
				clearTimeout(killTimer);
				resolve();
			});
			child.kill("SIGTERM");
			setTimeout(() => {
				resolve();
			}, 3500);
		});
	};
	try {
		await waitHealthy(baseUrl, 3e4, logger);
	} catch (error) {
		await stop();
		throw new Error(`${error instanceof Error ? error.message : String(error)}; pocketbase stderr tail: ${stderrTail.slice(-400)}`);
	}
	logger.info(`pocketbase serving at ${baseUrl} (data: ${dataDir})`);
	return {
		baseUrl,
		port,
		dataDir,
		credentials,
		stop
	};
}
//#endregion
//#region src/schema.ts
/** 全部 API rules 置 null（锁死为 superuser-only） */
function collectionBody(def) {
	return {
		name: def.name,
		type: "base",
		fields: def.fields.map((f) => ({
			name: f.name,
			type: f.type
		})),
		indexes: def.indexes,
		listRule: null,
		viewRule: null,
		createRule: null,
		updateRule: null,
		deleteRule: null
	};
}
const COLLECTIONS = [
	{
		name: "apps",
		fields: [
			{
				name: "name",
				type: "text"
			},
			{
				name: "displayName",
				type: "text"
			},
			{
				name: "kind",
				type: "text"
			},
			{
				name: "version",
				type: "text"
			},
			{
				name: "description",
				type: "text"
			},
			{
				name: "skill",
				type: "text"
			}
		],
		indexes: ["CREATE UNIQUE INDEX idx_apps_name ON apps (name)"]
	},
	{
		name: "components",
		fields: [
			{
				name: "rid",
				type: "text"
			},
			{
				name: "appName",
				type: "text"
			},
			{
				name: "kind",
				type: "text"
			},
			{
				name: "title",
				type: "text"
			},
			{
				name: "entry",
				type: "json"
			},
			{
				name: "description",
				type: "text"
			}
		],
		indexes: ["CREATE UNIQUE INDEX idx_components_rid ON components (rid)"]
	},
	{
		name: "apis",
		fields: [
			{
				name: "rid",
				type: "text"
			},
			{
				name: "appName",
				type: "text"
			},
			{
				name: "domain",
				type: "text"
			},
			{
				name: "path",
				type: "text"
			},
			{
				name: "authType",
				type: "text"
			},
			{
				name: "keySecret",
				type: "text"
			},
			{
				name: "summary",
				type: "text"
			}
		],
		indexes: ["CREATE UNIQUE INDEX idx_apis_rid ON apis (rid)"]
	},
	{
		name: "boards",
		fields: [
			{
				name: "bid",
				type: "text"
			},
			{
				name: "title",
				type: "text"
			},
			{
				name: "position",
				type: "number"
			}
		],
		indexes: ["CREATE UNIQUE INDEX idx_boards_bid ON boards (bid)"]
	},
	{
		name: "tiles",
		fields: [
			{
				name: "boardBid",
				type: "text"
			},
			{
				name: "tileId",
				type: "text"
			},
			{
				name: "sourceId",
				type: "text"
			},
			{
				name: "title",
				type: "text"
			},
			{
				name: "alias",
				type: "text"
			},
			{
				name: "position",
				type: "number"
			},
			{
				name: "layout",
				type: "json"
			},
			{
				name: "snapshot",
				type: "json"
			}
		],
		indexes: ["CREATE UNIQUE INDEX idx_tiles_board_tile ON tiles (boardBid, tileId)"]
	},
	{
		name: "meta",
		fields: [{
			name: "key",
			type: "text"
		}, {
			name: "value",
			type: "json"
		}],
		indexes: ["CREATE UNIQUE INDEX idx_meta_key ON meta (key)"]
	},
	{
		name: "app_events",
		fields: [
			{
				name: "at",
				type: "number"
			},
			{
				name: "kind",
				type: "text"
			},
			{
				name: "level",
				type: "text"
			},
			{
				name: "text",
				type: "text"
			}
		],
		indexes: ["CREATE INDEX idx_app_events_at ON app_events (at DESC)"]
	},
	{
		name: "api_usage",
		fields: [
			{
				name: "source",
				type: "text"
			},
			{
				name: "kind",
				type: "text"
			},
			{
				name: "at",
				type: "number"
			},
			{
				name: "ms",
				type: "number"
			},
			{
				name: "ok",
				type: "bool"
			}
		],
		indexes: ["CREATE INDEX idx_api_usage_at ON api_usage (at DESC)", "CREATE INDEX idx_api_usage_source ON api_usage (source)"]
	}
];
/**
* 幂等初始化：逐个 GET /api/collections/<name>，404 则创建，200 跳过。
* 返回已就绪的 collection 名单（供诊断/日志）。
*/
async function initCollections(pb) {
	const ready = [];
	for (const def of COLLECTIONS) try {
		await pb.request("GET", `/api/collections/${def.name}`);
		ready.push(def.name);
	} catch (error) {
		if ((error instanceof Error && "status" in error ? error.status : void 0) !== 404) throw error;
		await pb.request("POST", "/api/collections", collectionBody(def));
		ready.push(def.name);
	}
	return ready;
}
//#endregion
//#region src/facade.ts
const KEBAB_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const RID_RE = /^[a-z0-9-]+:[a-z0-9-]+$/;
const APP_KINDS = [
	"builtin",
	"local",
	"thirdparty"
];
const COMPONENT_KINDS = [
	"panel",
	"artifact",
	"mcp-app"
];
const AUTH_TYPES = ["none", "key"];
function bad(field, expected, actual) {
	throw new Error(`invalid ${field}: expected ${expected}, got ${JSON.stringify(actual).slice(0, 120)}`);
}
function requireString(value, field, maxLength) {
	if (typeof value !== "string" || value.length === 0) bad(field, `a non-empty string (≤${maxLength} chars)`, value);
	if (value.length > maxLength) bad(field, `a string ≤${maxLength} chars (got ${value.length})`, `${value.slice(0, 40)}…`);
	return value;
}
function requireKebab(value, field) {
	const s = requireString(value, field, 80);
	if (!KEBAB_RE.test(s)) bad(field, "a kebab-case name like \"acme-crm\" (lowercase letters/digits/hyphens)", s);
	return s;
}
function requireRid(value, field) {
	const s = requireString(value, field, 160);
	if (!RID_RE.test(s)) bad(field, "a `包名:组件名` resource id like \"acme-crm:dashboard\" (kebab-case on both sides)", s);
	return s;
}
function requireEnum(value, field, allowed) {
	if (typeof value !== "string" || !allowed.includes(value)) bad(field, `one of ${allowed.map((a) => `"${a}"`).join(" | ")}`, value);
	return value;
}
async function listRecords(pb, collection, filter) {
	const params = new URLSearchParams({
		filter,
		perPage: "200",
		page: "1"
	});
	return (await pb.request("GET", `/api/collections/${collection}/records?${params.toString()}`)).items;
}
async function findOne(pb, collection, filter) {
	return (await listRecords(pb, collection, filter))[0];
}
async function deleteByFilter(pb, collection, filter) {
	const items = await listRecords(pb, collection, filter);
	for (const item of items) await pb.request("DELETE", `/api/collections/${collection}/records/${item.id}`);
	return items.length;
}
/** upsert 语义：按 filter 找到则 PATCH，否则 POST；返回 { record, created } */
async function upsertRecord(pb, collection, filter, body) {
	const existing = await findOne(pb, collection, filter);
	if (existing !== void 0) return {
		record: await pb.request("PATCH", `/api/collections/${collection}/records/${existing.id}`, body),
		created: false
	};
	return {
		record: await pb.request("POST", `/api/collections/${collection}/records`, body),
		created: true
	};
}
function toAppRow(record) {
	return {
		name: String(record.name ?? ""),
		displayName: String(record.displayName ?? ""),
		kind: APP_KINDS.includes(String(record.kind)) ? record.kind : "local",
		version: String(record.version ?? ""),
		description: String(record.description ?? ""),
		skill: String(record.skill ?? "")
	};
}
function toComponentRow(record) {
	return {
		rid: String(record.rid ?? ""),
		appName: String(record.appName ?? ""),
		kind: COMPONENT_KINDS.includes(String(record.kind)) ? record.kind : "panel",
		title: String(record.title ?? ""),
		entry: record.entry,
		description: String(record.description ?? "")
	};
}
function toApiRow(record) {
	return {
		rid: String(record.rid ?? ""),
		appName: String(record.appName ?? ""),
		domain: String(record.domain ?? ""),
		path: String(record.path ?? ""),
		authType: AUTH_TYPES.includes(String(record.authType)) ? record.authType : "none",
		summary: String(record.summary ?? "")
	};
}
/** tile 溯源 ID：panel → `openloop:<panel.id>`；artifact → path 文件名（dock sourceIdOf 同款语义） */
function sourceIdOfTile(source) {
	if (source.kind === "panel") {
		const panelId = source.meta?.panel?.id;
		return typeof panelId === "string" && panelId.length > 0 ? `openloop:${panelId}` : "";
	}
	if (source.kind === "mcp-app") {
		const meta = source.meta;
		if (typeof meta?.rid === "string" && meta.rid.length > 0) return meta.rid;
		if (typeof meta?.serverId === "string" && typeof meta?.toolName === "string" && meta.serverId.length > 0 && meta.toolName.length > 0) return `${meta.serverId}:${meta.toolName.toLowerCase().replace(/[^a-z0-9-]+/g, "-")}`;
		return "";
	}
	const path = source.meta?.path;
	if (typeof path !== "string" || path.length === 0) return "";
	return `openloop:${path.split("/").pop() ?? path}`;
}
/** dock v2 state 校验（容错：非法 tile 剔除——与 dock store sanitize 同哲学，坏数据不进门面） */
function coerceDockState(state) {
	if (typeof state !== "object" || state === null) bad("dockState", "a dock v2 state object { version: 2, boards: [...], activeBoardId }", state);
	const raw = state;
	if (raw.version !== 2) bad("dockState.version", "2 (dock v1 states must be migrated by the dock client first)", raw.version);
	if (!Array.isArray(raw.boards) || raw.boards.length === 0) bad("dockState.boards", "a non-empty array of { id, name, tiles }", raw.boards);
	const boards = raw.boards.map((b) => {
		const board = b;
		const id = requireString(board.id, "board.id", 80);
		const name = requireString(board.name, "board.name", 80);
		const tiles = Array.isArray(board.tiles) ? board.tiles : [];
		const validTiles = [];
		for (const t of tiles) {
			const tile = t;
			const source = tile.source;
			if (typeof tile.tileId !== "string" || typeof tile.title !== "string" || source === null || typeof source !== "object" || source.kind !== "panel" && source.kind !== "artifact" && source.kind !== "mcp-app") continue;
			const valid = {
				tileId: tile.tileId,
				title: tile.title,
				source: {
					kind: source.kind,
					meta: source.meta
				},
				layout: typeof tile.layout === "object" && tile.layout !== null ? tile.layout : {
					column: 0,
					row: 0,
					columns: 6,
					rows: 4
				},
				origin: tile.origin ?? null,
				createdAt: typeof tile.createdAt === "number" ? tile.createdAt : Date.now()
			};
			if (typeof tile.alias === "string" && tile.alias.length > 0) valid.alias = tile.alias;
			validTiles.push(valid);
		}
		return {
			id,
			name,
			tiles: validTiles
		};
	});
	const activeBoardId = requireString(raw.activeBoardId, "dockState.activeBoardId", 80);
	if (!boards.some((b) => b.id === activeBoardId)) bad("dockState.activeBoardId", `the id of one of the boards (${boards.map((b) => b.id).join(", ")})`, activeBoardId);
	return {
		version: 2,
		boards,
		activeBoardId
	};
}
function createAppFacade(pb) {
	const requireApp = async (name) => {
		if (await findOne(pb, "apps", `name = "${name}"`) === void 0) throw new Error(`app "${name}" is not registered. Register it first (action: upsert_app), or pick from: ${(await listApps()).map((a) => a.name).join(", ") || "(none)"}`);
	};
	const listApps = async () => {
		return (await listRecords(pb, "apps", "id != \"\"")).map(toAppRow).sort((a, b) => a.name.localeCompare(b.name));
	};
	return {
		async listApps() {
			return listApps();
		},
		async upsertApp(input) {
			if (typeof input !== "object" || input === null) bad("app", "an app manifest object { name, displayName, kind, version, description?, skill? }", input);
			const raw = input;
			const name = requireKebab(raw.name, "app.name");
			const body = {
				name,
				displayName: requireString(raw.displayName ?? name, "app.displayName", 80),
				kind: requireEnum(raw.kind ?? "local", "app.kind", APP_KINDS),
				version: requireString(raw.version ?? "0.1.0", "app.version", 40),
				description: typeof raw.description === "string" ? raw.description.slice(0, 360) : "",
				skill: typeof raw.skill === "string" ? raw.skill.slice(0, 8e3) : ""
			};
			const { record, created } = await upsertRecord(pb, "apps", `name = "${name}"`, body);
			return {
				...toAppRow(record),
				created
			};
		},
		async deleteApp(name) {
			const app = await findOne(pb, "apps", `name = "${name}"`);
			if (app === void 0) throw new Error(`app "${name}" is not registered (nothing to delete). Registered apps: ${(await listApps()).map((a) => a.name).join(", ") || "(none)"}`);
			const removedComponents = await deleteByFilter(pb, "components", `appName = "${name}"`);
			const removedApis = await deleteByFilter(pb, "apis", `appName = "${name}"`);
			await pb.request("DELETE", `/api/collections/apps/records/${app.id}`);
			return {
				removedComponents,
				removedApis
			};
		},
		async getAppDetail(name) {
			const app = await findOne(pb, "apps", `name = "${name}"`);
			if (app === void 0) return void 0;
			const components = (await listRecords(pb, "components", `appName = "${name}"`)).map(toComponentRow).sort((a, b) => a.rid.localeCompare(b.rid));
			const apis = (await listRecords(pb, "apis", `appName = "${name}"`)).map((record) => {
				const row = toApiRow(record);
				const secret = record.keySecret;
				return {
					...row,
					configured: typeof secret === "string" && secret.length > 0
				};
			}).sort((a, b) => a.rid.localeCompare(b.rid));
			return {
				app: toAppRow(app),
				components,
				apis
			};
		},
		async registerComponent(appName, input) {
			await requireApp(appName);
			if (typeof input !== "object" || input === null) bad("component", "a component object { rid, kind, title, entry?, description? }", input);
			const raw = input;
			const rid = requireRid(raw.rid, "component.rid");
			if (!rid.startsWith(`${appName}:`)) bad("component.rid", `to start with the owning app's namespace "${appName}:" (got "${rid}") — naming is addressing, an app cannot register resources under another app's namespace`, rid);
			const body = {
				rid,
				appName,
				kind: requireEnum(raw.kind ?? "panel", "component.kind", COMPONENT_KINDS),
				title: requireString(raw.title, "component.title", 120),
				entry: raw.entry ?? null,
				description: typeof raw.description === "string" ? raw.description.slice(0, 360) : ""
			};
			const { record, created } = await upsertRecord(pb, "components", `rid = "${rid}"`, body);
			return {
				...toComponentRow(record),
				created
			};
		},
		async removeComponent(rid) {
			const found = await findOne(pb, "components", `rid = "${rid}"`);
			if (found === void 0) throw new Error(`component "${rid}" is not registered (nothing to remove)`);
			await pb.request("DELETE", `/api/collections/components/records/${found.id}`);
		},
		async registerApi(appName, input) {
			await requireApp(appName);
			if (typeof input !== "object" || input === null) bad("api", "an api object { rid, domain, path, authType, summary? }", input);
			const raw = input;
			const rid = requireRid(raw.rid, "api.rid");
			if (!rid.startsWith(`${appName}:`)) bad("api.rid", `to start with the owning app's namespace "${appName}:" (got "${rid}")`, rid);
			const body = {
				rid,
				appName,
				domain: requireString(raw.domain, "api.domain", 200),
				path: requireString(raw.path, "api.path", 300),
				authType: requireEnum(raw.authType ?? "none", "api.authType", AUTH_TYPES),
				summary: typeof raw.summary === "string" ? raw.summary.slice(0, 360) : ""
			};
			const { record, created } = await upsertRecord(pb, "apis", `rid = "${rid}"`, body);
			return {
				...toApiRow(record),
				created
			};
		},
		async removeApi(rid) {
			const found = await findOne(pb, "apis", `rid = "${rid}"`);
			if (found === void 0) throw new Error(`api "${rid}" is not registered (nothing to remove)`);
			await pb.request("DELETE", `/api/collections/apis/records/${found.id}`);
		},
		async setApiKey(rid, key) {
			if (typeof key !== "string" || key.length === 0) bad("apiKey", "a non-empty API key string", key);
			const found = await findOne(pb, "apis", `rid = "${rid}"`);
			if (found === void 0) throw new Error(`api "${rid}" is not registered. Register it first (action: register_api)`);
			await pb.request("PATCH", `/api/collections/apis/records/${found.id}`, { keySecret: key });
		},
		async saveDockState(state) {
			const dock = coerceDockState(state);
			await deleteByFilter(pb, "tiles", "id != \"\"");
			await deleteByFilter(pb, "boards", "id != \"\"");
			let tileCount = 0;
			for (const [boardIndex, board] of dock.boards.entries()) {
				await pb.request("POST", "/api/collections/boards/records", {
					bid: board.id,
					title: board.name,
					position: boardIndex
				});
				for (const [tileIndex, tile] of board.tiles.entries()) {
					await pb.request("POST", "/api/collections/tiles/records", {
						boardBid: board.id,
						tileId: tile.tileId,
						sourceId: sourceIdOfTile(tile.source),
						title: tile.title,
						alias: tile.alias ?? "",
						position: tileIndex,
						layout: tile.layout,
						snapshot: {
							source: tile.source,
							origin: tile.origin,
							createdAt: tile.createdAt
						}
					});
					tileCount++;
				}
			}
			await upsertRecord(pb, "meta", `key = "dock.activeBoardId"`, {
				key: "dock.activeBoardId",
				value: dock.activeBoardId
			});
			return {
				boards: dock.boards.length,
				tiles: tileCount
			};
		},
		async loadDockState() {
			const boardRecords = await listRecords(pb, "boards", "id != \"\"");
			if (boardRecords.length === 0) return null;
			const boards = [];
			const orderedBoards = [...boardRecords].sort((a, b) => Number(a.position ?? 0) - Number(b.position ?? 0));
			for (const boardRecord of orderedBoards) {
				const bid = String(boardRecord.bid ?? "");
				if (bid.length === 0) continue;
				const tiles = [...await listRecords(pb, "tiles", `boardBid = "${bid}"`)].sort((a, b) => Number(a.position ?? 0) - Number(b.position ?? 0)).map((record) => {
					const snapshot = record.snapshot;
					const source = snapshot?.source;
					if (source === null || typeof source !== "object" || source.kind !== "panel" && source.kind !== "artifact") return void 0;
					const tile = {
						tileId: String(record.tileId ?? ""),
						title: String(record.title ?? ""),
						source: {
							kind: source.kind,
							meta: source.meta
						},
						layout: record.layout && typeof record.layout === "object" ? record.layout : {
							column: 0,
							row: 0,
							columns: 6,
							rows: 4
						},
						origin: snapshot?.origin ?? null,
						createdAt: typeof snapshot?.createdAt === "number" ? snapshot.createdAt : Date.now()
					};
					const alias = String(record.alias ?? "");
					if (alias.length > 0) tile.alias = alias;
					return tile;
				}).filter((t) => t !== void 0 && t.tileId.length > 0 && t.title.length > 0);
				boards.push({
					id: bid,
					name: String(boardRecord.title ?? bid),
					tiles
				});
			}
			if (boards.length === 0) return null;
			const activeRecord = await findOne(pb, "meta", `key = "dock.activeBoardId"`);
			return {
				version: 2,
				boards,
				activeBoardId: typeof activeRecord?.value === "string" && boards.some((b) => b.id === activeRecord.value) ? activeRecord.value : boards[0]?.id ?? ""
			};
		}
	};
}
//#endregion
//#region src/watchdog.ts
const WATCHDOG_DEFAULTS = {
	healthIntervalMs: 15e3,
	backoffBaseMs: 2e3,
	maxConsecutiveFailures: 3,
	stableAfterMs: 6e4
};
var PbWatchdog = class {
	opts;
	restart;
	onStateChange;
	log;
	state = {
		restarts: 0,
		lastError: null,
		lastRestartAt: null,
		consecutiveFailures: 0
	};
	stopped = false;
	intentionalStop = false;
	restarting = false;
	healthTimer;
	backoffTimer;
	startedAt = 0;
	constructor(options) {
		this.opts = {
			healthIntervalMs: options.healthIntervalMs ?? WATCHDOG_DEFAULTS.healthIntervalMs,
			backoffBaseMs: options.backoffBaseMs ?? WATCHDOG_DEFAULTS.backoffBaseMs,
			maxConsecutiveFailures: options.maxConsecutiveFailures ?? WATCHDOG_DEFAULTS.maxConsecutiveFailures,
			stableAfterMs: options.stableAfterMs ?? WATCHDOG_DEFAULTS.stableAfterMs
		};
		this.restart = options.restart;
		this.onStateChange = options.onStateChange;
		this.log = options.log ?? (() => {});
	}
	getState() {
		return { ...this.state };
	}
	/** 手动停止（意图性）：停轮询、不触发重启。可在 stop 后 destroy。 */
	stop() {
		this.intentionalStop = true;
		this.stopped = true;
		this.clearTimers();
	}
	/** 恢复守护（重启成功后调用） */
	resume() {
		this.intentionalStop = false;
		this.stopped = false;
		this.startHealthPolling();
	}
	/** 进程退出通知（RunningPb.onExit 接线） */
	onProcessExit(code) {
		if (this.intentionalStop || this.stopped) return;
		this.log("warn", `pocketbase exited unexpectedly (code ${code ?? "null"}) — scheduling restart`);
		this.scheduleRestart(`pocketbase exited (code ${code ?? "null"})`);
	}
	startHealthPolling() {
		this.clearTimers();
		this.healthTimer = setInterval(() => {
			this.checkHealth();
		}, this.opts.healthIntervalMs);
	}
	async checkHealth() {
		if (this.stopped || this.restarting) return;
		if (this.state.consecutiveFailures > 0 && this.startedAt > 0 && Date.now() - this.startedAt > this.opts.stableAfterMs) {
			this.state = {
				...this.state,
				consecutiveFailures: 0
			};
			this.onStateChange(this.getState());
		}
	}
	backoffMs() {
		const n = this.state.consecutiveFailures;
		return Math.min(6e4, this.opts.backoffBaseMs * 2 ** n);
	}
	async scheduleRestart(reason) {
		if (this.restarting || this.stopped) return;
		if (this.state.consecutiveFailures >= this.opts.maxConsecutiveFailures) {
			const giveUp = `${reason}; giving up after ${this.state.consecutiveFailures} consecutive restart failures (agent can diagnose via app_backend backend_health / backend_restart)`;
			this.state = {
				...this.state,
				lastError: giveUp
			};
			this.onStateChange(this.getState());
			this.log("error", giveUp);
			return;
		}
		this.restarting = true;
		const delay = this.backoffMs();
		this.log("warn", `restarting pocketbase in ${delay}ms (attempt ${this.state.consecutiveFailures + 1}/${this.opts.maxConsecutiveFailures})`);
		this.backoffTimer = setTimeout(() => {
			this.doRestart(reason);
		}, delay);
	}
	async doRestart(reason) {
		try {
			await this.restart();
			this.startedAt = Date.now();
			this.state = {
				...this.state,
				restarts: this.state.restarts + 1,
				lastRestartAt: Date.now()
			};
			this.onStateChange(this.getState());
			this.log("info", "pocketbase restarted successfully");
			this.resume();
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			this.state = {
				...this.state,
				consecutiveFailures: this.state.consecutiveFailures + 1,
				lastError: `${reason}; restart failed: ${message}`
			};
			this.onStateChange(this.getState());
			this.log("error", `restart failed (${this.state.consecutiveFailures}/${this.opts.maxConsecutiveFailures}): ${message}`);
			this.restarting = false;
			this.scheduleRestart(reason);
		} finally {
			this.restarting = false;
		}
	}
	clearTimers() {
		if (this.healthTimer !== void 0) {
			clearInterval(this.healthTimer);
			this.healthTimer = void 0;
		}
		if (this.backoffTimer !== void 0) {
			clearTimeout(this.backoffTimer);
			this.backoffTimer = void 0;
		}
	}
};
//#endregion
//#region ../artifact/package.json
var require_package = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	module.exports = {
		"name": "@openloop/dsh-html-artifact",
		"version": "0.5.0",
		"description": "Replayable static or scripted fullscreen HTML artifacts for DeepSeek Harness.",
		"private": true,
		"type": "module",
		"main": "lib/index.js",
		"types": "lib/index.d.ts",
		"exports": {
			".": {
				"types": "./lib/index.d.ts",
				"default": "./lib/index.js"
			},
			"./client": {
				"types": "./src/client/index.tsx",
				"default": "./lib/client.js"
			},
			"./cordis.patch.yml": "./cordis.patch.yml",
			"./package.json": "./package.json"
		},
		"files": [
			"lib",
			"src",
			"assets",
			"cordis.patch.yml",
			"README.md"
		],
		"scripts": {
			"build": "tsdown",
			"typecheck": "tsc -p tsconfig.json && tsc -p tsconfig.client.json",
			"test": "vitest run",
			"check": "pnpm typecheck && pnpm test && pnpm build"
		},
		"dsh": {
			"bundle": { "patch": "./cordis.patch.yml" },
			"client": {
				"inject": [
					"@deepseek-ai/dsh-client-runtime",
					"@deepseek-ai/dsh-client-ui-tool",
					"@deepseek-ai/dsh-client-ui-primitives",
					"@deepseek-ai/dsh-client-ui-settings"
				],
				"platform": "web",
				"external": ["@openloop/dsh-base/client"]
			}
		},
		"peerDependencies": {
			"@deepseek-ai/cordis": "^4.0.1",
			"@deepseek-ai/dsh-fs": "^0.1.1-rc.2",
			"@deepseek-ai/dsh-sandbox-policy": "^0.1.1-rc.2",
			"@deepseek-ai/dsh-skill": "^0.1.1-rc.2",
			"@deepseek-ai/dsh-tools": "^0.1.1-rc.2",
			"@deepseek-ai/schemastery": "^3.18.1",
			"react": "^18.2.0 || ^19.0.0"
		},
		"devDependencies": {
			"@deepseek-ai/cordis": "4.0.1",
			"@deepseek-ai/dsh-client-runtime": "^0.1.1-rc.2",
			"@deepseek-ai/dsh-client-ui-settings": "^0.1.1-rc.2",
			"@deepseek-ai/dsh-client-ui-primitives": "^0.1.1-rc.2",
			"@deepseek-ai/dsh-client-ui-tool": "^0.1.1-rc.2",
			"@deepseek-ai/dsh-fs": "^0.1.1-rc.2",
			"@deepseek-ai/dsh-sandbox-policy": "^0.1.1-rc.2",
			"@deepseek-ai/dsh-skill": "^0.1.1-rc.2",
			"@deepseek-ai/dsh-tools": "^0.1.1-rc.2",
			"@deepseek-ai/schemastery": "3.18.1",
			"@openloop/dsh-base": "workspace:*",
			"@types/node": "^22.0.0",
			"@types/react": "~18.3.1",
			"react": "^18.2.0 || ^19.0.0",
			"react-dom": "^18.2.0",
			"tsdown": "^0.22.2",
			"typescript": "^5.9.3",
			"vitest": "^4.1.1"
		}
	};
}));
//#endregion
//#region src/seed.ts
/** 与 panels allPresetKinds() 对齐（38 个：33 + 自管理四件套 5） */
const BUILTIN_KINDS = [
	"accordion",
	"agent-activity",
	"api-credentials",
	"api-usage-monitor",
	"app-manager",
	"avatar",
	"badge",
	"callout",
	"card",
	"chart",
	"comparison",
	"data-table",
	"db-browser",
	"divider",
	"event-log",
	"flow",
	"funnel",
	"gauge",
	"grid",
	"heading",
	"heatmap",
	"markdown",
	"mcp-status",
	"metric-grid",
	"pb-stats",
	"plugin-registry",
	"progress",
	"row",
	"section",
	"sessions-stats",
	"sparkline",
	"split",
	"stack",
	"storage-usage",
	"system-overview",
	"tag",
	"text",
	"timeline"
];
const BUILTIN_APIS = [
	{
		rid: "openloop:boards",
		domain: "local.app",
		path: "/openloop/app/boards",
		authType: "none",
		summary: "看板集合的 CRUD（dock v2 state 全量存取）"
	},
	{
		rid: "openloop:components",
		domain: "local.app",
		path: "/openloop/app/registry",
		authType: "none",
		summary: "APP 组件资源注册表（工作台数据源）"
	},
	{
		rid: "openloop:apis",
		domain: "local.app",
		path: "/openloop/app/collections/:name/records",
		authType: "none",
		summary: "管理表受控查询（分页 + 关键词筛选）"
	}
];
/** 组件名段 → 中文标题（dock PRESET_INFO 同表；两边人工同步） */
const KIND_TITLES = {
	accordion: "折叠面板",
	"api-credentials": "凭据总览",
	avatar: "头像",
	badge: "徽章",
	callout: "提示条",
	card: "卡片",
	chart: "图表",
	comparison: "对比表",
	"data-table": "数据表格",
	"db-browser": "数据库浏览",
	divider: "分隔线",
	flow: "流程图",
	funnel: "漏斗",
	gauge: "仪表盘",
	grid: "网格",
	heading: "标题",
	heatmap: "热力图",
	markdown: "Markdown",
	"mcp-status": "MCP 状态",
	"metric-grid": "指标网格",
	"pb-stats": "后端状态",
	"plugin-registry": "插件清单",
	progress: "进度条",
	row: "横向行",
	section: "分区",
	"sessions-stats": "会话统计",
	sparkline: "迷你走势",
	split: "分栏",
	stack: "纵向堆叠",
	"storage-usage": "存储占用",
	tag: "标签",
	text: "文本",
	timeline: "时间线",
	"app-manager": "APP 管理",
	"api-usage-monitor": "调用监控",
	"system-overview": "系统总览",
	"event-log": "系统事件流",
	"agent-activity": "Agent 行为"
};
/** 极简合法 PanelDefinition（单 widget 平铺 entry）——保证目录条目「可固定」 */
function minimalEntry(kind) {
	return {
		$schema: "openloop.panel/v1",
		id: kind,
		title: KIND_TITLES[kind] ?? kind,
		widgets: [{
			id: "w1",
			source: {
				type: "preset",
				kind,
				props: {}
			}
		}]
	};
}
/** few-shot 库（0.5.2）：artifact 范例组件——HTML 来自 @openloop/dsh-html-artifact 的 skill 资产 */
const ARTIFACT_EXAMPLES = [
	{
		rid: "openloop:example-system-map",
		title: "系统地图",
		description: "生态系统拓扑大屏（可拖节点；static 档范例）",
		runtime: "static"
	},
	{
		rid: "openloop:example-agent-dashboard",
		title: "Agent 工作台",
		description: "Agent 活动脉冲 · 10s 轮询（scripts 档范例）",
		runtime: "scripts"
	},
	{
		rid: "openloop:example-usage-report",
		title: "调用监控报表",
		description: "24h API 调用图表（network 档 + Chart.js 范例）",
		runtime: "network"
	},
	{
		rid: "openloop:example-backend-console",
		title: "后端控制台",
		description: "同源 fetch + openloop.fetch 桥示范",
		runtime: "network"
	}
];
/**
* 读 artifact 包的范例资产（@openloop/dsh-html-artifact/assets/*.html）。
* 包缺失/文件缺失返回空 map——few-shot 组件静默缺席（不阻塞 seed 主流程）。
*/
function readArtifactExampleAssets() {
	const out = /* @__PURE__ */ new Map();
	try {
		require_package();
		const base = __require.resolve("@openloop/dsh-html-artifact/package.json");
		const dir = base.slice(0, base.lastIndexOf("/"));
		for (const [rid, file] of [
			["example-system-map", "system-map-example.html"],
			["example-agent-dashboard", "agent-dashboard-example.html"],
			["example-usage-report", "usage-report-example.html"],
			["example-backend-console", "backend-console-example.html"]
		]) try {
			out.set(rid, __require("node:fs").readFileSync(`${dir}/assets/${file}`, "utf8"));
		} catch {}
	} catch {}
	return out;
}
/**
* 幂等 seed：APP 存在即跳过全部（用户/agent 改过 openloop 就不再动）；
* 不存在则完整写入。返回写入的组件数（0 = 已存在跳过）。
* 0.5.2 升级路径：旧 seed（无 artifact 范例）检测到缺失时**只补注册范例组件**
* （不动用户已有组件——registerComponent 是按 rid upsert，幂等安全）。
*/
async function seedBuiltinApp(facade) {
	if ((await facade.listApps()).some((a) => a.name === "openloop")) {
		if (!((await facade.getAppDetail("openloop"))?.components ?? []).some((c) => c.rid === "openloop:example-system-map")) {
			let patched = 0;
			const exampleHtml = readArtifactExampleAssets();
			for (const example of ARTIFACT_EXAMPLES) {
				const html = exampleHtml.get(example.rid.split(":")[1] ?? "");
				if (html === void 0) continue;
				await facade.registerComponent("openloop", {
					rid: example.rid,
					kind: "artifact",
					title: example.title,
					description: example.description,
					entry: { artifact: {
						kind: "openloop.html-artifact",
						version: 1,
						title: example.title,
						runtime: example.runtime,
						html,
						path: `openloop-examples/${example.rid.split(":")[1]}.html`
					} }
				});
				patched++;
			}
			return {
				seeded: false,
				components: patched,
				apis: 0
			};
		}
		return {
			seeded: false,
			components: 0,
			apis: 0
		};
	}
	await facade.upsertApp({
		name: "openloop",
		displayName: "OpenLoop",
		kind: "builtin",
		version: "0.4.0",
		description: "系统内置 APP：panels 预设组件与本地后端 API，开箱即用。",
		skill: "内置组件目录。用户要「看板/图表/表格/状态」类可视化时直接 pin 这些组件；agent 用 panel 工具生成更复杂的面板。"
	});
	let components = 0;
	for (const kind of BUILTIN_KINDS) {
		await facade.registerComponent("openloop", {
			rid: `openloop:${kind}`,
			kind: "panel",
			title: KIND_TITLES[kind] ?? kind,
			description: "panels 预设组件（内置）",
			entry: minimalEntry(kind)
		});
		components++;
	}
	const exampleHtml = readArtifactExampleAssets();
	for (const example of ARTIFACT_EXAMPLES) {
		const html = exampleHtml.get(example.rid.split(":")[1] ?? "");
		if (html === void 0) continue;
		await facade.registerComponent("openloop", {
			rid: example.rid,
			kind: "artifact",
			title: example.title,
			description: example.description,
			entry: { artifact: {
				kind: "openloop.html-artifact",
				version: 1,
				title: example.title,
				runtime: example.runtime,
				html,
				path: `openloop-examples/${example.rid.split(":")[1]}.html`
			} }
		});
		components++;
	}
	let apis = 0;
	for (const api of BUILTIN_APIS) {
		await facade.registerApi("openloop", api);
		apis++;
	}
	return {
		seeded: true,
		components,
		apis
	};
}
//#endregion
//#region src/backend.ts
/**
* AppBackend 组装层：PocketBase 进程 + admin client + collections 初始化 + 门面。
*
* 生命周期（cordis apply 必须同步——AGENTS.md 沉淀 #6）：
* - createAppBackend() 构造即惰性（不启动）
* - start() 显式启动（index.ts 里 void start().catch(...)——fiber 不炸）
* - ready() 给 tool/route 消费：等启动完成返回门面；失败/超时抛面向 Agent 的错误
*/
function createAppBackend(options = {}) {
	const readyTimeoutMs = options.readyTimeoutMs ?? 45e3;
	let status = {
		state: "stopped",
		version: PB_VERSION
	};
	let running;
	let facade;
	let readyPromise;
	let startedAt;
	/** registry 变更代次（0 起步；invalidate 递增——dock 轻探对比用） */
	let registryRev = 0;
	/** P2 守护状态（status 扩展字段的数据源） */
	let watchdogState = {
		restarts: 0,
		lastError: null,
		lastRestartAt: null,
		consecutiveFailures: 0
	};
	const dshHome = resolveDshHome(options.dshHome);
	/** watchdog（惰性构造——doStart 成功后才有 restart 动作可注入） */
	let watchdog;
	const syncStatus = () => {
		status = {
			...status,
			restarts: watchdogState.restarts,
			lastError: watchdogState.lastError,
			lastRestartAt: watchdogState.lastRestartAt
		};
	};
	const doStart = async () => {
		status = {
			state: "starting",
			version: PB_VERSION
		};
		const process = await startPocketBase({
			...options,
			onExit: (code) => {
				watchdog?.onProcessExit(code);
			}
		});
		running = process;
		const pb = createPbClient(process.baseUrl, process.credentials);
		await initCollections(pb);
		facade = createAppFacade(pb);
		await seedBuiltinApp(facade);
		startedAt = Date.now();
		status = {
			state: "running",
			version: PB_VERSION,
			baseUrl: process.baseUrl
		};
		syncStatus();
		if (watchdog === void 0) watchdog = new PbWatchdog({
			restart: async () => {
				if (running !== void 0) await running.stop().catch(() => {});
				running = void 0;
				facade = void 0;
				readyPromise = void 0;
				await doStart();
			},
			onStateChange: (state) => {
				watchdogState = state;
				syncStatus();
			}
		});
		watchdog.resume();
		return facade;
	};
	return {
		async start() {
			if (readyPromise === void 0) readyPromise = doStart().catch((error) => {
				status = {
					state: "failed",
					version: PB_VERSION,
					error: error instanceof Error ? error.message : String(error)
				};
				readyPromise = void 0;
				throw error;
			});
			await readyPromise;
		},
		async ready() {
			if (facade !== void 0 && status.state === "running") return facade;
			if (readyPromise === void 0) this.start().catch(() => {});
			if (readyPromise === void 0) throw new Error(`openloop app backend is ${status.state}${status.error !== void 0 ? `: ${status.error}` : ""}. Retry in a moment.`);
			return Promise.race([readyPromise, new Promise((_, reject) => {
				setTimeout(() => {
					reject(/* @__PURE__ */ new Error(`openloop app backend did not become ready within ${readyTimeoutMs}ms (state: ${status.state}${status.error !== void 0 ? `, ${status.error}` : ""}). First start downloads PocketBase ${PB_VERSION} (~12MB) — check network or set OPENLOOP_PB_BIN to a local binary.`));
				}, readyTimeoutMs).unref?.();
			})]);
		},
		status() {
			return {
				...status,
				registryRev,
				restarts: watchdogState.restarts,
				lastError: watchdogState.lastError,
				lastRestartAt: watchdogState.lastRestartAt
			};
		},
		invalidateRegistry() {
			registryRev += 1;
			return registryRev;
		},
		async restart() {
			if (watchdog !== void 0) watchdog.resume();
			if (running !== void 0) await running.stop().catch(() => {});
			running = void 0;
			facade = void 0;
			readyPromise = void 0;
			await this.start();
		},
		pbClient() {
			if (status.state !== "running" || running === void 0) return void 0;
			return createPbClient(running.baseUrl, running.credentials);
		},
		pbDataDir() {
			return status.state === "running" && running !== void 0 ? running.dataDir : void 0;
		},
		dshHome() {
			return dshHome;
		},
		startedAt() {
			return startedAt;
		},
		async stop() {
			watchdog?.stop();
			readyPromise = void 0;
			facade = void 0;
			startedAt = void 0;
			if (running !== void 0) {
				await running.stop();
				running = void 0;
			}
			status = {
				state: "stopped",
				version: PB_VERSION
			};
		}
	};
}
//#endregion
//#region ../../node_modules/.pnpm/@deepseek-ai+dsh-scope@0.1.0-rc.6_@deepseek-ai+cordis@4.0.1_@deepseek-ai+dsh-invariants_6f3351786c779449c277f079a737f571/node_modules/@deepseek-ai/dsh-scope/lib/index.js
/**
* Shared insertion-ordered storage and effect ownership for scope-aware registries.
*
* @module @deepseek-ai/dsh-scope
*/
/**
* Insertion-ordered named entries with caller-owned duplicate diagnostics.
*
* Values are borrowed. Iterators are live within one nonempty table
* generation; draining the table detaches them from later insertions. Each
* successful insertion returns an idempotent undo for that exact entry.
*/
var NamedEntries = class {
	duplicateError;
	data = /* @__PURE__ */ new Map();
	constructor(duplicateError) {
		this.duplicateError = duplicateError;
	}
	/**
	* Insert one unique name.
	* @param name - name unique within this table.
	* @param value - borrowed value to retain.
	* @returns an idempotent undo that removes only this insertion.
	*/
	insert(name, value) {
		const data = this.data;
		if (data.has(name)) throw this.duplicateError(name);
		data.set(name, value);
		let active = true;
		return () => {
			if (!active) return;
			active = false;
			data.delete(name);
			if (data.size === 0 && this.data === data) this.data = /* @__PURE__ */ new Map();
		};
	}
	/**
	* Read one named value.
	* @param name - name to resolve.
	* @returns the retained value, or `undefined` when absent.
	*/
	get(name) {
		return this.data.get(name);
	}
	/**
	* Test one name for membership.
	* @param name - name to test.
	* @returns whether the table contains that name.
	*/
	has(name) {
		return this.data.has(name);
	}
	/**
	* Iterate live names in insertion order.
	* @returns the native live key iterator.
	*/
	keys() {
		return this.data.keys();
	}
	/**
	* Iterate live entries in insertion order.
	* @returns the native live entry iterator.
	*/
	entries() {
		return this.data.entries();
	}
	/**
	* Iterate live values in insertion order.
	* @returns the native live value iterator.
	*/
	values() {
		return this.data.values();
	}
	/**
	* Test whether this table has no entries.
	* @returns whether the table is empty.
	*/
	isEmpty() {
		return this.data.size === 0;
	}
};
/**
* Insertion-ordered anonymous entries with independent registration identity.
*
* Equal values remain separate registrations. Values are borrowed, and
* iterators are live within one nonempty table generation; draining the table
* detaches them from later appends.
*/
var AnonymousEntries = class {
	data = /* @__PURE__ */ new Map();
	/**
	* Append one independently owned value.
	* @param value - borrowed value to retain.
	* @returns an idempotent undo for this exact append.
	*/
	append(value) {
		const data = this.data;
		const key = Symbol();
		data.set(key, value);
		let active = true;
		return () => {
			if (!active) return;
			active = false;
			data.delete(key);
			if (data.size === 0 && this.data === data) this.data = /* @__PURE__ */ new Map();
		};
	}
	/**
	* Iterate live values in insertion order.
	* @returns the native live value iterator.
	*/
	values() {
		return this.data.values();
	}
	/**
	* Test whether this table has no entries.
	* @returns whether the table is empty.
	*/
	isEmpty() {
		return this.data.size === 0;
	}
};
/**
* Own the global and exact-scope layers for one registry.
*
* Reads never create scoped layers. Registrations derive both visibility and
* effect ownership from the supplied Cordis context, collect undo before
* notification, and reclaim only a completely empty aggregate layer.
*/
var ScopedLayers = class {
	createLayer;
	onChange;
	/** The eagerly constructed context-global layer. */
	global;
	scoped = /* @__PURE__ */ new Map();
	constructor(createLayer, onChange) {
		this.createLayer = createLayer;
		this.onChange = onChange;
		this.global = createLayer(void 0);
	}
	/**
	* Read an existing exact-scope overlay. Deliberately chain-blind: callers
	* addressing one scope's OWN contributions (its restrictions, its guards)
	* must not silently pick up an ancestor's — use {@link chainLayers} where
	* inheritance is the point.
	* @param scope - exact scope key; `undefined` denotes no overlay.
	* @returns the existing scoped layer, or `undefined` without creating one.
	*/
	peek(scope) {
		if (scope === void 0) return void 0;
		return this.scoped.get(scope);
	}
	/**
	* Existing overlays along the scope's parent chain ({@link scopeChainOf}),
	* farthest ancestor first and the exact scope last, so a caller layering
	* them in order gives the nearest scope the final word.
	* @param scope - viewing scope, or `undefined` for no overlays.
	* @returns the existing layers, nearest last; absent overlays are skipped.
	*/
	chainLayers(scope) {
		const layers = [];
		for (const key of scopeChainOf(scope).reverse()) {
			const layer = this.scoped.get(key);
			if (layer !== void 0) layers.push(layer);
		}
		return layers;
	}
	/**
	* Materialize global named entries followed by scope-chain shadows,
	* farthest ancestor first, so the nearest scope's entry wins a name.
	* @param scope - viewing scope, or `undefined` for the global view.
	* @param pick - select the named table from a layer.
	* @returns an insertion-ordered effective map.
	*/
	merge(scope, pick) {
		const merged = new Map(pick(this.global).entries());
		for (const layer of this.chainLayers(scope)) for (const [name, value] of pick(layer).entries()) merged.set(name, value);
		return merged;
	}
	/**
	* Attach one synchronous layer mutation to its registration context.
	* @param ctx - context that determines both scope visibility and effect ownership.
	* @param action - atomic mutation returning its synchronous undo.
	* @param options - Cordis effect label and optional change notification.
	* @returns the exact disposer returned by `ctx.effect()`.
	*/
	effect(ctx, action, options) {
		const scope = scopeOf(ctx);
		const notify = options.notify ?? true;
		return ctx.effect(function* () {
			let layer;
			let created = false;
			if (scope === void 0) layer = this.global;
			else {
				const existing = this.scoped.get(scope);
				if (existing === void 0) {
					layer = this.createLayer(scope);
					this.scoped.set(scope, layer);
					created = true;
				} else layer = existing;
			}
			let undo;
			try {
				undo = action(layer);
			} catch (error) {
				if (scope !== void 0 && created && layer.isEmpty()) this.scoped.delete(scope);
				throw error;
			}
			yield () => {
				undo();
				if (scope !== void 0 && layer.isEmpty()) this.scoped.delete(scope);
				if (notify) this.onChange();
			};
			if (notify) this.onChange();
		}.bind(this), options.label);
	}
};
/**
* Scoped-context primitive: mint a Cordis context that tags registrations with
* an opaque identity and build routing-only event carriers for that identity.
*
* @module @deepseek-ai/dsh-scope
*/
/** Context tag written by {@link createScope}. */
const kScope = Symbol("dsh.scope");
/** The key associated with each carrier. Presence distinguishes an unkeyed carrier from a non-carrier. */
const carrierKeys = /* @__PURE__ */ new WeakMap();
/**
* The enclosing scope of each key. One relation powers both directions of
* scope nesting: registration views inherit DOWN the chain (a child scope
* sees its ancestors' layers — {@link ScopedLayers}), and event admission
* extends UP it (a listener tagged with an ancestor receives events dispatched
* to a descendant key — {@link scopeTarget}).
*/
const scopeParents = /* @__PURE__ */ new WeakMap();
/**
* The chain from a key to its root ancestor.
* @param key - the starting key, or `undefined` for the empty chain.
* @returns keys nearest-first: `[key, parent, grandparent, …]`.
*/
function scopeChainOf(key) {
	const chain = [];
	for (let cursor = key; cursor !== void 0; cursor = scopeParents.get(cursor)) chain.push(cursor);
	return chain;
}
/**
* Read the nearest scope tag inherited by a context.
* @param ctx - context to inspect.
* @returns its scope key, or `undefined` for an unscoped context.
*/
function scopeOf(ctx) {
	return ctx[kScope];
}
/**
* Build an opaque receiver that preserves the base filter, admits untagged
* listeners globally, and admits tagged listeners for a matching key or any
* of its ancestors ({@link bindScopeParent}): a listener owned by an enclosing
* scope receives every descendant scope's events, which is what lets one
* standing composition observe each of the agents composed under it. A tag
* BELOW the dispatch key stays excluded — events flow up the chain, never
* down.
* @param base - subject or service whose existing Cordis filter is preserved.
* @param key - routed scope identity, or `undefined` for an unscoped subject.
* @returns a carrier whose subject remains available only through event arguments.
*/
function scopeTarget(base, key) {
	const baseFilter = base[Context.filter];
	const carrier = { [Context.filter](ctx) {
		if (baseFilter !== void 0 && !baseFilter.call(base, ctx)) return false;
		const tag = scopeOf(ctx);
		if (tag === void 0) return true;
		for (let cursor = key; cursor !== void 0; cursor = scopeParents.get(cursor)) if (cursor === tag) return true;
		return false;
	} };
	carrierKeys.set(carrier, key);
	return carrier;
}
//#endregion
//#region ../../node_modules/.pnpm/@deepseek-ai+dsh-timeout@0.1.0-rc.6_@deepseek-ai+cordis@4.0.1_@deepseek-ai+dsh-invarian_8c173ab999b05cf1db05d479dd44e888/node_modules/@deepseek-ai/dsh-timeout/lib/index.js
/** Largest delay Node schedules without clamping it to one millisecond. */
const MAX_TIMER_DELAY_MS = 2147483647;
//#endregion
//#region ../../node_modules/.pnpm/@deepseek-ai+dsh-llm@0.1.0-rc.6_@deepseek-ai+cordis@4.0.1_@deepseek-ai+dsh-attachment@0_4ed4e5c71eb965b0bd6912871e829940/node_modules/@deepseek-ai/dsh-llm/lib/index.js
/**
* dsh-llm's owned branded ids: tool-call correlation and provider request
* diagnostics.
*
* The `Branded<B>` primitive itself lives in `@deepseek-ai/dsh-brand` (a
* zero-dependency type-only package) so every owner of a cross-boundary id can
* brand it without depending on dsh-llm; see that package's README for the
* nominal-typing policy.
*
* @module @deepseek-ai/dsh-llm/brand
*/
/**
* Brand a message identifier.
* @param id - the opaque message identifier.
* @returns the same string, branded; no validation is performed.
*/
function MessageId(id) {
	return id;
}
/**
* Brand a string as a {@link CallId}.
* @param id - the provider-issued (or synthesized) call id.
* @returns the same string, branded; no validation is performed.
*/
function CallId(id) {
	return id;
}
/**
* Deep-freeze a value in place with an iterative traversal, guarding cycles,
* so later mutation throws without imposing a JavaScript call-stack depth cap.
* {@link AbortSignal} objects are deliberately skipped because they are the
* request's live cancellation channel and freezing them breaks abort.
* @param value - the value to freeze in place.
* @returns the same value, frozen.
*/
function deepFreeze(value) {
	const seen = /* @__PURE__ */ new WeakSet();
	const pending = [{
		kind: "visit",
		node: value
	}];
	while (pending.length > 0) {
		const task = pending.pop();
		/* v8 ignore next -- the loop condition guarantees one pending task. */
		if (task === void 0) continue;
		if (task.kind === "property") {
			pending.push({
				kind: "visit",
				node: task.source[task.key]
			});
			continue;
		}
		const node = task.node;
		if (node === null || typeof node !== "object") continue;
		if (node instanceof AbortSignal) continue;
		if (seen.has(node)) continue;
		seen.add(node);
		Object.freeze(node);
		const keys = Object.keys(node);
		for (let index = keys.length - 1; index >= 0; index--) {
			const key = keys[index];
			/* v8 ignore next -- the loop is bounded by the captured key count. */
			if (key === void 0) continue;
			pending.push({
				kind: "property",
				source: node,
				key
			});
		}
	}
	return value;
}
/**
* Detach and deep-freeze a message whose identity already exists.
* @param message - complete message, including its stable identity.
* @returns an immutable snapshot that preserves the identity.
*/
function freezeMessage(message) {
	return deepFreeze(structuredClone(message));
}
/**
* Create one identified message and freeze it before publication.
* @param input - complete role, content, and source for a new message.
* @returns an immutable message with a fresh stable identity.
*/
function createMessage(input) {
	return freezeMessage({
		...input,
		id: MessageId(crypto.randomUUID())
	});
}
/**
* Create one identified user-role message and freeze it before publication.
* @param input - complete content and source for a new user message.
* @returns an immutable user message with a fresh stable identity.
*/
function createUserMessage(input) {
	return createMessage({
		...input,
		role: "user"
	});
}
/**
* Harness error base with a stable machine-routable code and chained cause.
* Package errors extend it so tool results and replay can retain failure class.
* @module @deepseek-ai/dsh-llm/error
*/
/**
* Base class for all harness errors. Carries a `code` (stable, programmatic —
* e.g. `NO_ADAPTER`, `INVALID_ARGS`, `INVARIANT`) distinct from the
* human-readable `message`, and supports `cause` chaining via the standard
* `ErrorOptions`. `name` defaults to the subclass constructor name.
*/
var HarnessError = class extends Error {
	/** Stable machine-routable failure class (e.g. `RATE_LIMIT`); route on this, never by parsing `message`. */
	code;
	constructor(message, code, options) {
		super(message, options);
		this.code = code;
		this.name = new.target.name;
	}
};
/**
* Canonical provider-neutral code for a response that completed normally but
* carried no content blocks at all. Providers occasionally emit a degenerate
* completion (a terminal stop with zero output); adapters classify it as this
* failure instead of yielding an empty assistant message, because an empty
* message silently ends the turn with nothing for the user or the loop to act
* on. The attempt produced nothing durable, so retry policy treats it as safe
* to repeat.
*/
const EMPTY_RESPONSE_CODE = "EMPTY_RESPONSE";
new RegExp(String.raw`(?:^|[^a-z0-9])context[\s_-](?:length|window)[\s_-]` + String.raw`(?:exceed(?:ed|s)?|overflow(?:ed)?|limit[\s_-]exceeded)(?:$|[^a-z0-9])`, "i");
new RegExp(String.raw`\b(?:request|prompt|input|messages?)\s+(?:is\s+|are\s+)?` + String.raw`too\s+(?:large|long)\s+for\s+(?:(?:this|the)\s+)?` + String.raw`(?:model(?:'s)?\s+)?context(?:\s+window)?\b`, "i");
new RegExp(String.raw`\b(?:input|prompt|request|messages?)\b.{0,40}` + String.raw`\b(?:exceed(?:s|ed)?|overflows?|is\s+larger\s+than)\b.{0,40}` + String.raw`\b(?:the\s+)?(?:model(?:'s)?\s+)?context(?:\s+(?:length|window))?\b`, "i");
/**
* Provider-owned request-retry policy configuration and resolution.
*
* Adapters expose one resolved policy per registered provider route; the
* optional dsh-llm-retry plugin executes it on the agent's failed-step extension point.
*
* @module @deepseek-ai/dsh-llm/retry-policy
*/
const DEFAULT_MAX_RETRIES = 2;
const DEFAULT_INITIAL_DELAY_MS = 500;
const DEFAULT_MAX_DELAY_MS = 1e4;
const DEFAULT_JITTER_RATIO = .1;
const DEFAULT_RETRYABLE_CODES = Object.freeze([
	EMPTY_RESPONSE_CODE,
	"RATE_LIMIT",
	"SERVER",
	"TIMEOUT",
	"TRANSPORT"
]);
const backoffSchema = Schema.object({
	initialDelayMs: Schema.number().max(MAX_TIMER_DELAY_MS).default(DEFAULT_INITIAL_DELAY_MS),
	maxDelayMs: Schema.number().max(MAX_TIMER_DELAY_MS).default(DEFAULT_MAX_DELAY_MS),
	jitterRatio: Schema.number().min(0).max(1).default(DEFAULT_JITTER_RATIO)
});
const normalPolicySchema = Schema.object({
	mode: Schema.const("normal").required(),
	maxRetries: Schema.number().step(1).min(0).max(Number.MAX_SAFE_INTEGER).default(DEFAULT_MAX_RETRIES),
	retryableCodes: Schema.array(Schema.string()).default([...DEFAULT_RETRYABLE_CODES]),
	backoff: backoffSchema
});
const alwaysPolicySchema = Schema.object({
	mode: Schema.const("always").required(),
	backoff: backoffSchema
});
Schema.union([normalPolicySchema, alwaysPolicySchema]);
/**
* Centralize the non-secret product identity every provider request sends as `User-Agent`, keeping
* adapters from drifting. See
* `.agents/notes/implemented/architecture/2026-06-21-mandatory-app-attribution-headers.md`.
*
* App-attribution vocabulary for provider requests.
* @module @deepseek-ai/dsh-llm/attribution
*/
const { version } = createRequire(import.meta.url)("../package.json");
/**
* Exhaustiveness helper for closed core unions. Use {@link assertNever} at the default branch so a
* new variant fails compilation at every required handler. Do not use it for declaration-merged
* unions such as session events or content blocks: handle known variants and explicitly fall
* through because plugins may add valid unknown cases.
* @module @deepseek-ai/dsh-llm/never
*/
/**
* Mark an unreachable closed-union branch. A newly unhandled typed variant fails at the call site;
* a value that escaped its type throws with diagnostics at runtime.
* @param value - the impossible value; typed `never` so an unhandled variant fails compilation at the call site.
* @param context - optional label (e.g. the switch site) prefixed into the throw message.
* @returns never — it always throws, with the offending value JSON-rendered in the message.
*/
function assertNever(value, context) {
	const rendered = JSON.stringify(value) ?? String(value);
	throw new Error(`unreachable variant${context ? ` in ${context}` : ""}: ${rendered}`);
}
//#endregion
//#region ../../node_modules/.pnpm/@deepseek-ai+dsh-session@0.1.0-rc.6_6fd26f59436a18b115f326d6060415e6/node_modules/@deepseek-ai/dsh-session/lib/index.js
/** Lossless-JSON validation and detached snapshots for durable session data. @module @deepseek-ai/dsh-session/json */
/** Whether a realm-owned intrinsic prototype is backed by its native constructor. */
function hasIntrinsicConstructor$1(prototype, name) {
	const constructor = Object.getOwnPropertyDescriptor(prototype, "constructor")?.value;
	if (typeof constructor !== "function") return false;
	try {
		return constructor.name === name && constructor.prototype === prototype && Function.prototype.toString.call(constructor) === `function ${name}() { [native code] }`;
	} catch {
		return false;
	}
}
/** Whether a candidate is one realm's intrinsic `Object.prototype`. */
function isIntrinsicObjectPrototype$1(value) {
	return Object.getPrototypeOf(value) === null && hasIntrinsicConstructor$1(value, "Object");
}
/** Whether an array uses one realm's intrinsic `Array.prototype`, not a subclass or forged prototype. */
function hasPlainArrayPrototype$1(value) {
	const prototype = Object.getPrototypeOf(value);
	if (!Array.isArray(prototype) || !hasIntrinsicConstructor$1(prototype, "Array")) return false;
	const objectPrototype = Object.getPrototypeOf(prototype);
	return typeof objectPrototype === "object" && objectPrototype !== null && isIntrinsicObjectPrototype$1(objectPrototype);
}
/** Whether an object is a plain or null-prototype record from any JavaScript realm. */
function hasPlainObjectPrototype(value) {
	const prototype = Object.getPrototypeOf(value);
	return prototype === null || typeof prototype === "object" && isIntrinsicObjectPrototype$1(prototype);
}
/** Return every JSON-visible object key, or reject own data JSON would discard. */
function enumerableStringKeys(value) {
	const keys = Reflect.ownKeys(value);
	if (keys.some((key) => typeof key !== "string" || !Object.prototype.propertyIsEnumerable.call(value, key))) return void 0;
	return keys;
}
/** Validate lossless JSON iteratively, optionally materializing a detached snapshot. */
function walkJsonValue(value, detach) {
	const ancestors = /* @__PURE__ */ new Set();
	let root;
	const assign = (destination, item) => {
		if (destination === void 0) return;
		if (destination.kind === "root") root = item;
		else if (destination.kind === "array") destination.target[destination.index] = item;
		else Object.defineProperty(destination.target, destination.key, {
			value: item,
			enumerable: true,
			configurable: true,
			writable: true
		});
	};
	const tasks = [{
		kind: "visit",
		value,
		...detach ? { destination: { kind: "root" } } : {}
	}];
	for (let task = tasks.pop(); task !== void 0; task = tasks.pop()) {
		if (task.kind === "leave") {
			ancestors.delete(task.source);
			continue;
		}
		if (task.kind === "array-item") {
			if (!Object.prototype.hasOwnProperty.call(task.source, task.index)) return void 0;
			tasks.push({
				kind: "visit",
				value: task.source[task.index],
				...task.target === void 0 ? {} : { destination: {
					kind: "array",
					target: task.target,
					index: task.index
				} }
			});
			continue;
		}
		if (task.kind === "object-property") {
			tasks.push({
				kind: "visit",
				value: task.source[task.key],
				...task.target === void 0 ? {} : { destination: {
					kind: "object",
					target: task.target,
					key: task.key
				} }
			});
			continue;
		}
		const current = task.value;
		if (current === null) {
			assign(task.destination, null);
			continue;
		}
		if (typeof current === "boolean" || typeof current === "string") {
			assign(task.destination, current);
			continue;
		}
		if (typeof current === "number") {
			if (!Number.isFinite(current) || Object.is(current, -0)) return void 0;
			assign(task.destination, current);
			continue;
		}
		if (typeof current !== "object") return void 0;
		if (ancestors.has(current)) return void 0;
		if (Array.isArray(current)) {
			if (!hasPlainArrayPrototype$1(current)) return void 0;
			const length = current.length;
			if (Reflect.ownKeys(current).length !== length + 1) return void 0;
			const target = detach ? [] : void 0;
			if (target !== void 0) assign(task.destination, target);
			ancestors.add(current);
			tasks.push({
				kind: "leave",
				source: current
			});
			for (let index = length - 1; index >= 0; index--) tasks.push({
				kind: "array-item",
				source: current,
				index,
				...target === void 0 ? {} : { target }
			});
			continue;
		}
		if (!hasPlainObjectPrototype(current)) return void 0;
		const keys = enumerableStringKeys(current);
		if (keys === void 0) return void 0;
		const target = detach ? {} : void 0;
		if (target !== void 0) assign(task.destination, target);
		ancestors.add(current);
		tasks.push({
			kind: "leave",
			source: current
		});
		for (let index = keys.length - 1; index >= 0; index--) {
			const key = keys[index];
			/* v8 ignore next -- the loop is bounded by the captured key count. */
			if (key === void 0) return void 0;
			tasks.push({
				kind: "object-property",
				source: current,
				key,
				...target === void 0 ? {} : { target }
			});
		}
	}
	return detach ? root : true;
}
/**
* Validate and detach lossless JSON in one read per property, so a stateful
* getter cannot change between validation and copying. Traversal is iterative,
* so valid nesting is bounded by available memory rather than the JavaScript
* call stack. Accepts ordinary arrays, plain or null-prototype objects, and JSON
* scalars; rejects sparse, cyclic, exotic, negative-zero, and non-finite values.
* Getter throws propagate.
*
* @param value - the candidate value to validate and detach.
* @returns the detached snapshot, or `undefined` when the value is not
*   losslessly JSON-serializable.
*/
function snapshotJsonValue(value) {
	return walkJsonValue(value, true);
}
/**
* Test the same lossless JSON boundary as {@link snapshotJsonValue} without
* detaching it. Only own enumerable string properties participate; `toJSON`
* is ignored and getters run, so persistence boundaries use the snapshotter.
* @param value - the candidate event data to test.
* @returns whether `value` survives JSON round-trip losslessly.
*/
function isJsonValue(value) {
	return walkJsonValue(value, false) === true;
}
//#endregion
//#region ../../node_modules/.pnpm/@deepseek-ai+dsh-tools@0.1.1-rc.2_f8724372086ccc1457fc84e7becee2e0/node_modules/@deepseek-ai/dsh-tools/lib/index.js
/**
* Enforced JSON Schema subset shared by tool outputs, generated Code Mode
* types, subagents, and workflows. The subset accepts any JSON root, an
* annotation-only schema for unconstrained JSON, one scalar `type`, object
* `properties`/`required`/boolean `additionalProperties`, array `items`,
* type-correct scalar `enum`/`const`, and exact-one `oneOf`.
*
* Unsupported or misplaced keywords reject rather than being accepted without
* enforcement. Consumers that require an object root apply
* {@link assertObjectJsonSchema} before accepting input.
* @module dsh-tools/json-schema
*/
/**
* Thrown when a raw schema falls outside the enforced subset. `violations`
* lists every offending path instead of stopping at the first author error.
*/
var JsonSchemaError = class extends HarnessError {
	/** Individual schema violations in walk order. */
	violations;
	constructor(violations) {
		super(`unsupported JSON schema: ${violations.join("; ")}`, "UNSUPPORTED_SCHEMA");
		this.name = "JsonSchemaError";
		this.violations = violations;
	}
};
const CONSTRAINT_KEYWORDS = /* @__PURE__ */ new Set([
	"type",
	"oneOf",
	"properties",
	"required",
	"additionalProperties",
	"items",
	"enum",
	"const"
]);
const ANNOTATION_KEYWORDS = /* @__PURE__ */ new Set([
	"description",
	"title",
	"default",
	"examples"
]);
const SCHEMA_TYPES = [
	"object",
	"array",
	"string",
	"number",
	"integer",
	"boolean",
	"null"
];
/** Whether a realm-owned intrinsic prototype is backed by its native constructor. */
function hasIntrinsicConstructor(prototype, name) {
	const constructor = Object.getOwnPropertyDescriptor(prototype, "constructor")?.value;
	if (typeof constructor !== "function") return false;
	try {
		return constructor.name === name && constructor.prototype === prototype && Function.prototype.toString.call(constructor) === `function ${name}() { [native code] }`;
	} catch {
		return false;
	}
}
/** Whether a candidate is one realm's intrinsic `Object.prototype`. */
function isIntrinsicObjectPrototype(value) {
	return Object.getPrototypeOf(value) === null && hasIntrinsicConstructor(value, "Object");
}
/**
* Test for a realm-agnostic plain JSON record without accepting arrays or
* exotic objects.
* @param value - candidate record from any JavaScript realm.
* @returns Whether the value has a plain-object prototype chain.
*/
function isPlainJsonRecord(value) {
	if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
	try {
		const prototype = Object.getPrototypeOf(value);
		return prototype === null || typeof prototype === "object" && isIntrinsicObjectPrototype(prototype);
	} catch {
		return false;
	}
}
/** Whether an array uses one realm's intrinsic `Array.prototype`. */
function hasPlainArrayPrototype(value) {
	const prototype = Object.getPrototypeOf(value);
	if (!Array.isArray(prototype) || !hasIntrinsicConstructor(prototype, "Array")) return false;
	const objectPrototype = Object.getPrototypeOf(prototype);
	return typeof objectPrototype === "object" && objectPrototype !== null && isIntrinsicObjectPrototype(objectPrototype);
}
/** Return whether a record contains only own enumerable string keys. */
function hasOnlyEnumerableStringKeys(value) {
	try {
		return Reflect.ownKeys(value).every((key) => typeof key === "string" && Object.prototype.propertyIsEnumerable.call(value, key));
	} catch {
		return false;
	}
}
/**
* Test for an ordinary schema record whose keys survive JSON projection.
* @param value - candidate record from any JavaScript realm.
* @returns Whether the record has an intrinsic prototype and only own enumerable string keys.
*/
function isJsonSchemaRecord(value) {
	return isPlainJsonRecord(value) && hasOnlyEnumerableStringKeys(value);
}
/**
* Test for a dense ordinary array with no JSON-invisible decorations.
* @param value - candidate array from any JavaScript realm.
* @returns Whether the array is intrinsic, dense, and undecorated.
*/
function isPlainJsonArray(value) {
	if (!Array.isArray(value)) return false;
	try {
		if (!hasPlainArrayPrototype(value) || Reflect.ownKeys(value).length !== value.length + 1) return false;
		for (let index = 0; index < value.length; index++) if (!Object.hasOwn(value, index)) return false;
		return true;
	} catch {
		return false;
	}
}
/** Lossless finite JSON number, excluding negative zero. */
function isJsonNumber(value) {
	return typeof value === "number" && Number.isFinite(value) && !Object.is(value, -0);
}
/** Whether a scalar is valid for one declared schema type. */
function scalarMatches(type, value) {
	switch (type) {
		case "string": return typeof value === "string";
		case "number": return isJsonNumber(value);
		case "integer": return isJsonNumber(value) && Number.isInteger(value);
		case "boolean": return typeof value === "boolean";
		case "null": return value === null;
		/* v8 ignore next -- JsonSchemaScalarType is closed; this retains compile-time exhaustiveness. */
		default: return assertNever(type, "JsonSchemaType");
	}
}
/** Keywords that are invalid beside `oneOf`. */
const ONE_OF_SIBLING_KEYWORDS = [
	"properties",
	"required",
	"additionalProperties",
	"items",
	"enum",
	"const"
];
/** Validate object-only fields after its property schemas have been visited. */
function checkObjectSchemaTail(node, path, properties, violations) {
	const hasRequired = Object.hasOwn(node, "required");
	const required = hasRequired ? node.required : void 0;
	if (hasRequired) if (!isPlainJsonArray(required) || required.some((entry) => typeof entry !== "string")) violations.push(`${path}.required must be an array of strings`);
	else {
		const declared = isJsonSchemaRecord(properties) ? properties : {};
		for (const key of required) if (!Object.hasOwn(declared, key)) violations.push(`${path}.required names "${key}" which is not in properties`);
	}
	if (Object.hasOwn(node, "additionalProperties") && typeof node.additionalProperties !== "boolean") violations.push(`${path}.additionalProperties must be a boolean`);
}
/** Collect every violation for one raw schema tree without using the JavaScript call stack. */
function checkSchemaNode(root, rootPath, violations, seen) {
	const tasks = [{
		kind: "enter",
		node: root,
		path: rootPath
	}];
	for (let task = tasks.pop(); task !== void 0; task = tasks.pop()) {
		if (task.kind === "leave") {
			seen.delete(task.node);
			continue;
		}
		if (task.kind === "one-of-tail") {
			for (const key of ONE_OF_SIBLING_KEYWORDS) if (Object.hasOwn(task.node, key)) violations.push(`${task.path}.${key} is not supported beside oneOf`);
			continue;
		}
		if (task.kind === "object-tail") {
			checkObjectSchemaTail(task.node, task.path, task.properties, violations);
			continue;
		}
		const { node, path } = task;
		if (!isJsonSchemaRecord(node)) {
			violations.push(`${path} must be a schema object`);
			continue;
		}
		if (seen.has(node)) {
			violations.push(`${path} is circular`);
			continue;
		}
		seen.add(node);
		tasks.push({
			kind: "leave",
			node
		});
		for (const key of Object.keys(node)) {
			if (CONSTRAINT_KEYWORDS.has(key)) continue;
			if (ANNOTATION_KEYWORDS.has(key)) {
				try {
					if (!isJsonValue(node[key])) violations.push(`${path}.${key} annotation must be lossless JSON data`);
				} catch {
					violations.push(`${path}.${key} annotation must be lossless JSON data`);
				}
				continue;
			}
			violations.push(`${path}.${key} is not a supported keyword (subset: type/oneOf/properties/required/additionalProperties/items/enum/const + annotations)`);
		}
		if (Object.hasOwn(node, "description") && typeof node.description !== "string") violations.push(`${path}.description must be a string`);
		if (Object.hasOwn(node, "title") && typeof node.title !== "string") violations.push(`${path}.title must be a string`);
		const hasType = Object.hasOwn(node, "type");
		const hasOneOf = Object.hasOwn(node, "oneOf");
		if (hasType && hasOneOf) {
			violations.push(`${path} cannot declare both type and oneOf`);
			continue;
		}
		if (!hasType && !hasOneOf) {
			for (const key of ONE_OF_SIBLING_KEYWORDS) if (Object.hasOwn(node, key)) violations.push(`${path}.${key} requires type or oneOf`);
			continue;
		}
		if (hasOneOf) {
			const oneOf = node.oneOf;
			tasks.push({
				kind: "one-of-tail",
				node,
				path
			});
			if (!isPlainJsonArray(oneOf) || oneOf.length < 2) violations.push(`${path}.oneOf must be an array of at least two schemas`);
			else for (let index = oneOf.length - 1; index >= 0; index--) tasks.push({
				kind: "enter",
				node: oneOf[index],
				path: `${path}.oneOf[${index}]`
			});
			continue;
		}
		const type = node.type;
		if (typeof type !== "string" || !SCHEMA_TYPES.includes(type)) {
			violations.push(Array.isArray(type) ? `${path}.type must be a single type string (type arrays are not supported)` : `${path}.type must be one of ${SCHEMA_TYPES.join("/")}`);
			continue;
		}
		const schemaType = type;
		for (const [key, types] of Object.entries({
			properties: ["object"],
			required: ["object"],
			additionalProperties: ["object"],
			items: ["array"],
			enum: [
				"string",
				"number",
				"integer",
				"boolean",
				"null"
			],
			const: [
				"string",
				"number",
				"integer",
				"boolean",
				"null"
			]
		})) if (Object.hasOwn(node, key) && !types.includes(schemaType)) violations.push(`${path}.${key} is not supported on type "${schemaType}"`);
		switch (schemaType) {
			case "object": {
				const properties = Object.hasOwn(node, "properties") ? node.properties : void 0;
				tasks.push({
					kind: "object-tail",
					node,
					path,
					properties
				});
				if (Object.hasOwn(node, "properties")) if (!isJsonSchemaRecord(properties)) violations.push(`${path}.properties must be an object of schemas`);
				else {
					const entries = Object.entries(properties);
					for (let index = entries.length - 1; index >= 0; index--) {
						const entry = entries[index];
						/* v8 ignore next -- the loop is bounded by the captured entry count. */
						if (entry === void 0) continue;
						tasks.push({
							kind: "enter",
							node: entry[1],
							path: `${path}.properties.${entry[0]}`
						});
					}
				}
				break;
			}
			case "array":
				if (Object.hasOwn(node, "items")) tasks.push({
					kind: "enter",
					node: node.items,
					path: `${path}.items`
				});
				break;
			case "string":
			case "number":
			case "integer":
			case "boolean":
			case "null": {
				const hasEnum = Object.hasOwn(node, "enum");
				const allowed = hasEnum ? node.enum : void 0;
				const enumValid = isPlainJsonArray(allowed) && allowed.length > 0 && allowed.every((entry) => scalarMatches(schemaType, entry));
				if (hasEnum && !enumValid) violations.push(`${path}.enum must be a non-empty array of ${schemaType} values`);
				const hasConst = Object.hasOwn(node, "const");
				const declaredConst = hasConst ? node.const : void 0;
				const constValid = scalarMatches(schemaType, declaredConst);
				if (hasConst) {
					if (!constValid) violations.push(`${path}.const must be a ${schemaType} value`);
					else if (enumValid && !allowed.includes(declaredConst)) violations.push(`${path}.const must be one of ${path}.enum when both are declared`);
				}
				break;
			}
			/* v8 ignore next -- schemaType was narrowed from the closed SCHEMA_TYPES table above. */
			default: assertNever(schemaType, "JsonSchemaType");
		}
	}
}
/**
* Assert that an arbitrary raw schema uses only the enforced subset.
* Annotation-only schemas are accepted as the standard unconstrained-JSON
* form; callers that require an object root use {@link assertObjectJsonSchema}.
* @param schema - untrusted raw JSON Schema.
* @returns Assertion that the schema belongs to the supported subset.
*/
function assertSupportedJsonSchema(schema) {
	const violations = [];
	checkSchemaNode(schema, "schema", violations, /* @__PURE__ */ new Set());
	if (violations.length > 0) throw new JsonSchemaError(violations);
}
/** Safely test the lossless JSON boundary when a getter may throw. */
function safelyIsJsonValue(value) {
	try {
		return isJsonValue(value);
	} catch {
		return false;
	}
}
/** Root-aware diagnostic path for the parameter validator's empty sentinel. */
function diagnosticPath(path) {
	return path === "" ? "arguments" : path;
}
/** Append one object property without a leading dot at an implicit root. */
function propertyPath(path, key) {
	return path === "" ? key : `${path}.${key}`;
}
/** The generic exception-containment diagnostic owned by one valid schema node. */
function losslessValueViolation(path) {
	return [`"${diagnosticPath(path)}" must be a lossless JSON value`];
}
/** Append diagnostics without spreading a potentially wide child result as call arguments. */
function appendViolations(target, source) {
	for (const violation of source) target.push(violation);
}
/** Initialize one validation frame with empty aggregation state. */
function valueFrame(node, value, path) {
	return {
		node,
		value,
		path,
		catches: false,
		phase: "start",
		children: [],
		childIndex: 0,
		violations: [],
		tailViolations: [],
		matches: 0
	};
}
/** Validate one scalar node after its primitive type check. */
function checkScalarValue(node, value, path) {
	const allowed = Object.hasOwn(node, "enum") ? node.enum : void 0;
	if (allowed !== void 0 && !allowed.includes(value)) return [`"${diagnosticPath(path)}" must be one of ${JSON.stringify(allowed)}`];
	if (Object.hasOwn(node, "const") && value !== node.const) return [`"${diagnosticPath(path)}" must be ${JSON.stringify(node.const)}`];
	return [];
}
/** Validate one trusted schema/value pair with explicit frames rather than recursive calls. */
function checkValue(schema, value, path) {
	const frames = [valueFrame(schema, value, path)];
	let rootResult;
	const receive = (result) => {
		const parent = frames.at(-1);
		if (parent === void 0) {
			rootResult = result;
			return;
		}
		if (parent.kind === "oneOf") {
			if (result.length === 0) parent.matches++;
		} else appendViolations(parent.violations, result);
	};
	const finish = (result) => {
		frames.pop();
		receive(result);
	};
	while (frames.length > 0) {
		const frame = frames.at(-1);
		/* v8 ignore next -- the loop condition guarantees a current frame. */
		if (frame === void 0) break;
		try {
			if (frame.phase === "children") {
				if (frame.childIndex < frame.children.length) {
					const child = frame.children[frame.childIndex];
					/* v8 ignore next -- childIndex is bounded by children.length. */
					if (child === void 0) throw new Error("missing schema-value child frame");
					frame.childIndex++;
					frames.push(valueFrame(child.node, child.value, child.path));
					continue;
				}
				if (frame.kind === "oneOf") {
					finish(frame.matches === 1 ? [] : [`"${diagnosticPath(frame.path)}" must match exactly one oneOf branch (matched ${frame.matches})`]);
					continue;
				}
				appendViolations(frame.violations, frame.tailViolations);
				if (frame.violations.length > 0) finish(frame.violations);
				else if (frame.kind === "object") finish(safelyIsJsonValue(frame.value) ? [] : [`"${diagnosticPath(frame.path)}" must be a lossless JSON object`]);
				else finish(safelyIsJsonValue(frame.value) ? [] : [`"${diagnosticPath(frame.path)}" must be a dense lossless JSON array`]);
				continue;
			}
			const nodeType = Object.hasOwn(frame.node, "type") ? frame.node.type : void 0;
			frame.catches = !(nodeType !== void 0 && !SCHEMA_TYPES.includes(nodeType));
			const oneOf = Object.hasOwn(frame.node, "oneOf") ? frame.node.oneOf : void 0;
			if (oneOf !== void 0) {
				frame.kind = "oneOf";
				frame.children = Array.from(oneOf, (branch) => ({
					node: branch,
					value: frame.value,
					path: frame.path
				}));
				frame.childIndex = 0;
				frame.matches = 0;
				frame.phase = "children";
				continue;
			}
			if (nodeType === void 0) {
				finish(safelyIsJsonValue(frame.value) ? [] : losslessValueViolation(frame.path));
				continue;
			}
			switch (nodeType) {
				case "object": {
					if (!isPlainJsonRecord(frame.value)) {
						finish([`"${diagnosticPath(frame.path)}" must be an object`]);
						break;
					}
					const properties = Object.hasOwn(frame.node, "properties") ? frame.node.properties ?? {} : {};
					const violations = [];
					const required = Object.hasOwn(frame.node, "required") ? frame.node.required ?? [] : [];
					for (const key of required) if (!Object.hasOwn(frame.value, key) || frame.value[key] === void 0) violations.push(`missing required property "${propertyPath(frame.path, key)}"`);
					const children = [];
					for (const [key, child] of Object.entries(properties)) {
						if (!Object.hasOwn(frame.value, key) || frame.value[key] === void 0) continue;
						children.push({
							node: child,
							value: frame.value[key],
							path: propertyPath(frame.path, key)
						});
					}
					const tailViolations = [];
					if (Object.hasOwn(frame.node, "additionalProperties") && frame.node.additionalProperties === false) {
						for (const key of Object.keys(frame.value)) if (!Object.hasOwn(properties, key)) tailViolations.push(`"${propertyPath(frame.path, key)}" is not a declared property (additionalProperties: false)`);
					}
					frame.kind = "object";
					frame.children = children;
					frame.childIndex = 0;
					frame.violations = violations;
					frame.tailViolations = tailViolations;
					frame.phase = "children";
					break;
				}
				case "array": {
					if (!Array.isArray(frame.value)) {
						finish([`"${diagnosticPath(frame.path)}" must be an array`]);
						break;
					}
					const items = Object.hasOwn(frame.node, "items") ? frame.node.items : void 0;
					const children = items === void 0 ? [] : frame.value.flatMap((entry, index) => [{
						node: items,
						value: entry,
						path: `${frame.path}[${index}]`
					}]);
					frame.kind = "array";
					frame.children = children;
					frame.childIndex = 0;
					frame.violations = [];
					frame.phase = "children";
					break;
				}
				case "string":
					finish(typeof frame.value === "string" ? checkScalarValue(frame.node, frame.value, frame.path) : [`"${diagnosticPath(frame.path)}" must be a string`]);
					break;
				case "number":
					finish(typeof frame.value !== "number" ? [`"${diagnosticPath(frame.path)}" must be a number`] : !isJsonNumber(frame.value) ? [`"${diagnosticPath(frame.path)}" must be a finite JSON number`] : checkScalarValue(frame.node, frame.value, frame.path));
					break;
				case "integer":
					finish(!isJsonNumber(frame.value) || !Number.isInteger(frame.value) ? [`"${diagnosticPath(frame.path)}" must be an integer`] : checkScalarValue(frame.node, frame.value, frame.path));
					break;
				case "boolean":
					finish(typeof frame.value === "boolean" ? checkScalarValue(frame.node, frame.value, frame.path) : [`"${diagnosticPath(frame.path)}" must be a boolean`]);
					break;
				case "null":
					finish(frame.value === null ? checkScalarValue(frame.node, frame.value, frame.path) : [`"${diagnosticPath(frame.path)}" must be null`]);
					break;
				default: finish(assertNever(nodeType, "JsonSchemaType"));
			}
		} catch (error) {
			let failed = frames.pop();
			while (failed !== void 0 && !failed.catches) failed = frames.pop();
			if (failed === void 0) throw error;
			receive(losslessValueViolation(failed.path));
		}
	}
	/* v8 ignore next -- every root frame finishes or throws. */
	return rootResult ?? losslessValueViolation(path);
}
/**
* Validate a candidate value against an asserted raw schema. The function is
* total for arbitrary values and returns path-qualified violations.
* @param schema - a schema accepted by {@link assertSupportedJsonSchema}.
* @param value - the candidate JSON value.
* @param path - root label used in diagnostics.
* @returns All violations in walk order; empty means valid.
*/
function validateJsonSchemaValue(schema, value, path = "value") {
	return checkValue(schema, value, path);
}
/** Unified JSON-value schema DSL, inference, compilation, and typed tool helper. @module dsh-tools/schema */
const ANNOTATION_KEYS = [
	"description",
	"title",
	"default",
	"examples"
];
/** Throw one author-schema violation through the shared schema error type. */
function authorError(message) {
	throw new JsonSchemaError([message]);
}
/** Copy own annotation fields for validation by the raw-schema boundary. */
function copyAnnotations(source, target) {
	if (Object.hasOwn(source, "description")) target.description = source.description;
	if (Object.hasOwn(source, "title")) target.title = source.title;
	if (Object.hasOwn(source, "default")) target.default = source.default;
	if (Object.hasOwn(source, "examples")) target.examples = source.examples;
}
/** Reject author-only keys outside one node's declared vocabulary. */
function assertAuthorKeys(source, path, allowed) {
	for (const key of Object.keys(source)) if (!allowed.includes(key)) authorError(`${path}.${key} is not supported by the value schema DSL`);
}
/** Install a compiled node without giving `__proto__` assignment semantics. */
function assignCompiledNode(destination, node) {
	switch (destination.kind) {
		case "root":
			destination.holder.value = node;
			break;
		case "property":
			Object.defineProperty(destination.target, destination.key, {
				value: node,
				enumerable: true,
				configurable: true,
				writable: true
			});
			break;
		case "item":
			destination.target.items = node;
			break;
		case "one-of": destination.target[destination.index] = node;
	}
}
/** Install a compiled property map at its root or containing object node. */
function assignCompiledPropertyMap(destination, compiled) {
	if (destination.kind === "root") destination.holder.value = compiled;
	else destination.target.properties = compiled.properties;
}
/** Execute an author-schema compilation task graph without recursive descent. */
function runSchemaCompiler(initial) {
	const seen = /* @__PURE__ */ new Set();
	const tasks = [initial];
	for (let task = tasks.pop(); task !== void 0; task = tasks.pop()) {
		if (task.kind === "leave") {
			seen.delete(task.input);
			continue;
		}
		if (task.kind === "property-map-tail") {
			if (task.required.length > 0) {
				task.compiled.required = task.required;
				if (task.destination.kind === "object") task.destination.target.required = task.required;
			}
			continue;
		}
		if (task.kind === "property") {
			if (!isJsonSchemaRecord(task.property)) authorError(`${task.path} must be a value schema object`);
			if (Object.hasOwn(task.property, "required") && task.property.required !== true) authorError(`${task.path}.required must be true when present`);
			if (Object.hasOwn(task.property, "required") && task.property.required === true) task.required.push(task.key);
			tasks.push({
				kind: "value",
				input: task.property,
				path: task.path,
				allowRequired: true,
				destination: {
					kind: "property",
					target: task.properties,
					key: task.key
				}
			});
			continue;
		}
		if (task.kind === "property-map") {
			if (!isJsonSchemaRecord(task.input)) authorError(`${task.path} must be an object of value schemas`);
			if (seen.has(task.input)) authorError(`${task.path} is circular`);
			seen.add(task.input);
			const compiled = { properties: {} };
			const required = [];
			assignCompiledPropertyMap(task.destination, compiled);
			tasks.push({
				kind: "leave",
				input: task.input
			});
			tasks.push({
				kind: "property-map-tail",
				compiled,
				required,
				destination: task.destination
			});
			const entries = Object.entries(task.input);
			for (let index = entries.length - 1; index >= 0; index--) {
				const entry = entries[index];
				/* v8 ignore next -- the loop is bounded by the captured entry count. */
				if (entry === void 0) continue;
				tasks.push({
					kind: "property",
					property: entry[1],
					path: `${task.path}.${entry[0]}`,
					key: entry[0],
					properties: compiled.properties,
					required
				});
			}
			continue;
		}
		const { input, path } = task;
		if (!isJsonSchemaRecord(input)) authorError(`${path} must be a value schema object`);
		if (seen.has(input)) authorError(`${path} is circular`);
		seen.add(input);
		const authorKeys = [...ANNOTATION_KEYS, ...task.allowRequired ? ["required"] : []];
		const node = {};
		assignCompiledNode(task.destination, node);
		tasks.push({
			kind: "leave",
			input
		});
		if (Object.hasOwn(input, "oneOf")) {
			assertAuthorKeys(input, path, [
				...authorKeys,
				"oneOf",
				"type"
			]);
			if (Object.hasOwn(input, "type")) authorError(`${path} cannot declare both type and oneOf`);
			if (!isPlainJsonArray(input.oneOf)) authorError(`${path}.oneOf must be an array of at least two value schemas`);
			const branches = [];
			node.oneOf = branches;
			copyAnnotations(input, node);
			for (let index = input.oneOf.length - 1; index >= 0; index--) tasks.push({
				kind: "value",
				input: input.oneOf[index],
				path: `${path}.oneOf[${index}]`,
				allowRequired: false,
				destination: {
					kind: "one-of",
					target: branches,
					index
				}
			});
			continue;
		}
		const inputType = Object.hasOwn(input, "type") ? input.type : void 0;
		switch (inputType) {
			case "json":
				assertAuthorKeys(input, path, [...authorKeys, "type"]);
				copyAnnotations(input, node);
				break;
			case "object":
				assertAuthorKeys(input, path, [
					...authorKeys,
					"type",
					"properties",
					"additionalProperties"
				]);
				if (!Object.hasOwn(input, "additionalProperties") || typeof input.additionalProperties !== "boolean") authorError(`${path}.additionalProperties must be explicitly true or false`);
				node.type = "object";
				copyAnnotations(input, node);
				node.additionalProperties = input.additionalProperties;
				if (Object.hasOwn(input, "properties")) tasks.push({
					kind: "property-map",
					input: input.properties,
					path: `${path}.properties`,
					destination: {
						kind: "object",
						target: node
					}
				});
				break;
			case "array":
				assertAuthorKeys(input, path, [
					...authorKeys,
					"type",
					"items"
				]);
				node.type = "array";
				copyAnnotations(input, node);
				if (Object.hasOwn(input, "items")) tasks.push({
					kind: "value",
					input: input.items,
					path: `${path}.items`,
					allowRequired: false,
					destination: {
						kind: "item",
						target: node
					}
				});
				break;
			case "string":
			case "number":
			case "integer":
			case "boolean":
			case "null":
				assertAuthorKeys(input, path, [
					...authorKeys,
					"type",
					"enum",
					"const"
				]);
				node.type = inputType;
				copyAnnotations(input, node);
				if (Object.hasOwn(input, "enum")) {
					if (!isPlainJsonArray(input.enum)) authorError(`${path}.enum must be a non-empty array of scalar values`);
					node.enum = Array.from(input.enum, (entry) => entry);
				}
				if (Object.hasOwn(input, "const")) node.const = input.const;
				break;
			default: authorError(`${path}.type must be string/number/integer/boolean/null/array/object/json, or use oneOf`);
		}
	}
}
/** Compile one implicit property map, collecting per-property requiredness. */
function compilePropertyMap(input, path) {
	const holder = {};
	runSchemaCompiler({
		kind: "property-map",
		input,
		path,
		destination: {
			kind: "root",
			holder
		}
	});
	/* v8 ignore next -- the root task assigns before scheduling any descendants. */
	return holder.value ?? authorError(`${path} did not compile`);
}
/** Compile one author node without applying any consumer root restriction. */
function compileValueSchema(input, path) {
	const holder = {};
	runSchemaCompiler({
		kind: "value",
		input,
		path,
		allowRequired: false,
		destination: {
			kind: "root",
			holder
		}
	});
	/* v8 ignore next -- the root task assigns before scheduling any descendants. */
	return holder.value ?? authorError(`${path} did not compile`);
}
/**
* Compile one author-facing value schema to the enforced raw JSON Schema
* subset. The author-only `json` node becomes an annotation-only schema.
* @param spec - schema for any JSON-value root.
* @returns The asserted raw schema projection.
*/
function valueSchemaSpecToJsonSchema(spec) {
	const schema = compileValueSchema(spec, "schema");
	assertSupportedJsonSchema(schema);
	return schema;
}
/**
* Compile the implicit open parameter object into raw JSON Schema.
* @param spec - per-property parameter definitions.
* @returns An object-rooted raw schema with no implicit-root openness override.
*/
function parameterSchemaSpecToJsonSchema(spec) {
	const compiled = compilePropertyMap(spec, "parameters");
	const schema = {
		type: "object",
		properties: compiled.properties,
		...compiled.required === void 0 ? {} : { required: compiled.required }
	};
	assertSupportedJsonSchema(schema);
	return schema;
}
/** Invalid model-generated arguments for a typed tool. */
var ToolArgsError = class extends HarnessError {
	/** Individual violations in schema-walk order. */
	violations;
	constructor(violations) {
		super(`invalid arguments: ${violations.join("; ")}`, "INVALID_ARGS");
		this.name = "ToolArgsError";
		this.violations = violations;
	}
};
/**
* Define a first-party tool with inferred arguments and strict execution
* validation. Replay-only presenters validate softly and fall back to generic
* rendering for obsolete logged arguments.
* @param options - typed definition and optional finalizer and presenters.
* @returns A registry-ready definition.
*/
function defineTool(options) {
	const userExecute = options.execute;
	const userFinalizeContent = options.finalizeContent;
	const userRender = options.output.render;
	const userPresentationMeta = options.output.presentationMeta;
	const userPresentCall = options.presentCall;
	const userPresentResult = options.presentResult;
	const userIsConcurrencySafe = options.isConcurrencySafe;
	if (options.timeoutMs !== void 0 && (!Number.isFinite(options.timeoutMs) || options.timeoutMs <= 0)) throw new Error(`defineTool(${options.name}): timeoutMs must be a positive finite number`);
	const parameters = parameterSchemaSpecToJsonSchema(options.parameters);
	const outputSchema = valueSchemaSpecToJsonSchema(options.output.schema);
	const validate = (args) => validateJsonSchemaValue(parameters, args, "");
	const tool = {
		name: options.name,
		description: options.description,
		parameters,
		output: {
			schema: outputSchema,
			render(args, value) {
				return userRender(args, value);
			},
			...userPresentationMeta !== void 0 ? { presentationMeta(args, value) {
				return userPresentationMeta(args, value);
			} } : {}
		},
		...options.timeoutMs !== void 0 ? { timeoutMs: options.timeoutMs } : {},
		async execute(args, exec) {
			const violations = validate(args);
			if (violations.length > 0) throw new ToolArgsError(violations);
			return userExecute(args, exec);
		}
	};
	if (userFinalizeContent) tool.finalizeContent = (exec, result) => userFinalizeContent(exec, result);
	if (userPresentCall) tool.presentCall = (args) => {
		if (validate(args).length > 0) return void 0;
		return userPresentCall(args);
	};
	if (userPresentResult) tool.presentResult = (args, result) => {
		if (validate(args).length > 0) return void 0;
		return userPresentResult(args, result);
	};
	if (userIsConcurrencySafe) tool.isConcurrencySafe = (args) => {
		if (validate(args).length > 0) return false;
		return userIsConcurrencySafe(args);
	};
	return tool;
}
/**
* Code Mode `run_code` transport. Programs call the registry's agent-visible
* tools through nested executions scheduled under the native concurrency
* contract; each sub-dispatch is logged for reconstruction, while only the
* outer curated result enters model history.
* @module @deepseek-ai/dsh-tools/src/code-mode
*/
/** The model-facing name of the Code Mode tool. */
const RUN_CODE_NAME = "run_code";
/**
* The TypeScript flavor: the fallback for a schema read with no runtime
* mounted ({@link resolveFlavor} owns which readers reach that). A real
* assembly always resolves a runtime first, so the model never sees this
* fallback outside its own language.
*/
const TYPESCRIPT_FLAVOR = {
	description: "Execute a TypeScript program against the available tools. Takes two required arguments: `code`, the BODY of an async function (erasable syntax only; top-level `await` and `return` work), and `description`, a short summary of what the program does. Call tools as `await tools.name(args)` per the declarations in the system prompt. Only what you print or return is program output — curate it. Image-bearing subtool results are attached after the run.",
	codeDescription: "The program: the body of an async TypeScript function."
};
/** Per-language `run_code` schema flavors (see {@link RunCodeFlavor}); one entry per {@link CodeSdkLanguage}. */
const RUN_CODE_FLAVORS = {
	typescript: TYPESCRIPT_FLAVOR,
	python: {
		description: "Execute a Python program against the available tools. Takes two required arguments: `code`, the BODY of an async function (top-level `await` and `return` work), and `description`, a short summary of what the program does. Call tools as `await tools.name(args)` per the declarations in the system prompt. Use `print(...)` and/or `return <value>` for program output — curate it. Image-bearing subtool results are attached after the run.",
		codeDescription: "The program: the body of an async Python function."
	}
};
/**
* The `description` parameter's model-facing description: language-independent
* (the UI label contract is the same for every runtime), shared between the
* static spec and the language-aware `parameters` getter so the two emissions
* can never drift.
*/
const RUN_CODE_DESCRIPTION_PARAM_DESCRIPTION = "Clear, concise description of what this program does in active voice, 5-10 words (shown in the UI). Examples: \"Count TODO markers across packages\"; \"Read failing test and its fixture\"; \"Rename config key in every cordis.yml\".";
/**
* Resolve the {@link RunCodeFlavor} for the loaded runtime's language, read at
* schema-emission time so the model-visible `run_code` schema always matches
* the SDK section's language. `peekRuntime` returns `undefined` only when no
* runtime is mounted, which reaches this function through definition readers
* and `schemas()` — the doc-catalog harvest is the only shipped one, and none
* of them feeds a model, because `wireSchemas` calls `requireCodeRuntime`
* before projecting — so that path degrades to {@link TYPESCRIPT_FLAVOR}. A
* mounted runtime whose language has no flavor entry fails loud, exactly as
* `requireCodeRuntime` rejects it at assembly. Keeping this table in step with
* `SDK_RENDERERS` is the compiler's job ({@link CodeSdkLanguage}); what this
* guard owns is the runtime-supplied language neither table knows, which never
* yields a wrong-language schema for a real runtime.
*/
function resolveFlavor(peekRuntime) {
	const runtime = peekRuntime();
	if (runtime === void 0) return TYPESCRIPT_FLAVOR;
	const flavor = RUN_CODE_FLAVORS[runtime.language];
	if (!Object.hasOwn(RUN_CODE_FLAVORS, runtime.language) || flavor === void 0) {
		const known = Object.keys(RUN_CODE_FLAVORS).map((name) => JSON.stringify(name)).join(", ");
		throw new Error(`dsh-tools: no run_code schema flavor registered for runtime language ${JSON.stringify(runtime.language)} (known: ${known})`);
	}
	return flavor;
}
/**
* Thrown by `run_code` when the program run itself failed — a program
* exception, a budget expiry, an abort, or substrate death. Extends
* {@link HarnessError} (`code: 'CODE_RUN_FAILED'`); the registry's execution
* pipeline converts it into a structured `isError` result whose text carries
* the failure kind plus the captured logs, so the model can self-correct.
*/
var CodeRunFailedError = class extends HarnessError {
	constructor(message) {
		super(message, "CODE_RUN_FAILED");
		this.name = "CodeRunFailedError";
	}
};
/**
* Snapshot one binding call's argument as lossless JSON, then snapshot that
* detached value again so dispatch and logging stay independent without
* reintroducing structured-clone's platform-specific nesting limit.
*/
function jsonNormalizeArgs(value) {
	let snapshot;
	try {
		snapshot = snapshotJsonValue(value);
	} catch (error) {
		throw new Error(`tool arguments must be lossless JSON: ${error instanceof Error ? error.message : String(error)}`);
	}
	if (snapshot === void 0) throw new Error("tool arguments must be lossless JSON (call the tool with an arguments object, e.g. `{}`)");
	const logged = snapshotJsonValue(snapshot);
	/* v8 ignore next -- snapshot is already a detached lossless JSON value. */
	if (logged === void 0) throw new Error("tool arguments could not be detached for durable logging");
	return {
		dispatched: snapshot,
		logged
	};
}
/** Two-space JSON presentation, matching the existing shallow `run_code` text contract. */
const JSON_INDENT = "  ";
/**
* ECMAScript caps `JSON.stringify`'s `space` string at ten characters. The
* renderer also caps TOTAL indentation there, compacting deeper subtrees, so
* formatted output remains linear in the canonical JSON size.
*/
const MAX_JSON_INDENT_CHARS = 10;
/** Render one non-string JSON root without recursive traversal or unbounded indentation growth. */
function renderJsonValue(value) {
	const chunks = [];
	const tasks = [{
		kind: "value",
		value,
		depth: 0,
		compact: false
	}];
	for (let task = tasks.pop(); task !== void 0; task = tasks.pop()) {
		if (task.kind === "text") {
			chunks.push(task.text);
			continue;
		}
		const current = task.value;
		if (current === null || typeof current === "boolean" || typeof current === "number") {
			chunks.push(String(current));
			continue;
		}
		if (typeof current === "string") {
			chunks.push(JSON.stringify(current));
			continue;
		}
		const compact = task.compact || (task.depth + 1) * 2 > MAX_JSON_INDENT_CHARS;
		const childDepth = task.depth + 1;
		if (Array.isArray(current)) {
			chunks.push("[");
			if (current.length === 0) {
				chunks.push("]");
				continue;
			}
			tasks.push({
				kind: "text",
				text: compact ? "]" : `\n${JSON_INDENT.repeat(task.depth)}]`
			});
			for (let index = current.length - 1; index >= 0; index--) {
				const item = current[index];
				/* v8 ignore next -- canonical JsonValue arrays are dense. */
				if (item === void 0) throw new Error("cannot render a sparse JSON array");
				tasks.push({
					kind: "value",
					value: item,
					depth: childDepth,
					compact
				});
				tasks.push({
					kind: "text",
					text: compact ? index === 0 ? "" : "," : `${index === 0 ? "\n" : ",\n"}${JSON_INDENT.repeat(childDepth)}`
				});
			}
			continue;
		}
		const keys = Object.keys(current);
		chunks.push("{");
		if (keys.length === 0) {
			chunks.push("}");
			continue;
		}
		tasks.push({
			kind: "text",
			text: compact ? "}" : `\n${JSON_INDENT.repeat(task.depth)}}`
		});
		for (let index = keys.length - 1; index >= 0; index--) {
			const key = keys[index];
			/* v8 ignore next -- the loop is bounded by the captured key count. */
			if (key === void 0) throw new Error("cannot render a missing JSON object key");
			const item = current[key];
			/* v8 ignore next -- canonical JsonValue records contain no undefined properties. */
			if (item === void 0) throw new Error("cannot render an undefined JSON object property");
			tasks.push({
				kind: "value",
				value: item,
				depth: childDepth,
				compact
			});
			tasks.push({
				kind: "text",
				text: compact ? `${index === 0 ? "" : ","}${JSON.stringify(key)}:` : `${index === 0 ? "\n" : ",\n"}${JSON_INDENT.repeat(childDepth)}${JSON.stringify(key)}: `
			});
		}
	}
	return chunks.join("");
}
/** Render one present program completion value for the model-facing result text. */
function renderValue(value) {
	return typeof value === "string" ? value : renderJsonValue(value);
}
/**
* Build the `run_code` {@link ToolDefinition}: required `code` and
* `description` parameters, executed through the dispatch bridge described
* above. The
* registry reserves it as presentation infrastructure under non-native modes,
* outside the filterable global/scoped capability layers.
* @param registry - the owning registry (sub-calls go through its `execute`,
*   bindings cover its registered tools).
* @param options - the registry-private capabilities described above.
* @returns the registry-ready definition.
*/
function createRunCodeTool(registry, options) {
	const { requireRuntime, peekRuntime, maxParallel, shapeDispatchLog } = options;
	const definition = defineTool({
		name: RUN_CODE_NAME,
		description: TYPESCRIPT_FLAVOR.description,
		parameters: {
			code: {
				type: "string",
				required: true,
				description: TYPESCRIPT_FLAVOR.codeDescription
			},
			description: {
				type: "string",
				required: true,
				description: RUN_CODE_DESCRIPTION_PARAM_DESCRIPTION
			}
		},
		output: {
			schema: {
				type: "object",
				additionalProperties: false,
				properties: {
					logs: {
						type: "array",
						required: true,
						items: { type: "string" }
					},
					result: { type: "json" }
				}
			},
			render: (_args, value) => {
				const rendered = value.result === void 0 ? "" : renderValue(value.result);
				const parts = [value.logs.join("\n"), rendered].filter((part) => part.length > 0);
				return [{
					type: "text",
					text: parts.length > 0 ? parts.join("\n") : "(run_code completed with no output)"
				}];
			}
		},
		async execute(args, exec) {
			if (args.description.trim().length === 0) throw new Error("invalid description: expected a non-empty string");
			const runtime = requireRuntime();
			const runController = new AbortController();
			const onOuterAbort = () => {
				runController.abort(exec.signal.reason);
			};
			exec.signal.addEventListener("abort", onOuterAbort, { once: true });
			let dispatches = 0;
			const pendingQueue = [];
			const inFlight = /* @__PURE__ */ new Set();
			/** Tracked settle-event side work (log-content listener + append), drained at run settlement. */
			const logWork = /* @__PURE__ */ new Set();
			const commitQueue = [];
			let exclusiveActive = false;
			let driving = false;
			let driverRun = Promise.resolve();
			let wake;
			const wakeup = () => {
				const release = wake;
				wake = void 0;
				release?.();
			};
			/**
			* The single ordered lane. Each pass commits the head-of-line settled
			* dispatch (ordered post-execute), then starts the next queued entry if
			* its slot is free (ordered pre-execute), and otherwise sleeps until a
			* body settles or a new submission arrives. One run reaching the
			* empty-queues/empty-pool state is quiescence.
			*/
			const drive = () => {
				if (driving) return driverRun;
				driving = true;
				driverRun = (async () => {
					try {
						for (;;) {
							const signal = new Promise((resolve) => {
								wake = resolve;
							});
							const commitHead = commitQueue[0];
							if (commitHead !== void 0 && commitHead.settled) {
								commitQueue.shift();
								await commitHead.commit();
								if (commitHead.mode === "exclusive") exclusiveActive = false;
								continue;
							}
							const head = pendingQueue[0];
							if (head !== void 0) {
								if (runController.signal.aborted) {
									pendingQueue.shift();
									head.abandon();
									continue;
								}
								const mode = head.classify();
								if (!exclusiveActive && (mode === "exclusive" ? inFlight.size === 0 : inFlight.size < maxParallel)) {
									if (mode === "exclusive") exclusiveActive = true;
									head.mode = mode;
									pendingQueue.shift();
									commitQueue.push(head);
									await head.start();
									const flight = head.flight.finally(() => {
										inFlight.delete(flight);
										wakeup();
									});
									inFlight.add(flight);
									continue;
								}
							}
							if (pendingQueue.length === 0 && commitQueue.length === 0 && inFlight.size === 0) return;
							await signal;
						}
					} finally {
						driving = false;
						wake = void 0;
					}
				})();
				return driverRun;
			};
			/** Every dispatch settled AND committed; nothing can start (the run is aborted at call time). */
			const drainDispatches = async () => {
				await drive();
				while (logWork.size > 0) await Promise.allSettled([...logWork]);
			};
			const runOver = () => runController.signal.aborted;
			const binding = (name) => async (rawArgs) => {
				if (runOver()) throw new Error(`run_code run is over (${String(runController.signal.reason)}); ${name} not dispatched`);
				const normalized = jsonNormalizeArgs(rawArgs);
				const n = ++dispatches;
				const subCallId = CallId(`${String(exec.callId)}:code:${n}`);
				const input = {
					callId: subCallId,
					rootCallId: exec.rootCallId,
					name,
					arguments: normalized.dispatched,
					...exec.agent ? { agent: exec.agent } : {},
					parent: exec.token,
					signal: runController.signal
				};
				const scheduler = registry[TOOL_RUNTIME_SCHEDULER];
				const outcome = await new Promise((resolve, reject) => {
					let parked;
					const settle = (result) => {
						resolve(result.isError ? {
							isError: true,
							message: result.error.message
						} : {
							isError: false,
							value: result.value
						});
						const agent = exec.agent;
						if (agent === void 0) return;
						const task = (async () => {
							const logged = await shapeDispatchLog({
								exec,
								agent,
								subCallId,
								name,
								isError: result.isError,
								content: result.content
							});
							agent.session.append("tool/code-dispatch", {
								rootCallId: exec.rootCallId,
								parentCallId: exec.callId,
								subCallId,
								name,
								arguments: normalized.logged,
								isError: result.isError,
								content: logged
							});
						})().finally(() => {
							logWork.delete(task);
						});
						logWork.add(task);
					};
					pendingQueue.push({
						flight: Promise.resolve(),
						settled: false,
						classify: () => registry.executionMode(input).kind,
						abandon: () => {
							reject(/* @__PURE__ */ new Error(`run_code run is over (${String(runController.signal.reason)}); ${name} tool call abandoned`));
						},
						async start() {
							exec.agent?.session.append("tool/code-dispatch-start", {
								rootCallId: exec.rootCallId,
								parentCallId: exec.callId,
								subCallId,
								name,
								arguments: normalized.logged
							});
							const prepared = await scheduler.prepare(input);
							if (prepared.kind === "dispatch") {
								this.flight = scheduler.dispatch(prepared.exec).then((dispatchOutcome) => {
									parked = {
										kind: dispatchOutcome.kind,
										exec: prepared.exec,
										result: dispatchOutcome.result
									};
									this.settled = true;
								});
								return;
							}
							parked = {
								kind: prepared.kind,
								exec: prepared.exec,
								result: prepared.result
							};
							this.settled = true;
						},
						async commit() {
							/* v8 ignore next -- commit() runs only after `settled` flipped, which set parked. */
							if (parked === void 0) return;
							const result = parked.kind === "post-result" ? await scheduler.finalize(parked.exec, parked.result) : scheduler.finish(parked.exec, parked.result);
							if (!result.isError && result.content.some((block) => block.type === "image")) exec.deferContext(createUserMessage({
								content: result.content,
								source: {
									kind: "plugin",
									plugin: "tools-code-mode"
								}
							}));
							for (const context of result.additionalContexts ?? []) exec.deferContext(context);
							if (result.concludesTurn) exec.concludeTurn();
							settle(result);
							while (logWork.size > maxParallel) await Promise.race(logWork);
						}
					});
					wakeup();
					drive();
				});
				if (runOver()) throw new Error(`run_code run is over (${String(runController.signal.reason)}); ${name} result discarded`);
				if (outcome.isError) throw new Error(outcome.message);
				return outcome.value;
			};
			const functions = Object.create(null);
			for (const schema of registry.schemas(exec.agent)) {
				if (schema.name === "run_code") continue;
				Object.defineProperty(functions, schema.name, {
					enumerable: true,
					value: binding(schema.name)
				});
			}
			try {
				let result;
				try {
					result = await runtime.run({
						program: args.code,
						bindings: [{
							global: "tools",
							functions,
							errorClass: {
								name: "ToolCallError",
								memberNameProperty: "toolName"
							}
						}],
						signal: runController.signal
					});
				} finally {
					runController.abort("run_code settled");
					await drainDispatches();
				}
				if (result.error) {
					const logsText = result.logs.length > 0 ? `\nCaptured output:\n${result.logs.join("\n")}` : "";
					throw new CodeRunFailedError(`code run failed (${result.error.kind}): ${result.error.message}${logsText}`);
				}
				return {
					logs: result.logs,
					...result.value !== void 0 ? { result: result.value } : {}
				};
			} finally {
				exec.signal.removeEventListener("abort", onOuterAbort);
			}
		},
		presentCall: (args) => ({
			card: "generic",
			title: args.description,
			kind: "execute",
			rawInput: args.code
		})
	});
	Object.defineProperty(definition, "description", {
		enumerable: true,
		get: () => resolveFlavor(peekRuntime).description
	});
	Object.defineProperty(definition, "parameters", {
		enumerable: true,
		get: () => parameterSchemaSpecToJsonSchema({
			code: {
				type: "string",
				required: true,
				description: resolveFlavor(peekRuntime).codeDescription
			},
			description: {
				type: "string",
				required: true,
				description: RUN_CODE_DESCRIPTION_PARAM_DESCRIPTION
			}
		})
	});
	return definition;
}
/**
* Code Mode codegen: the pure projection from registered tool schemas to the TypeScript SDK
* text the model programs against (the `tools:sdk` prompt section). Sibling of
* `json-schema.ts` — `schemas()` (native function calling) and this module (the generated
* `declare const tools` API) are two projections of the same store.
* @module @deepseek-ai/dsh-tools/src/ts-types
*/
/** Property names that are valid bare TS identifiers; anything else is quoted. */
const IDENTIFIER$1 = /^[A-Za-z_$][A-Za-z0-9_$]*$/;
/** Render an object key: bare when it is a valid identifier, quoted otherwise (every name stays reachable, no aliasing). */
function renderKey(name) {
	return IDENTIFIER$1.test(name) ? name : JSON.stringify(name);
}
/** One `indent`-deep line prefix (two spaces per level). */
function pad$1(indent) {
	return "  ".repeat(indent);
}
/** A one-line JSDoc block for a schema `description`, or no lines when there is none. */
function docLines$1(description, indent) {
	if (typeof description !== "string" || description.length === 0) return [];
	const collapsed = description.replace(/\s+/g, " ").trim();
	return [`${pad$1(indent)}/** ${collapsed.replaceAll("*/", String.raw`*\/`)} */`];
}
/** Render one scalar already validated by the unified schema boundary. */
function renderScalar(value) {
	return JSON.stringify(value);
}
/** Render a validated scalar `const`/`enum`, falling back to the broad type. */
function renderConstrainedScalar$1(node, type) {
	const broad = type === "integer" ? "number" : type;
	if (Object.hasOwn(node, "const")) return renderScalar(node.const);
	if (Object.hasOwn(node, "enum")) return node.enum.map(renderScalar).join(" | ");
	return broad;
}
/** Build one document from captured parts while retaining the legacy array-parenthesization test. */
function typeDocumentFrom(parts) {
	return {
		parts,
		containsUnionOrIntersection: parts.some((part) => typeof part === "string" ? part.includes("|") || part.includes("&") : part.containsUnionOrIntersection)
	};
}
/** Build a small document without an intermediate array at each call site. */
function typeDocument(...parts) {
	return typeDocumentFrom(parts);
}
/** Flatten a nested document with an explicit work stack. */
function flattenTypeDocument(document) {
	const chunks = [];
	const tasks = [document];
	for (let task = tasks.pop(); task !== void 0; task = tasks.pop()) {
		if (typeof task === "string") {
			chunks.push(task);
			continue;
		}
		for (let index = task.parts.length - 1; index >= 0; index--) {
			const part = task.parts[index];
			/* v8 ignore next -- the loop is bounded by the captured part count. */
			if (part !== void 0) tasks.push(part);
		}
	}
	return chunks.join("");
}
/** Initialize one schema-render frame with empty aggregation state. */
function schemaRenderFrame(node, indent) {
	return {
		node,
		indent,
		phase: "start",
		children: [],
		childIndex: 0,
		childDocuments: [],
		entries: []
	};
}
/** Render an already asserted schema to a composable document. */
function renderSupportedSchema(schema, indent) {
	const frames = [schemaRenderFrame(schema, indent)];
	let rootDocument;
	const finish = (document) => {
		frames.pop();
		const parent = frames.at(-1);
		if (parent === void 0) rootDocument = document;
		else parent.childDocuments.push(document);
	};
	while (frames.length > 0) {
		const frame = frames.at(-1);
		/* v8 ignore next -- the loop condition guarantees a current frame. */
		if (frame === void 0) break;
		if (frame.phase === "children") {
			if (frame.childIndex < frame.children.length) {
				const child = frame.children[frame.childIndex];
				/* v8 ignore next -- childIndex is bounded by children.length. */
				if (child === void 0) throw new Error("missing schema render child");
				frame.childIndex++;
				frames.push(schemaRenderFrame(child.node, child.indent));
				continue;
			}
			if (frame.kind === "oneOf") {
				const parts = [];
				for (let index = 0; index < frame.childDocuments.length; index++) {
					if (index > 0) parts.push(" | ");
					const child = frame.childDocuments[index];
					/* v8 ignore next -- child documents correspond one-to-one with children. */
					if (child !== void 0) parts.push(child);
				}
				finish(typeDocumentFrom(parts));
				continue;
			}
			if (frame.kind === "array") {
				const child = frame.childDocuments[0];
				/* v8 ignore next -- array frames always schedule exactly one child. */
				if (child === void 0) throw new Error("missing array item type");
				finish(child.containsUnionOrIntersection ? typeDocument("(", child, ")[]") : typeDocument(child, "[]"));
				continue;
			}
			const required = new Set(frame.node.required);
			const parts = ["{"];
			for (let index = 0; index < frame.entries.length; index++) {
				const entry = frame.entries[index];
				const child = frame.childDocuments[index];
				/* v8 ignore next -- object entries and child documents have the same length. */
				if (entry === void 0 || child === void 0) throw new Error("missing object property type");
				const [name, prop] = entry;
				for (const line of docLines$1(prop.description, frame.indent + 1)) parts.push("\n", line);
				parts.push("\n", `${pad$1(frame.indent + 1)}${renderKey(name)}${required.has(name) ? "" : "?"}: `, child, ";");
			}
			parts.push("\n", `${pad$1(frame.indent)}}`);
			const declared = typeDocumentFrom(parts);
			finish(frame.node.additionalProperties === false ? declared : typeDocument(declared, " & Record<string, JsonValue>"));
			continue;
		}
		const node = frame.node;
		if (node.oneOf !== void 0) {
			frame.kind = "oneOf";
			frame.children = Array.from(node.oneOf, (child) => ({
				node: child,
				indent: frame.indent
			}));
			frame.childIndex = 0;
			frame.childDocuments = [];
			frame.phase = "children";
			continue;
		}
		if (node.type === void 0) {
			finish(typeDocument("JsonValue"));
			continue;
		}
		switch (node.type) {
			case "string":
			case "number":
			case "integer":
			case "boolean":
			case "null":
				finish(typeDocument(renderConstrainedScalar$1(node, node.type)));
				break;
			case "array":
				if (node.items === void 0) finish(typeDocument("JsonValue[]"));
				else {
					frame.kind = "array";
					frame.children = [{
						node: node.items,
						indent: frame.indent
					}];
					frame.childIndex = 0;
					frame.childDocuments = [];
					frame.phase = "children";
				}
				break;
			case "object": {
				const open = node.additionalProperties !== false;
				const entries = Object.entries(node.properties ?? {});
				if (entries.length === 0) finish(typeDocument(open ? "Record<string, JsonValue>" : "Record<string, never>"));
				else {
					frame.kind = "object";
					frame.entries = entries;
					frame.children = entries.map(([, child]) => ({
						node: child,
						indent: frame.indent + 1
					}));
					frame.childIndex = 0;
					frame.childDocuments = [];
					frame.phase = "children";
				}
				break;
			}
			/* v8 ignore next -- assertSupportedJsonSchema narrowed this closed type union. */
			default: finish(typeDocument("unknown"));
		}
	}
	/* v8 ignore next -- every root frame produces one document. */
	return rootDocument ?? typeDocument("unknown");
}
/**
* Map one enforced JSON-Schema node to a TypeScript type literal. Supports
* every unified schema construct and returns `unknown` for malformed or
* unsupported inputs without throwing.
* @param schema - the JSON-Schema node (any shape; hostile inputs degrade).
* @param indent - the indentation level for nested object members.
* @returns the TS type text (multi-line for objects with properties).
*/
function jsonSchemaToTs(schema, indent = 0) {
	try {
		assertSupportedJsonSchema(schema);
		return flattenTypeDocument(renderSupportedSchema(schema, indent));
	} catch {
		return "unknown";
	}
}
/** The fixed model-facing usage contract rendered above the declarations (see the Code Mode Agent Note's "What the model sees"). */
const SDK_INSTRUCTIONS$1 = `## Writing code for run_code

\`run_code\` takes two required arguments: \`code\` — the body of an async TypeScript function (erasable syntax only — no \`enum\` or namespaces; type annotations are advisory, the code runs type-stripped) — and \`description\`, a short summary of what the program does. Inside the program:

- Call tools as \`await tools.name(args)\` — quoted access for exotic names: \`tools["my-tool"](args)\`. Every call resolves to the tool's typed canonical JSON value. Tool arguments must be lossless JSON.
- A FAILED tool call rejects with \`ToolCallError\`, whose \`toolName\` identifies the failed tool and whose \`message\` is human-readable — \`try/catch\` it to handle and continue.
- Independent read-only calls MAY overlap under \`Promise.all\` (safe calls run concurrently; mutating calls run alone, in submission order). Sequence dependent work with \`await\`.
- Emit results with \`return\` and/or \`console.log(...)\`. Only what you print or return is program output. A successful tool result containing an image is attached after the run so you can inspect it on the next step; every other intermediate result stays out of the conversation, so extract just what you need.

The available tools:`;
/**
* Render the full `tools:sdk` prompt section: the fixed usage instructions
* plus one `declare const tools` interface covering every given tool.
* Deterministic — tools are emitted in lexicographic name order, so an
* unchanged tool set produces byte-identical text across assemblies. The sort
* is not a total order on byte-equal names, so two schemas sharing a name
* would render in argument order; the caller's visible-capability map is keyed
* by name, so the input never carries a duplicate.
* @param schemas - the tool schemas to declare (the caller excludes
*   `run_code` itself).
* @returns the complete section text.
*/
function renderToolsSdk(schemas) {
	const sorted = [...schemas].sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
	const argsMembers = [];
	const outputMembers = [];
	for (const schema of sorted) {
		argsMembers.push(...docLines$1(schema.description, 1));
		argsMembers.push(`${pad$1(1)}${renderKey(schema.name)}: ${jsonSchemaToTs(schema.parameters, 1)};`);
		outputMembers.push(`${pad$1(1)}${renderKey(schema.name)}: ${jsonSchemaToTs(schema.output, 1)};`);
	}
	return `${SDK_INSTRUCTIONS$1}\n\n\`\`\`ts\ntype JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue }\n\n${[
		`interface ToolArgsMap {${argsMembers.length > 0 ? `\n${argsMembers.join("\n")}\n` : ""}}`,
		`interface ToolOutputMap {${outputMembers.length > 0 ? `\n${outputMembers.join("\n")}\n` : ""}}`,
		"type ToolName = keyof ToolOutputMap",
		[
			"declare class ToolCallError extends Error {",
			"  readonly name: \"ToolCallError\";",
			"  readonly toolName: ToolName;",
			"}"
		].join("\n"),
		[
			"declare const tools: {",
			"  [K in ToolName]: (args: ToolArgsMap[K]) => Promise<ToolOutputMap[K]>;",
			"}"
		].join("\n")
	].join("\n\n")}\n\`\`\``;
}
/**
* Code Mode codegen — Python flavor. The pure projection from registered tool schemas to the
* Python SDK text the model programs against under `runtime.language === 'python'`. Sibling of
* {@link ./ts-types.ts | ts-types.ts}; the two files are two projections of the same registry
* store, keyed by the loaded {@link @deepseek-ai/dsh-code-runtime#CodeRuntime.language | code
* runtime's language}.
*
* Under `mode: 'code'` the native tool schemas are omitted from the request, so this generated
* SDK is the model's ONLY source for each tool's argument names, required fields, types,
* descriptions, and canonical output shapes; under `mode: 'both'` the native schemas ship
* alongside it and it is one of two. Object-shaped arguments and outputs therefore render as one
* named `TypedDict` per tool (and per nested object), not an opaque `dict[str, Any]`, so the
* shape survives into the program under the mode that has nothing else to carry it.
* @module @deepseek-ai/dsh-tools/src/py-types
*/
/**
* The reference grammar's `xid_start xid_continue*` — the set
* `str.isidentifier()` accepts on a CPython whose Unicode tables match the
* engine's. See {@link isBareIdentifier} for what a version skew does.
*/
const IDENTIFIER = /^[\p{XID_Start}_]\p{XID_Continue}*$/u;
/**
* Whether a name can be emitted as a bare Python identifier rather than
* routed to the subscript/`dict[str, Any]` path.
*
* Python identifiers are not ASCII: `路径` is as legal a field name as `path`,
* and rejecting it would degrade the whole enclosing object, dropping every
* field's name, requiredness, and type — information whose only source under
* `mode: 'code'` is this generated text.
*
* NFKC stability is a second and separate condition, because CPython
* normalizes identifiers at compile time while JSON keys are compared as
* written: `ﬁeld` would be declared and reachable as `field`, so the SDK would
* advertise a key under a spelling the harness never accepts, and two keys
* that normalize together would collapse into one declaration. Those names
* take the subscript path, which carries their exact bytes.
*
* `IDENTIFIER` matches `str.isidentifier()` (measured on Node 22.23.1 vs
* CPython 3.9.6 tables): the equivalence holds inside the two versions' shared
* tables, and the skew characters below are exactly where that pair diverges.
* The predicate as a whole is deliberately stricter than `isidentifier()`,
* which does not test NFKC stability: `'ﬁeld'.isidentifier()` is True and
* this returns false.
*
* Both conditions are evaluated against the ENGINE's Unicode tables, and the
* two sides are versioned independently — `\p{XID_Start}`/`\p{XID_Continue}`
* follow the running engine (Node 22.23.1 reports Unicode 17.0) while CPython
* follows its own (3.9.6 reports 13.0.0). The skew is not symmetric. A CPython
* older than the engine is the dangerous direction: a character added to either
* property since its tables (U+10570 Vithkuqi and U+1E290 Toto, 14.0; U+1E4D0
* Nag Mundari, 15.0; U+1C89 Cyrillic TJE, 16.0 — ages per `DerivedAge.txt`; all
* four are NFKC-stable and accepted here, and all four are `Cn` on that 3.9.6,
* which rejects them) is emitted bare and its tokenizer refuses the character,
* taking the whole SDK block down — the same parseability invariant
* {@link UNPRINTABLE}, {@link LONE_SURROGATE} and {@link MAX_LIST_NESTING}
* exist for. Both properties carry it: a character added only to `XID_Continue`
* passes the trailing `\p{XID_Continue}*` in a tail position and fails the same
* way — U+200C ZWNJ and U+200D ZWJ are that case, gaining `XID_Continue` in UCD
* 15.1 and absent from it in 13.0.0, 14.0.0 and 15.0.0, so `a\u{200C}b` is
* emitted bare here while `isidentifier()` is False on 3.9.6 and on 3.12.13
* (15.0.0). A CPython newer than the engine only routes a legal name to the
* subscript/`dict[str, Any]` path: less readable, still correct. The NFKC
* condition reduces to the same skew, since normalization stability guarantees
* an assigned character's normalization never changes afterwards.
*
* This predicate is not the only reader of engine tables. {@link camelCase}
* reads them at three further points — its split set, its head test, and its
* `toUpperCase()` case mapping — and this predicate's verdict gates none of
* them: a class name derived there reaches emitted text whenever any object
* shape in the tool's schema declares a `TypedDict`, including for a tool this
* predicate rejected. A tool named `zz-\u{1E4D0}x` with such parameters never
* reaches the skew here (the `-` rejects it outright) yet emits `class
* Zz\u{1E4D0}xArgs`, which that same 3.9.6 refuses — Nag Mundari arrived two
* releases after its tables. The case mapping is a separate table rather than
* an XID membership test, and it fails on names both conditions above accept:
* `\u{019B}` is XID_Start and NFKC-stable, so this predicate accepts it and
* `async def \u{019B}` compiles on 3.9.6, but Node uppercases it to
* `\u{A7DC}` — unassigned in that CPython, whose own `.upper()` is the identity
* here — and the declared `class \u{A7DC}Args` fails with `invalid
* non-printable character U+A7DC`. Closing the exposure therefore covers all
* four read points, not this predicate alone; it needs the target interpreter's
* version, which the backend reporting `language: 'python'` owns; the
* language-dispatch Agent Note records the deferral.
*
* The `ts-types` sibling keeps its own ASCII rule rather than sharing this
* one: ECMAScript identifiers are a different set (`$`) and are never
* normalized, so one predicate cannot be correct for both. ZWJ/ZWNJ are not
* part of that difference — both sets carry them on the engine's tables; what
* separates the two there is the CPython table version above.
* @param name - the raw schema field or tool name.
* @returns whether the name can be emitted bare.
*/
function isBareIdentifier(name) {
	return IDENTIFIER.test(name) && name.normalize("NFKC") === name;
}
/**
* Python hard keywords: reserved everywhere, so a tool or field named
* ``class`` or ``lambda`` is legal on the wire but not as an attribute
* (``tools.class`` would be a SyntaxError in the model program) and not as a
* class-syntax `TypedDict` field. Such a tool renders under subscript access
* and such an object degrades to ``dict[str, Any]`` — the model still reaches
* every tool and field without collisions.
* Soft keywords (``match``, ``case``, ``type``, ``_`` — the language
* reference's whole set) are deliberately ABSENT: each is special in exactly
* one syntactic position — a statement head (``match``, ``type``), a ``match``
* statement's clause head (``case``), or a pattern (``_``) — so ``match: str``
* as a field and ``async def match(...)`` as a method are both legal, and
* including them would needlessly degrade common search/regex tool fields to
* ``dict[str, Any]``. Underscore-leading names are handled separately, not
* here: a non-dunder ``__token`` name-mangles, a dunder present on
* ``object``/``type`` resolves before the proxy hook, and implicit
* special-method lookup bypasses the hook.
*/
const RESERVED = /* @__PURE__ */ new Set([
	"False",
	"None",
	"True",
	"and",
	"as",
	"assert",
	"async",
	"await",
	"break",
	"class",
	"continue",
	"def",
	"del",
	"elif",
	"else",
	"except",
	"finally",
	"for",
	"from",
	"global",
	"if",
	"import",
	"in",
	"is",
	"lambda",
	"nonlocal",
	"not",
	"or",
	"pass",
	"raise",
	"return",
	"try",
	"while",
	"with",
	"yield",
	"__debug__"
]);
/** `typing` symbols this module may emit, in the deterministic import order. */
const TYPING_ORDER = [
	"Any",
	"Literal",
	"NotRequired",
	"Protocol",
	"TypedDict"
];
/** `indent`-deep line prefix (four spaces per level to match PEP 8 output). */
function pad(indent) {
	return "    ".repeat(indent);
}
/**
* The `Cc` code points that survive the whitespace collapse in {@link describe}
* and have no printable form: the C0 controls, DEL, and the C1 controls. Only
* U+0009 to U+000D are absent, because ECMAScript `\s` already collapsed them —
* `\s` is TAB/VT/FF/SP/NBSP/ZWNBSP/Zs plus LF/CR/LS/PS, so no C1 code point is
* in it and the whole U+0080 to U+009F block reaches this rule intact. Those
* are not hypothetical input: they are what Windows-1252 bytes 0x80 to 0x9F
* (smart quotes, em dash) become when decoded as Latin-1.
* CPython rejects source containing a NUL outright
* (`SyntaxError: source code string cannot contain null bytes`), whether it
* sits in a docstring or in a comment, so one such byte anywhere in a schema
* description would make the whole generated SDK unparseable — under
* `mode: 'code'`, the model's only declaration of the tools. The rest are
* legal but invisible; escaping them with the same rule keeps the emitted text
* readable and the treatment uniform.
*
* The boundary is the category, not per-code-point addressability: `\xNN`
* addresses U+0000 to U+00FF, so one escape form covers `Cc` exactly. The
* invisible `Cf` formatting characters pass through by design — of them only
* U+00AD soft hyphen would fit `\xNN` at all, and escaping that one while
* U+200B ZWSP, U+200E/U+200F bidi marks, and U+2060 word joiner passed through
* would leave a rule that is neither category- nor addressability-shaped. The
* whole family is legal in both consumers, since only LF and CR terminate a
* Python string literal or a `#` comment. That set is the tokenizer's, not
* `str.splitlines()`': NEL (U+0085), LS (U+2028), and PS (U+2029) split a
* string at run time but do not end a physical line in source — measured on
* CPython 3.9.6 and 3.12.13, each accepted in both positions with the value
* round-tripping — so they are safe raw wherever they reach emitted text
* unescaped, which for all three is `JSON.stringify`, at two call sites:
* {@link pyScalar}'s literal path, and the subscript tool-name comment's own
* call, which a name carrying any of them always reaches, none being
* `XID_Continue`. The `description` path escapes NEL under the class above and
* folds LS and PS in {@link describe}'s `\s+` collapse, both being `\s`.
*/
const UNPRINTABLE = /[\u0000-\u0008\u000e-\u001f\u007f-\u009f]/g;
/**
* Unpaired surrogate code points, escaped by {@link describe} as `\uNNNN` —
* its own form, since `\xNN` stops at U+00FF. The `u` flag is what makes this
* the LONE ones: in Unicode mode a well-formed pair is a single astral code
* point outside D800 to DFFF, so an emoji in a description survives untouched.
*
* This is the NUL case from {@link UNPRINTABLE}, not the invisible-character
* case. Python source must be UTF-8-encodable and a lone surrogate is not, so
* `compile()` raises `UnicodeEncodeError: surrogates not allowed` for one
* anywhere in the text — measured on 3.9 for a string literal and for a `#`
* comment alike. A raw or MCP tool description reaches this: `JSON.parse` on a
* wire `"\ud800"` escape yields exactly such a code point.
*/
const LONE_SURROGATE = /[\ud800-\udfff]/gu;
/**
* The collapsed one-line `description` of a schema node (byte-stable across
* formatting churn), or `undefined` when the node carries none. Every caller
* passes an object — a validated property node, the `ToolSdkSchema` itself, or
* the `{ description }` wrapper {@link docLines} synthesizes — so only the
* description field needs guarding. A description that collapses
* to nothing (empty, or whitespace only) is `undefined` too: it documents the
* node no better than an absent one, and emitting it would leave an empty
* `"""` docstring or a bare `#   ` line in the SDK. Only ECMAScript whitespace
* folds, so a description of whitespace plus one surviving control character is
* NOT absent: it collapses to that character's visible escape.
*
* Control characters left over after the whitespace collapse are rendered as
* their `\xNN` escapes (see {@link UNPRINTABLE}) and unpaired surrogates as
* their `\uNNNN` escapes (see {@link LONE_SURROGATE}); the escape's own backslash is
* emitted literally by both consumers, since {@link docLines} doubles it into a
* Python source escape and a `#` comment carries it verbatim.
*/
function describe(schema) {
	const description = schema.description;
	if (typeof description !== "string") return void 0;
	const collapsed = description.replace(/\s+/g, " ").replace(UNPRINTABLE, (char) => `\\x${char.charCodeAt(0).toString(16).padStart(2, "0")}`).replace(LONE_SURROGATE, (char) => `\\u${char.charCodeAt(0).toString(16).padStart(4, "0")}`).trim();
	return collapsed.length === 0 ? void 0 : collapsed;
}
/**
* One-line docstring for a tool `description`, or no lines when there is none.
* Backslashes are doubled first, every quote is escaped, and a trailing
* backslash cannot survive: a description ending in `"` or an odd backslash
* would otherwise merge with (or escape) the closing triple quote and make
* the generated block — Code Mode's only SDK — syntactically invalid Python.
*/
function docLines(description, indent) {
	const collapsed = describe({ description });
	if (collapsed === void 0) return [];
	const escaped = collapsed.replaceAll("\\", "\\\\").replaceAll("\"", "\\\"");
	return [`${pad(indent)}"""${escaped}"""`];
}
/**
* CamelCase a name into a Python type identifier: non-identifier characters
* split words, `_` splits too (it is `XID_Continue`, so the split set names it
* explicitly), and a head that cannot start an identifier takes a `Tool`
* prefix. Unicode survives, so a `路径` field yields `路径`-based class names
* instead of collapsing to the bare prefix. A character that is not
* `XID_Continue` splits even when it is a letter, so a name whose NFKC folding
* would leave the identifier set is not carried through — the split set is the
* grammar's, not an ASCII approximation of it.
*
* The result is NFKC-normalized: these names are generated, never matched
* against a JSON key, so normalizing is free here and keeps what CPython
* compiles identical to what is emitted — unlike {@link isBareIdentifier},
* which must reject unstable names outright. Normalizing AFTER the prefix
* decision is what makes that hold at the seam the prefix creates: `Tool` +
* a combining-mark head composes there (`U+0301` gives `Tooĺ`, U+013A), so
* normalizing only the un-prefixed part would emit a name CPython compiles to
* a different symbol. The second call is idempotent on the un-prefixed arm.
*
* The split set, the head test, and `toUpperCase()` all read the engine's
* Unicode tables, so this function carries the same version skew
* {@link isBareIdentifier} documents, by paths independent of it: a class name
* derived here reaches emitted text whenever any object shape in the tool's
* schema declares a `TypedDict`, and the predicate's verdict on the tool name
* does not gate that. The case mapping is the one that can fail on a name the
* predicate accepted; the worked example is there.
* @param raw - the schema field or tool name to derive from.
* @returns a class-name segment safe to emit.
*/
function camelCase(raw) {
	const joined = raw.split(/[^\p{XID_Continue}]+|_+/u).filter((part) => part.length > 0).map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`).join("").normalize("NFKC");
	return (/^\p{XID_Start}/u.test(joined) ? joined : `Tool${joined}`).normalize("NFKC");
}
/** Class-name base cap keeping each emitted name — and total text — linear in schema depth. */
const MAX_CLASS_NAME_BASE = 120;
/**
* Deepest `list[…]` nesting emitted into one annotation before the item type
* degrades to `Any`. CPython's tokenizer rejects a logical line holding more
* than 200 simultaneously-open brackets (`MAXLEVEL`, `SyntaxError: too many
* nested parentheses`), so an array chain deeper than that would render an SDK
* block that is not valid Python at all — the same failure the docstring
* escaping in {@link docLines} exists to prevent. 180 leaves headroom for the
* few brackets an annotation can add around the chain, all of which count
* toward the same limit. Per emission site, counting brackets open at the
* chain's innermost point:
*
* - Return annotation, `async def f(self, args: X) -> chain:` — 180 `list[`
*   plus an innermost `Literal[`. The parameter list's `(` closed at the `)`
*   before the `->`, so it is NOT open here: 181.
* - TypedDict field, `field: NotRequired[chain]` — a class-body line with no
*   other open bracket, and its children start at `listDepth: 1` to reserve
*   the `NotRequired[`, so 179 `list[` plus `Literal[`: 181. Required fields
*   share that start for uniformity, spending one level of representable depth
*   on a bracket they never emit.
* - Argument annotation, `async def f(self, args: chain) -> Y:` — the `(` IS
*   still open around it: 180 `list[` plus `Literal[` plus the paren, 182, the
*   worst case. Reachable only through a raw `register()` whose `parameters`
*   is an array reached from the root through `oneOf` arms alone — the root
*   array itself, or one nested under any depth of unions, since an arm
*   inherits the enclosing depth unchanged (`A | B` opens no bracket). An
*   object ancestor takes it out of this case: its fields restart the chain at
*   the 181 site. `defineTool` compiles an object root, so the annotation is a
*   bare TypedDict class name or a one-bracket `dict[str, Any]` when that
*   object degrades — never a chain.
*
* A CPython grammar limit, not a deployment choice, so it is fixed rather than
* configurable. The sibling `ts-types` renderer needs no counterpart: nothing
* in the TypeScript grammar bounds nesting, and its SDK block is never type-
* checked. Only bracket nesting counts — a `oneOf` renders as a flat `A | B`
* chain and nested objects render as separate `class` statements, so neither
* accumulates open brackets at any depth. The invariant this cap serves is
* grammatical validity; see the `oneOf` arm in {@link renderType} for the one
* interpreter limit deliberately left uncapped.
*/
const MAX_LIST_NESTING = 180;
/**
* Cap a class-name base at {@link MAX_CLASS_NAME_BASE} (see the callers for
* why capping keeps the render linear). `slice` counts UTF-16 code units, so
* an astral character straddling the boundary would be cut in half and leave a
* lone surrogate — not an identifier character, and not even well-formed text;
* drop it rather than emit it.
*/
function capClassNameBase(base) {
	if (base.length <= MAX_CLASS_NAME_BASE) return base;
	const capped = base.slice(0, MAX_CLASS_NAME_BASE);
	return /[\uD800-\uDBFF]$/.test(capped) ? capped.slice(0, -1) : capped;
}
/**
* Reserve a unique class name from a base, suffixing `2`, `3`, … on collision.
* The base is capped at {@link MAX_CLASS_NAME_BASE} first: child class names
* derive from their parent's allocated name (`ParentChild`), so an unbounded
* schema of single-field objects would otherwise grow each name by one field
* per level and the sum of all names to Θ(depth²). Capping the base keeps each
* name — and the total emitted text — linear in depth. Collisions resume from
* the per-base counter in `state.nextClassCounter` rather than rescanning from
* `2`, so a deep chain sharing one capped base stays O(1) per allocation
* (amortized) instead of Θ(depth²) in time.
*/
function allocateClassName(base, state) {
	const capped = capClassNameBase(base);
	let name = capped;
	if (state.usedClassNames.has(name)) {
		let n = state.nextClassCounter.get(capped) ?? 2;
		while (state.usedClassNames.has(`${capped}${n}`)) n++;
		name = `${capped}${n}`;
		state.nextClassCounter.set(capped, n + 1);
	}
	state.usedClassNames.add(name);
	return name;
}
/**
* Append a child-name segment to a parent class-name base, capping the result
* at {@link MAX_CLASS_NAME_BASE}. Capping AT PROPAGATION (not only inside
* {@link allocateClassName}) keeps each level O(1): a deep `oneOf`- or
* object-chain would otherwise carry an ever-growing ConsString down the tree
* and re-materialize it (via `.length`/`.slice`) at every level — Θ(depth²).
* The bounded base plus the collision counter still yields unique names.
*
* The join is NFKC-normalized because both sides are separately normalized yet
* their concatenation need not be: a base ending in a Hangul L jamo or LV
* syllable composes with a following V or T jamo head (`가` + `ᆨ` gives `각`),
* so the emitted class name would differ from the symbol CPython compiles, and
* two byte-distinct names could fold onto one — `usedClassNames` dedupes by the
* raw bytes, so the collision counter would not see it. Normalizing costs
* O(cap + segment) per level, the same order as the `slice` it feeds. The other
* two join points need no counterpart: `Args`/`Output` start with `A`/`O` and
* {@link allocateClassName}'s suffix is digits, none of which compose backwards.
*/
function childClassName(base, segment) {
	return capClassNameBase(`${base}${segment}`.normalize("NFKC"));
}
/**
* Render one validated scalar as Python literal text (`True`/`False`,
* JSON-quoted strings, bare numbers). `null` cannot reach here: the `null`
* type renders directly as `None`, and the unified validator rejects a null
* `const`/`enum` entry on every other scalar type.
*
* A beyond-safe-range integral number takes `BigInt` digits rather than
* `String`: Python integers are arbitrary-precision, so the emitted digits ARE
* the value the model programs against, and `String` can give a different
* integer than the double holds (`2 ** 60` prints the rounded `...847000`, not
* the exact `...846976`) or no integer literal at all (`1e21` prints `1e+21`).
* `String`'s rounding is not a bug in it: `Number::toString` emits the shortest
* decimal string that re-reads to the same double, then pads to the exponent
* with zeros (1 significant digit for `1e20`, 16 for `2 ** 60`) — and when the
* shortest string is shorter than the double's exact value, those padded digits
* name an integer no double holds. Passing one back would have to cross the
* argument boundary as a JSON number — a double again — so the SDK would
* document a value no program can pass. `BigInt` needs no case split: where
* `String` is already exact (`2 ** 53`, `1e20`) the two agree byte for byte,
* and where it is not, `BigInt` is the exact one. The TS flavor needs no
* counterpart at all: its literal is re-read by a JS parser back into the same
* double.
*
* `JSON.stringify` is also what keeps this path's output parseable, and it is
* the only thing that does. It covers both classes of hazard: the two kinds of
* code point CPython refuses anywhere in source — NUL among the C0 controls,
* and the whole D800–DFFF unpaired-surrogate block, escaped under ES2019
* well-formed stringification, which the engines range guarantees — and the
* ones that break this line in particular, a bare `"` closing the literal
* early, a trailing odd backslash eating the closing quote, and a bare LF/CR
* ending it before its terminator. The `description` path carries
* {@link UNPRINTABLE} and {@link LONE_SURROGATE} because nothing quotes it,
* and folds newlines in {@link describe}.
*
* That leans on a coincidence worth naming: every escape `JSON.stringify` can
* emit (`\"`, `\\`, `\b`, `\f`, `\n`, `\r`, `\t`, `\uXXXX`) is also a Python
* escape denoting the same character, so the emitted `Literal[...]` both
* parses and decodes back to the value the schema declared. DEL, the C1
* controls (NEL among them), and LS/PS (U+2028/U+2029) do reach it raw —
* legal but invisible, byte-for-byte as in the TS flavor; escaping them is a
* both-flavors change. Those last three are legal here for the reason
* {@link UNPRINTABLE} records: they are `str.splitlines()` boundaries, not
* tokenizer line terminators. The subscript tool-name comment quotes its name
* through its own call to the same `JSON.stringify`, never through this
* function, and inherits both halves — escapes and pass-throughs alike.
*/
function pyScalar(value) {
	if (value === true) return "True";
	if (value === false) return "False";
	if (typeof value === "string") return JSON.stringify(value);
	if (typeof value === "number" && Number.isInteger(value) && !Number.isSafeInteger(value)) return BigInt(value).toString();
	return String(value);
}
/**
* Render a validated scalar `const`/`enum` as `Literal[...]`, falling back to
* the broad type. Deliberately deviates from PEP 586, which restricts `Literal`
* parameters to int/bool/str/bytes/enum/None: a non-integral number
* `const`/`enum` emits a float literal (`Literal[1.5]`) a strict checker would
* reject. An integral one does not deviate — {@link pyScalar} emits int digits,
* including for the beyond-safe-range values it widens through `BigInt`, and
* PEP 586 admits int parameters. Harmless either way — the stub is advisory
* prompt text, only required to parse — and keeping the exact value
* communicates the constraint to the model.
*/
function renderConstrainedScalar(node, broad, state) {
	if (node.const !== void 0) {
		state.typing.add("Literal");
		return `Literal[${pyScalar(node.const)}]`;
	}
	if (node.enum !== void 0) {
		state.typing.add("Literal");
		return `Literal[${node.enum.map(pyScalar).join(", ")}]`;
	}
	return broad;
}
/**
* Map one JSON-Schema node to a Python type expression, threading `state` to
* collect the `TypedDict` declarations and `typing` symbols a full render
* needs. `className` is the name to give an object node with properties (and
* the prefix for its nested objects). Handles every unified schema construct —
* `oneOf` (→ `X | Y`), `const`/`enum` (→ `Literal[...]`), `integer` (→ `int`),
* `null` (→ `None`) — and degrades an unsupported or malformed schema to `Any`
* without throwing, the same trusted-after-validation stance as the sibling
* {@link ./ts-types.ts | ts-types} renderer. {@link jsonSchemaToPy} is the
* context-free entry point; this is the collecting core.
*/
function renderType(schema, className, state) {
	const newFrame = (schema, className, listDepth) => ({
		schema,
		className,
		phase: "start",
		listDepth,
		children: [],
		childIndex: 0,
		childTypes: [],
		entries: []
	});
	try {
		assertSupportedJsonSchema(schema);
		const frames = [newFrame(schema, className, 0)];
		let result;
		const finish = (type) => {
			frames.pop();
			const parent = frames.at(-1);
			if (parent === void 0) result = type;
			else parent.childTypes.push(type);
		};
		while (frames.length > 0) {
			const frame = frames.at(-1);
			/* v8 ignore next -- the loop condition guarantees a current frame. */
			if (frame === void 0) break;
			if (frame.phase === "children") {
				if (frame.childIndex < frame.children.length) {
					const child = frame.children[frame.childIndex];
					/* v8 ignore next -- childIndex is bounded by children.length. */
					if (child === void 0) throw new Error("missing python render child");
					frame.childIndex++;
					frames.push(newFrame(child.schema, child.className, child.listDepth));
					continue;
				}
				if (frame.kind === "oneOf") {
					let union = "";
					for (const [index, childType] of frame.childTypes.entries()) union = index === 0 ? childType : `${union} | ${childType}`;
					finish(union);
					continue;
				}
				if (frame.kind === "array") {
					/* v8 ignore next -- the ?? arm needs a childless array frame, which start never builds. */
					finish(`list[${frame.childTypes[0] ?? "Any"}]`);
					continue;
				}
				const node = frame.node;
				const name = frame.allocated;
				/* v8 ignore next -- typeddict frames always set node and allocated at start. */
				if (node === void 0 || name === void 0) throw new Error("missing typeddict frame state");
				const required = new Set(node.required);
				const lines = [`class ${name}(TypedDict):`];
				for (let index = 0; index < frame.entries.length; index++) {
					const entry = frame.entries[index];
					const fieldType = frame.childTypes[index];
					/* v8 ignore next -- entries and childTypes correspond one-to-one. */
					if (entry === void 0 || fieldType === void 0) throw new Error("missing typeddict field type");
					const [field, fieldSchema] = entry;
					const description = describe(fieldSchema);
					if (description !== void 0) lines.push(`${pad(1)}# ${description}`);
					if (required.has(field)) lines.push(`${pad(1)}${field}: ${fieldType}`);
					else {
						state.typing.add("NotRequired");
						lines.push(`${pad(1)}${field}: NotRequired[${fieldType}]`);
					}
				}
				if (node.additionalProperties !== false) lines.push(`${pad(1)}# Additional keys beyond those declared are allowed.`);
				if (lines.length === 1) lines.push(`${pad(1)}pass`);
				state.classes.push(lines.join("\n"));
				finish(name);
				continue;
			}
			frame.phase = "children";
			const node = frame.schema;
			if (node.oneOf !== void 0) {
				frame.kind = "oneOf";
				frame.children = node.oneOf.map((branch, index) => ({
					schema: branch,
					className: childClassName(frame.className, `${index + 1}`),
					listDepth: frame.listDepth
				}));
				continue;
			}
			if (node.type === void 0) {
				state.typing.add("Any");
				finish("Any");
				continue;
			}
			switch (node.type) {
				case "string":
					finish(renderConstrainedScalar(node, "str", state));
					break;
				case "number":
					finish(renderConstrainedScalar(node, "float", state));
					break;
				case "integer":
					finish(renderConstrainedScalar(node, "int", state));
					break;
				case "boolean":
					finish(renderConstrainedScalar(node, "bool", state));
					break;
				case "null":
					finish("None");
					break;
				case "array":
					if (node.items === void 0) {
						state.typing.add("Any");
						finish("list[Any]");
						break;
					}
					if (frame.listDepth >= MAX_LIST_NESTING) {
						state.typing.add("Any");
						finish("Any");
						break;
					}
					frame.kind = "array";
					frame.children = [{
						schema: node.items,
						className: frame.className,
						listDepth: frame.listDepth + 1
					}];
					break;
				case "object": {
					const entries = Object.entries(node.properties ?? {});
					if (className === "" || !entries.every(([name]) => isBareIdentifier(name) && !RESERVED.has(name) && !(name.startsWith("__") && !name.endsWith("__")))) {
						state.typing.add("Any");
						finish("dict[str, Any]");
						break;
					}
					if (entries.length === 0 && node.additionalProperties !== false) {
						state.typing.add("Any");
						finish("dict[str, Any]");
						break;
					}
					frame.kind = "typeddict";
					frame.node = node;
					frame.allocated = allocateClassName(frame.className, state);
					state.typing.add("TypedDict");
					frame.entries = entries;
					/* v8 ignore next -- allocated is always set before children are built. */
					frame.children = entries.map(([field, child]) => ({
						schema: child,
						className: childClassName(frame.allocated ?? "", camelCase(field)),
						listDepth: 1
					}));
					break;
				}
				/* v8 ignore next 4 -- assertSupportedJsonSchema narrowed this closed type union. */
				default:
					state.typing.add("Any");
					finish("Any");
			}
		}
		/* v8 ignore next -- every root frame produces one expression. */
		return result ?? "Any";
	} catch {
		state.typing.add("Any");
		return "Any";
	}
}
/** The fixed model-facing usage contract rendered above the declarations. */
const SDK_INSTRUCTIONS = `## Writing code for run_code

\`run_code\` takes two required arguments: \`code\` — the body of an async Python function (top-level \`await\` and \`return\` both work) — and \`description\`, a short summary of what the program does. At run time exactly two of the names declared below are bound: \`tools\` and \`ToolCallError\`. Everything else is a STATIC STUB describing argument and return types — in particular the \`TypedDict\` classes do NOT exist at run time, so build arguments as plain \`dict\`/\`list\` JSON values: \`await tools.name({"field": 1})\`, never \`FooArgs(field=1)\`, which raises \`NameError\`. Inside the program:

- Call tools as \`await tools.name(args)\` — subscript access for exotic, reserved, or underscore-leading names: \`await tools["my-tool"](args)\`. Every call resolves to the tool's typed canonical JSON value (each method's return type below). Tool arguments must be lossless JSON.
- A FAILED tool call raises \`ToolCallError\`, whose \`toolName\` identifies the failed tool and whose message is human-readable — wrap in \`try/except\` to handle and continue.
- Independent read-only calls MAY overlap under \`asyncio.gather\` (safe calls run concurrently; mutating calls run alone, in submission order). Sequence dependent work with \`await\`.
- Emit the run's answer with \`print(...)\` and/or a top-level \`return <value>\`; the returned value must be lossless JSON. Only what you print and return is program output. A successful tool result containing an image is attached after the run so you can inspect it on the next step; every other intermediate result stays out of the conversation, so extract just what you need.

The available tools:`;
/**
* Render the full `tools:sdk` prompt section under `runtime.language ===
* 'python'`: the Python-flavored usage instructions plus one named `TypedDict`
* per tool argument or output object (and per nested object) and one awaitable
* method per visible tool on a `Tools` protocol — typed args in, the tool's
* canonical output value out — with a `tools: Tools` singleton the model calls
* into. The `typing` import line lists exactly the symbols the render used.
* Deterministic — tools are emitted in lexicographic name order, and class
* declarations precede the protocol in that same order (nested classes before
* the parent that references them), so an unchanged tool set produces
* byte-identical text across assemblies. The sort is not a total order on
* byte-equal names, so two schemas sharing a name would render in argument
* order; the caller's visible-capability map is keyed by name, so the input
* never carries a duplicate.
* @param schemas - the tool schemas plus canonical output schemas to declare
*   (the caller excludes `run_code` itself).
* @returns the complete section text.
*/
function renderToolsSdkPy(schemas) {
	const sorted = [...schemas].sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
	const state = {
		classes: [],
		usedClassNames: /* @__PURE__ */ new Set(),
		nextClassCounter: /* @__PURE__ */ new Map(),
		typing: /* @__PURE__ */ new Set(["Protocol"])
	};
	const members = [];
	let statements = 0;
	for (const schema of sorted) {
		const argType = renderType(schema.parameters, `${camelCase(schema.name)}Args`, state);
		const outputType = renderType(schema.output, `${camelCase(schema.name)}Output`, state);
		if (isBareIdentifier(schema.name) && !RESERVED.has(schema.name) && !schema.name.startsWith("_")) {
			const doc = docLines(schema.description, 2);
			members.push(doc.length > 0 ? `${pad(1)}async def ${schema.name}(self, args: ${argType}) -> ${outputType}:` : `${pad(1)}async def ${schema.name}(self, args: ${argType}) -> ${outputType}: ...`);
			members.push(...doc);
			statements += 1;
		} else {
			members.push(`${pad(1)}# tools[${JSON.stringify(schema.name)}](args: ${argType}) -> ${outputType}`);
			const description = describe(schema);
			if (description !== void 0) members.push(`${pad(1)}#   ${description}`);
		}
	}
	const body = (statements > 0 ? members : [`${pad(1)}pass`, ...members]).join("\n");
	const imports = TYPING_ORDER.filter((symbol) => state.typing.has(symbol));
	const classBlock = state.classes.length > 0 ? `${state.classes.join("\n\n")}\n\n` : "";
	return `${SDK_INSTRUCTIONS}\n\n\`\`\`python\n${`from typing import ${imports.join(", ")}\n\nclass ToolCallError(Exception):
    toolName: str\n\n${classBlock}class Tools(Protocol):\n${body}\n\ntools: Tools`}\n\`\`\``;
}
/**
* Tool registry, model presentation modes, and pre/guard/around/post/result
* execution pipeline.
* @module @deepseek-ai/dsh-tools
*/
/**
* Language → SDK-section renderer. The registry looks up the loaded
* `ctx.codeRuntime.language` in this table when assembling the `tools:sdk`
* section under a non-native mode; a runtime whose language is not a key
* fails the assembly loudly (same idiom as `toolOrder` violations). Adding a
* new backend language is three parallel edits — a {@link CodeSdkLanguage}
* member, an entry here, and a `RUN_CODE_FLAVORS` entry in `code-mode.ts` for
* its `run_code` schema strings — plus the renderer function this table points
* at. The `satisfies` clause pins this table's key set to that union, which
* the flavor table is checked against too, so any of the three left out is a
* typecheck failure. What no check reaches is the prose that names the values
* instead of deriving them: the seam's `dsh-code-runtime` README pair, its
* `CodeRuntime.language` JSDoc, and `docs/subsystems/code-runtime.md`
* with its zh pair, plus this package's own README pair and the
* {@link Config.mode} JSDoc.
*/
/**
* Prompt order of the `code` collapse statement: after the persona and before
* the 100-199 per-tool guidance band, so the model reads which tools it may
* call before it reads what each one is for.
*/
const COLLAPSE_SECTION_ORDER = 99;
/**
* The model-facing statement of the `code` collapse. Names the consequence
* (the call fails) and the route (inside the program), because a rule the
* model can only discover by being denied is one it corrects too late.
*/
const CODE_ONLY_INSTRUCTION = `\`${RUN_CODE_NAME}\` is the only tool you can call directly — a tool call naming any other tool fails. Reach every tool the SDK declares below from inside the program.`;
const SDK_RENDERERS = {
	typescript: renderToolsSdk,
	python: renderToolsSdkPy
};
/**
* Scheduler entry point omitted from the generated named service API.
* @internal
*/
const TOOL_RUNTIME_SCHEDULER = Symbol("@deepseek-ai/dsh-tools.scheduler");
/** Canonical error code for cancellation after a tool body was invoked. */
const TOOL_ABORTED = "ABORTED";
/** Canonical error code for cancellation before a tool body was invoked. */
const TOOL_ABORTED_BEFORE_DISPATCH = "ABORTED_BEFORE_DISPATCH";
/**
* Thrown (internally) when the model requests a tool that isn't registered.
* Extends {@link HarnessError} (`code: 'UNKNOWN_TOOL'`) so an unknown-tool
* failure is as routable as a tool-thrown one — retry/sandbox/replay code can
* distinguish it from a tool body's own error.
*/
var ToolNotFoundError = class extends HarnessError {
	/**
	* @param toolName - the name the caller asked for.
	* @param reachableFrom - how the model reaches this tool instead, when the
	*   name IS visible and only the presentation denies calling it directly.
	*   Omitted for a name that is registered nowhere.
	*/
	constructor(toolName, reachableFrom) {
		super(reachableFrom === void 0 ? `unknown tool "${toolName}"` : `unknown tool "${toolName}": ${reachableFrom}`, "UNKNOWN_TOOL");
		this.name = "ToolNotFoundError";
	}
};
/** Thrown when a tool body or post-policy value violates its declared output. */
var ToolOutputError = class extends HarnessError {
	/** Schema/value violations in validation order. */
	violations;
	constructor(toolName, violations) {
		super(`tool "${toolName}" returned invalid output: ${violations.join("; ")}`, "INVALID_TOOL_OUTPUT");
		this.name = "ToolOutputError";
		this.violations = violations;
	}
};
/** Convert one projector exception into the canonical invalid-output failure. */
function projectionError(toolName, projector, error) {
	return new ToolOutputError(toolName, [`output.${projector} failed: ${errorMessage$1(error)}`]);
}
/** Snapshot one projector result before later durable-result materialization. */
function snapshotProjection(toolName, projector, candidate) {
	try {
		const detached = snapshotJsonValue(candidate);
		if (detached === void 0) throw new ToolOutputError(toolName, [`output.${projector} returned non-lossless JSON`]);
		return detached;
	} catch (error) {
		if (error instanceof ToolOutputError) throw error;
		throw projectionError(toolName, projector, error);
	}
}
/** Snapshot one body or policy value into the canonical invalid-output failure class. */
function snapshotToolValue(toolName, candidate) {
	try {
		const detached = snapshotJsonValue(candidate);
		if (detached === void 0) throw new ToolOutputError(toolName, ["value is not lossless JSON"]);
		return detached;
	} catch (error) {
		if (error instanceof ToolOutputError) throw error;
		throw new ToolOutputError(toolName, [`value snapshot failed: ${errorMessage$1(error)}`]);
	}
}
/**
* Best-effort human-readable message from an arbitrary thrown value: Error
* instances use `.message`; non-Error objects with a string `message`
* property (e.g. `throw { message: 'denied' }`) use it too; everything else
* is stringified.
*/
function errorMessage$1(error) {
	try {
		if (error instanceof Error) return error.message;
		if (typeof error === "object" && error !== null && "message" in error && typeof error.message === "string") return error.message;
		return String(error);
	} catch {
		return "<unprintable thrown value>";
	}
}
/** Derive one failure message from policy feedback without changing its rendered blocks. */
function failureMessageFromContent(content) {
	const text = content.map((block) => block.type === "text" ? block.text : `[${block.type} content]`).join("\n");
	return text.length > 0 ? text : "tool result blocked by post-execute policy";
}
/** Snapshot and freeze one durable tool-result projection or reject lossy data. */
function materializePresentation(candidate) {
	const detached = snapshotJsonValue(candidate);
	if (detached === void 0) throw new TypeError("tool result must be losslessly JSON-serializable");
	return deepFreeze(detached);
}
/** Structured `{ name, code }` for a thrown HarnessError, else undefined. */
function errorInfo(error) {
	try {
		return error instanceof HarnessError ? {
			name: error.name,
			code: error.code
		} : void 0;
	} catch {
		return;
	}
}
/** One scope's complete tool-registry contribution. */
var ToolLayer = class {
	tools;
	restrictions = new AnonymousEntries();
	guards = new AnonymousEntries();
	/**
	* Presentation this scope's agent declared for itself, shadowing the
	* deployment default. One cell rather than an entry table: two answers to
	* "which form does the model see" is a contradiction, not a merge.
	*/
	mode;
	constructor(scope) {
		this.tools = new NamedEntries((name) => /* @__PURE__ */ new Error(scope === void 0 ? `tool "${name}" is already registered (for a per-agent variant, register through that agent's \`agent.ctx\` instead)` : `tool "${name}" is already registered in this scope`));
	}
	/** Whether every contribution table in this aggregate layer is empty. */
	isEmpty() {
		return this.tools.isEmpty() && this.restrictions.isEmpty() && this.guards.isEmpty() && this.mode === void 0;
	}
	/** Whether every compiled restriction in this layer admits a global tool name. */
	admits(name) {
		for (const filter of this.restrictions.values()) if (filter.allow !== void 0 && !filter.allow.has(name) || filter.deny !== void 0 && filter.deny.has(name)) return false;
		return true;
	}
	/** First monotonic denial from this layer's live guard registrations. */
	guardReason(exec) {
		for (const guard of this.guards.values()) {
			const reason = guard(exec);
			if (reason !== void 0) return reason;
		}
	}
};
/** Resolve the run_code overlap cap at the owning config boundary (direct construction bypasses the Loader schema). */
function resolveMaxParallelSubCalls(value) {
	const maxParallelSubCalls = value ?? 10;
	if (!Number.isInteger(maxParallelSubCalls) || maxParallelSubCalls < 1) throw new Error("maxParallelSubCalls must be a positive integer");
	return maxParallelSubCalls;
}
(class extends Service {
	static inject = ["systemPrompt"];
	static Config = Schema.object({
		mode: Schema.union([
			"native",
			"code",
			"both"
		]).default("native"),
		maxParallelSubCalls: Schema.natural().min(1).default(10)
	});
	/** Internal staged view consumed by `dsh-agent-loop`'s parallel scheduler. */
	[TOOL_RUNTIME_SCHEDULER] = {
		prepare: (exec) => this.prepareScheduledExecution(exec),
		dispatch: (exec) => this.dispatchScheduledExecution(exec),
		finalize: (exec, result) => this.finalizeScheduledExecution(exec, result),
		finish: (exec, result) => this.finishScheduledExecution(exec, result)
	};
	/** Context deferred by a running tool body, keyed by its scheduler-owned execution. */
	deferredContexts = /* @__PURE__ */ new WeakMap();
	/** Executions whose tool body declared the current turn complete. */
	concludingExecutions = /* @__PURE__ */ new WeakSet();
	/** Original caller cancellation, kept outside the wrapper-mutable execution object. */
	cancellationStates = /* @__PURE__ */ new WeakMap();
	/** Definition-owned final content transform snapshotted before policy begins. */
	contentFinalizers = /* @__PURE__ */ new WeakMap();
	layers = new ScopedLayers((scope) => new ToolLayer(scope), () => {
		this.ctx.emit("tools/change");
	});
	/** Presentation for scopes that declare none; {@link presentAs} shadows it per scope. */
	defaultMode;
	maxParallelSubCalls;
	/**
	* Reserved presentation transport, kept outside the filterable registration
	* layers. Built on first need rather than at construction: which agents run
	* a code mode is no longer known when the service is constructed, and the
	* transport is stateless beyond its closures over `this`.
	*/
	codeTransport;
	constructor(ctx, config = {}) {
		super(ctx, "tools");
		this.defaultMode = config.mode ?? "native";
		this.maxParallelSubCalls = resolveMaxParallelSubCalls(config.maxParallelSubCalls);
		ctx.systemPrompt.tools((context) => this.wireSchemas(context.scope));
		if (this.defaultMode !== "native") {
			ctx.systemPrompt.section(this.collapseSection());
			ctx.systemPrompt.section(this.sdkSection());
		}
	}
	/**
	* The prompt statement of the `code` executor collapse, registered wherever
	* {@link sdkSection} is and rendering empty outside an effective `code`.
	*
	* Every tool contributes its own guidance section naming its tool, none of
	* them qualify how that tool is reached, and they all render before the SDK
	* (orders 100-199 against {@link SDK_SECTION_ORDER}). Without this the model
	* reads a catalog of tools it is told to use and no statement that only
	* `run_code` may be called, so it emits a native call, receives
	* `UNKNOWN_TOOL` for a tool the prompt just declared, and concludes the
	* deployment is inconsistent. {@link COLLAPSE_SECTION_ORDER} places the rule
	* before that guidance rather than after it.
	*
	* `both` renders empty: native calls do execute there, so the rule is false.
	* @returns the section registration.
	*/
	collapseSection() {
		return {
			name: "tools:code-only",
			order: COLLAPSE_SECTION_ORDER,
			text: (context) => this.modeFor(context.scope) === "code" ? CODE_ONLY_INSTRUCTION : ""
		};
	}
	/**
	* The generated-SDK prompt section, registered globally by a code-mode
	* deployment and per scope by {@link presentAs}.
	*
	* The body regenerates from the CALLING scope, and renders empty for an
	* agent presenting natively — an agent that opted out under a code-mode
	* deployment still sees the global registration, and an empty section is
	* dropped from the rendered prompt.
	* @returns the section registration.
	*/
	sdkSection() {
		return {
			name: "tools:sdk",
			order: 150,
			text: (context) => {
				const mode = this.modeFor(context.scope);
				if (mode === "native") return "";
				const runtime = this.requireCodeRuntime(mode);
				const render = SDK_RENDERERS[runtime.language];
				/* v8 ignore next -- requireCodeRuntime rejects an unknown language before this runs. */
				if (render === void 0) throw new Error(`dsh-tools: no SDK renderer for ${runtime.language}`);
				return render(this.sdkSchemas(context.scope));
			}
		};
	}
	/**
	* The presentation one scope's agent sees: its own declaration, else the
	* deployment default.
	* @param scope - the calling agent, or undefined for the global view.
	* @returns the resolved presentation mode.
	*/
	modeFor(scope) {
		const layers = this.layers.chainLayers(scope);
		for (let index = layers.length - 1; index >= 0; index -= 1) {
			const mode = layers[index]?.mode;
			if (mode !== void 0) return mode;
		}
		return this.defaultMode;
	}
	/**
	* The reserved `run_code` transport, built on first need.
	*
	* It never enters the global layer: per-agent restrictions must not remove
	* it, and a scoped registration must not shadow it. The visibility resolver
	* appends it after resolving the filterable global/scoped capability layers,
	* and only for scopes whose mode actually presents it.
	* @returns the shared transport definition.
	*/
	requireCodeTransport() {
		this.codeTransport ??= createRunCodeTool(this, {
			requireRuntime: () => this.requireCodeRuntime(this.defaultMode),
			peekRuntime: () => this.ctx.get("codeRuntime"),
			maxParallel: this.maxParallelSubCalls,
			shapeDispatchLog: (dispatch) => this.shapeDispatchLog(dispatch)
		});
		return this.codeTransport;
	}
	/**
	* Present the calling scope's tools in `mode` instead of the deployment
	* default. Nearest scope on the chain wins, so a preset's standing
	* declaration covers every agent joined under it.
	*
	* Scoped only, and one declaration per scope: this is how an agent preset
	* composes Code Mode agents beside native ones in the same process, and a
	* process-global override would be the `mode` config field instead.
	* @param mode - the presentation the covered agents' models see.
	* @returns the exact disposer that restores the deployment default.
	*/
	presentAs(mode) {
		const ctx = this.ctx;
		if (scopeOf(ctx) === void 0) throw new Error("tools.presentAs() requires a scoped context (agent.ctx): a context-global presentation is the `mode` config field on the tools row");
		return ctx.effect(function* () {
			yield this.layers.effect(ctx, (layer) => {
				if (layer.mode !== void 0) throw new Error(`tools.presentAs("${mode}") conflicts with "${layer.mode}" already declared for this scope; one composition selects one presentation`);
				layer.mode = mode;
				return () => {
					layer.mode = void 0;
				};
			}, { label: "tools.presentAs()" });
			if (mode !== "native") {
				yield ctx.systemPrompt.section(this.collapseSection());
				yield ctx.systemPrompt.section(this.sdkSection());
			}
		}.bind(this), "tools.presentAs()");
	}
	/**
	* Build one scope's wire schemas and names for prompt-order validation.
	* Restrictions do not make known tools invalid, but a mode collapse does.
	*/
	wireSchemas(scope) {
		const view = this.view(scope);
		const mode = this.modeFor(scope);
		if (mode === "native") return {
			schemas: [...view.visible.values()].map((definition) => this.schemaOf(definition, false)),
			knownNames: [...view.knownNames]
		};
		this.requireCodeRuntime(mode);
		const schemas = [...view.visible.values()].map((definition) => this.schemaOf(definition, false));
		if (mode === "code") return {
			schemas: schemas.filter((schema) => schema.name === RUN_CODE_NAME),
			knownNames: [RUN_CODE_NAME]
		};
		return {
			schemas,
			knownNames: [...view.knownNames, RUN_CODE_NAME]
		};
	}
	/**
	* Resolve the code runtime or throw the actionable misconfiguration error.
	* Read at use time (assembly / run_code execution), NOT via static
	* `inject`: an inject entry would hold `ctx.tools` — and every tool plugin
	* behind it — hostage to a code runtime existing even under `mode:
	* 'native'` (the loop's optional-backend idiom, same as
	* `sessionPersistence`).
	*
	* Assembly and `run_code` execution read separately, so the language is not
	* bound to a request. Harmless while one published backend exists — both
	* reads return the same flavor — but a reload that swapped in a second
	* language between them would hand a program written against one SDK to the
	* other. Binding it is deferred until a second backend ships (the first
	* point it is testable); rationale in the
	* [language-dispatch note](../../../../.agents/notes/implemented/feature/2026-07-31-code-mode-language-dispatch.md).
	*/
	requireCodeRuntime(mode) {
		const runtime = this.ctx.get("codeRuntime");
		if (!runtime) throw new Error(`dsh-tools: mode "${mode}" requires a code runtime — load a ctx.codeRuntime implementation (e.g. @deepseek-ai/dsh-code-runtime-worker-thread) or set tools mode to "native"`);
		if (!Object.hasOwn(SDK_RENDERERS, runtime.language)) {
			const known = Object.keys(SDK_RENDERERS).map((name) => JSON.stringify(name)).join(", ");
			throw new Error(`dsh-tools: no SDK renderer registered for runtime language ${JSON.stringify(runtime.language)} (known: ${known})`);
		}
		return runtime;
	}
	/**
	* Register globally or in the calling agent scope. Scoped tools shadow
	* globals; duplicates within one layer and the reserved `run_code` name fail.
	* @param definition - tool schema, execution, and optional finalization/presentation callbacks.
	* @returns the exact disposer that unregisters the tool.
	*/
	register(definition) {
		const name = definition.name;
		const output = definition.output;
		if (output === void 0 || typeof output !== "object" || typeof output.render !== "function" || output.presentationMeta !== void 0 && typeof output.presentationMeta !== "function") throw new TypeError(`tool "${name}" must declare output { schema, render, presentationMeta? }`);
		assertSupportedJsonSchema(output.schema);
		const timeoutMs = definition.timeoutMs;
		if (timeoutMs !== void 0 && (!Number.isFinite(timeoutMs) || timeoutMs <= 0)) throw new TypeError(`tool "${name}" timeoutMs must be a positive finite number`);
		if (name === "run_code") throw new Error(`tool name "${RUN_CODE_NAME}" is reserved for the Code Mode presentation transport and cannot be registered or shadowed`);
		return this.layers.effect(this.ctx, (layer) => layer.tools.insert(name, definition), { label: "tools.register()" });
	}
	/**
	* Restrict global tools for the calling agent scope. Empty filters, unknown
	* names, scope-local names, and reserved transport names fail. Restrictions
	* intersect; scoped registrations remain visible.
	* @param filter - global-tool mask: `allow` (keep only) and/or `deny` (remove).
	* @returns the exact disposer that lifts this restriction.
	*/
	restrict(filter) {
		const scope = scopeOf(this.ctx);
		if (scope === void 0) throw new Error("tools.restrict() requires a scoped context (agent.ctx): a context-global restriction would mask every agent — deny the tool for the intended agent instead");
		const allow = filter.allow;
		const deny = filter.deny;
		if (allow === void 0 && deny === void 0) throw new Error("tools.restrict({}) is a no-op: pass `allow` and/or `deny` (an empty filter is almost always a materialized-empty-config bug)");
		const compiled = {
			...allow !== void 0 ? { allow: new Set(allow) } : {},
			...deny !== void 0 ? { deny: new Set(deny) } : {}
		};
		if ([...allow ?? [], ...deny ?? []].includes("run_code")) throw new Error(`tools.restrict() cannot name reserved Code Mode presentation transport "${RUN_CODE_NAME}"; restrict end-capability tools instead`);
		const known = this.view(scope).restrictableNames;
		const unknown = [...allow ?? [], ...deny ?? []].filter((name) => !known.has(name));
		if (unknown.length > 0) throw new Error(`tools.restrict() names unknown global tool${unknown.length > 1 ? "s" : ""} ${unknown.map((n) => `"${n}"`).join(", ")}; known global tools: ${[...known].sort().join(", ") || "(none)"}`);
		return this.layers.effect(this.ctx, (layer) => layer.restrictions.append(compiled), { label: "tools.restrict()" });
	}
	/**
	* Register a monotonic guard after the extensible `tools/pre-execute`
	* waterfall. A plain-context guard applies globally; one registered through
	* `agent.ctx` applies only to that agent. Any matching guard may deny by
	* returning a reason, while no guard can force-allow a call another guard
	* denied. The exact effect disposer is returned for ordered ownership and
	* HMR cleanup.
	* @param guard - synchronous check; a returned string denies the execution.
	* @returns the exact disposer that unregisters the guard.
	*/
	guard(guard) {
		return this.layers.effect(this.ctx, (layer) => layer.guards.append(guard), {
			label: "tools.guard()",
			notify: false
		});
	}
	/** First monotonic denial from the global then the scope chain's guard layers, farthest first. */
	guardReason(exec) {
		const globalReason = this.layers.global.guardReason(exec);
		if (globalReason !== void 0) return globalReason;
		if (exec.agent === void 0) return void 0;
		for (const layer of this.layers.chainLayers(exec.agent)) {
			const reason = layer.guardReason(exec);
			if (reason !== void 0) return reason;
		}
	}
	/**
	* Resolve every registry fact one scope needs in one layer traversal. The
	* visible map applies restrictions to the INHERITED surface, then the
	* scope's own registrations and the reserved presentation transport; the
	* other sets retain the pre-restriction facts needed by restriction and
	* prompt-order validation.
	*
	* A restriction filters what a scope inherits — the global layer and every
	* ancestor layer on its chain — and never what its OWN layer registers.
	* That exemption is what a per-child capability filter has to keep intact:
	* the delegation runtime registers a child's reporting and structured-output
	* tools into the child's own layer, and a filter naming the capabilities the
	* child may use must not strip the machinery it answers through.
	*
	* Reading the exempt set as "the global layer" instead of "not mine" held
	* only while every model-facing tool sat in the host composition. Once
	* presets moved them onto the agent plane they became an ANCESTOR
	* contribution, so a child's filter silently stopped constraining anything
	* it was given.
	* @param scope - the viewing scope (the agent), or undefined for the global view.
	* @returns the complete derived view for that scope.
	*/
	view(scope) {
		const layers = this.layers.chainLayers(scope);
		const own = this.layers.peek(scope);
		const inherited = new Map(this.layers.global.tools.entries());
		for (const layer of layers) {
			if (layer === own) continue;
			for (const [name, definition] of layer.tools.entries()) inherited.set(name, definition);
		}
		const visible = /* @__PURE__ */ new Map();
		const knownNames = /* @__PURE__ */ new Set();
		const restrictableNames = /* @__PURE__ */ new Set();
		for (const [name, definition] of inherited) {
			knownNames.add(name);
			restrictableNames.add(name);
			if (layers.every((layer) => layer.admits(name))) visible.set(name, definition);
		}
		if (own !== void 0) for (const [name, definition] of own.tools.entries()) {
			knownNames.add(name);
			visible.set(name, definition);
		}
		if (this.modeFor(scope) !== "native") visible.set(RUN_CODE_NAME, this.requireCodeTransport());
		return {
			visible,
			knownNames,
			restrictableNames
		};
	}
	/**
	* Look up a tool as one scope sees it (scoped
	* shadows global; a restricted-away global reads as absent). Presenters pass
	* the calling agent so the rendered card matches the definition that
	* actually executed.
	* @param name - the tool name as registered.
	* @param scope - the viewing scope (the agent); omitted = the global view.
	* @returns the definition the scope resolves, or undefined when none is visible.
	*/
	get(name, scope) {
		return this.view(scope).visible.get(name);
	}
	/**
	* Resolve the definition that MAY EXECUTE for a call, applying the mode
	* collapse at the operation boundary that owns it. The registry view
	* (`get`) is presentation-agnostic; here a MODEL-DIRECT call under `code`
	* may only name the reserved `run_code` transport, while a nested
	* sub-dispatch (a `parent` token set — the `run_code` SDK calling a tool
	* it bound) may call any visible tool. Denial surfaces as `UNKNOWN_TOOL`
	* through the executor, matching an absent definition.
	* @param name - the tool name as registered.
	* @param scope - the viewing scope (the agent); omitted = the global view.
	* @param nested - whether the call is a transport sub-dispatch, not a model-direct call.
	* @returns the definition that may run, or undefined when the call must be rejected.
	*/
	resolveExecution(name, scope, nested) {
		const tool = this.get(name, scope);
		if (tool === void 0) return void 0;
		if (this.collapses(name, scope, nested)) return void 0;
		return tool;
	}
	/**
	* Project visible definitions onto the allowlisted model-facing schema fields,
	* excluding execution and presentation callbacks.
	* @param scope - the viewing scope (the agent); omitted = the global view.
	* @returns one deep-cloned schema per visible tool.
	*/
	schemas(scope) {
		return [...this.view(scope).visible.values()].map((definition) => this.schemaOf(definition, true));
	}
	/** Project visible callable tools onto the generated Code Mode SDK contract. */
	sdkSchemas(scope) {
		return [...this.view(scope).visible.values()].filter((definition) => definition.name !== RUN_CODE_NAME).map((definition) => {
			const output = snapshotJsonValue(definition.output.schema);
			/* v8 ignore next -- registration already validated and retained this schema as lossless JSON. */
			if (output === void 0) throw new Error(`tool "${definition.name}" output schema must be lossless JSON before SDK projection`);
			return {
				...this.schemaOf(definition, true),
				output
			};
		});
	}
	/** Project one definition onto the model-facing schema fields. */
	schemaOf(definition, detachParameters) {
		const { name, description, parameters } = definition;
		const detached = detachParameters ? snapshotJsonValue(parameters) : parameters;
		if (detached === void 0) throw new Error(`tool "${name}" parameters must be lossless JSON before schema projection`);
		return {
			name,
			description,
			parameters: detached
		};
	}
	/**
	* Classify a pending call through the caller's visible tool definition. Only
	* an exact `true` is parallel; unknown, hidden, undeclared, invalid, or
	* throwing classifiers are exclusive.
	* @param exec - call name, parsed arguments, and optional agent scope.
	* @returns the fail-closed scheduling mode.
	*/
	executionMode(exec) {
		const tool = this.resolveExecution(exec.name, exec.agent, exec.parent !== void 0);
		if (!tool?.isConcurrencySafe) return { kind: "exclusive" };
		try {
			return tool.isConcurrencySafe(exec.arguments) === true ? { kind: "parallel" } : { kind: "exclusive" };
		} catch {
			return { kind: "exclusive" };
		}
	}
	/**
	* Run the `tools/code-dispatch-log` waterfall over one settled sub-dispatch
	* and return the content the bridge should log on `tool/code-dispatch`.
	* Contained: when a listener throws, the method logs the original settled
	* content; that failure must not fail the dispatch or omit the settle event. Private:
	* the ONE consumer is the `run_code` bridge this registry constructs, which
	* receives it as a capability parameter (the `requireRuntime` idiom) — the
	* waterfall, not this invoker, is the public extension point.
	*/
	async shapeDispatchLog(dispatch) {
		try {
			return await this.ctx.waterfall(scopeTarget(this, dispatch.agent), "tools/code-dispatch-log", dispatch, () => Promise.resolve(dispatch.content));
		} catch (error) {
			this.ctx.logger.warn(`tools: code-dispatch-log listener failed for ${dispatch.name}: ${errorMessage$1(error)}; logging the original settled content`);
			return dispatch.content;
		}
	}
	/**
	* Whether the `code` mode collapse denies a model-direct call: only the
	* reserved `run_code` transport may be named. Nested sub-dispatches (a
	* `parent` token set) bypass the collapse. One home for the
	* security-relevant predicate, shared by {@link resolveExecution} and
	* {@link createExecution} so the two can never drift apart.
	*
	* Resolved through {@link modeFor}, NOT `defaultMode`: an agent given `code`
	* by an agent preset under a native deployment is the composition
	* `dsh-agent-tool-presentation` exists for, and reading the deployment default would
	* leave exactly that agent uncollapsed — announcing one surface while
	* executing another, which is the bypass this collapse closes.
	* @param name - the tool name as registered.
	* @param scope - the viewing scope whose effective presentation mode applies.
	* @param nested - whether the call is a transport sub-dispatch, not a model-direct call.
	*/
	collapses(name, scope, nested) {
		return !nested && this.modeFor(scope) === "code" && name !== "run_code";
	}
	/**
	* Execute through pre-policy, guards, around-dispatch, post-policy,
	* definition-owned content finalization, and final notification. Tool and
	* listener failures resolve as materialized error results; an invisible tool
	* reports `UNKNOWN_TOOL`. The returned outcome is the same lossless, frozen
	* snapshot final observers receive. Cancellation
	* arriving after entry and before final result materialization skips a
	* not-yet-started body with `ABORTED_BEFORE_DISPATCH` or replaces a
	* successful started outcome with `ABORTED`; already-started work is still
	* drained and may retain a tool-owned structured error.
	* @param exec - the typed same-process call input. The registry assigns its
	*   correlation token before policy begins.
	* @returns the materialized final result.
	*/
	async execute(exec) {
		return this.prepareExecution(exec, (prepared) => this.completeScheduledExecution(prepared));
	}
	async completeScheduledExecution(prepared) {
		switch (prepared.kind) {
			case "dispatch": {
				const dispatched = await this.dispatchScheduledExecution(prepared.exec);
				return dispatched.kind === "post-result" ? await this.finalizeScheduledExecution(prepared.exec, dispatched.result) : this.finishScheduledExecution(prepared.exec, dispatched.result);
			}
			case "post-result": return await this.finalizeScheduledExecution(prepared.exec, prepared.result);
			case "final-result": return this.finishScheduledExecution(prepared.exec, prepared.result);
			/* v8 ignore next -- closed-union exhaustiveness guard */
			default: return assertNever(prepared, "scheduled tool preparation");
		}
	}
	createExecution(exec) {
		const deferredContexts = [];
		const token = createExecutionToken();
		const callId = exec.callId;
		const rootCallId = exec.rootCallId ?? callId;
		const name = exec.name;
		const agent = exec.agent;
		const parent = exec.parent;
		const signal = exec.signal;
		const visible = this.get(name, agent);
		const collapsed = visible !== void 0 && this.collapses(name, agent, parent !== void 0);
		const concludingExecutions = this.concludingExecutions;
		const base = {
			token,
			callId,
			rootCallId,
			name,
			signal,
			...agent !== void 0 ? { agent } : {},
			...parent !== void 0 ? { parent } : {},
			deferContext(context) {
				deferredContexts.push(context);
			},
			concludeTurn() {
				concludingExecutions.add(this);
			}
		};
		const capturedFinalizer = visible?.finalizeContent?.bind(visible);
		const finalizerFor = () => collapsed && !signal.aborted ? void 0 : capturedFinalizer;
		try {
			const detached = snapshotJsonValue(exec.arguments);
			if (detached === void 0) throw new TypeError("tool execution arguments must be losslessly JSON-serializable");
			const execution = {
				...base,
				arguments: deepFreeze(detached)
			};
			this.deferredContexts.set(execution, deferredContexts);
			this.contentFinalizers.set(execution, finalizerFor());
			this.cancellationStates.set(execution, {
				callerSignal: signal,
				bodyInvoked: false
			});
			if (collapsed) {
				if (signal.aborted) return {
					kind: "final-result",
					exec: execution,
					result: toolAbortedBeforeDispatchResult()
				};
				return {
					kind: "final-result",
					exec: execution,
					result: toolErrorResult(new ToolNotFoundError(name, `only \`${RUN_CODE_NAME}\` is callable directly — call \`${name}\` from inside a \`${RUN_CODE_NAME}\` program instead`))
				};
			}
			return {
				kind: "ready",
				exec: execution
			};
		} catch (error) {
			const execution = {
				...base,
				arguments: void 0
			};
			this.contentFinalizers.set(execution, finalizerFor());
			return {
				kind: "final-result",
				exec: execution,
				result: toolErrorResult(error)
			};
		}
	}
	/**
	* Run the ordered pre-execute and monotonic guard stages for the scheduler.
	* @param input - the caller-supplied execution input.
	* @returns the prepared execution plus the next scheduler stage.
	* @internal
	*/
	async prepareScheduledExecution(input) {
		return this.prepareExecution(input, (prepared) => prepared);
	}
	async prepareExecution(input, next) {
		const created = this.createExecution(input);
		if (created.kind !== "ready") return next(created);
		const exec = created.exec;
		if (this.callerCancelled(exec)) return next({
			kind: "final-result",
			exec,
			result: toolAbortedBeforeDispatchResult()
		});
		try {
			const carrier = scopeTarget(this, exec.agent);
			const gate = await this.ctx.waterfall(carrier, "tools/pre-execute", exec, () => Promise.resolve({ kind: "allow" }));
			const askResolution = gate.kind === "ask" ? await this.serviceAsk(exec, gate) : {
				decision: gate,
				approvalCancelled: false
			};
			const { decision } = askResolution;
			if (this.callerCancelled(exec) && askResolution.approvalCancelled) return await next({
				kind: "post-result",
				exec,
				result: toolAbortedBeforeDispatchResult()
			});
			const denialReason = decision.kind === "allow" ? this.guardReason(exec) : decision.reason;
			if (denialReason !== void 0) return await next({
				kind: "post-result",
				exec,
				result: this.materializeFinalResult({
					content: [{
						type: "text",
						text: `Error: ${denialReason}`
					}],
					isError: true,
					error: { message: denialReason }
				})
			});
			if (this.callerCancelled(exec)) return await next({
				kind: "post-result",
				exec,
				result: toolAbortedBeforeDispatchResult()
			});
			return await next({
				kind: "dispatch",
				exec
			});
		} catch (error) {
			return next({
				kind: "final-result",
				exec,
				result: toolErrorResult(error)
			});
		}
	}
	/** Whether the original caller signal is currently aborted. */
	callerCancelled(exec) {
		const state = this.cancellationStates.get(exec);
		/* v8 ignore next -- only registry-minted executions reach the staged scheduler methods */
		if (state === void 0) throw new Error("tool registry scheduler invariant violated: missing cancellation state");
		return state.callerSignal.aborted;
	}
	/** Canonical cancellation outcome selected by whether the tool body started. */
	cancellationResult(exec, prior) {
		const state = this.cancellationStates.get(exec);
		/* v8 ignore next -- only registry-minted executions reach the staged scheduler methods */
		if (state === void 0) throw new Error("tool registry scheduler invariant violated: missing cancellation state");
		return state.bodyInvoked ? toolAbortedResult(prior) : toolAbortedBeforeDispatchResult(prior);
	}
	/**
	* Dispatch the registered body with the original caller signal fused back
	* into any around-wrapper replacement. Cancellation never abandons the body:
	* a started promise reaches quiescence before its outcome becomes `ABORTED`.
	*/
	async dispatchToolBody(exec) {
		const state = this.cancellationStates.get(exec);
		/* v8 ignore next -- only registry-minted executions reach the staged scheduler methods */
		if (state === void 0) throw new Error("tool registry scheduler invariant violated: missing cancellation state");
		const wrapperSignal = exec.signal;
		const fused = fuseToolSignals(state.callerSignal, wrapperSignal);
		const signal = fused.signal;
		if (isAborted(signal)) {
			fused.dispose();
			return toolAbortedBeforeDispatchResult();
		}
		exec.signal = signal;
		try {
			const tool = this.resolveExecution(exec.name, exec.agent, exec.parent !== void 0);
			if (!tool) throw new ToolNotFoundError(exec.name);
			state.bodyInvoked = true;
			const returned = await tool.execute(exec.arguments, exec);
			const result = this.createSuccessResult(exec, tool, returned);
			return isAborted(signal) ? toolAbortedResult(result) : result;
		} catch (error) {
			return toolErrorResult(error);
		} finally {
			fused.dispose();
			exec.signal = wrapperSignal;
		}
	}
	/**
	* Run around-dispatch and the tool body. Tool and unknown-tool failures still
	* receive post-execute; pipeline failures are already final.
	* @param exec - the prepared execution.
	* @returns whether the result still needs post-execute.
	* @internal
	*/
	async dispatchScheduledExecution(exec) {
		try {
			const mutableExec = exec;
			const carrier = scopeTarget(this, exec.agent);
			const result = await this.ctx.waterfall(carrier, "tools/execute", mutableExec, () => this.dispatchToolBody(mutableExec));
			const normalized = this.normalizeDispatchResult(exec, result);
			const deferredContexts = this.deferredContexts.get(exec);
			/* v8 ignore next -- dispatch only receives executions minted by this registry's prepare stage */
			if (deferredContexts === void 0) throw new Error("tool registry scheduler invariant violated: unprepared execution");
			const resultWithDeferredContexts = deferredContexts.length === 0 ? normalized : this.markCanonical(exec, {
				...normalized,
				additionalContexts: [...deferredContexts, ...normalized.additionalContexts ?? []]
			});
			return {
				kind: "post-result",
				result: this.callerCancelled(exec) && !resultWithDeferredContexts.isError ? this.cancellationResult(exec, resultWithDeferredContexts) : resultWithDeferredContexts
			};
		} catch (error) {
			return {
				kind: "final-result",
				result: toolErrorResult(error)
			};
		}
	}
	/**
	* Run ordered post-execute, then apply definition-owned content finalization,
	* materialize, and notify the final outcome.
	* @param exec - the prepared execution.
	* @param result - dispatch/pre result that still needs post-execute.
	* @returns the materialized final result.
	* @internal
	*/
	async finalizeScheduledExecution(exec, result) {
		try {
			const postResult = await this.postExecute(exec, result);
			return this.finishScheduledExecution(exec, this.callerCancelled(exec) && !postResult.isError ? this.cancellationResult(exec, postResult) : postResult);
		} catch (error) {
			return this.finishScheduledExecution(exec, toolErrorResult(error));
		}
	}
	/**
	* Materialize the candidate, apply definition-owned content finalization,
	* then materialize and notify the authoritative result.
	* @param exec - the prepared execution.
	* @param result - final result.
	* @returns the materialized final result.
	* @internal
	*/
	finishScheduledExecution(exec, result) {
		let materializedResult;
		try {
			materializedResult = this.materializeFinalResult(result);
		} catch (error) {
			materializedResult = this.materializeFinalResult(toolErrorResult(error));
		}
		let finalResult;
		try {
			finalResult = this.materializeFinalResult(this.applyFinalContent(exec, materializedResult));
		} catch (error) {
			finalResult = this.materializeFinalResult(toolErrorResult(error));
		}
		this.notifyResult(exec, finalResult);
		return finalResult;
	}
	/** Apply the snapshotted tool-owned content transform without exposing other result fields. */
	applyFinalContent(exec, result) {
		const finalizeContent = this.contentFinalizers.get(exec);
		if (finalizeContent === void 0) return result;
		const content = finalizeContent(exec, result);
		return content === void 0 ? result : {
			...result,
			content
		};
	}
	/** Notify observers without exposing a mutation or error channel into the outcome. */
	notifyResult(exec, result) {
		Object.freeze(exec);
		const { name: toolName, callId } = exec;
		const reportFailure = (error) => {
			this.ctx.logger.warn(`tool "${toolName}" (${callId}): tools/result observer failed: ${errorMessage$1(error)}`);
		};
		const callbacks = this.ctx.events.dispatch("emit", [
			scopeTarget(this, exec.agent),
			"tools/result",
			exec,
			result
		]);
		for (const callback of callbacks) try {
			const returned = callback(exec, result);
			Promise.resolve(returned).catch(reportFailure);
		} catch (error) {
			reportFailure(error);
		}
	}
	/**
	* Resolve an `ask` decision to allow/deny through the approval seam. The
	* seam is consumed opportunistically with `ctx.get('approval')` — a
	* deployment that composes no ApprovalService keeps the historical degrade
	* to deny, and an unmount mid-session degrades the same way on the next ask.
	* An agent-less execution also degrades: without an agent there is no
	* session to audit to and no UI to route to. Otherwise the outcome maps
	* one-to-one — `allowed-once` proceeds; the three non-grants deny with
	* distinct reasons so the model can tell a human "no" from an absent
	* approval channel.
	*/
	async serviceAsk(exec, ask) {
		const approval = this.ctx.get("approval");
		if (approval === void 0) return {
			decision: {
				kind: "deny",
				reason: ask.reason ?? `tool "${exec.name}" requires approval (not yet supported)`
			},
			approvalCancelled: false
		};
		if (exec.agent === void 0) return {
			decision: {
				kind: "deny",
				reason: `tool "${exec.name}" requires approval, but the call has no agent to route it through`
			},
			approvalCancelled: false
		};
		const outcome = await approval.request({
			agent: exec.agent,
			toolName: exec.name,
			callId: exec.callId,
			...ask.reason !== void 0 ? { reason: ask.reason } : {},
			signal: exec.signal
		});
		switch (outcome) {
			case "allowed-once": return {
				decision: { kind: "allow" },
				approvalCancelled: false
			};
			case "rejected": return {
				decision: {
					kind: "deny",
					reason: `the user rejected tool "${exec.name}"`
				},
				approvalCancelled: false
			};
			case "cancelled": return {
				decision: {
					kind: "deny",
					reason: `approval for tool "${exec.name}" was cancelled`
				},
				approvalCancelled: true
			};
			case "unavailable": return {
				decision: {
					kind: "deny",
					reason: `tool "${exec.name}" requires approval, but no approval channel is available`
				},
				approvalCancelled: false
			};
			default: return assertNever(outcome, "ApprovalOutcome");
		}
	}
	/**
	* Run the `tools/post-execute` waterfall over a dispatched `result` and apply
	* its {@link PostToolDecision}: `accept` keeps the call successful (replacing
	* `content` when given), `block` turns it into an `isError` whose content is
	* the corrective `feedback`. Either decision may attach `additionalContexts`,
	* which are ferried on the returned result for the loop's active-batch FIFO.
	* Context deferred by the tool body survives an accepted result but is
	* discarded when the outer call is blocked; a block exposes only context the
	* blocking decision explicitly supplied.
	* Runs inside `execute`'s outer try/catch (a throwing listener → isError).
	*/
	async postExecute(exec, result) {
		const decision = await this.ctx.waterfall(scopeTarget(this, exec.agent), "tools/post-execute", exec, result, () => Promise.resolve({ kind: "accept" }));
		const decisionContexts = decision.additionalContexts ?? [];
		if (decision.kind === "block") {
			const message = failureMessageFromContent(decision.feedback);
			return this.markCanonical(exec, {
				content: decision.feedback,
				isError: true,
				error: { message },
				...decisionContexts.length > 0 ? { additionalContexts: decisionContexts } : {}
			});
		}
		if (Object.hasOwn(decision, "content") && Object.hasOwn(decision, "value")) throw new TypeError("tools/post-execute accept decision cannot replace both value and content");
		const additionalContexts = [...result.additionalContexts ?? [], ...decisionContexts];
		if (Object.hasOwn(decision, "value")) {
			if (result.isError) throw new TypeError("tools/post-execute cannot replace the value of a failed result");
			const tool = this.resolveExecution(exec.name, exec.agent, exec.parent !== void 0);
			if (tool === void 0) throw new ToolNotFoundError(exec.name);
			const replaced = this.createSuccessResult(exec, tool, decision.value);
			return this.markCanonical(exec, {
				...replaced,
				...additionalContexts.length > 0 ? { additionalContexts } : {}
			});
		}
		return this.markCanonical(exec, {
			...result,
			...decision.content !== void 0 ? { content: decision.content } : {},
			...additionalContexts.length > 0 ? { additionalContexts } : {}
		});
	}
	/** Registry-normalized results and the exact dispatch that validated each value. */
	canonicalResults = /* @__PURE__ */ new WeakMap();
	/** Mark one registry-normalized result as canonical only for its owning dispatch. */
	markCanonical(exec, result) {
		this.canonicalResults.set(result, exec.token);
		return result;
	}
	/** Snapshot, validate, render, and optionally project one successful body value. */
	createSuccessResult(exec, tool, candidate) {
		const detached = snapshotToolValue(tool.name, candidate);
		const violations = validateJsonSchemaValue(tool.output.schema, detached, "value");
		if (violations.length > 0) throw new ToolOutputError(tool.name, violations);
		const value = deepFreeze(detached);
		let rendered;
		try {
			rendered = tool.output.render(exec.arguments, value);
		} catch (error) {
			throw projectionError(tool.name, "render", error);
		}
		const content = snapshotProjection(tool.name, "render", rendered);
		let meta;
		if (exec.parent === void 0 && tool.output.presentationMeta !== void 0) {
			let projected;
			try {
				projected = tool.output.presentationMeta(exec.arguments, value);
			} catch (error) {
				throw projectionError(tool.name, "presentationMeta", error);
			}
			meta = snapshotProjection(tool.name, "presentationMeta", projected);
		}
		const concludesTurn = this.concludingExecutions.has(exec);
		return this.markCanonical(exec, this.materializeFinalResult({
			isError: false,
			value,
			content,
			...meta !== void 0 ? { meta } : {},
			...concludesTurn ? { concludesTurn: true } : {}
		}));
	}
	/** Normalize an around-dispatch wrapper's authored result through the owning output contract. */
	normalizeDispatchResult(exec, result) {
		if (this.canonicalResults.get(result) === exec.token) return result;
		if (result.isError) return this.markCanonical(exec, {
			isError: true,
			error: result.error,
			content: result.content,
			...result.meta !== void 0 ? { meta: result.meta } : {},
			...result.additionalContexts !== void 0 ? { additionalContexts: result.additionalContexts } : {}
		});
		const tool = this.resolveExecution(exec.name, exec.agent, exec.parent !== void 0);
		if (tool === void 0) throw new ToolNotFoundError(exec.name);
		const normalized = this.createSuccessResult(exec, tool, result.value);
		return this.markCanonical(exec, {
			...normalized,
			...result.additionalContexts !== void 0 ? { additionalContexts: result.additionalContexts } : {}
		});
	}
	/** Materialize the authoritative commit outcome once, immediately before `tools/result`. */
	materializeFinalResult(result) {
		const presentation = {
			content: result.content,
			...result.meta !== void 0 ? { meta: result.meta } : {},
			...result.additionalContexts !== void 0 ? { additionalContexts: result.additionalContexts } : {}
		};
		if (result.isError) return materializePresentation({
			isError: true,
			error: result.error,
			...presentation
		});
		return deepFreeze({
			...materializePresentation({
				isError: false,
				...presentation,
				...result.concludesTurn === true ? { concludesTurn: true } : {}
			}),
			value: result.value
		});
	}
});
/** Mint a same-process correlation token whose identity is its value. */
function createExecutionToken() {
	return Symbol("dsh.tool.execution");
}
function toolErrorResult(error) {
	const info = errorInfo(error);
	const message = errorMessage$1(error);
	return {
		content: [{
			type: "text",
			text: `Error: ${message}`
		}],
		isError: true,
		error: {
			message,
			...info ? { info } : {}
		}
	};
}
/** Read live abort state across an await without treating it as synchronously immutable. */
function isAborted(signal) {
	return signal.aborted;
}
/**
* Fuse caller and wrapper cancellation without nesting `AbortSignal.any`.
* Keeping the relay dispatch-scoped also removes listeners when work settles.
*/
function fuseToolSignals(caller, wrapper) {
	if (caller === wrapper) return {
		signal: caller,
		dispose() {}
	};
	const controller = new AbortController();
	let listening = false;
	const dispose = () => {
		if (!listening) return;
		listening = false;
		caller.removeEventListener("abort", abortFromCaller);
		wrapper.removeEventListener("abort", abortFromWrapper);
	};
	const abortFrom = (source) => {
		const reason = source.reason;
		controller.abort(reason);
		dispose();
	};
	const abortFromCaller = () => {
		abortFrom(caller);
	};
	const abortFromWrapper = () => {
		abortFrom(wrapper);
	};
	if (wrapper.aborted) abortFromWrapper();
	else if (caller.aborted) abortFromCaller();
	else {
		listening = true;
		caller.addEventListener("abort", abortFromCaller, { once: true });
		wrapper.addEventListener("abort", abortFromWrapper, { once: true });
	}
	return {
		signal: controller.signal,
		dispose
	};
}
/** Canonical result when cancellation supersedes success after body invocation. */
function toolAbortedResult(prior) {
	const additionalContexts = prior?.additionalContexts ?? [];
	return {
		content: [{
			type: "text",
			text: "Error: tool call aborted"
		}],
		isError: true,
		error: {
			message: "tool call aborted",
			info: {
				name: "AbortError",
				code: TOOL_ABORTED
			}
		},
		...additionalContexts.length > 0 ? { additionalContexts } : {}
	};
}
/** Canonical result when cancellation prevents tool body invocation. */
function toolAbortedBeforeDispatchResult(prior) {
	const additionalContexts = prior?.additionalContexts ?? [];
	return {
		content: [{
			type: "text",
			text: "Error: tool call aborted before dispatch"
		}],
		isError: true,
		error: {
			message: "tool call aborted before dispatch",
			info: {
				name: "AbortError",
				code: TOOL_ABORTED_BEFORE_DISPATCH
			}
		},
		...additionalContexts.length > 0 ? { additionalContexts } : {}
	};
}
//#endregion
//#region src/tool.ts
/**
* Agent 工具 `app_backend`（MVP 出口：Agent 可经门面 CRUD）。
*
* 单 tool + action 参数化（panels 单 tool 多参数的同款哲学）：门面动作全部收口在一处，
* 参数契约与 facade 一一对应；错误消息由 facade 生成（面向 Agent 可自修正）。
* skill 即 API 文档：openloop-app-backend SKILL.md 承载完整用法与何时唤起。
*/
const APP_BACKEND_TOOL = "app_backend";
const ACTIONS = [
	"list_apps",
	"upsert_app",
	"delete_app",
	"get_app",
	"register_component",
	"remove_component",
	"register_api",
	"remove_api",
	"set_api_key",
	"save_dock_state",
	"load_dock_state",
	"invalidate",
	"connect_server",
	"disconnect_server",
	"reconnect_server",
	"backend_health",
	"backend_restart"
];
const APP_BACKEND_PARAMETERS = {
	action: {
		type: "string",
		required: true,
		enum: [...ACTIONS],
		description: "Facade action. Registry: list_apps / upsert_app / delete_app / get_app; components: register_component / remove_component; apis: register_api / remove_api / set_api_key; boards: save_dock_state / load_dock_state."
	},
	app: {
		type: "object",
		additionalProperties: true,
		description: "App manifest for upsert_app: { name (kebab-case, global namespace), displayName, kind (builtin|local|thirdparty), version, description?, skill? }. Same name = update."
	},
	appName: {
		type: "string",
		description: "Owning app name (namespace) for register_component / register_api / delete_app / get_app."
	},
	component: {
		type: "object",
		additionalProperties: true,
		description: "Component resource for register_component: { rid (must start with \"<appName>:\"), kind (panel|artifact), title, entry?, description? }."
	},
	rid: {
		type: "string",
		description: "Resource id `app-name:resource-name` for remove_component / remove_api / set_api_key."
	},
	api: {
		type: "object",
		additionalProperties: true,
		description: "Api resource for register_api: { rid (must start with \"<appName>:\"), domain, path, authType (none|key), summary? }. Credentials are set separately via set_api_key and never echoed back."
	},
	apiKey: {
		type: "string",
		description: "The API key value for set_api_key (stored server-side; only configured true/false is ever returned)."
	},
	dockState: {
		type: "object",
		additionalProperties: true,
		description: "Full dock v2 state for save_dock_state: { version: 2, boards: [{ id, name, tiles }], activeBoardId }. Replaces all boards/tiles atomically."
	},
	serverId: {
		type: "string",
		description: "MCP server id for connect_server: the mcp.json key and the app namespace (kebab-case)."
	},
	server: {
		type: "object",
		additionalProperties: true,
		description: "MCP server entry for connect_server (mcp.json shape): { \"type\": \"http\", \"url\": \"https://…\" } or { \"type\": \"stdio\", \"command\": \"npx\", \"args\": […] }, optional headers / env / cwd / protocol (\"legacy\"|\"auto\"|\"2026-07-28\"). Connects a third-party MCP Apps 2.0 pack: writes user-scope mcp.json, hot-activates the runtime, and registers ui-bound tools as mcp-app components (pin-ready)."
	}
};
/** 写操作清单（这些 action 完成后建议 agent 调一次 invalidate 通知 UI 刷新） */
const WRITE_ACTIONS = /* @__PURE__ */ new Set([
	"upsert_app",
	"delete_app",
	"register_component",
	"remove_component",
	"register_api",
	"remove_api",
	"set_api_key",
	"save_dock_state",
	"connect_server"
]);
/** 输出契约：各 action 返回形态不同，统一为开放对象（细节由 facade 类型承载） */
const APP_OUTPUT_SCHEMA = {
	type: "object",
	additionalProperties: true
};
function expectString(args, key, action) {
	const value = args[key];
	if (typeof value !== "string" || value.length === 0) throw new Error(`action "${action}" requires a non-empty string parameter "${key}".`);
	return value;
}
function expectObject(args, key, action) {
	const value = args[key];
	if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error(`action "${action}" requires an object parameter "${key}" (a stringified JSON is also fine — pass the object directly, do not stringify).`);
	return value;
}
async function runAction(action, a, backend, facade) {
	if (action === "backend_health") {
		const s = backend.status();
		return {
			state: s.state,
			version: s.version,
			baseUrl: s.baseUrl ?? null,
			restarts: s.restarts ?? 0,
			lastError: s.lastError ?? null,
			lastRestartAt: s.lastRestartAt ?? null,
			registryRev: s.registryRev ?? 0,
			hint: s.state === "running" ? "backend is healthy" : s.state === "starting" ? "backend is starting (first start downloads the binary — wait and re-check)" : `backend is ${s.state}${s.error !== void 0 ? `: ${s.error}` : ""} — call backend_restart to recover, or check OPENLOOP_PB_BIN / network`
		};
	}
	if (action === "backend_restart") {
		await backend.restart();
		const s = backend.status();
		return {
			restarted: true,
			state: s.state,
			baseUrl: s.baseUrl ?? null
		};
	}
	const result = await runCore(action, a, facade);
	if (WRITE_ACTIONS.has(action) || action === "invalidate") backend.invalidateRegistry();
	return result;
}
async function runCore(action, a, facade) {
	switch (action) {
		case "list_apps": return { apps: await facade.listApps() };
		case "upsert_app": return { app: await facade.upsertApp(expectObject(a, "app", action)) };
		case "delete_app": {
			const appName = expectString(a, "appName", action);
			return {
				deleted: appName,
				...await facade.deleteApp(appName)
			};
		}
		case "get_app": {
			const detail = await facade.getAppDetail(expectString(a, "appName", action));
			if (detail === void 0) throw new Error(`app "${String(a.appName)}" is not registered. Call list_apps to see what exists.`);
			return detail;
		}
		case "register_component": return { component: await facade.registerComponent(expectString(a, "appName", action), expectObject(a, "component", action)) };
		case "remove_component":
			await facade.removeComponent(expectString(a, "rid", action));
			return { removed: expectString(a, "rid", action) };
		case "register_api": return { api: await facade.registerApi(expectString(a, "appName", action), expectObject(a, "api", action)) };
		case "remove_api":
			await facade.removeApi(expectString(a, "rid", action));
			return { removed: expectString(a, "rid", action) };
		case "set_api_key":
			await facade.setApiKey(expectString(a, "rid", action), expectString(a, "apiKey", action));
			return {
				rid: expectString(a, "rid", action),
				configured: true
			};
		case "save_dock_state": return { saved: await facade.saveDockState(expectObject(a, "dockState", action)) };
		case "load_dock_state": return { state: await facade.loadDockState() };
		case "invalidate": return { invalidated: true };
		case "backend_health":
		case "backend_restart": throw new Error(`action "${action}" is handled elsewhere`);
	}
}
function createAppBackendTool(backend, options = {}) {
	return defineTool({
		name: APP_BACKEND_TOOL,
		description: "Managed local app backend (PocketBase behind a controlled facade): app/component/api registry, board & tile storage, dock state migration, and connect_server for third-party MCP Apps 2.0 packs. Load the openloop-app-backend skill before the first call. All resource ids follow `app-name:resource-name` (naming is addressing). Credentials are write-only — only configured status is returned.",
		parameters: APP_BACKEND_PARAMETERS,
		output: {
			schema: APP_OUTPUT_SCHEMA,
			render: (args, value) => {
				const action = typeof args.action === "string" ? args.action : "unknown";
				return [{
					type: "text",
					text: `app_backend ${String(action)} ok: ${JSON.stringify(value).slice(0, 400)}`
				}];
			}
		},
		async execute(args) {
			const a = args;
			const action = expectString(a, "action", "list_apps");
			if (!ACTIONS.includes(action)) throw new Error(`unknown action "${String(a.action)}". Valid actions: ${ACTIONS.join(", ")}.`);
			if (action === "backend_health" || action === "backend_restart") return await runAction(action, a, backend, void 0);
			if (action === "connect_server" || action === "disconnect_server" || action === "reconnect_server") {
				const { connectServer, disconnectServer, reconnectServer } = await import("./connect-CmTvIpKq.js");
				const result = await (action === "connect_server" ? () => connectServer({
					serverId: expectString(a, "serverId", action),
					entry: expectObject(a, "server", action),
					dshHome: backend.dshHome(),
					backend,
					mcpRuntime: options.getMcpRuntime?.()
				}) : action === "disconnect_server" ? () => disconnectServer({
					serverId: expectString(a, "serverId", action),
					dshHome: backend.dshHome(),
					backend,
					mcpRuntime: options.getMcpRuntime?.()
				}) : () => reconnectServer({
					serverId: expectString(a, "serverId", action),
					dshHome: backend.dshHome(),
					backend,
					mcpRuntime: options.getMcpRuntime?.()
				}))();
				backend.invalidateRegistry();
				return result;
			}
			return await runAction(action, a, backend, await backend.ready());
		}
	});
}
//#endregion
//#region ../../node_modules/.pnpm/@deepseek-ai+dsh-skill@0.1.1-rc.2_@deepseek-ai+cordis@4.0.1_@deepseek-ai+dsh-invariants_8e540be08712eb0192427c91631b3fb1/node_modules/@deepseek-ai/dsh-skill/lib/index.js
/**
* Agent skill provider registry.
*
* This package owns the Service Definition role of the skill capability seam.
* Concrete
* providers such as `@deepseek-ai/dsh-skill-filesystem` decide where skills come
* from; this service only merges provider catalogs, resolves the winning skill
* for a name, and exposes the winning summaries and definitions to consumers.
*
* @module @deepseek-ai/dsh-skill
*/
const SKILL_NAME$2 = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DEFAULT_COLLECT_CACHE_ENTRIES = 128;
const MAX_COLLECT_ATTEMPTS = 2;
const RUNTIME_PROVIDER = "runtime";
const RUNTIME_RANK = 250;
/**
* Return whether a string is a valid kebab-case skill name.
* @param name - candidate skill name to validate.
* @returns whether the name matches the public skill-name grammar.
*/
function isSkillName(name) {
	return SKILL_NAME$2.test(name);
}
/** One scope's complete skill-registry contribution. */
var SkillLayer = class {
	/** Providers registered through contexts carrying this scope, insertion-ordered. */
	providers;
	/** Runtime skills registered through contexts carrying this scope. */
	runtime = /* @__PURE__ */ new Map();
	constructor(scope) {
		this.providers = new NamedEntries((name) => /* @__PURE__ */ new Error(scope === void 0 ? `a skill provider named "${name}" is already registered` : `a skill provider named "${name}" is already registered in this scope`));
	}
	/** Whether every contribution table in this aggregate layer is empty. */
	isEmpty() {
		return this.providers.isEmpty() && this.runtime.size === 0;
	}
};
(class extends Service {
	static Config = Schema.object({ collectCacheMaxEntries: Schema.number().default(DEFAULT_COLLECT_CACHE_ENTRIES) });
	collectCacheMaxEntries;
	layers = new ScopedLayers((scope) => new SkillLayer(scope), () => {
		this.invalidateCache();
	});
	collectCache = /* @__PURE__ */ new Map();
	revision = 0;
	nextProviderOrder = 0;
	/** Stable identities for cache keys; scope keys are opaque identity-compared objects. */
	scopeIds = /* @__PURE__ */ new WeakMap();
	nextScopeId = 1;
	constructor(ctx, config = {}) {
		super(ctx, "skills");
		this.collectCacheMaxEntries = config.collectCacheMaxEntries ?? DEFAULT_COLLECT_CACHE_ENTRIES;
		assertPositiveInteger("collectCacheMaxEntries", this.collectCacheMaxEntries);
	}
	/**
	* Register a borrowed same-process provider synchronously during plugin
	* apply, into the calling context's layer: a scoped context (an agent
	* preset's standing mount) registers for that scope alone, an unscoped
	* context registers globally. Duplicate names within one layer and reserved
	* names throw; remote initialization belongs in `list()`. Fiber disposal
	* unregisters the provider and invalidates catalog caches.
	* @param create - synchronous factory receiving this registration's lifecycle and invalidation control.
	* @returns the exact Cordis effect disposer that unregisters this provider;
	*   composite effects may yield it directly to preserve teardown ordering.
	*/
	registerProvider(create) {
		const lifecycle = new AbortController();
		let registration;
		let provider;
		const control = {
			signal: lifecycle.signal,
			invalidate: () => {
				const active = registration;
				if (active !== void 0 && active.layer.providers.get(active.name)?.provider === provider) this.invalidateCache();
			}
		};
		try {
			provider = create(control);
			const name = provider.name;
			if (name === RUNTIME_PROVIDER) throw new Error(`"${RUNTIME_PROVIDER}" is reserved for runtime skill registrations`);
			const order = this.nextProviderOrder;
			this.nextProviderOrder += 1;
			return this.layers.effect(this.ctx, (layer) => {
				const undo = layer.providers.insert(name, {
					provider,
					order
				});
				registration = {
					layer,
					name
				};
				return () => {
					registration = void 0;
					undo();
					lifecycle.abort(/* @__PURE__ */ new Error(`skill provider "${name}" disposed`));
				};
			}, { label: "skills.registerProvider()" });
		} catch (error) {
			lifecycle.abort(error);
			throw error;
		}
	}
	/**
	* Register a borrowed readonly runtime skill into the calling context's
	* layer. Project entries outrank runtime entries, which outrank user
	* entries, within one layer. Same-name runtime entries in one layer are
	* first-wins; a duplicate logs a warning and receives a no-op disposer so
	* it cannot remove the winner.
	* @param skill - the skill definition input; omitted invocation and provider fields receive defaults.
	* @returns the exact Cordis effect disposer, preserving composite teardown order and invalidating caches.
	*/
	register(skill) {
		validateRuntimeSkill(skill);
		const scope = scopeOf(this.ctx);
		const existingLayer = scope === void 0 ? this.layers.global : this.layers.peek(scope);
		if (existingLayer !== void 0 && existingLayer.runtime.has(skill.name)) {
			this.ctx.logger.warn(`runtime skill "${skill.name}" ignored because it is already registered`);
			return () => {};
		}
		const definition = {
			...skill,
			invocation: skill.invocation ?? {
				modelInvocable: true,
				userInvocable: true
			},
			provider: skill.provider ?? RUNTIME_PROVIDER
		};
		return this.layers.effect(this.ctx, (layer) => {
			layer.runtime.set(definition.name, definition);
			return () => {
				layer.runtime.delete(definition.name);
			};
		}, { label: "skills.register()" });
	}
	/**
	* List invocation-neutral skill summaries for a workspace. Consumers apply
	* model or user invocation policy at their operational boundary. Lookup
	* options and provider candidates are readonly same-process values borrowed
	* throughout discovery.
	* @param options - view options; `scope` selects the viewing agent's layers, `cwd` selects project roots, and `signal` cancels discovery.
	* @returns all sorted winning summaries.
	*/
	async list(options = {}) {
		return (await this.snapshot(options)).skills;
	}
	/**
	* Observe the current invocation-neutral catalog and whether discovery completed within a stable revision.
	* Incomplete observations are never cached, allowing consumers to retain last-good state and
	* retry on their next request boundary.
	* @param options - view options; `scope` selects the viewing agent's layers, `cwd` selects project roots, and `signal` cancels discovery.
	* @returns sorted summaries plus discovery-completeness state.
	*/
	async snapshot(options = {}) {
		const collected = await this.collect(options);
		return {
			skills: [...collected.entries.values()].map((entry) => toSummary(entry.candidate)).sort(compareSkillSummary),
			complete: collected.cacheable
		};
	}
	/**
	* Load and validate the winning candidate, passing its opaque discovery locator back to the
	* provider. Cancellation is rechecked after selection, including cache hits, and raced against
	* loading so an uncooperative provider cannot hang the caller.
	* @param name - kebab-case skill name.
	* @param options - view options; `scope` selects the viewing agent's layers,
	*   `cwd` selects workspace-sensitive skills, and `signal` cancels work.
	* @returns the full skill, including body content, or `undefined`.
	*/
	async get(name, options = {}) {
		if (!isSkillName(name)) return void 0;
		const collected = await this.collect(options);
		throwIfAborted(options.signal);
		const match = collected.entries.get(name);
		if (match === void 0) return void 0;
		const definition = await waitWithAbort(match.provider.get(match.candidate, options), options.signal);
		if (definition === void 0) return void 0;
		validateDefinition(definition);
		if (definition.name !== match.candidate.name) {
			this.invalidateEntry(match);
			return;
		}
		return definition;
	}
	async collect(options) {
		throwIfAborted(options.signal);
		let attempt = 1;
		while (true) {
			const revision = this.revision;
			const key = this.collectCacheKey(options.cwd, scopeChainOf(options.scope), revision);
			const cached = this.collectCache.get(key);
			if (cached !== void 0) return {
				entries: cached,
				cacheable: true
			};
			const result = await this.collectFresh(options);
			throwIfAborted(options.signal);
			if (revision !== this.revision) {
				if (attempt < MAX_COLLECT_ATTEMPTS) {
					attempt += 1;
					continue;
				}
				return {
					entries: result.entries,
					cacheable: false
				};
			}
			if (result.cacheable) {
				this.collectCache.set(key, result.entries);
				if (this.collectCache.size > this.collectCacheMaxEntries) {
					const oldest = this.collectCache.keys().next();
					this.collectCache.delete(oldest.value);
				}
			}
			return result;
		}
	}
	async collectFresh(options) {
		const layers = [this.layers.global, ...this.layers.chainLayers(options.scope)];
		const merged = /* @__PURE__ */ new Map();
		let cacheable = true;
		for (const layer of layers) {
			const collected = await this.collectLayer(layer, options);
			if (!collected.cacheable) cacheable = false;
			for (const entry of collected.entries) merged.set(entry.candidate.name, entry);
		}
		return {
			entries: merged,
			cacheable
		};
	}
	async collectLayer(layer, options) {
		const collected = await this.listLayerCandidates(layer, options);
		collected.entries.sort(compareIndexedCandidates);
		const seen = /* @__PURE__ */ new Set();
		const result = [];
		for (const entry of collected.entries) {
			const skill = entry.candidate;
			if (seen.has(skill.name)) {
				this.ctx.logger.warn(`skill "${skill.name}" from ${skill.source} ignored because a higher-priority skill already exists`);
				continue;
			}
			seen.add(skill.name);
			result.push(entry);
		}
		return {
			entries: result,
			cacheable: collected.cacheable
		};
	}
	async listLayerCandidates(layer, options) {
		throwIfAborted(options.signal);
		const candidates = [];
		let cacheable = true;
		let runtimeOrder = 0;
		for (const skill of [...layer.runtime.values()].sort((a, b) => compareCodePoints(a.name, b.name))) {
			candidates.push({
				candidate: runtimeCandidate(skill),
				provider: RUNTIME_SKILL_PROVIDER,
				providerOrder: -1,
				localOrder: runtimeOrder,
				layer
			});
			runtimeOrder += 1;
		}
		for (const { provider, order } of [...layer.providers.values()]) {
			let localOrder = 0;
			let output;
			try {
				output = await waitWithAbort(provider.list(options), options.signal);
			} catch (error) {
				if (options.signal?.aborted === true) throw toError(options.signal.reason);
				cacheable = false;
				this.ctx.logger.warn(`skill provider "${provider.name}" skipped: ${errorMessage(error)}`);
			}
			if (output === void 0) continue;
			const observation = normalizeProviderObservation(output, provider.name);
			if (!observation.complete) cacheable = false;
			for (const candidate of observation.candidates) {
				validateCandidate(candidate, provider.name);
				candidates.push({
					candidate,
					provider,
					providerOrder: order,
					localOrder,
					layer
				});
				localOrder += 1;
			}
		}
		return {
			entries: candidates,
			cacheable
		};
	}
	invalidateCache() {
		this.revision += 1;
		this.collectCache.clear();
		this.notifyChange();
	}
	/** Invalidate after a stale definition load, only while the exact registration that produced the entry is still live. */
	invalidateEntry(entry) {
		/* v8 ignore else -- A definition load can outlive the exact provider registration it selected. */
		if (entry.layer.providers.get(entry.provider.name)?.provider === entry.provider) this.invalidateCache();
	}
	scopeId(key) {
		let id = this.scopeIds.get(key);
		if (id === void 0) {
			id = this.nextScopeId;
			this.nextScopeId += 1;
			this.scopeIds.set(key, id);
		}
		return id;
	}
	collectCacheKey(cwd, chain, revision) {
		return JSON.stringify({
			cwd,
			scopes: chain.map((key) => this.scopeId(key)),
			revision
		});
	}
	/** Notify catalog observers without making their refresh work load-bearing. */
	notifyChange() {
		for (const callback of this.ctx.events.dispatch("emit", ["skills/change"])) try {
			const returned = callback();
			Promise.resolve(returned).catch((error) => {
				this.ctx.logger.warn(`skills/change listener rejected: ${errorMessage(error)}`);
			});
		} catch (error) {
			this.ctx.logger.warn(`skills/change listener threw: ${errorMessage(error)}`);
		}
	}
});
function normalizeProviderObservation(output, providerName) {
	if (Array.isArray(output)) return {
		candidates: output,
		complete: true
	};
	if (output === null || typeof output !== "object") throw invalidProviderObservation(providerName);
	const observation = output;
	if (!Array.isArray(observation.candidates) || typeof observation.complete !== "boolean") throw invalidProviderObservation(providerName);
	return observation;
}
function invalidProviderObservation(providerName) {
	return /* @__PURE__ */ new TypeError(`skill provider "${providerName}" list() must return an array or { candidates, complete } observation`);
}
const RUNTIME_SKILL_PROVIDER = {
	name: RUNTIME_PROVIDER,
	/* v8 ignore next -- Runtime skills are injected directly by the registry; this provider only owns `get()`. */
	list() {
		return Promise.resolve([]);
	},
	get(candidate) {
		return Promise.resolve(candidate.locator);
	}
};
function runtimeCandidate(skill) {
	return {
		name: skill.name,
		description: skill.description,
		...skill.whenToUse !== void 0 ? { whenToUse: skill.whenToUse } : {},
		invocation: skill.invocation,
		source: skill.source,
		provider: skill.provider,
		...skill.resourceBase !== void 0 ? { resourceBase: skill.resourceBase } : {},
		rank: RUNTIME_RANK,
		locator: skill,
		...skill.path !== void 0 ? { path: skill.path } : {},
		...skill.metadata !== void 0 ? { metadata: skill.metadata } : {}
	};
}
function validateCandidate(candidate, providerName) {
	if (typeof candidate.name !== "string") throw new TypeError(`skill provider "${providerName}" returned a non-string skill name`);
	if (!SKILL_NAME$2.test(candidate.name)) throw new Error(`skill provider "${providerName}" returned invalid skill name "${candidate.name}"`);
	if (typeof candidate.description !== "string") throw new TypeError(`skill provider "${providerName}" returned skill "${candidate.name}" with a non-string description`);
	if (candidate.description.length === 0) throw new Error(`skill provider "${providerName}" returned skill "${candidate.name}" without a description`);
	validateInvocation(candidate.invocation, `skill provider "${providerName}" returned skill "${candidate.name}"`);
	if (candidate.whenToUse !== void 0 && typeof candidate.whenToUse !== "string") throw new TypeError(`skill provider "${providerName}" returned skill "${candidate.name}" with a non-string whenToUse`);
	if (typeof candidate.source !== "string") throw new TypeError(`skill provider "${providerName}" returned skill "${candidate.name}" with a non-string source`);
	if (typeof candidate.rank !== "number" || !Number.isFinite(candidate.rank)) throw new Error(`skill provider "${providerName}" returned skill "${candidate.name}" with an invalid rank`);
	if (typeof candidate.provider !== "string") throw new TypeError(`skill provider "${providerName}" returned skill "${candidate.name}" with a non-string provider`);
	if (candidate.provider !== providerName) throw new Error(`skill provider "${providerName}" returned skill "${candidate.name}" for provider "${candidate.provider}"`);
	if (candidate.path !== void 0 && typeof candidate.path !== "string") throw new TypeError(`skill provider "${providerName}" returned skill "${candidate.name}" with a non-string path`);
}
function validateRuntimeSkill(skill) {
	if (!SKILL_NAME$2.test(skill.name)) throw new Error(`invalid skill name "${skill.name}"`);
	if (skill.description.length === 0) throw new Error(`skill "${skill.name}" requires a description`);
	validateInvocation(skill.invocation, `runtime skill "${skill.name}"`);
}
/** Validate a definition loaded from a provider-controlled parser or remote source. */
function validateDefinition(skill) {
	const name = skill.name;
	const description = skill.description;
	const whenToUse = skill.whenToUse;
	const invocation = skill.invocation;
	const source = skill.source;
	const provider = skill.provider;
	const content = skill.content;
	const path = skill.path;
	if (typeof name !== "string") throw new TypeError("loaded skill name must be a string");
	if (!SKILL_NAME$2.test(name)) throw new Error(`loaded skill has invalid name "${name}"`);
	if (typeof description !== "string") throw new TypeError(`loaded skill "${name}" description must be a string`);
	if (description.length === 0) throw new Error(`loaded skill "${name}" requires a description`);
	validateInvocation(invocation, `loaded skill "${name}"`);
	if (whenToUse !== void 0 && typeof whenToUse !== "string") throw new TypeError(`loaded skill "${name}" whenToUse must be a string`);
	if (typeof source !== "string") throw new TypeError(`loaded skill "${name}" source must be a string`);
	if (typeof provider !== "string") throw new TypeError(`loaded skill "${name}" provider must be a string`);
	if (typeof content !== "string") throw new TypeError(`loaded skill "${name}" content must be a string`);
	if (path !== void 0 && typeof path !== "string") throw new TypeError(`loaded skill "${name}" path must be a string`);
}
function toSummary(skill) {
	const { name, description, whenToUse, invocation, source, provider, resourceBase } = skill;
	return {
		name,
		description,
		...whenToUse !== void 0 ? { whenToUse } : {},
		invocation,
		source,
		provider,
		...resourceBase !== void 0 ? { resourceBase } : {}
	};
}
function validateInvocation(invocation, subject) {
	if (invocation === void 0) return;
	if (typeof invocation !== "object" || invocation === null || Array.isArray(invocation)) throw new TypeError(`${subject} with a non-object invocation policy`);
	const policy = invocation;
	if (typeof policy.modelInvocable !== "boolean") throw new TypeError(`${subject} with a non-boolean invocation.modelInvocable`);
	if (typeof policy.userInvocable !== "boolean") throw new TypeError(`${subject} with a non-boolean invocation.userInvocable`);
}
function compareSkillSummary(left, right) {
	return compareCodePoints(left.name, right.name);
}
function compareCodePoints(left, right) {
	if (left < right) return -1;
	if (left > right) return 1;
	return 0;
}
function compareIndexedCandidates(left, right) {
	return left.candidate.rank - right.candidate.rank || left.providerOrder - right.providerOrder || left.localOrder - right.localOrder;
}
function assertPositiveInteger(name, value, minimum = 1) {
	if (!Number.isInteger(value) || value < minimum) throw new Error(`skill: ${name} must be an integer greater than or equal to ${minimum}`);
}
function waitWithAbort(promise, signal) {
	if (signal === void 0) return promise;
	throwIfAborted(signal);
	return new Promise((resolve, reject) => {
		const cleanup = () => {
			signal.removeEventListener("abort", onAbort);
		};
		const onAbort = () => {
			cleanup();
			reject(toError(signal.reason));
		};
		signal.addEventListener("abort", onAbort, { once: true });
		promise.then((value) => {
			cleanup();
			resolve(value);
		}, (error) => {
			cleanup();
			reject(toError(error));
		});
	});
}
/** Throw a total Error for an already-aborted lookup. */
function throwIfAborted(signal) {
	if (signal?.aborted === true) throw toError(signal.reason);
}
/** Normalize an arbitrary abort or provider failure without trusting coercion. */
function toError(error) {
	try {
		if (error instanceof Error) return error;
	} catch {}
	return new Error(errorMessage(error));
}
/** Render an arbitrary provider failure without letting coercion escape containment. */
function errorMessage(error) {
	try {
		return String(error);
	} catch {
		return "[unrenderable thrown value]";
	}
}
//#endregion
//#region src/skill.ts
/**
* openloop-app-backend skill（skill 即 API 文档——插件设计四原则之二）。
* content 为 assets/skills/openloop-app-backend/SKILL.md（bundled asset；src 下的
* .md 不进 lib 的教训见 panels skills 注释）。
*/
const SKILL_NAME$1 = "openloop-app-backend";
const resourceBase$1 = {
	kind: "directory",
	path: fileURLToPath(new URL("../assets/skills/", import.meta.url))
};
const appBackendSkillProvider = {
	name: SKILL_NAME$1,
	list: () => Promise.resolve([createCandidate$1()]),
	async get() {
		const body = new URL(`../assets/skills/${SKILL_NAME$1}/SKILL.md`, import.meta.url);
		return {
			...createCandidate$1(),
			content: await readFile(body, "utf8")
		};
	}
};
function createCandidate$1() {
	return {
		name: SKILL_NAME$1,
		description: "OpenLoop 本地应用后端（PocketBase 门面）：注册 APP/组件/API 资源、配置 API 凭据（只写不读）、存取看板与 tile。用 app_backend 工具前先读——action 清单、rid 命名规则（包名:组件名）与错误自修正指南。",
		invocation: {
			modelInvocable: true,
			userInvocable: true
		},
		provider: SKILL_NAME$1,
		source: "bundled",
		resourceBase: resourceBase$1,
		rank: 600,
		locator: new URL(`../assets/skills/${SKILL_NAME$1}/SKILL.md`, import.meta.url)
	};
}
//#endregion
//#region src/skill-doctor.ts
/**
* openloop-app-doctor skill（P3 自愈）：PB 门面故障的诊断决策树。
* 与 openloop-app-backend skill 并列注册（后者管 CRUD 用法，本 skill 管健康）。
*/
const SKILL_NAME = "openloop-app-doctor";
const resourceBase = {
	kind: "directory",
	path: fileURLToPath(new URL("../assets/skills/", import.meta.url))
};
function createCandidate() {
	return {
		name: SKILL_NAME,
		description: "OpenLoop 本地后端自愈：PocketBase 门面故障的诊断与修复（backend_health 查状态、对因修复、backend_restart 恢复）。app_backend 报 backend 未运行/failed、dock 降级提示、APP 页异常时先读——分诊表 + 熔断恢复路径。",
		invocation: {
			modelInvocable: true,
			userInvocable: true
		},
		provider: SKILL_NAME,
		source: "bundled",
		resourceBase,
		rank: 600,
		locator: new URL(`../assets/skills/${SKILL_NAME}/SKILL.md`, import.meta.url)
	};
}
const appDoctorSkillProvider = {
	name: SKILL_NAME,
	list: () => Promise.resolve([createCandidate()]),
	async get() {
		const body = new URL(`../assets/skills/${SKILL_NAME}/SKILL.md`, import.meta.url);
		return {
			...createCandidate(),
			content: await readFile(body, "utf8")
		};
	}
};
/** 敏感字段剥离（apis.keySecret）——受控查询通道绝不回显凭据 */
const STRIP_FIELDS = /* @__PURE__ */ new Set(["keySecret"]);
function isManagedCollection(name) {
	return COLLECTIONS.some((c) => c.name === name);
}
/** 钳制分页参数（非法输入回落默认值，不抛错——查询参数宽松语义） */
function clampPaging(page, perPage) {
	const p = typeof page === "string" && /^\d+$/.test(page) ? Number(page) : 1;
	const pp = typeof perPage === "string" && /^\d+$/.test(perPage) ? Number(perPage) : 20;
	return {
		page: Math.max(1, Math.floor(p)),
		perPage: Math.min(100, Math.max(5, Math.floor(pp)))
	};
}
/** 关键词 → PB 过滤器（text 字段的 OR like 串；空白/无 text 字段返回 null = 不过滤） */
function buildKeywordFilter(fields, q) {
	const textFields = fields.map((f) => typeof f.name === "string" ? f.name : "").filter((name) => name.length > 0);
	if (textFields.length === 0) return null;
	const escaped = q.trim().replaceAll("\"", "");
	if (escaped.length === 0) return null;
	return textFields.map((f) => `${f} ~ "${escaped}"`).join(" || ");
}
async function listRecordsPaged(pb, collection, page, perPage, q) {
	const schema = await pb.request("GET", `/api/collections/${collection}`);
	const fields = Array.isArray(schema?.fields) ? schema.fields : [];
	const params = new URLSearchParams({
		page: String(page),
		perPage: String(perPage)
	});
	const keyword = typeof q === "string" ? q.trim() : "";
	if (keyword.length > 0) {
		const filter = buildKeywordFilter(fields, keyword);
		if (filter !== null) params.set("filter", filter);
	}
	const res = await pb.request("GET", `/api/collections/${collection}/records?${params.toString()}`);
	const items = (Array.isArray(res?.items) ? res.items : []).map((row) => {
		const clean = {};
		for (const [key, value] of Object.entries(row)) if (!STRIP_FIELDS.has(key)) clean[key] = value;
		return clean;
	});
	return {
		collection,
		items,
		page: typeof res?.page === "number" ? res.page : page,
		perPage: typeof res?.perPage === "number" ? res.perPage : perPage,
		totalItems: typeof res?.totalItems === "number" ? res.totalItems : items.length,
		totalPages: typeof res?.totalPages === "number" ? res.totalPages : 1
	};
}
/** 全部管理表的记录数（pb-stats / collections 下拉用） */
async function collectionCounts(pb) {
	const counts = [];
	for (const def of COLLECTIONS) {
		const params = new URLSearchParams({
			page: "1",
			perPage: "1"
		});
		const res = await pb.request("GET", `/api/collections/${def.name}/records?${params.toString()}`);
		counts.push({
			name: def.name,
			count: typeof res?.totalItems === "number" ? res.totalItems : 0
		});
	}
	return counts.sort((a, b) => a.name.localeCompare(b.name));
}
//#endregion
//#region src/stats.ts
/**
* 本地统计聚合（M3+ 本地后端预设族的服务端数据源）：
* - dirStats：递归 stat 走目录（不读内容）→ { bytes, files }；符号链接跳过（防环）
* - storageUsage：DSH_HOME 顶层占用分解（sessions/attachments/cache/data + 根文件）
* - sessionsStats：sessions 目录（slug/session- 前缀子目录）走查——总数/总字节/最近活跃/按日聚合/最大占用
*
* 全部只 stat 不 read，万级文件量也在百毫秒级。
*/
/** 递归统计目录（符号链接跳过；不存在返回 0） */
async function dirStats(path) {
	let bytes = 0;
	let files = 0;
	const entries = await readdir(path, { withFileTypes: true }).catch(() => []);
	for (const entry of entries) {
		const full = join(path, entry.name);
		if (entry.isSymbolicLink()) continue;
		if (entry.isDirectory()) {
			const sub = await dirStats(full);
			bytes += sub.bytes;
			files += sub.files;
		} else if (entry.isFile()) {
			const s = await stat(full).catch(() => void 0);
			if (s !== void 0) {
				bytes += s.size;
				files++;
			}
		}
	}
	return {
		bytes,
		files
	};
}
/** DSH_HOME 顶层占用分解（目录 + 根文件）；条目按字节降序 */
async function storageUsage(dshHome) {
	const entries = await readdir(dshHome, { withFileTypes: true }).catch(() => []);
	const result = [];
	for (const entry of entries) {
		const full = join(dshHome, entry.name);
		if (entry.isDirectory()) {
			const s = await dirStats(full);
			result.push({
				label: entry.name,
				path: full,
				bytes: s.bytes,
				files: s.files
			});
		} else if (entry.isFile()) {
			const s = await stat(full).catch(() => void 0);
			if (s !== void 0) result.push({
				label: entry.name,
				path: full,
				bytes: s.size,
				files: 1
			});
		}
	}
	result.sort((a, b) => b.bytes - a.bytes);
	return {
		home: dshHome,
		totalBytes: result.reduce((n, e) => n + e.bytes, 0),
		entries: result
	};
}
const DAY_MS = 864e5;
/** sessions 统计：目录结构 = sessions/<slug>/session-<uuid>/（AGENTS.md 既有事实） */
async function sessionsStats(dshHome, byDayDays = 14, largestN = 5) {
	const sessionsRoot = join(dshHome, "sessions");
	const slugs = await readdir(sessionsRoot, { withFileTypes: true }).catch(() => []);
	let totalSessions = 0;
	let totalBytes = 0;
	let lastActive = 0;
	const largest = [];
	const dayMap = /* @__PURE__ */ new Map();
	for (const slug of slugs) {
		if (!slug.isDirectory()) continue;
		const slugDir = join(sessionsRoot, slug.name);
		const sessionDirs = await readdir(slugDir, { withFileTypes: true }).catch(() => []);
		for (const session of sessionDirs) {
			if (!session.isDirectory() || !session.name.startsWith("session-")) continue;
			totalSessions++;
			const sessionDir = join(slugDir, session.name);
			const s = await dirStats(sessionDir);
			totalBytes += s.bytes;
			const mtime = (await stat(sessionDir).catch(() => void 0))?.mtimeMs ?? 0;
			if (mtime > lastActive) lastActive = mtime;
			const date = new Date(mtime).toISOString().slice(0, 10);
			const day = dayMap.get(date) ?? {
				count: 0,
				bytes: 0
			};
			day.count++;
			day.bytes += s.bytes;
			dayMap.set(date, day);
			largest.push({
				name: `${slug.name}/${session.name}`,
				bytes: s.bytes,
				modified: new Date(mtime).toISOString()
			});
		}
	}
	largest.sort((a, b) => b.bytes - a.bytes);
	const cutoff = Date.now() - byDayDays * DAY_MS;
	const byDay = [...dayMap.entries()].map(([date, v]) => ({
		date,
		...v
	})).filter((d) => new Date(d.date).getTime() >= new Date(new Date(cutoff).toISOString().slice(0, 10)).getTime()).sort((a, b) => a.date.localeCompare(b.date));
	return {
		totalSessions,
		totalBytes,
		lastActiveAt: lastActive > 0 ? new Date(lastActive).toISOString() : null,
		byDay,
		largest: largest.slice(0, largestN)
	};
}
//#endregion
//#region src/routes.ts
const APP_ROUTE = "/openloop/app";
async function readBody(req, maxBytes = 2097152) {
	const chunks = [];
	let total = 0;
	for await (const chunk of req) {
		total += chunk.byteLength;
		if (total > maxBytes) throw new Error("request body too large");
		chunks.push(chunk);
	}
	return Buffer.concat(chunks).toString("utf8");
}
function json(res, status, body) {
	res.setHeader("Content-Type", "application/json");
	res.setHeader("Cache-Control", "no-store");
	res.statusCode = status;
	res.end(JSON.stringify(body));
}
function registerAppRoutes(ctx, webServer, backend, options = {}) {
	const handler = (req, res) => {
		handle(req, res, backend, options).catch((error) => {
			json(res, 500, { error: error instanceof Error ? error.message : String(error) });
		});
	};
	return webServer.register({
		kind: "prefix",
		path: APP_ROUTE,
		handler
	});
}
async function handle(req, res, backend, options) {
	const url = new URL(req.url ?? "/", "http://loopback.invalid");
	const sub = url.pathname.slice(13).replace(/^\/+|\/+$/g, "");
	const method = req.method ?? "GET";
	if (sub === "status" && method === "GET") {
		json(res, 200, backend.status());
		return;
	}
	if (sub === "invalidate" && method === "POST") {
		json(res, 200, {
			ok: true,
			registryRev: backend.invalidateRegistry()
		});
		return;
	}
	if (sub === "agent-activity" && method === "GET") {
		const { snapshotAgentActivity } = await import("./agent-activity-Byu8Knx9.js");
		json(res, 200, await snapshotAgentActivity(join(backend.dshHome(), "sessions")));
		return;
	}
	if (sub === "events" && method === "GET") {
		const url = new URL(req.url ?? "/", "http://loopback.invalid");
		const limitRaw = Number(url.searchParams.get("limit") ?? "100");
		const limit = Number.isFinite(limitRaw) ? Math.min(200, Math.max(1, Math.round(limitRaw))) : 100;
		if (options.listEvents !== void 0) json(res, 200, { events: await options.listEvents(limit) });
		else {
			const { ringSnapshot } = await import("./event-log-BXAbL1aZ.js").then((n) => n.i);
			json(res, 200, { events: ringSnapshot(limit) });
		}
		return;
	}
	if (sub === "events" && method === "POST") {
		const body = JSON.parse(await readBody(req));
		const text = typeof body.text === "string" ? body.text.trim() : "";
		if (text.length === 0) {
			json(res, 400, { error: "text is required" });
			return;
		}
		const kind = body.kind === "backend" || body.kind === "mcp" || body.kind === "dock" ? body.kind : "registry";
		const level = body.level === "warn" || body.level === "error" ? body.level : "info";
		options.recordEvent?.(kind, level, text.slice(0, 500));
		json(res, 200, { ok: true });
		return;
	}
	if (sub === "api-usage" && method === "GET") {
		if (options.readUsage !== void 0) json(res, 200, await options.readUsage());
		else json(res, 200, {
			windowMs: 864e5,
			sources: []
		});
		return;
	}
	if (sub === "api-usage" && method === "POST") {
		const body = JSON.parse(await readBody(req));
		const source = typeof body.source === "string" ? body.source.trim() : "";
		if (source.length === 0) {
			json(res, 400, { error: "source is required" });
			return;
		}
		const kind = body.kind === "mcp-call" ? "mcp-call" : "panel-binding";
		options.recordUsage?.(source, kind, body.ok !== false, typeof body.ms === "number" && Number.isFinite(body.ms) ? Math.max(0, Math.round(body.ms)) : 0);
		json(res, 200, { ok: true });
		return;
	}
	if (sub === "manage/disconnect" && method === "POST") {
		const body = JSON.parse(await readBody(req));
		if (typeof body.serverId !== "string" || body.serverId.length === 0) {
			json(res, 400, { error: "serverId is required" });
			return;
		}
		const { disconnectServer } = await import("./connect-CmTvIpKq.js");
		json(res, 200, await disconnectServer({
			serverId: body.serverId,
			dshHome: backend.dshHome(),
			backend,
			mcpRuntime: options.getMcpRuntime?.()
		}));
		return;
	}
	if (sub === "manage/reconnect" && method === "POST") {
		const body = JSON.parse(await readBody(req));
		if (typeof body.serverId !== "string" || body.serverId.length === 0) {
			json(res, 400, { error: "serverId is required" });
			return;
		}
		const { reconnectServer } = await import("./connect-CmTvIpKq.js");
		json(res, 200, await reconnectServer({
			serverId: body.serverId,
			dshHome: backend.dshHome(),
			backend,
			mcpRuntime: options.getMcpRuntime?.()
		}));
		return;
	}
	if (sub === "manage/delete" && method === "POST") {
		const body = JSON.parse(await readBody(req));
		if (typeof body.appName !== "string" || body.appName.length === 0) {
			json(res, 400, { error: "appName is required" });
			return;
		}
		const result = await (await backend.ready()).deleteApp(body.appName);
		options.recordEvent?.("registry", "warn", `删除 APP「${body.appName}」（级联清理 ${result.removedComponents ?? 0} 组件）`);
		backend.invalidateRegistry();
		json(res, 200, {
			ok: true,
			appName: body.appName,
			...result
		});
		return;
	}
	const facade = await backend.ready();
	if (sub === "registry" && method === "GET") {
		const apps = await facade.listApps();
		json(res, 200, { apps: (await Promise.all(apps.map(async (app) => facade.getAppDetail(app.name)))).map((d) => d === void 0 ? null : d).filter((d) => d !== null) });
		return;
	}
	if (sub === "boards" && method === "GET") {
		json(res, 200, { state: await facade.loadDockState() });
		return;
	}
	if (sub === "boards" && method === "PUT") {
		const body = JSON.parse(await readBody(req));
		json(res, 200, { saved: await facade.saveDockState(body) });
		return;
	}
	if (sub === "pb-stats" && method === "GET") {
		const pb = backend.pbClient();
		if (pb === void 0) {
			json(res, 503, { error: "app backend is not running" });
			return;
		}
		const collections = await collectionCounts(pb);
		const dataDir = backend.pbDataDir();
		const dataDirBytes = dataDir !== void 0 ? (await dirStats(dataDir)).bytes : 0;
		const startedAt = backend.startedAt();
		json(res, 200, {
			version: PB_VERSION,
			state: "running",
			uptimeMs: startedAt !== void 0 ? Date.now() - startedAt : null,
			collections,
			dataDirBytes
		});
		return;
	}
	if (sub === "collections" && method === "GET") {
		const pb = backend.pbClient();
		if (pb === void 0) {
			json(res, 503, { error: "app backend is not running" });
			return;
		}
		json(res, 200, { collections: await collectionCounts(pb) });
		return;
	}
	if (sub.startsWith("collections/") && sub.endsWith("/records") && method === "GET") {
		const pb = backend.pbClient();
		if (pb === void 0) {
			json(res, 503, { error: "app backend is not running" });
			return;
		}
		const name = sub.slice(12, -8);
		if (!isManagedCollection(name)) {
			json(res, 404, { error: `unknown collection "${name}"; managed: apps, components, apis, boards, tiles, meta` });
			return;
		}
		const { page, perPage } = clampPaging(url.searchParams.get("page"), url.searchParams.get("perPage"));
		json(res, 200, await listRecordsPaged(pb, name, page, perPage, url.searchParams.get("q") ?? void 0));
		return;
	}
	if (sub === "storage-usage" && method === "GET") {
		json(res, 200, await storageUsage(backend.dshHome()));
		return;
	}
	if (sub === "credentials" && method === "GET") {
		const pb = backend.pbClient();
		if (pb === void 0) {
			json(res, 503, { error: "app backend is not running" });
			return;
		}
		const params = new URLSearchParams({
			page: "1",
			perPage: "200"
		});
		json(res, 200, { apis: ((await pb.request("GET", `/api/collections/apis/records?${params.toString()}`))?.items ?? []).map((row) => ({
			rid: String(row.rid ?? ""),
			appName: String(row.appName ?? ""),
			domain: String(row.domain ?? ""),
			path: String(row.path ?? ""),
			authType: row.authType === "key" ? "key" : "none",
			configured: typeof row.keySecret === "string" && row.keySecret.length > 0
		})).filter((row) => row.rid.length > 0).sort((a, b) => a.rid.localeCompare(b.rid)) });
		return;
	}
	if (sub === "sessions-stats" && method === "GET") {
		json(res, 200, await sessionsStats(backend.dshHome()));
		return;
	}
	json(res, 404, { error: `unknown app route: ${method} /openloop/app/${sub}` });
}
//#endregion
//#region src/api-usage.ts
const WINDOW_MS_DEFAULT = 864e5;
function createPbUsageWriter(getPb) {
	let buffer = [];
	let flushing = false;
	const flush = async () => {
		if (flushing || buffer.length === 0) return;
		flushing = true;
		const batch = buffer;
		buffer = [];
		try {
			const pb = getPb();
			if (pb === void 0) return;
			for (const r of batch) await pb.request("POST", "/api/collections/api_usage/records", {
				source: r.source.slice(0, 500),
				kind: r.kind,
				at: r.at,
				ms: Math.round(r.ms),
				ok: r.ok
			});
		} catch {} finally {
			flushing = false;
			if (buffer.length > 0) flush();
		}
	};
	return { append(source, kind, ok, ms) {
		buffer.push({
			source,
			kind,
			at: Date.now(),
			ms,
			ok
		});
		if (buffer.length >= 16) return flush();
		return new Promise((resolve) => {
			setTimeout(() => {
				flush().finally(resolve);
			}, 100);
		});
	} };
}
/** PB 聚合读取（窗口内 records → 每 source 的 totals/failures/avg；总条数上限防大库）。
*  0.5.0 合并语义：PB（持久化——浏览器侧 panels 埋点经 POST 落库）+
*  globalThis.__openloopApiUsage 单例（服务端 mcp-runtime callTool 埋点——同进程
*  内存写通道，避免 HTTP 自绕），两路按 source 合并输出。 */
async function readApiUsageFromPb(pb, windowMs = WINDOW_MS_DEFAULT) {
	const since = Date.now() - windowMs;
	const all = [];
	for (let page = 1; page <= 10; page++) {
		const params = new URLSearchParams({
			page: String(page),
			perPage: "200",
			sort: "-at",
			filter: `at > ${since}`
		});
		const res = await pb.request("GET", `/api/collections/api_usage/records?${params.toString()}`);
		const items = res?.items ?? [];
		for (const r of items) all.push(r);
		if (all.length >= (typeof res?.totalItems === "number" ? res.totalItems : 0) || items.length < 200) break;
	}
	const singleton = globalThis.__openloopApiUsage;
	if (singleton?.stats !== void 0) {
		for (const stat of singleton.stats.values()) for (const r of stat.records) if (r.at >= since) all.push({
			source: stat.source,
			kind: stat.kind,
			at: r.at,
			ms: r.ms,
			ok: r.ok
		});
	}
	const bySource = /* @__PURE__ */ new Map();
	for (const r of all) {
		const source = typeof r.source === "string" ? r.source : "";
		if (source.length === 0) continue;
		const kind = r.kind === "mcp-call" ? "mcp-call" : "panel-binding";
		const at = typeof r.at === "number" ? r.at : 0;
		const ms = typeof r.ms === "number" ? r.ms : 0;
		const ok = r.ok !== false;
		let stat = bySource.get(source);
		if (stat === void 0) {
			stat = {
				source,
				kind,
				total: 0,
				failures: 0,
				records: []
			};
			bySource.set(source, stat);
		}
		stat.total += 1;
		if (!ok) stat.failures += 1;
		stat.records.push({
			at,
			ok,
			ms
		});
	}
	return {
		windowMs,
		sources: [...bySource.values()].map((stat) => ({
			source: stat.source,
			kind: stat.kind,
			total: stat.total,
			failures: stat.failures,
			avgMs: stat.records.length > 0 ? Math.round(stat.records.reduce((n, r) => n + r.ms, 0) / stat.records.length) : null,
			recent: stat.records.slice(0, 30)
		})).sort((a, b) => b.total - a.total)
	};
}
//#endregion
//#region src/index.ts
const name = "openloop-dsh-app";
const inject = ["tools", "skills"];
const Config = Schema.object({
	dshHome: Schema.string(),
	binPath: Schema.string()
});
function apply(ctx, config = {}) {
	const logger = ctx.logger("openloop-dsh-app");
	const backendOptions = { logger: {
		info: (msg) => logger.info(msg),
		warn: (msg) => logger.warn(msg),
		error: (msg) => logger.error(msg)
	} };
	if (typeof config.dshHome === "string" && config.dshHome.length > 0) backendOptions.dshHome = config.dshHome;
	const binPath = typeof config.binPath === "string" && config.binPath.length > 0 ? config.binPath : process.env.OPENLOOP_PB_BIN;
	if (typeof binPath === "string" && binPath.length > 0) backendOptions.binPath = binPath;
	const backend = createAppBackend(backendOptions);
	let mcpRuntime;
	ctx.inject(["mcpRuntime"], (runtimeCtx) => {
		mcpRuntime = runtimeCtx.mcpRuntime;
		logger.info("mcpRuntime available — connect_server will hot-activate third-party packs");
	});
	backend.start().then(() => {
		logger.info(`app backend ready (PocketBase ${PB_VERSION})`);
	}).catch((error) => {
		logger.error(`app backend failed to start: ${error instanceof Error ? error.message : String(error)}`);
	});
	ctx.tools.register(createAppBackendTool(backend, { getMcpRuntime: () => mcpRuntime }));
	ctx.skills.registerProvider(() => appBackendSkillProvider);
	ctx.skills.registerProvider(() => appDoctorSkillProvider);
	ctx.inject(["webServer"], (routeCtx) => {
		let routeMcpRuntime;
		routeCtx.inject(["mcpRuntime"], (rc) => {
			routeMcpRuntime = rc.mcpRuntime;
		});
		const eventWriter = createPbEventWriter(() => backend.pbClient());
		const recordEvent = createEventRecorder(() => eventWriter);
		const eventReader = createPbEventReader(() => backend.pbClient());
		const usageWriter = createPbUsageWriter(() => backend.pbClient());
		registerAppRoutes(routeCtx, routeCtx.webServer, backend, {
			getMcpRuntime: () => routeMcpRuntime,
			recordEvent,
			listEvents: (limit) => eventReader.list(limit),
			recordUsage: (source, kind, ok, ms) => {
				usageWriter.append(source, kind, ok, ms);
			},
			readUsage: () => readApiUsageFromPb(backend.pbClient()).catch(() => ({
				windowMs: 864e5,
				sources: []
			}))
		});
		globalThis.__openloopRecordEvent = recordEvent;
	});
	ctx.effect(() => () => {
		backend.stop();
	}, "openloop-dsh-app: backend lifecycle");
}
//#endregion
export { APP_BACKEND_PARAMETERS, APP_BACKEND_TOOL, APP_ROUTE, BUILTIN_KINDS, COLLECTIONS, Config, PB_VERSION, PbRequestError, PbWatchdog, WATCHDOG_DEFAULTS, apply, createAppBackend, createAppBackendTool, createAppFacade, createPbClient, ensureBinary, findFreePort, initCollections, inject, name, pbAssetName, pbDownloadUrl, registerAppRoutes, resolveDshHome, seedBuiltinApp, startPocketBase };
