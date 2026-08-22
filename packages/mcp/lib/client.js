window.__ModuleLoader__.load({
	id: "@openloop/dsh-mcp",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let react_jsx_runtime = require("react/jsx-runtime");
		//#region ../../node_modules/.pnpm/zod@4.4.3/node_modules/zod/v4/core/core.js
		var _a$1;
		function $constructor(name, initializer, params) {
			function init(inst, def) {
				if (!inst._zod) Object.defineProperty(inst, "_zod", {
					value: {
						def,
						constr: _,
						traits: /* @__PURE__ */ new Set()
					},
					enumerable: false
				});
				if (inst._zod.traits.has(name)) return;
				inst._zod.traits.add(name);
				initializer(inst, def);
				const proto = _.prototype;
				const keys = Object.keys(proto);
				for (let i = 0; i < keys.length; i++) {
					const k = keys[i];
					if (!(k in inst)) inst[k] = proto[k].bind(inst);
				}
			}
			const Parent = params?.Parent ?? Object;
			class Definition extends Parent {}
			Object.defineProperty(Definition, "name", { value: name });
			function _(def) {
				var _a;
				const inst = params?.Parent ? new Definition() : this;
				init(inst, def);
				(_a = inst._zod).deferred ?? (_a.deferred = []);
				for (const fn of inst._zod.deferred) fn();
				return inst;
			}
			Object.defineProperty(_, "init", { value: init });
			Object.defineProperty(_, Symbol.hasInstance, { value: (inst) => {
				if (params?.Parent && inst instanceof params.Parent) return true;
				return inst?._zod?.traits?.has(name);
			} });
			Object.defineProperty(_, "name", { value: name });
			return _;
		}
		var $ZodAsyncError = class extends Error {
			constructor() {
				super(`Encountered Promise during synchronous parse. Use .parseAsync() instead.`);
			}
		};
		var $ZodEncodeError = class extends Error {
			constructor(name) {
				super(`Encountered unidirectional transform during encode: ${name}`);
				this.name = "ZodEncodeError";
			}
		};
		(_a$1 = globalThis).__zod_globalConfig ?? (_a$1.__zod_globalConfig = {});
		const globalConfig = globalThis.__zod_globalConfig;
		function config(newConfig) {
			if (newConfig) Object.assign(globalConfig, newConfig);
			return globalConfig;
		}
		//#endregion
		//#region ../../node_modules/.pnpm/zod@4.4.3/node_modules/zod/v4/core/util.js
		function getEnumValues(entries) {
			const numericValues = Object.values(entries).filter((v) => typeof v === "number");
			return Object.entries(entries).filter(([k, _]) => numericValues.indexOf(+k) === -1).map(([_, v]) => v);
		}
		function jsonStringifyReplacer(_, value) {
			if (typeof value === "bigint") return value.toString();
			return value;
		}
		function cached(getter) {
			return { get value() {
				{
					const value = getter();
					Object.defineProperty(this, "value", { value });
					return value;
				}
			} };
		}
		function nullish(input) {
			return input === null || input === void 0;
		}
		function cleanRegex(source) {
			const start = source.startsWith("^") ? 1 : 0;
			const end = source.endsWith("$") ? source.length - 1 : source.length;
			return source.slice(start, end);
		}
		function floatSafeRemainder(val, step) {
			const ratio = val / step;
			const roundedRatio = Math.round(ratio);
			const tolerance = Number.EPSILON * Math.max(Math.abs(ratio), 1);
			if (Math.abs(ratio - roundedRatio) < tolerance) return 0;
			return ratio - roundedRatio;
		}
		const EVALUATING = /* @__PURE__*/ Symbol("evaluating");
		function defineLazy(object, key, getter) {
			let value = void 0;
			Object.defineProperty(object, key, {
				get() {
					if (value === EVALUATING) return;
					if (value === void 0) {
						value = EVALUATING;
						value = getter();
					}
					return value;
				},
				set(v) {
					Object.defineProperty(object, key, { value: v });
				},
				configurable: true
			});
		}
		function assignProp(target, prop, value) {
			Object.defineProperty(target, prop, {
				value,
				writable: true,
				enumerable: true,
				configurable: true
			});
		}
		function mergeDefs(...defs) {
			const mergedDescriptors = {};
			for (const def of defs) {
				const descriptors = Object.getOwnPropertyDescriptors(def);
				Object.assign(mergedDescriptors, descriptors);
			}
			return Object.defineProperties({}, mergedDescriptors);
		}
		function esc(str) {
			return JSON.stringify(str);
		}
		function slugify(input) {
			return input.toLowerCase().trim().replace(/[^\w\s-]/g, "").replace(/[\s_-]+/g, "-").replace(/^-+|-+$/g, "");
		}
		const captureStackTrace = "captureStackTrace" in Error ? Error.captureStackTrace : (..._args) => {};
		function isObject(data) {
			return typeof data === "object" && data !== null && !Array.isArray(data);
		}
		const allowsEval = /* @__PURE__*/ cached(() => {
			if (globalConfig.jitless) return false;
			if (typeof navigator !== "undefined" && navigator?.userAgent?.includes("Cloudflare")) return false;
			try {
				new Function("");
				return true;
			} catch (_) {
				return false;
			}
		});
		function isPlainObject(o) {
			if (isObject(o) === false) return false;
			const ctor = o.constructor;
			if (ctor === void 0) return true;
			if (typeof ctor !== "function") return true;
			const prot = ctor.prototype;
			if (isObject(prot) === false) return false;
			if (Object.prototype.hasOwnProperty.call(prot, "isPrototypeOf") === false) return false;
			return true;
		}
		function shallowClone(o) {
			if (isPlainObject(o)) return { ...o };
			if (Array.isArray(o)) return [...o];
			if (o instanceof Map) return new Map(o);
			if (o instanceof Set) return new Set(o);
			return o;
		}
		const propertyKeyTypes = /* @__PURE__*/ new Set([
			"string",
			"number",
			"symbol"
		]);
		function escapeRegex(str) {
			return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
		}
		function clone(inst, def, params) {
			const cl = new inst._zod.constr(def ?? inst._zod.def);
			if (!def || params?.parent) cl._zod.parent = inst;
			return cl;
		}
		function normalizeParams(_params) {
			const params = _params;
			if (!params) return {};
			if (typeof params === "string") return { error: () => params };
			if (params?.message !== void 0) {
				if (params?.error !== void 0) throw new Error("Cannot specify both `message` and `error` params");
				params.error = params.message;
			}
			delete params.message;
			if (typeof params.error === "string") return {
				...params,
				error: () => params.error
			};
			return params;
		}
		function optionalKeys(shape) {
			return Object.keys(shape).filter((k) => {
				return shape[k]._zod.optin === "optional" && shape[k]._zod.optout === "optional";
			});
		}
		const NUMBER_FORMAT_RANGES = {
			safeint: [Number.MIN_SAFE_INTEGER, Number.MAX_SAFE_INTEGER],
			int32: [-2147483648, 2147483647],
			uint32: [0, 4294967295],
			float32: [-34028234663852886e22, 34028234663852886e22],
			float64: [-Number.MAX_VALUE, Number.MAX_VALUE]
		};
		function pick(schema, mask) {
			const currDef = schema._zod.def;
			const checks = currDef.checks;
			if (checks && checks.length > 0) throw new Error(".pick() cannot be used on object schemas containing refinements");
			return clone(schema, mergeDefs(schema._zod.def, {
				get shape() {
					const newShape = {};
					for (const key in mask) {
						if (!(key in currDef.shape)) throw new Error(`Unrecognized key: "${key}"`);
						if (!mask[key]) continue;
						newShape[key] = currDef.shape[key];
					}
					assignProp(this, "shape", newShape);
					return newShape;
				},
				checks: []
			}));
		}
		function omit(schema, mask) {
			const currDef = schema._zod.def;
			const checks = currDef.checks;
			if (checks && checks.length > 0) throw new Error(".omit() cannot be used on object schemas containing refinements");
			return clone(schema, mergeDefs(schema._zod.def, {
				get shape() {
					const newShape = { ...schema._zod.def.shape };
					for (const key in mask) {
						if (!(key in currDef.shape)) throw new Error(`Unrecognized key: "${key}"`);
						if (!mask[key]) continue;
						delete newShape[key];
					}
					assignProp(this, "shape", newShape);
					return newShape;
				},
				checks: []
			}));
		}
		function extend(schema, shape) {
			if (!isPlainObject(shape)) throw new Error("Invalid input to extend: expected a plain object");
			const checks = schema._zod.def.checks;
			if (checks && checks.length > 0) {
				const existingShape = schema._zod.def.shape;
				for (const key in shape) if (Object.getOwnPropertyDescriptor(existingShape, key) !== void 0) throw new Error("Cannot overwrite keys on object schemas containing refinements. Use `.safeExtend()` instead.");
			}
			return clone(schema, mergeDefs(schema._zod.def, { get shape() {
				const _shape = {
					...schema._zod.def.shape,
					...shape
				};
				assignProp(this, "shape", _shape);
				return _shape;
			} }));
		}
		function safeExtend(schema, shape) {
			if (!isPlainObject(shape)) throw new Error("Invalid input to safeExtend: expected a plain object");
			return clone(schema, mergeDefs(schema._zod.def, { get shape() {
				const _shape = {
					...schema._zod.def.shape,
					...shape
				};
				assignProp(this, "shape", _shape);
				return _shape;
			} }));
		}
		function merge(a, b) {
			if (a._zod.def.checks?.length) throw new Error(".merge() cannot be used on object schemas containing refinements. Use .safeExtend() instead.");
			return clone(a, mergeDefs(a._zod.def, {
				get shape() {
					const _shape = {
						...a._zod.def.shape,
						...b._zod.def.shape
					};
					assignProp(this, "shape", _shape);
					return _shape;
				},
				get catchall() {
					return b._zod.def.catchall;
				},
				checks: b._zod.def.checks ?? []
			}));
		}
		function partial(Class, schema, mask) {
			const checks = schema._zod.def.checks;
			if (checks && checks.length > 0) throw new Error(".partial() cannot be used on object schemas containing refinements");
			return clone(schema, mergeDefs(schema._zod.def, {
				get shape() {
					const oldShape = schema._zod.def.shape;
					const shape = { ...oldShape };
					if (mask) for (const key in mask) {
						if (!(key in oldShape)) throw new Error(`Unrecognized key: "${key}"`);
						if (!mask[key]) continue;
						shape[key] = Class ? new Class({
							type: "optional",
							innerType: oldShape[key]
						}) : oldShape[key];
					}
					else for (const key in oldShape) shape[key] = Class ? new Class({
						type: "optional",
						innerType: oldShape[key]
					}) : oldShape[key];
					assignProp(this, "shape", shape);
					return shape;
				},
				checks: []
			}));
		}
		function required(Class, schema, mask) {
			return clone(schema, mergeDefs(schema._zod.def, { get shape() {
				const oldShape = schema._zod.def.shape;
				const shape = { ...oldShape };
				if (mask) for (const key in mask) {
					if (!(key in shape)) throw new Error(`Unrecognized key: "${key}"`);
					if (!mask[key]) continue;
					shape[key] = new Class({
						type: "nonoptional",
						innerType: oldShape[key]
					});
				}
				else for (const key in oldShape) shape[key] = new Class({
					type: "nonoptional",
					innerType: oldShape[key]
				});
				assignProp(this, "shape", shape);
				return shape;
			} }));
		}
		function aborted(x, startIndex = 0) {
			if (x.aborted === true) return true;
			for (let i = startIndex; i < x.issues.length; i++) if (x.issues[i]?.continue !== true) return true;
			return false;
		}
		function explicitlyAborted(x, startIndex = 0) {
			if (x.aborted === true) return true;
			for (let i = startIndex; i < x.issues.length; i++) if (x.issues[i]?.continue === false) return true;
			return false;
		}
		function prefixIssues(path, issues) {
			return issues.map((iss) => {
				var _a;
				(_a = iss).path ?? (_a.path = []);
				iss.path.unshift(path);
				return iss;
			});
		}
		function unwrapMessage(message) {
			return typeof message === "string" ? message : message?.message;
		}
		function finalizeIssue(iss, ctx, config) {
			const message = iss.message ? iss.message : unwrapMessage(iss.inst?._zod.def?.error?.(iss)) ?? unwrapMessage(ctx?.error?.(iss)) ?? unwrapMessage(config.customError?.(iss)) ?? unwrapMessage(config.localeError?.(iss)) ?? "Invalid input";
			const { inst: _inst, continue: _continue, input: _input, ...rest } = iss;
			rest.path ?? (rest.path = []);
			rest.message = message;
			if (ctx?.reportInput) rest.input = _input;
			return rest;
		}
		function getLengthableOrigin(input) {
			if (Array.isArray(input)) return "array";
			if (typeof input === "string") return "string";
			return "unknown";
		}
		function issue(...args) {
			const [iss, input, inst] = args;
			if (typeof iss === "string") return {
				message: iss,
				code: "custom",
				input,
				inst
			};
			return { ...iss };
		}
		//#endregion
		//#region ../../node_modules/.pnpm/zod@4.4.3/node_modules/zod/v4/core/errors.js
		const initializer$1 = (inst, def) => {
			inst.name = "$ZodError";
			Object.defineProperty(inst, "_zod", {
				value: inst._zod,
				enumerable: false
			});
			Object.defineProperty(inst, "issues", {
				value: def,
				enumerable: false
			});
			inst.message = JSON.stringify(def, jsonStringifyReplacer, 2);
			Object.defineProperty(inst, "toString", {
				value: () => inst.message,
				enumerable: false
			});
		};
		const $ZodError = $constructor("$ZodError", initializer$1);
		const $ZodRealError = $constructor("$ZodError", initializer$1, { Parent: Error });
		function flattenError(error, mapper = (issue) => issue.message) {
			const fieldErrors = {};
			const formErrors = [];
			for (const sub of error.issues) if (sub.path.length > 0) {
				fieldErrors[sub.path[0]] = fieldErrors[sub.path[0]] || [];
				fieldErrors[sub.path[0]].push(mapper(sub));
			} else formErrors.push(mapper(sub));
			return {
				formErrors,
				fieldErrors
			};
		}
		function formatError(error, mapper = (issue) => issue.message) {
			const fieldErrors = { _errors: [] };
			const processError = (error, path = []) => {
				for (const issue of error.issues) if (issue.code === "invalid_union" && issue.errors.length) issue.errors.map((issues) => processError({ issues }, [...path, ...issue.path]));
				else if (issue.code === "invalid_key") processError({ issues: issue.issues }, [...path, ...issue.path]);
				else if (issue.code === "invalid_element") processError({ issues: issue.issues }, [...path, ...issue.path]);
				else {
					const fullpath = [...path, ...issue.path];
					if (fullpath.length === 0) fieldErrors._errors.push(mapper(issue));
					else {
						let curr = fieldErrors;
						let i = 0;
						while (i < fullpath.length) {
							const el = fullpath[i];
							if (!(i === fullpath.length - 1)) curr[el] = curr[el] || { _errors: [] };
							else {
								curr[el] = curr[el] || { _errors: [] };
								curr[el]._errors.push(mapper(issue));
							}
							curr = curr[el];
							i++;
						}
					}
				}
			};
			processError(error);
			return fieldErrors;
		}
		//#endregion
		//#region ../../node_modules/.pnpm/zod@4.4.3/node_modules/zod/v4/core/parse.js
		const _parse = (_Err) => (schema, value, _ctx, _params) => {
			const ctx = _ctx ? {
				..._ctx,
				async: false
			} : { async: false };
			const result = schema._zod.run({
				value,
				issues: []
			}, ctx);
			if (result instanceof Promise) throw new $ZodAsyncError();
			if (result.issues.length) {
				const e = new ((_params?.Err) ?? _Err)(result.issues.map((iss) => finalizeIssue(iss, ctx, config())));
				captureStackTrace(e, _params?.callee);
				throw e;
			}
			return result.value;
		};
		const _parseAsync = (_Err) => async (schema, value, _ctx, params) => {
			const ctx = _ctx ? {
				..._ctx,
				async: true
			} : { async: true };
			let result = schema._zod.run({
				value,
				issues: []
			}, ctx);
			if (result instanceof Promise) result = await result;
			if (result.issues.length) {
				const e = new ((params?.Err) ?? _Err)(result.issues.map((iss) => finalizeIssue(iss, ctx, config())));
				captureStackTrace(e, params?.callee);
				throw e;
			}
			return result.value;
		};
		const _safeParse = (_Err) => (schema, value, _ctx) => {
			const ctx = _ctx ? {
				..._ctx,
				async: false
			} : { async: false };
			const result = schema._zod.run({
				value,
				issues: []
			}, ctx);
			if (result instanceof Promise) throw new $ZodAsyncError();
			return result.issues.length ? {
				success: false,
				error: new (_Err ?? $ZodError)(result.issues.map((iss) => finalizeIssue(iss, ctx, config())))
			} : {
				success: true,
				data: result.value
			};
		};
		const safeParse$2 = /* @__PURE__*/ _safeParse($ZodRealError);
		const _safeParseAsync = (_Err) => async (schema, value, _ctx) => {
			const ctx = _ctx ? {
				..._ctx,
				async: true
			} : { async: true };
			let result = schema._zod.run({
				value,
				issues: []
			}, ctx);
			if (result instanceof Promise) result = await result;
			return result.issues.length ? {
				success: false,
				error: new _Err(result.issues.map((iss) => finalizeIssue(iss, ctx, config())))
			} : {
				success: true,
				data: result.value
			};
		};
		const safeParseAsync$1 = /* @__PURE__*/ _safeParseAsync($ZodRealError);
		const _encode = (_Err) => (schema, value, _ctx) => {
			const ctx = _ctx ? {
				..._ctx,
				direction: "backward"
			} : { direction: "backward" };
			return _parse(_Err)(schema, value, ctx);
		};
		const _decode = (_Err) => (schema, value, _ctx) => {
			return _parse(_Err)(schema, value, _ctx);
		};
		const _encodeAsync = (_Err) => async (schema, value, _ctx) => {
			const ctx = _ctx ? {
				..._ctx,
				direction: "backward"
			} : { direction: "backward" };
			return _parseAsync(_Err)(schema, value, ctx);
		};
		const _decodeAsync = (_Err) => async (schema, value, _ctx) => {
			return _parseAsync(_Err)(schema, value, _ctx);
		};
		const _safeEncode = (_Err) => (schema, value, _ctx) => {
			const ctx = _ctx ? {
				..._ctx,
				direction: "backward"
			} : { direction: "backward" };
			return _safeParse(_Err)(schema, value, ctx);
		};
		const _safeDecode = (_Err) => (schema, value, _ctx) => {
			return _safeParse(_Err)(schema, value, _ctx);
		};
		const _safeEncodeAsync = (_Err) => async (schema, value, _ctx) => {
			const ctx = _ctx ? {
				..._ctx,
				direction: "backward"
			} : { direction: "backward" };
			return _safeParseAsync(_Err)(schema, value, ctx);
		};
		const _safeDecodeAsync = (_Err) => async (schema, value, _ctx) => {
			return _safeParseAsync(_Err)(schema, value, _ctx);
		};
		//#endregion
		//#region ../../node_modules/.pnpm/zod@4.4.3/node_modules/zod/v4/core/regexes.js
		/**
		* @deprecated CUID v1 is deprecated by its authors due to information leakage
		* (timestamps embedded in the id). Use {@link cuid2} instead.
		* See https://github.com/paralleldrive/cuid.
		*/
		const cuid = /^[cC][0-9a-z]{6,}$/;
		const cuid2 = /^[0-9a-z]+$/;
		const ulid = /^[0-9A-HJKMNP-TV-Za-hjkmnp-tv-z]{26}$/;
		const xid = /^[0-9a-vA-V]{20}$/;
		const ksuid = /^[A-Za-z0-9]{27}$/;
		const nanoid = /^[a-zA-Z0-9_-]{21}$/;
		/** ISO 8601-1 duration regex. Does not support the 8601-2 extensions like negative durations or fractional/negative components. */
		const duration$1 = /^P(?:(\d+W)|(?!.*W)(?=\d|T\d)(\d+Y)?(\d+M)?(\d+D)?(T(?=\d)(\d+H)?(\d+M)?(\d+([.,]\d+)?S)?)?)$/;
		/** A regex for any UUID-like identifier: 8-4-4-4-12 hex pattern */
		const guid = /^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})$/;
		/** Returns a regex for validating an RFC 9562/4122 UUID.
		*
		* @param version Optionally specify a version 1-8. If no version is specified, all versions are supported. */
		const uuid = (version) => {
			if (!version) return /^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$/;
			return new RegExp(`^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-${version}[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12})$`);
		};
		/** Practical email validation */
		const email = /^(?!\.)(?!.*\.\.)([A-Za-z0-9_'+\-\.]*)[A-Za-z0-9_+-]@([A-Za-z0-9][A-Za-z0-9\-]*\.)+[A-Za-z]{2,}$/;
		const _emoji$1 = `^(\\p{Extended_Pictographic}|\\p{Emoji_Component})+$`;
		function emoji() {
			return new RegExp(_emoji$1, "u");
		}
		const ipv4 = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/;
		const ipv6 = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:))$/;
		const cidrv4 = /^((25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/([0-9]|[1-2][0-9]|3[0-2])$/;
		const cidrv6 = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|::|([0-9a-fA-F]{1,4})?::([0-9a-fA-F]{1,4}:?){0,6})\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/;
		const base64 = /^$|^(?:[0-9a-zA-Z+/]{4})*(?:(?:[0-9a-zA-Z+/]{2}==)|(?:[0-9a-zA-Z+/]{3}=))?$/;
		const base64url = /^[A-Za-z0-9_-]*$/;
		const httpProtocol = /^https?$/;
		const e164 = /^\+[1-9]\d{6,14}$/;
		const dateSource = `(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))`;
		const date$1 = /*@__PURE__*/ new RegExp(`^${dateSource}$`);
		function timeSource(args) {
			const hhmm = `(?:[01]\\d|2[0-3]):[0-5]\\d`;
			return typeof args.precision === "number" ? args.precision === -1 ? `${hhmm}` : args.precision === 0 ? `${hhmm}:[0-5]\\d` : `${hhmm}:[0-5]\\d\\.\\d{${args.precision}}` : `${hhmm}(?::[0-5]\\d(?:\\.\\d+)?)?`;
		}
		function time$1(args) {
			return new RegExp(`^${timeSource(args)}$`);
		}
		function datetime$1(args) {
			const time = timeSource({ precision: args.precision });
			const opts = ["Z"];
			if (args.local) opts.push("");
			if (args.offset) opts.push(`([+-](?:[01]\\d|2[0-3]):[0-5]\\d)`);
			const timeRegex = `${time}(?:${opts.join("|")})`;
			return new RegExp(`^${dateSource}T(?:${timeRegex})$`);
		}
		const string$1 = (params) => {
			const regex = params ? `[\\s\\S]{${params?.minimum ?? 0},${params?.maximum ?? ""}}` : `[\\s\\S]*`;
			return new RegExp(`^${regex}$`);
		};
		const integer = /^-?\d+$/;
		const number$1 = /^-?\d+(?:\.\d+)?$/;
		const boolean$1 = /^(?:true|false)$/i;
		const _null$2 = /^null$/i;
		const _undefined$2 = /^undefined$/i;
		const lowercase = /^[^A-Z]*$/;
		const uppercase = /^[^a-z]*$/;
		//#endregion
		//#region ../../node_modules/.pnpm/zod@4.4.3/node_modules/zod/v4/core/checks.js
		const $ZodCheck = /*@__PURE__*/ $constructor("$ZodCheck", (inst, def) => {
			var _a;
			inst._zod ?? (inst._zod = {});
			inst._zod.def = def;
			(_a = inst._zod).onattach ?? (_a.onattach = []);
		});
		const numericOriginMap = {
			number: "number",
			bigint: "bigint",
			object: "date"
		};
		const $ZodCheckLessThan = /*@__PURE__*/ $constructor("$ZodCheckLessThan", (inst, def) => {
			$ZodCheck.init(inst, def);
			const origin = numericOriginMap[typeof def.value];
			inst._zod.onattach.push((inst) => {
				const bag = inst._zod.bag;
				const curr = (def.inclusive ? bag.maximum : bag.exclusiveMaximum) ?? Number.POSITIVE_INFINITY;
				if (def.value < curr) {
					if (def.inclusive) bag.maximum = def.value;
					else bag.exclusiveMaximum = def.value;
				}
			});
			inst._zod.check = (payload) => {
				if (def.inclusive ? payload.value <= def.value : payload.value < def.value) return;
				payload.issues.push({
					origin,
					code: "too_big",
					maximum: typeof def.value === "object" ? def.value.getTime() : def.value,
					input: payload.value,
					inclusive: def.inclusive,
					inst,
					continue: !def.abort
				});
			};
		});
		const $ZodCheckGreaterThan = /*@__PURE__*/ $constructor("$ZodCheckGreaterThan", (inst, def) => {
			$ZodCheck.init(inst, def);
			const origin = numericOriginMap[typeof def.value];
			inst._zod.onattach.push((inst) => {
				const bag = inst._zod.bag;
				const curr = (def.inclusive ? bag.minimum : bag.exclusiveMinimum) ?? Number.NEGATIVE_INFINITY;
				if (def.value > curr) {
					if (def.inclusive) bag.minimum = def.value;
					else bag.exclusiveMinimum = def.value;
				}
			});
			inst._zod.check = (payload) => {
				if (def.inclusive ? payload.value >= def.value : payload.value > def.value) return;
				payload.issues.push({
					origin,
					code: "too_small",
					minimum: typeof def.value === "object" ? def.value.getTime() : def.value,
					input: payload.value,
					inclusive: def.inclusive,
					inst,
					continue: !def.abort
				});
			};
		});
		const $ZodCheckMultipleOf = /*@__PURE__*/ $constructor("$ZodCheckMultipleOf", (inst, def) => {
			$ZodCheck.init(inst, def);
			inst._zod.onattach.push((inst) => {
				var _a;
				(_a = inst._zod.bag).multipleOf ?? (_a.multipleOf = def.value);
			});
			inst._zod.check = (payload) => {
				if (typeof payload.value !== typeof def.value) throw new Error("Cannot mix number and bigint in multiple_of check.");
				if (typeof payload.value === "bigint" ? payload.value % def.value === BigInt(0) : floatSafeRemainder(payload.value, def.value) === 0) return;
				payload.issues.push({
					origin: typeof payload.value,
					code: "not_multiple_of",
					divisor: def.value,
					input: payload.value,
					inst,
					continue: !def.abort
				});
			};
		});
		const $ZodCheckNumberFormat = /*@__PURE__*/ $constructor("$ZodCheckNumberFormat", (inst, def) => {
			$ZodCheck.init(inst, def);
			def.format = def.format || "float64";
			const isInt = def.format?.includes("int");
			const origin = isInt ? "int" : "number";
			const [minimum, maximum] = NUMBER_FORMAT_RANGES[def.format];
			inst._zod.onattach.push((inst) => {
				const bag = inst._zod.bag;
				bag.format = def.format;
				bag.minimum = minimum;
				bag.maximum = maximum;
				if (isInt) bag.pattern = integer;
			});
			inst._zod.check = (payload) => {
				const input = payload.value;
				if (isInt) {
					if (!Number.isInteger(input)) {
						payload.issues.push({
							expected: origin,
							format: def.format,
							code: "invalid_type",
							continue: false,
							input,
							inst
						});
						return;
					}
					if (!Number.isSafeInteger(input)) {
						if (input > 0) payload.issues.push({
							input,
							code: "too_big",
							maximum: Number.MAX_SAFE_INTEGER,
							note: "Integers must be within the safe integer range.",
							inst,
							origin,
							inclusive: true,
							continue: !def.abort
						});
						else payload.issues.push({
							input,
							code: "too_small",
							minimum: Number.MIN_SAFE_INTEGER,
							note: "Integers must be within the safe integer range.",
							inst,
							origin,
							inclusive: true,
							continue: !def.abort
						});
						return;
					}
				}
				if (input < minimum) payload.issues.push({
					origin: "number",
					input,
					code: "too_small",
					minimum,
					inclusive: true,
					inst,
					continue: !def.abort
				});
				if (input > maximum) payload.issues.push({
					origin: "number",
					input,
					code: "too_big",
					maximum,
					inclusive: true,
					inst,
					continue: !def.abort
				});
			};
		});
		const $ZodCheckMaxLength = /*@__PURE__*/ $constructor("$ZodCheckMaxLength", (inst, def) => {
			var _a;
			$ZodCheck.init(inst, def);
			(_a = inst._zod.def).when ?? (_a.when = (payload) => {
				const val = payload.value;
				return !nullish(val) && val.length !== void 0;
			});
			inst._zod.onattach.push((inst) => {
				const curr = inst._zod.bag.maximum ?? Number.POSITIVE_INFINITY;
				if (def.maximum < curr) inst._zod.bag.maximum = def.maximum;
			});
			inst._zod.check = (payload) => {
				const input = payload.value;
				if (input.length <= def.maximum) return;
				const origin = getLengthableOrigin(input);
				payload.issues.push({
					origin,
					code: "too_big",
					maximum: def.maximum,
					inclusive: true,
					input,
					inst,
					continue: !def.abort
				});
			};
		});
		const $ZodCheckMinLength = /*@__PURE__*/ $constructor("$ZodCheckMinLength", (inst, def) => {
			var _a;
			$ZodCheck.init(inst, def);
			(_a = inst._zod.def).when ?? (_a.when = (payload) => {
				const val = payload.value;
				return !nullish(val) && val.length !== void 0;
			});
			inst._zod.onattach.push((inst) => {
				const curr = inst._zod.bag.minimum ?? Number.NEGATIVE_INFINITY;
				if (def.minimum > curr) inst._zod.bag.minimum = def.minimum;
			});
			inst._zod.check = (payload) => {
				const input = payload.value;
				if (input.length >= def.minimum) return;
				const origin = getLengthableOrigin(input);
				payload.issues.push({
					origin,
					code: "too_small",
					minimum: def.minimum,
					inclusive: true,
					input,
					inst,
					continue: !def.abort
				});
			};
		});
		const $ZodCheckLengthEquals = /*@__PURE__*/ $constructor("$ZodCheckLengthEquals", (inst, def) => {
			var _a;
			$ZodCheck.init(inst, def);
			(_a = inst._zod.def).when ?? (_a.when = (payload) => {
				const val = payload.value;
				return !nullish(val) && val.length !== void 0;
			});
			inst._zod.onattach.push((inst) => {
				const bag = inst._zod.bag;
				bag.minimum = def.length;
				bag.maximum = def.length;
				bag.length = def.length;
			});
			inst._zod.check = (payload) => {
				const input = payload.value;
				const length = input.length;
				if (length === def.length) return;
				const origin = getLengthableOrigin(input);
				const tooBig = length > def.length;
				payload.issues.push({
					origin,
					...tooBig ? {
						code: "too_big",
						maximum: def.length
					} : {
						code: "too_small",
						minimum: def.length
					},
					inclusive: true,
					exact: true,
					input: payload.value,
					inst,
					continue: !def.abort
				});
			};
		});
		const $ZodCheckStringFormat = /*@__PURE__*/ $constructor("$ZodCheckStringFormat", (inst, def) => {
			var _a, _b;
			$ZodCheck.init(inst, def);
			inst._zod.onattach.push((inst) => {
				const bag = inst._zod.bag;
				bag.format = def.format;
				if (def.pattern) {
					bag.patterns ?? (bag.patterns = /* @__PURE__ */ new Set());
					bag.patterns.add(def.pattern);
				}
			});
			if (def.pattern) (_a = inst._zod).check ?? (_a.check = (payload) => {
				def.pattern.lastIndex = 0;
				if (def.pattern.test(payload.value)) return;
				payload.issues.push({
					origin: "string",
					code: "invalid_format",
					format: def.format,
					input: payload.value,
					...def.pattern ? { pattern: def.pattern.toString() } : {},
					inst,
					continue: !def.abort
				});
			});
			else (_b = inst._zod).check ?? (_b.check = () => {});
		});
		const $ZodCheckRegex = /*@__PURE__*/ $constructor("$ZodCheckRegex", (inst, def) => {
			$ZodCheckStringFormat.init(inst, def);
			inst._zod.check = (payload) => {
				def.pattern.lastIndex = 0;
				if (def.pattern.test(payload.value)) return;
				payload.issues.push({
					origin: "string",
					code: "invalid_format",
					format: "regex",
					input: payload.value,
					pattern: def.pattern.toString(),
					inst,
					continue: !def.abort
				});
			};
		});
		const $ZodCheckLowerCase = /*@__PURE__*/ $constructor("$ZodCheckLowerCase", (inst, def) => {
			def.pattern ?? (def.pattern = lowercase);
			$ZodCheckStringFormat.init(inst, def);
		});
		const $ZodCheckUpperCase = /*@__PURE__*/ $constructor("$ZodCheckUpperCase", (inst, def) => {
			def.pattern ?? (def.pattern = uppercase);
			$ZodCheckStringFormat.init(inst, def);
		});
		const $ZodCheckIncludes = /*@__PURE__*/ $constructor("$ZodCheckIncludes", (inst, def) => {
			$ZodCheck.init(inst, def);
			const escapedRegex = escapeRegex(def.includes);
			const pattern = new RegExp(typeof def.position === "number" ? `^.{${def.position}}${escapedRegex}` : escapedRegex);
			def.pattern = pattern;
			inst._zod.onattach.push((inst) => {
				const bag = inst._zod.bag;
				bag.patterns ?? (bag.patterns = /* @__PURE__ */ new Set());
				bag.patterns.add(pattern);
			});
			inst._zod.check = (payload) => {
				if (payload.value.includes(def.includes, def.position)) return;
				payload.issues.push({
					origin: "string",
					code: "invalid_format",
					format: "includes",
					includes: def.includes,
					input: payload.value,
					inst,
					continue: !def.abort
				});
			};
		});
		const $ZodCheckStartsWith = /*@__PURE__*/ $constructor("$ZodCheckStartsWith", (inst, def) => {
			$ZodCheck.init(inst, def);
			const pattern = new RegExp(`^${escapeRegex(def.prefix)}.*`);
			def.pattern ?? (def.pattern = pattern);
			inst._zod.onattach.push((inst) => {
				const bag = inst._zod.bag;
				bag.patterns ?? (bag.patterns = /* @__PURE__ */ new Set());
				bag.patterns.add(pattern);
			});
			inst._zod.check = (payload) => {
				if (payload.value.startsWith(def.prefix)) return;
				payload.issues.push({
					origin: "string",
					code: "invalid_format",
					format: "starts_with",
					prefix: def.prefix,
					input: payload.value,
					inst,
					continue: !def.abort
				});
			};
		});
		const $ZodCheckEndsWith = /*@__PURE__*/ $constructor("$ZodCheckEndsWith", (inst, def) => {
			$ZodCheck.init(inst, def);
			const pattern = new RegExp(`.*${escapeRegex(def.suffix)}$`);
			def.pattern ?? (def.pattern = pattern);
			inst._zod.onattach.push((inst) => {
				const bag = inst._zod.bag;
				bag.patterns ?? (bag.patterns = /* @__PURE__ */ new Set());
				bag.patterns.add(pattern);
			});
			inst._zod.check = (payload) => {
				if (payload.value.endsWith(def.suffix)) return;
				payload.issues.push({
					origin: "string",
					code: "invalid_format",
					format: "ends_with",
					suffix: def.suffix,
					input: payload.value,
					inst,
					continue: !def.abort
				});
			};
		});
		const $ZodCheckOverwrite = /*@__PURE__*/ $constructor("$ZodCheckOverwrite", (inst, def) => {
			$ZodCheck.init(inst, def);
			inst._zod.check = (payload) => {
				payload.value = def.tx(payload.value);
			};
		});
		//#endregion
		//#region ../../node_modules/.pnpm/zod@4.4.3/node_modules/zod/v4/core/doc.js
		var Doc = class {
			constructor(args = []) {
				this.content = [];
				this.indent = 0;
				if (this) this.args = args;
			}
			indented(fn) {
				this.indent += 1;
				fn(this);
				this.indent -= 1;
			}
			write(arg) {
				if (typeof arg === "function") {
					arg(this, { execution: "sync" });
					arg(this, { execution: "async" });
					return;
				}
				const lines = arg.split("\n").filter((x) => x);
				const minIndent = Math.min(...lines.map((x) => x.length - x.trimStart().length));
				const dedented = lines.map((x) => x.slice(minIndent)).map((x) => " ".repeat(this.indent * 2) + x);
				for (const line of dedented) this.content.push(line);
			}
			compile() {
				const F = Function;
				const args = this?.args;
				const lines = [...(this?.content ?? [``]).map((x) => `  ${x}`)];
				return new F(...args, lines.join("\n"));
			}
		};
		//#endregion
		//#region ../../node_modules/.pnpm/zod@4.4.3/node_modules/zod/v4/core/versions.js
		const version = {
			major: 4,
			minor: 4,
			patch: 3
		};
		//#endregion
		//#region ../../node_modules/.pnpm/zod@4.4.3/node_modules/zod/v4/core/schemas.js
		const $ZodType = /*@__PURE__*/ $constructor("$ZodType", (inst, def) => {
			var _a;
			inst ?? (inst = {});
			inst._zod.def = def;
			inst._zod.bag = inst._zod.bag || {};
			inst._zod.version = version;
			const checks = [...inst._zod.def.checks ?? []];
			if (inst._zod.traits.has("$ZodCheck")) checks.unshift(inst);
			for (const ch of checks) for (const fn of ch._zod.onattach) fn(inst);
			if (checks.length === 0) {
				(_a = inst._zod).deferred ?? (_a.deferred = []);
				inst._zod.deferred?.push(() => {
					inst._zod.run = inst._zod.parse;
				});
			} else {
				const runChecks = (payload, checks, ctx) => {
					let isAborted = aborted(payload);
					let asyncResult;
					for (const ch of checks) {
						if (ch._zod.def.when) {
							if (explicitlyAborted(payload)) continue;
							if (!ch._zod.def.when(payload)) continue;
						} else if (isAborted) continue;
						const currLen = payload.issues.length;
						const _ = ch._zod.check(payload);
						if (_ instanceof Promise && ctx?.async === false) throw new $ZodAsyncError();
						if (asyncResult || _ instanceof Promise) asyncResult = (asyncResult ?? Promise.resolve()).then(async () => {
							await _;
							if (payload.issues.length === currLen) return;
							if (!isAborted) isAborted = aborted(payload, currLen);
						});
						else {
							if (payload.issues.length === currLen) continue;
							if (!isAborted) isAborted = aborted(payload, currLen);
						}
					}
					if (asyncResult) return asyncResult.then(() => {
						return payload;
					});
					return payload;
				};
				const handleCanaryResult = (canary, payload, ctx) => {
					if (aborted(canary)) {
						canary.aborted = true;
						return canary;
					}
					const checkResult = runChecks(payload, checks, ctx);
					if (checkResult instanceof Promise) {
						if (ctx.async === false) throw new $ZodAsyncError();
						return checkResult.then((checkResult) => inst._zod.parse(checkResult, ctx));
					}
					return inst._zod.parse(checkResult, ctx);
				};
				inst._zod.run = (payload, ctx) => {
					if (ctx.skipChecks) return inst._zod.parse(payload, ctx);
					if (ctx.direction === "backward") {
						const canary = inst._zod.parse({
							value: payload.value,
							issues: []
						}, {
							...ctx,
							skipChecks: true
						});
						if (canary instanceof Promise) return canary.then((canary) => {
							return handleCanaryResult(canary, payload, ctx);
						});
						return handleCanaryResult(canary, payload, ctx);
					}
					const result = inst._zod.parse(payload, ctx);
					if (result instanceof Promise) {
						if (ctx.async === false) throw new $ZodAsyncError();
						return result.then((result) => runChecks(result, checks, ctx));
					}
					return runChecks(result, checks, ctx);
				};
			}
			defineLazy(inst, "~standard", () => ({
				validate: (value) => {
					try {
						const r = safeParse$2(inst, value);
						return r.success ? { value: r.data } : { issues: r.error?.issues };
					} catch (_) {
						return safeParseAsync$1(inst, value).then((r) => r.success ? { value: r.data } : { issues: r.error?.issues });
					}
				},
				vendor: "zod",
				version: 1
			}));
		});
		const $ZodString = /*@__PURE__*/ $constructor("$ZodString", (inst, def) => {
			$ZodType.init(inst, def);
			inst._zod.pattern = [...inst?._zod.bag?.patterns ?? []].pop() ?? string$1(inst._zod.bag);
			inst._zod.parse = (payload, _) => {
				if (def.coerce) try {
					payload.value = String(payload.value);
				} catch (_) {}
				if (typeof payload.value === "string") return payload;
				payload.issues.push({
					expected: "string",
					code: "invalid_type",
					input: payload.value,
					inst
				});
				return payload;
			};
		});
		const $ZodStringFormat = /*@__PURE__*/ $constructor("$ZodStringFormat", (inst, def) => {
			$ZodCheckStringFormat.init(inst, def);
			$ZodString.init(inst, def);
		});
		const $ZodGUID = /*@__PURE__*/ $constructor("$ZodGUID", (inst, def) => {
			def.pattern ?? (def.pattern = guid);
			$ZodStringFormat.init(inst, def);
		});
		const $ZodUUID = /*@__PURE__*/ $constructor("$ZodUUID", (inst, def) => {
			if (def.version) {
				const v = {
					v1: 1,
					v2: 2,
					v3: 3,
					v4: 4,
					v5: 5,
					v6: 6,
					v7: 7,
					v8: 8
				}[def.version];
				if (v === void 0) throw new Error(`Invalid UUID version: "${def.version}"`);
				def.pattern ?? (def.pattern = uuid(v));
			} else def.pattern ?? (def.pattern = uuid());
			$ZodStringFormat.init(inst, def);
		});
		const $ZodEmail = /*@__PURE__*/ $constructor("$ZodEmail", (inst, def) => {
			def.pattern ?? (def.pattern = email);
			$ZodStringFormat.init(inst, def);
		});
		const $ZodURL = /*@__PURE__*/ $constructor("$ZodURL", (inst, def) => {
			$ZodStringFormat.init(inst, def);
			inst._zod.check = (payload) => {
				try {
					const trimmed = payload.value.trim();
					if (!def.normalize && def.protocol?.source === httpProtocol.source) {
						if (!/^https?:\/\//i.test(trimmed)) {
							payload.issues.push({
								code: "invalid_format",
								format: "url",
								note: "Invalid URL format",
								input: payload.value,
								inst,
								continue: !def.abort
							});
							return;
						}
					}
					const url = new URL(trimmed);
					if (def.hostname) {
						def.hostname.lastIndex = 0;
						if (!def.hostname.test(url.hostname)) payload.issues.push({
							code: "invalid_format",
							format: "url",
							note: "Invalid hostname",
							pattern: def.hostname.source,
							input: payload.value,
							inst,
							continue: !def.abort
						});
					}
					if (def.protocol) {
						def.protocol.lastIndex = 0;
						if (!def.protocol.test(url.protocol.endsWith(":") ? url.protocol.slice(0, -1) : url.protocol)) payload.issues.push({
							code: "invalid_format",
							format: "url",
							note: "Invalid protocol",
							pattern: def.protocol.source,
							input: payload.value,
							inst,
							continue: !def.abort
						});
					}
					if (def.normalize) payload.value = url.href;
					else payload.value = trimmed;
					return;
				} catch (_) {
					payload.issues.push({
						code: "invalid_format",
						format: "url",
						input: payload.value,
						inst,
						continue: !def.abort
					});
				}
			};
		});
		const $ZodEmoji = /*@__PURE__*/ $constructor("$ZodEmoji", (inst, def) => {
			def.pattern ?? (def.pattern = emoji());
			$ZodStringFormat.init(inst, def);
		});
		const $ZodNanoID = /*@__PURE__*/ $constructor("$ZodNanoID", (inst, def) => {
			def.pattern ?? (def.pattern = nanoid);
			$ZodStringFormat.init(inst, def);
		});
		/**
		* @deprecated CUID v1 is deprecated by its authors due to information leakage
		* (timestamps embedded in the id). Use {@link $ZodCUID2} instead.
		* See https://github.com/paralleldrive/cuid.
		*/
		const $ZodCUID = /*@__PURE__*/ $constructor("$ZodCUID", (inst, def) => {
			def.pattern ?? (def.pattern = cuid);
			$ZodStringFormat.init(inst, def);
		});
		const $ZodCUID2 = /*@__PURE__*/ $constructor("$ZodCUID2", (inst, def) => {
			def.pattern ?? (def.pattern = cuid2);
			$ZodStringFormat.init(inst, def);
		});
		const $ZodULID = /*@__PURE__*/ $constructor("$ZodULID", (inst, def) => {
			def.pattern ?? (def.pattern = ulid);
			$ZodStringFormat.init(inst, def);
		});
		const $ZodXID = /*@__PURE__*/ $constructor("$ZodXID", (inst, def) => {
			def.pattern ?? (def.pattern = xid);
			$ZodStringFormat.init(inst, def);
		});
		const $ZodKSUID = /*@__PURE__*/ $constructor("$ZodKSUID", (inst, def) => {
			def.pattern ?? (def.pattern = ksuid);
			$ZodStringFormat.init(inst, def);
		});
		const $ZodISODateTime = /*@__PURE__*/ $constructor("$ZodISODateTime", (inst, def) => {
			def.pattern ?? (def.pattern = datetime$1(def));
			$ZodStringFormat.init(inst, def);
		});
		const $ZodISODate = /*@__PURE__*/ $constructor("$ZodISODate", (inst, def) => {
			def.pattern ?? (def.pattern = date$1);
			$ZodStringFormat.init(inst, def);
		});
		const $ZodISOTime = /*@__PURE__*/ $constructor("$ZodISOTime", (inst, def) => {
			def.pattern ?? (def.pattern = time$1(def));
			$ZodStringFormat.init(inst, def);
		});
		const $ZodISODuration = /*@__PURE__*/ $constructor("$ZodISODuration", (inst, def) => {
			def.pattern ?? (def.pattern = duration$1);
			$ZodStringFormat.init(inst, def);
		});
		const $ZodIPv4 = /*@__PURE__*/ $constructor("$ZodIPv4", (inst, def) => {
			def.pattern ?? (def.pattern = ipv4);
			$ZodStringFormat.init(inst, def);
			inst._zod.bag.format = `ipv4`;
		});
		const $ZodIPv6 = /*@__PURE__*/ $constructor("$ZodIPv6", (inst, def) => {
			def.pattern ?? (def.pattern = ipv6);
			$ZodStringFormat.init(inst, def);
			inst._zod.bag.format = `ipv6`;
			inst._zod.check = (payload) => {
				try {
					new URL(`http://[${payload.value}]`);
				} catch {
					payload.issues.push({
						code: "invalid_format",
						format: "ipv6",
						input: payload.value,
						inst,
						continue: !def.abort
					});
				}
			};
		});
		const $ZodCIDRv4 = /*@__PURE__*/ $constructor("$ZodCIDRv4", (inst, def) => {
			def.pattern ?? (def.pattern = cidrv4);
			$ZodStringFormat.init(inst, def);
		});
		const $ZodCIDRv6 = /*@__PURE__*/ $constructor("$ZodCIDRv6", (inst, def) => {
			def.pattern ?? (def.pattern = cidrv6);
			$ZodStringFormat.init(inst, def);
			inst._zod.check = (payload) => {
				const parts = payload.value.split("/");
				try {
					if (parts.length !== 2) throw new Error();
					const [address, prefix] = parts;
					if (!prefix) throw new Error();
					const prefixNum = Number(prefix);
					if (`${prefixNum}` !== prefix) throw new Error();
					if (prefixNum < 0 || prefixNum > 128) throw new Error();
					new URL(`http://[${address}]`);
				} catch {
					payload.issues.push({
						code: "invalid_format",
						format: "cidrv6",
						input: payload.value,
						inst,
						continue: !def.abort
					});
				}
			};
		});
		function isValidBase64(data) {
			if (data === "") return true;
			if (/\s/.test(data)) return false;
			if (data.length % 4 !== 0) return false;
			try {
				atob(data);
				return true;
			} catch {
				return false;
			}
		}
		const $ZodBase64 = /*@__PURE__*/ $constructor("$ZodBase64", (inst, def) => {
			def.pattern ?? (def.pattern = base64);
			$ZodStringFormat.init(inst, def);
			inst._zod.bag.contentEncoding = "base64";
			inst._zod.check = (payload) => {
				if (isValidBase64(payload.value)) return;
				payload.issues.push({
					code: "invalid_format",
					format: "base64",
					input: payload.value,
					inst,
					continue: !def.abort
				});
			};
		});
		function isValidBase64URL(data) {
			if (!base64url.test(data)) return false;
			const base64 = data.replace(/[-_]/g, (c) => c === "-" ? "+" : "/");
			return isValidBase64(base64.padEnd(Math.ceil(base64.length / 4) * 4, "="));
		}
		const $ZodBase64URL = /*@__PURE__*/ $constructor("$ZodBase64URL", (inst, def) => {
			def.pattern ?? (def.pattern = base64url);
			$ZodStringFormat.init(inst, def);
			inst._zod.bag.contentEncoding = "base64url";
			inst._zod.check = (payload) => {
				if (isValidBase64URL(payload.value)) return;
				payload.issues.push({
					code: "invalid_format",
					format: "base64url",
					input: payload.value,
					inst,
					continue: !def.abort
				});
			};
		});
		const $ZodE164 = /*@__PURE__*/ $constructor("$ZodE164", (inst, def) => {
			def.pattern ?? (def.pattern = e164);
			$ZodStringFormat.init(inst, def);
		});
		function isValidJWT(token, algorithm = null) {
			try {
				const tokensParts = token.split(".");
				if (tokensParts.length !== 3) return false;
				const [header] = tokensParts;
				if (!header) return false;
				const parsedHeader = JSON.parse(atob(header));
				if ("typ" in parsedHeader && parsedHeader?.typ !== "JWT") return false;
				if (!parsedHeader.alg) return false;
				if (algorithm && (!("alg" in parsedHeader) || parsedHeader.alg !== algorithm)) return false;
				return true;
			} catch {
				return false;
			}
		}
		const $ZodJWT = /*@__PURE__*/ $constructor("$ZodJWT", (inst, def) => {
			$ZodStringFormat.init(inst, def);
			inst._zod.check = (payload) => {
				if (isValidJWT(payload.value, def.alg)) return;
				payload.issues.push({
					code: "invalid_format",
					format: "jwt",
					input: payload.value,
					inst,
					continue: !def.abort
				});
			};
		});
		const $ZodNumber = /*@__PURE__*/ $constructor("$ZodNumber", (inst, def) => {
			$ZodType.init(inst, def);
			inst._zod.pattern = inst._zod.bag.pattern ?? number$1;
			inst._zod.parse = (payload, _ctx) => {
				if (def.coerce) try {
					payload.value = Number(payload.value);
				} catch (_) {}
				const input = payload.value;
				if (typeof input === "number" && !Number.isNaN(input) && Number.isFinite(input)) return payload;
				const received = typeof input === "number" ? Number.isNaN(input) ? "NaN" : !Number.isFinite(input) ? "Infinity" : void 0 : void 0;
				payload.issues.push({
					expected: "number",
					code: "invalid_type",
					input,
					inst,
					...received ? { received } : {}
				});
				return payload;
			};
		});
		const $ZodNumberFormat = /*@__PURE__*/ $constructor("$ZodNumberFormat", (inst, def) => {
			$ZodCheckNumberFormat.init(inst, def);
			$ZodNumber.init(inst, def);
		});
		const $ZodBoolean = /*@__PURE__*/ $constructor("$ZodBoolean", (inst, def) => {
			$ZodType.init(inst, def);
			inst._zod.pattern = boolean$1;
			inst._zod.parse = (payload, _ctx) => {
				if (def.coerce) try {
					payload.value = Boolean(payload.value);
				} catch (_) {}
				const input = payload.value;
				if (typeof input === "boolean") return payload;
				payload.issues.push({
					expected: "boolean",
					code: "invalid_type",
					input,
					inst
				});
				return payload;
			};
		});
		const $ZodUndefined = /*@__PURE__*/ $constructor("$ZodUndefined", (inst, def) => {
			$ZodType.init(inst, def);
			inst._zod.pattern = _undefined$2;
			inst._zod.values = /* @__PURE__ */ new Set([void 0]);
			inst._zod.parse = (payload, _ctx) => {
				const input = payload.value;
				if (typeof input === "undefined") return payload;
				payload.issues.push({
					expected: "undefined",
					code: "invalid_type",
					input,
					inst
				});
				return payload;
			};
		});
		const $ZodNull = /*@__PURE__*/ $constructor("$ZodNull", (inst, def) => {
			$ZodType.init(inst, def);
			inst._zod.pattern = _null$2;
			inst._zod.values = /* @__PURE__ */ new Set([null]);
			inst._zod.parse = (payload, _ctx) => {
				const input = payload.value;
				if (input === null) return payload;
				payload.issues.push({
					expected: "null",
					code: "invalid_type",
					input,
					inst
				});
				return payload;
			};
		});
		const $ZodAny = /*@__PURE__*/ $constructor("$ZodAny", (inst, def) => {
			$ZodType.init(inst, def);
			inst._zod.parse = (payload) => payload;
		});
		const $ZodUnknown = /*@__PURE__*/ $constructor("$ZodUnknown", (inst, def) => {
			$ZodType.init(inst, def);
			inst._zod.parse = (payload) => payload;
		});
		const $ZodNever = /*@__PURE__*/ $constructor("$ZodNever", (inst, def) => {
			$ZodType.init(inst, def);
			inst._zod.parse = (payload, _ctx) => {
				payload.issues.push({
					expected: "never",
					code: "invalid_type",
					input: payload.value,
					inst
				});
				return payload;
			};
		});
		function handleArrayResult(result, final, index) {
			if (result.issues.length) final.issues.push(...prefixIssues(index, result.issues));
			final.value[index] = result.value;
		}
		const $ZodArray = /*@__PURE__*/ $constructor("$ZodArray", (inst, def) => {
			$ZodType.init(inst, def);
			inst._zod.parse = (payload, ctx) => {
				const input = payload.value;
				if (!Array.isArray(input)) {
					payload.issues.push({
						expected: "array",
						code: "invalid_type",
						input,
						inst
					});
					return payload;
				}
				payload.value = Array(input.length);
				const proms = [];
				for (let i = 0; i < input.length; i++) {
					const item = input[i];
					const result = def.element._zod.run({
						value: item,
						issues: []
					}, ctx);
					if (result instanceof Promise) proms.push(result.then((result) => handleArrayResult(result, payload, i)));
					else handleArrayResult(result, payload, i);
				}
				if (proms.length) return Promise.all(proms).then(() => payload);
				return payload;
			};
		});
		function handlePropertyResult(result, final, key, input, isOptionalIn, isOptionalOut) {
			const isPresent = key in input;
			if (result.issues.length) {
				if (isOptionalIn && isOptionalOut && !isPresent) return;
				final.issues.push(...prefixIssues(key, result.issues));
			}
			if (!isPresent && !isOptionalIn) {
				if (!result.issues.length) final.issues.push({
					code: "invalid_type",
					expected: "nonoptional",
					input: void 0,
					path: [key]
				});
				return;
			}
			if (result.value === void 0) {
				if (isPresent) final.value[key] = void 0;
			} else final.value[key] = result.value;
		}
		function normalizeDef(def) {
			const keys = Object.keys(def.shape);
			for (const k of keys) if (!def.shape?.[k]?._zod?.traits?.has("$ZodType")) throw new Error(`Invalid element at key "${k}": expected a Zod schema`);
			const okeys = optionalKeys(def.shape);
			return {
				...def,
				keys,
				keySet: new Set(keys),
				numKeys: keys.length,
				optionalKeys: new Set(okeys)
			};
		}
		function handleCatchall(proms, input, payload, ctx, def, inst) {
			const unrecognized = [];
			const keySet = def.keySet;
			const _catchall = def.catchall._zod;
			const t = _catchall.def.type;
			const isOptionalIn = _catchall.optin === "optional";
			const isOptionalOut = _catchall.optout === "optional";
			for (const key in input) {
				if (key === "__proto__") continue;
				if (keySet.has(key)) continue;
				if (t === "never") {
					unrecognized.push(key);
					continue;
				}
				const r = _catchall.run({
					value: input[key],
					issues: []
				}, ctx);
				if (r instanceof Promise) proms.push(r.then((r) => handlePropertyResult(r, payload, key, input, isOptionalIn, isOptionalOut)));
				else handlePropertyResult(r, payload, key, input, isOptionalIn, isOptionalOut);
			}
			if (unrecognized.length) payload.issues.push({
				code: "unrecognized_keys",
				keys: unrecognized,
				input,
				inst
			});
			if (!proms.length) return payload;
			return Promise.all(proms).then(() => {
				return payload;
			});
		}
		const $ZodObject = /*@__PURE__*/ $constructor("$ZodObject", (inst, def) => {
			$ZodType.init(inst, def);
			if (!Object.getOwnPropertyDescriptor(def, "shape")?.get) {
				const sh = def.shape;
				Object.defineProperty(def, "shape", { get: () => {
					const newSh = { ...sh };
					Object.defineProperty(def, "shape", { value: newSh });
					return newSh;
				} });
			}
			const _normalized = cached(() => normalizeDef(def));
			defineLazy(inst._zod, "propValues", () => {
				const shape = def.shape;
				const propValues = {};
				for (const key in shape) {
					const field = shape[key]._zod;
					if (field.values) {
						propValues[key] ?? (propValues[key] = /* @__PURE__ */ new Set());
						for (const v of field.values) propValues[key].add(v);
					}
				}
				return propValues;
			});
			const isObject$1 = isObject;
			const catchall = def.catchall;
			let value;
			inst._zod.parse = (payload, ctx) => {
				value ?? (value = _normalized.value);
				const input = payload.value;
				if (!isObject$1(input)) {
					payload.issues.push({
						expected: "object",
						code: "invalid_type",
						input,
						inst
					});
					return payload;
				}
				payload.value = {};
				const proms = [];
				const shape = value.shape;
				for (const key of value.keys) {
					const el = shape[key];
					const isOptionalIn = el._zod.optin === "optional";
					const isOptionalOut = el._zod.optout === "optional";
					const r = el._zod.run({
						value: input[key],
						issues: []
					}, ctx);
					if (r instanceof Promise) proms.push(r.then((r) => handlePropertyResult(r, payload, key, input, isOptionalIn, isOptionalOut)));
					else handlePropertyResult(r, payload, key, input, isOptionalIn, isOptionalOut);
				}
				if (!catchall) return proms.length ? Promise.all(proms).then(() => payload) : payload;
				return handleCatchall(proms, input, payload, ctx, _normalized.value, inst);
			};
		});
		const $ZodObjectJIT = /*@__PURE__*/ $constructor("$ZodObjectJIT", (inst, def) => {
			$ZodObject.init(inst, def);
			const superParse = inst._zod.parse;
			const _normalized = cached(() => normalizeDef(def));
			const generateFastpass = (shape) => {
				const doc = new Doc([
					"shape",
					"payload",
					"ctx"
				]);
				const normalized = _normalized.value;
				const parseStr = (key) => {
					const k = esc(key);
					return `shape[${k}]._zod.run({ value: input[${k}], issues: [] }, ctx)`;
				};
				doc.write(`const input = payload.value;`);
				const ids = Object.create(null);
				let counter = 0;
				for (const key of normalized.keys) ids[key] = `key_${counter++}`;
				doc.write(`const newResult = {};`);
				for (const key of normalized.keys) {
					const id = ids[key];
					const k = esc(key);
					const schema = shape[key];
					const isOptionalIn = schema?._zod?.optin === "optional";
					const isOptionalOut = schema?._zod?.optout === "optional";
					doc.write(`const ${id} = ${parseStr(key)};`);
					if (isOptionalIn && isOptionalOut) doc.write(`
        if (${id}.issues.length) {
          if (${k} in input) {
            payload.issues = payload.issues.concat(${id}.issues.map(iss => ({
              ...iss,
              path: iss.path ? [${k}, ...iss.path] : [${k}]
            })));
          }
        }
        
        if (${id}.value === undefined) {
          if (${k} in input) {
            newResult[${k}] = undefined;
          }
        } else {
          newResult[${k}] = ${id}.value;
        }
        
      `);
					else if (!isOptionalIn) doc.write(`
        const ${id}_present = ${k} in input;
        if (${id}.issues.length) {
          payload.issues = payload.issues.concat(${id}.issues.map(iss => ({
            ...iss,
            path: iss.path ? [${k}, ...iss.path] : [${k}]
          })));
        }
        if (!${id}_present && !${id}.issues.length) {
          payload.issues.push({
            code: "invalid_type",
            expected: "nonoptional",
            input: undefined,
            path: [${k}]
          });
        }

        if (${id}_present) {
          if (${id}.value === undefined) {
            newResult[${k}] = undefined;
          } else {
            newResult[${k}] = ${id}.value;
          }
        }

      `);
					else doc.write(`
        if (${id}.issues.length) {
          payload.issues = payload.issues.concat(${id}.issues.map(iss => ({
            ...iss,
            path: iss.path ? [${k}, ...iss.path] : [${k}]
          })));
        }
        
        if (${id}.value === undefined) {
          if (${k} in input) {
            newResult[${k}] = undefined;
          }
        } else {
          newResult[${k}] = ${id}.value;
        }
        
      `);
				}
				doc.write(`payload.value = newResult;`);
				doc.write(`return payload;`);
				const fn = doc.compile();
				return (payload, ctx) => fn(shape, payload, ctx);
			};
			let fastpass;
			const isObject$2 = isObject;
			const jit = !globalConfig.jitless;
			const fastEnabled = jit && allowsEval.value;
			const catchall = def.catchall;
			let value;
			inst._zod.parse = (payload, ctx) => {
				value ?? (value = _normalized.value);
				const input = payload.value;
				if (!isObject$2(input)) {
					payload.issues.push({
						expected: "object",
						code: "invalid_type",
						input,
						inst
					});
					return payload;
				}
				if (jit && fastEnabled && ctx?.async === false && ctx.jitless !== true) {
					if (!fastpass) fastpass = generateFastpass(def.shape);
					payload = fastpass(payload, ctx);
					if (!catchall) return payload;
					return handleCatchall([], input, payload, ctx, value, inst);
				}
				return superParse(payload, ctx);
			};
		});
		function handleUnionResults(results, final, inst, ctx) {
			for (const result of results) if (result.issues.length === 0) {
				final.value = result.value;
				return final;
			}
			const nonaborted = results.filter((r) => !aborted(r));
			if (nonaborted.length === 1) {
				final.value = nonaborted[0].value;
				return nonaborted[0];
			}
			final.issues.push({
				code: "invalid_union",
				input: final.value,
				inst,
				errors: results.map((result) => result.issues.map((iss) => finalizeIssue(iss, ctx, config())))
			});
			return final;
		}
		const $ZodUnion = /*@__PURE__*/ $constructor("$ZodUnion", (inst, def) => {
			$ZodType.init(inst, def);
			defineLazy(inst._zod, "optin", () => def.options.some((o) => o._zod.optin === "optional") ? "optional" : void 0);
			defineLazy(inst._zod, "optout", () => def.options.some((o) => o._zod.optout === "optional") ? "optional" : void 0);
			defineLazy(inst._zod, "values", () => {
				if (def.options.every((o) => o._zod.values)) return new Set(def.options.flatMap((option) => Array.from(option._zod.values)));
			});
			defineLazy(inst._zod, "pattern", () => {
				if (def.options.every((o) => o._zod.pattern)) {
					const patterns = def.options.map((o) => o._zod.pattern);
					return new RegExp(`^(${patterns.map((p) => cleanRegex(p.source)).join("|")})$`);
				}
			});
			const first = def.options.length === 1 ? def.options[0]._zod.run : null;
			inst._zod.parse = (payload, ctx) => {
				if (first) return first(payload, ctx);
				let async = false;
				const results = [];
				for (const option of def.options) {
					const result = option._zod.run({
						value: payload.value,
						issues: []
					}, ctx);
					if (result instanceof Promise) {
						results.push(result);
						async = true;
					} else {
						if (result.issues.length === 0) return result;
						results.push(result);
					}
				}
				if (!async) return handleUnionResults(results, payload, inst, ctx);
				return Promise.all(results).then((results) => {
					return handleUnionResults(results, payload, inst, ctx);
				});
			};
		});
		const $ZodDiscriminatedUnion = /*@__PURE__*/ $constructor("$ZodDiscriminatedUnion", (inst, def) => {
			def.inclusive = false;
			$ZodUnion.init(inst, def);
			const _super = inst._zod.parse;
			defineLazy(inst._zod, "propValues", () => {
				const propValues = {};
				for (const option of def.options) {
					const pv = option._zod.propValues;
					if (!pv || Object.keys(pv).length === 0) throw new Error(`Invalid discriminated union option at index "${def.options.indexOf(option)}"`);
					for (const [k, v] of Object.entries(pv)) {
						if (!propValues[k]) propValues[k] = /* @__PURE__ */ new Set();
						for (const val of v) propValues[k].add(val);
					}
				}
				return propValues;
			});
			const disc = cached(() => {
				const opts = def.options;
				const map = /* @__PURE__ */ new Map();
				for (const o of opts) {
					const values = o._zod.propValues?.[def.discriminator];
					if (!values || values.size === 0) throw new Error(`Invalid discriminated union option at index "${def.options.indexOf(o)}"`);
					for (const v of values) {
						if (map.has(v)) throw new Error(`Duplicate discriminator value "${String(v)}"`);
						map.set(v, o);
					}
				}
				return map;
			});
			inst._zod.parse = (payload, ctx) => {
				const input = payload.value;
				if (!isObject(input)) {
					payload.issues.push({
						code: "invalid_type",
						expected: "object",
						input,
						inst
					});
					return payload;
				}
				const opt = disc.value.get(input?.[def.discriminator]);
				if (opt) return opt._zod.run(payload, ctx);
				if (def.unionFallback || ctx.direction === "backward") return _super(payload, ctx);
				payload.issues.push({
					code: "invalid_union",
					errors: [],
					note: "No matching discriminator",
					discriminator: def.discriminator,
					options: Array.from(disc.value.keys()),
					input,
					path: [def.discriminator],
					inst
				});
				return payload;
			};
		});
		const $ZodIntersection = /*@__PURE__*/ $constructor("$ZodIntersection", (inst, def) => {
			$ZodType.init(inst, def);
			inst._zod.parse = (payload, ctx) => {
				const input = payload.value;
				const left = def.left._zod.run({
					value: input,
					issues: []
				}, ctx);
				const right = def.right._zod.run({
					value: input,
					issues: []
				}, ctx);
				if (left instanceof Promise || right instanceof Promise) return Promise.all([left, right]).then(([left, right]) => {
					return handleIntersectionResults(payload, left, right);
				});
				return handleIntersectionResults(payload, left, right);
			};
		});
		function mergeValues(a, b) {
			if (a === b) return {
				valid: true,
				data: a
			};
			if (a instanceof Date && b instanceof Date && +a === +b) return {
				valid: true,
				data: a
			};
			if (isPlainObject(a) && isPlainObject(b)) {
				const bKeys = Object.keys(b);
				const sharedKeys = Object.keys(a).filter((key) => bKeys.indexOf(key) !== -1);
				const newObj = {
					...a,
					...b
				};
				for (const key of sharedKeys) {
					const sharedValue = mergeValues(a[key], b[key]);
					if (!sharedValue.valid) return {
						valid: false,
						mergeErrorPath: [key, ...sharedValue.mergeErrorPath]
					};
					newObj[key] = sharedValue.data;
				}
				return {
					valid: true,
					data: newObj
				};
			}
			if (Array.isArray(a) && Array.isArray(b)) {
				if (a.length !== b.length) return {
					valid: false,
					mergeErrorPath: []
				};
				const newArray = [];
				for (let index = 0; index < a.length; index++) {
					const itemA = a[index];
					const itemB = b[index];
					const sharedValue = mergeValues(itemA, itemB);
					if (!sharedValue.valid) return {
						valid: false,
						mergeErrorPath: [index, ...sharedValue.mergeErrorPath]
					};
					newArray.push(sharedValue.data);
				}
				return {
					valid: true,
					data: newArray
				};
			}
			return {
				valid: false,
				mergeErrorPath: []
			};
		}
		function handleIntersectionResults(result, left, right) {
			const unrecKeys = /* @__PURE__ */ new Map();
			let unrecIssue;
			for (const iss of left.issues) if (iss.code === "unrecognized_keys") {
				unrecIssue ?? (unrecIssue = iss);
				for (const k of iss.keys) {
					if (!unrecKeys.has(k)) unrecKeys.set(k, {});
					unrecKeys.get(k).l = true;
				}
			} else result.issues.push(iss);
			for (const iss of right.issues) if (iss.code === "unrecognized_keys") for (const k of iss.keys) {
				if (!unrecKeys.has(k)) unrecKeys.set(k, {});
				unrecKeys.get(k).r = true;
			}
			else result.issues.push(iss);
			const bothKeys = [...unrecKeys].filter(([, f]) => f.l && f.r).map(([k]) => k);
			if (bothKeys.length && unrecIssue) result.issues.push({
				...unrecIssue,
				keys: bothKeys
			});
			if (aborted(result)) return result;
			const merged = mergeValues(left.value, right.value);
			if (!merged.valid) throw new Error(`Unmergable intersection. Error path: ${JSON.stringify(merged.mergeErrorPath)}`);
			result.value = merged.data;
			return result;
		}
		const $ZodRecord = /*@__PURE__*/ $constructor("$ZodRecord", (inst, def) => {
			$ZodType.init(inst, def);
			inst._zod.parse = (payload, ctx) => {
				const input = payload.value;
				if (!isPlainObject(input)) {
					payload.issues.push({
						expected: "record",
						code: "invalid_type",
						input,
						inst
					});
					return payload;
				}
				const proms = [];
				const values = def.keyType._zod.values;
				if (values) {
					payload.value = {};
					const recordKeys = /* @__PURE__ */ new Set();
					for (const key of values) if (typeof key === "string" || typeof key === "number" || typeof key === "symbol") {
						recordKeys.add(typeof key === "number" ? key.toString() : key);
						const keyResult = def.keyType._zod.run({
							value: key,
							issues: []
						}, ctx);
						if (keyResult instanceof Promise) throw new Error("Async schemas not supported in object keys currently");
						if (keyResult.issues.length) {
							payload.issues.push({
								code: "invalid_key",
								origin: "record",
								issues: keyResult.issues.map((iss) => finalizeIssue(iss, ctx, config())),
								input: key,
								path: [key],
								inst
							});
							continue;
						}
						const outKey = keyResult.value;
						const result = def.valueType._zod.run({
							value: input[key],
							issues: []
						}, ctx);
						if (result instanceof Promise) proms.push(result.then((result) => {
							if (result.issues.length) payload.issues.push(...prefixIssues(key, result.issues));
							payload.value[outKey] = result.value;
						}));
						else {
							if (result.issues.length) payload.issues.push(...prefixIssues(key, result.issues));
							payload.value[outKey] = result.value;
						}
					}
					let unrecognized;
					for (const key in input) if (!recordKeys.has(key)) {
						unrecognized = unrecognized ?? [];
						unrecognized.push(key);
					}
					if (unrecognized && unrecognized.length > 0) payload.issues.push({
						code: "unrecognized_keys",
						input,
						inst,
						keys: unrecognized
					});
				} else {
					payload.value = {};
					for (const key of Reflect.ownKeys(input)) {
						if (key === "__proto__") continue;
						if (!Object.prototype.propertyIsEnumerable.call(input, key)) continue;
						let keyResult = def.keyType._zod.run({
							value: key,
							issues: []
						}, ctx);
						if (keyResult instanceof Promise) throw new Error("Async schemas not supported in object keys currently");
						if (typeof key === "string" && number$1.test(key) && keyResult.issues.length) {
							const retryResult = def.keyType._zod.run({
								value: Number(key),
								issues: []
							}, ctx);
							if (retryResult instanceof Promise) throw new Error("Async schemas not supported in object keys currently");
							if (retryResult.issues.length === 0) keyResult = retryResult;
						}
						if (keyResult.issues.length) {
							if (def.mode === "loose") payload.value[key] = input[key];
							else payload.issues.push({
								code: "invalid_key",
								origin: "record",
								issues: keyResult.issues.map((iss) => finalizeIssue(iss, ctx, config())),
								input: key,
								path: [key],
								inst
							});
							continue;
						}
						const result = def.valueType._zod.run({
							value: input[key],
							issues: []
						}, ctx);
						if (result instanceof Promise) proms.push(result.then((result) => {
							if (result.issues.length) payload.issues.push(...prefixIssues(key, result.issues));
							payload.value[keyResult.value] = result.value;
						}));
						else {
							if (result.issues.length) payload.issues.push(...prefixIssues(key, result.issues));
							payload.value[keyResult.value] = result.value;
						}
					}
				}
				if (proms.length) return Promise.all(proms).then(() => payload);
				return payload;
			};
		});
		const $ZodEnum = /*@__PURE__*/ $constructor("$ZodEnum", (inst, def) => {
			$ZodType.init(inst, def);
			const values = getEnumValues(def.entries);
			const valuesSet = new Set(values);
			inst._zod.values = valuesSet;
			inst._zod.pattern = new RegExp(`^(${values.filter((k) => propertyKeyTypes.has(typeof k)).map((o) => typeof o === "string" ? escapeRegex(o) : o.toString()).join("|")})$`);
			inst._zod.parse = (payload, _ctx) => {
				const input = payload.value;
				if (valuesSet.has(input)) return payload;
				payload.issues.push({
					code: "invalid_value",
					values,
					input,
					inst
				});
				return payload;
			};
		});
		const $ZodLiteral = /*@__PURE__*/ $constructor("$ZodLiteral", (inst, def) => {
			$ZodType.init(inst, def);
			if (def.values.length === 0) throw new Error("Cannot create literal schema with no valid values");
			const values = new Set(def.values);
			inst._zod.values = values;
			inst._zod.pattern = new RegExp(`^(${def.values.map((o) => typeof o === "string" ? escapeRegex(o) : o ? escapeRegex(o.toString()) : String(o)).join("|")})$`);
			inst._zod.parse = (payload, _ctx) => {
				const input = payload.value;
				if (values.has(input)) return payload;
				payload.issues.push({
					code: "invalid_value",
					values: def.values,
					input,
					inst
				});
				return payload;
			};
		});
		const $ZodTransform = /*@__PURE__*/ $constructor("$ZodTransform", (inst, def) => {
			$ZodType.init(inst, def);
			inst._zod.optin = "optional";
			inst._zod.parse = (payload, ctx) => {
				if (ctx.direction === "backward") throw new $ZodEncodeError(inst.constructor.name);
				const _out = def.transform(payload.value, payload);
				if (ctx.async) return (_out instanceof Promise ? _out : Promise.resolve(_out)).then((output) => {
					payload.value = output;
					payload.fallback = true;
					return payload;
				});
				if (_out instanceof Promise) throw new $ZodAsyncError();
				payload.value = _out;
				payload.fallback = true;
				return payload;
			};
		});
		function handleOptionalResult(result, input) {
			if (input === void 0 && (result.issues.length || result.fallback)) return {
				issues: [],
				value: void 0
			};
			return result;
		}
		const $ZodOptional = /*@__PURE__*/ $constructor("$ZodOptional", (inst, def) => {
			$ZodType.init(inst, def);
			inst._zod.optin = "optional";
			inst._zod.optout = "optional";
			defineLazy(inst._zod, "values", () => {
				return def.innerType._zod.values ? /* @__PURE__ */ new Set([...def.innerType._zod.values, void 0]) : void 0;
			});
			defineLazy(inst._zod, "pattern", () => {
				const pattern = def.innerType._zod.pattern;
				return pattern ? new RegExp(`^(${cleanRegex(pattern.source)})?$`) : void 0;
			});
			inst._zod.parse = (payload, ctx) => {
				if (def.innerType._zod.optin === "optional") {
					const input = payload.value;
					const result = def.innerType._zod.run(payload, ctx);
					if (result instanceof Promise) return result.then((r) => handleOptionalResult(r, input));
					return handleOptionalResult(result, input);
				}
				if (payload.value === void 0) return payload;
				return def.innerType._zod.run(payload, ctx);
			};
		});
		const $ZodExactOptional = /*@__PURE__*/ $constructor("$ZodExactOptional", (inst, def) => {
			$ZodOptional.init(inst, def);
			defineLazy(inst._zod, "values", () => def.innerType._zod.values);
			defineLazy(inst._zod, "pattern", () => def.innerType._zod.pattern);
			inst._zod.parse = (payload, ctx) => {
				return def.innerType._zod.run(payload, ctx);
			};
		});
		const $ZodNullable = /*@__PURE__*/ $constructor("$ZodNullable", (inst, def) => {
			$ZodType.init(inst, def);
			defineLazy(inst._zod, "optin", () => def.innerType._zod.optin);
			defineLazy(inst._zod, "optout", () => def.innerType._zod.optout);
			defineLazy(inst._zod, "pattern", () => {
				const pattern = def.innerType._zod.pattern;
				return pattern ? new RegExp(`^(${cleanRegex(pattern.source)}|null)$`) : void 0;
			});
			defineLazy(inst._zod, "values", () => {
				return def.innerType._zod.values ? /* @__PURE__ */ new Set([...def.innerType._zod.values, null]) : void 0;
			});
			inst._zod.parse = (payload, ctx) => {
				if (payload.value === null) return payload;
				return def.innerType._zod.run(payload, ctx);
			};
		});
		const $ZodDefault = /*@__PURE__*/ $constructor("$ZodDefault", (inst, def) => {
			$ZodType.init(inst, def);
			inst._zod.optin = "optional";
			defineLazy(inst._zod, "values", () => def.innerType._zod.values);
			inst._zod.parse = (payload, ctx) => {
				if (ctx.direction === "backward") return def.innerType._zod.run(payload, ctx);
				if (payload.value === void 0) {
					payload.value = def.defaultValue;
					/**
					* $ZodDefault returns the default value immediately in forward direction.
					* It doesn't pass the default value into the validator ("prefault"). There's no reason to pass the default value through validation. The validity of the default is enforced by TypeScript statically. Otherwise, it's the responsibility of the user to ensure the default is valid. In the case of pipes with divergent in/out types, you can specify the default on the `in` schema of your ZodPipe to set a "prefault" for the pipe.   */
					return payload;
				}
				const result = def.innerType._zod.run(payload, ctx);
				if (result instanceof Promise) return result.then((result) => handleDefaultResult(result, def));
				return handleDefaultResult(result, def);
			};
		});
		function handleDefaultResult(payload, def) {
			if (payload.value === void 0) payload.value = def.defaultValue;
			return payload;
		}
		const $ZodPrefault = /*@__PURE__*/ $constructor("$ZodPrefault", (inst, def) => {
			$ZodType.init(inst, def);
			inst._zod.optin = "optional";
			defineLazy(inst._zod, "values", () => def.innerType._zod.values);
			inst._zod.parse = (payload, ctx) => {
				if (ctx.direction === "backward") return def.innerType._zod.run(payload, ctx);
				if (payload.value === void 0) payload.value = def.defaultValue;
				return def.innerType._zod.run(payload, ctx);
			};
		});
		const $ZodNonOptional = /*@__PURE__*/ $constructor("$ZodNonOptional", (inst, def) => {
			$ZodType.init(inst, def);
			defineLazy(inst._zod, "values", () => {
				const v = def.innerType._zod.values;
				return v ? new Set([...v].filter((x) => x !== void 0)) : void 0;
			});
			inst._zod.parse = (payload, ctx) => {
				const result = def.innerType._zod.run(payload, ctx);
				if (result instanceof Promise) return result.then((result) => handleNonOptionalResult(result, inst));
				return handleNonOptionalResult(result, inst);
			};
		});
		function handleNonOptionalResult(payload, inst) {
			if (!payload.issues.length && payload.value === void 0) payload.issues.push({
				code: "invalid_type",
				expected: "nonoptional",
				input: payload.value,
				inst
			});
			return payload;
		}
		const $ZodCatch = /*@__PURE__*/ $constructor("$ZodCatch", (inst, def) => {
			$ZodType.init(inst, def);
			inst._zod.optin = "optional";
			defineLazy(inst._zod, "optout", () => def.innerType._zod.optout);
			defineLazy(inst._zod, "values", () => def.innerType._zod.values);
			inst._zod.parse = (payload, ctx) => {
				if (ctx.direction === "backward") return def.innerType._zod.run(payload, ctx);
				const result = def.innerType._zod.run(payload, ctx);
				if (result instanceof Promise) return result.then((result) => {
					payload.value = result.value;
					if (result.issues.length) {
						payload.value = def.catchValue({
							...payload,
							error: { issues: result.issues.map((iss) => finalizeIssue(iss, ctx, config())) },
							input: payload.value
						});
						payload.issues = [];
						payload.fallback = true;
					}
					return payload;
				});
				payload.value = result.value;
				if (result.issues.length) {
					payload.value = def.catchValue({
						...payload,
						error: { issues: result.issues.map((iss) => finalizeIssue(iss, ctx, config())) },
						input: payload.value
					});
					payload.issues = [];
					payload.fallback = true;
				}
				return payload;
			};
		});
		const $ZodPipe = /*@__PURE__*/ $constructor("$ZodPipe", (inst, def) => {
			$ZodType.init(inst, def);
			defineLazy(inst._zod, "values", () => def.in._zod.values);
			defineLazy(inst._zod, "optin", () => def.in._zod.optin);
			defineLazy(inst._zod, "optout", () => def.out._zod.optout);
			defineLazy(inst._zod, "propValues", () => def.in._zod.propValues);
			inst._zod.parse = (payload, ctx) => {
				if (ctx.direction === "backward") {
					const right = def.out._zod.run(payload, ctx);
					if (right instanceof Promise) return right.then((right) => handlePipeResult(right, def.in, ctx));
					return handlePipeResult(right, def.in, ctx);
				}
				const left = def.in._zod.run(payload, ctx);
				if (left instanceof Promise) return left.then((left) => handlePipeResult(left, def.out, ctx));
				return handlePipeResult(left, def.out, ctx);
			};
		});
		function handlePipeResult(left, next, ctx) {
			if (left.issues.length) {
				left.aborted = true;
				return left;
			}
			return next._zod.run({
				value: left.value,
				issues: left.issues,
				fallback: left.fallback
			}, ctx);
		}
		const $ZodPreprocess = /*@__PURE__*/ $constructor("$ZodPreprocess", (inst, def) => {
			$ZodPipe.init(inst, def);
		});
		const $ZodReadonly = /*@__PURE__*/ $constructor("$ZodReadonly", (inst, def) => {
			$ZodType.init(inst, def);
			defineLazy(inst._zod, "propValues", () => def.innerType._zod.propValues);
			defineLazy(inst._zod, "values", () => def.innerType._zod.values);
			defineLazy(inst._zod, "optin", () => def.innerType?._zod?.optin);
			defineLazy(inst._zod, "optout", () => def.innerType?._zod?.optout);
			inst._zod.parse = (payload, ctx) => {
				if (ctx.direction === "backward") return def.innerType._zod.run(payload, ctx);
				const result = def.innerType._zod.run(payload, ctx);
				if (result instanceof Promise) return result.then(handleReadonlyResult);
				return handleReadonlyResult(result);
			};
		});
		function handleReadonlyResult(payload) {
			payload.value = Object.freeze(payload.value);
			return payload;
		}
		const $ZodCustom = /*@__PURE__*/ $constructor("$ZodCustom", (inst, def) => {
			$ZodCheck.init(inst, def);
			$ZodType.init(inst, def);
			inst._zod.parse = (payload, _) => {
				return payload;
			};
			inst._zod.check = (payload) => {
				const input = payload.value;
				const r = def.fn(input);
				if (r instanceof Promise) return r.then((r) => handleRefineResult(r, payload, input, inst));
				handleRefineResult(r, payload, input, inst);
			};
		});
		function handleRefineResult(result, payload, input, inst) {
			if (!result) {
				const _iss = {
					code: "custom",
					input,
					inst,
					path: [...inst._zod.def.path ?? []],
					continue: !inst._zod.def.abort
				};
				if (inst._zod.def.params) _iss.params = inst._zod.def.params;
				payload.issues.push(issue(_iss));
			}
		}
		//#endregion
		//#region ../../node_modules/.pnpm/zod@4.4.3/node_modules/zod/v4/core/registries.js
		var _a;
		var $ZodRegistry = class {
			constructor() {
				this._map = /* @__PURE__ */ new WeakMap();
				this._idmap = /* @__PURE__ */ new Map();
			}
			add(schema, ..._meta) {
				const meta = _meta[0];
				this._map.set(schema, meta);
				if (meta && typeof meta === "object" && "id" in meta) this._idmap.set(meta.id, schema);
				return this;
			}
			clear() {
				this._map = /* @__PURE__ */ new WeakMap();
				this._idmap = /* @__PURE__ */ new Map();
				return this;
			}
			remove(schema) {
				const meta = this._map.get(schema);
				if (meta && typeof meta === "object" && "id" in meta) this._idmap.delete(meta.id);
				this._map.delete(schema);
				return this;
			}
			get(schema) {
				const p = schema._zod.parent;
				if (p) {
					const pm = { ...this.get(p) ?? {} };
					delete pm.id;
					const f = {
						...pm,
						...this._map.get(schema)
					};
					return Object.keys(f).length ? f : void 0;
				}
				return this._map.get(schema);
			}
			has(schema) {
				return this._map.has(schema);
			}
		};
		function registry() {
			return new $ZodRegistry();
		}
		(_a = globalThis).__zod_globalRegistry ?? (_a.__zod_globalRegistry = registry());
		const globalRegistry = globalThis.__zod_globalRegistry;
		//#endregion
		//#region ../../node_modules/.pnpm/zod@4.4.3/node_modules/zod/v4/core/api.js
		// @__NO_SIDE_EFFECTS__
		function _string(Class, params) {
			return new Class({
				type: "string",
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _email(Class, params) {
			return new Class({
				type: "string",
				format: "email",
				check: "string_format",
				abort: false,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _guid(Class, params) {
			return new Class({
				type: "string",
				format: "guid",
				check: "string_format",
				abort: false,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _uuid(Class, params) {
			return new Class({
				type: "string",
				format: "uuid",
				check: "string_format",
				abort: false,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _uuidv4(Class, params) {
			return new Class({
				type: "string",
				format: "uuid",
				check: "string_format",
				abort: false,
				version: "v4",
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _uuidv6(Class, params) {
			return new Class({
				type: "string",
				format: "uuid",
				check: "string_format",
				abort: false,
				version: "v6",
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _uuidv7(Class, params) {
			return new Class({
				type: "string",
				format: "uuid",
				check: "string_format",
				abort: false,
				version: "v7",
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _url(Class, params) {
			return new Class({
				type: "string",
				format: "url",
				check: "string_format",
				abort: false,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _emoji(Class, params) {
			return new Class({
				type: "string",
				format: "emoji",
				check: "string_format",
				abort: false,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _nanoid(Class, params) {
			return new Class({
				type: "string",
				format: "nanoid",
				check: "string_format",
				abort: false,
				...normalizeParams(params)
			});
		}
		/**
		* @deprecated CUID v1 is deprecated by its authors due to information leakage
		* (timestamps embedded in the id). Use {@link _cuid2} instead.
		* See https://github.com/paralleldrive/cuid.
		*/
		// @__NO_SIDE_EFFECTS__
		function _cuid(Class, params) {
			return new Class({
				type: "string",
				format: "cuid",
				check: "string_format",
				abort: false,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _cuid2(Class, params) {
			return new Class({
				type: "string",
				format: "cuid2",
				check: "string_format",
				abort: false,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _ulid(Class, params) {
			return new Class({
				type: "string",
				format: "ulid",
				check: "string_format",
				abort: false,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _xid(Class, params) {
			return new Class({
				type: "string",
				format: "xid",
				check: "string_format",
				abort: false,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _ksuid(Class, params) {
			return new Class({
				type: "string",
				format: "ksuid",
				check: "string_format",
				abort: false,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _ipv4(Class, params) {
			return new Class({
				type: "string",
				format: "ipv4",
				check: "string_format",
				abort: false,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _ipv6(Class, params) {
			return new Class({
				type: "string",
				format: "ipv6",
				check: "string_format",
				abort: false,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _cidrv4(Class, params) {
			return new Class({
				type: "string",
				format: "cidrv4",
				check: "string_format",
				abort: false,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _cidrv6(Class, params) {
			return new Class({
				type: "string",
				format: "cidrv6",
				check: "string_format",
				abort: false,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _base64(Class, params) {
			return new Class({
				type: "string",
				format: "base64",
				check: "string_format",
				abort: false,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _base64url(Class, params) {
			return new Class({
				type: "string",
				format: "base64url",
				check: "string_format",
				abort: false,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _e164(Class, params) {
			return new Class({
				type: "string",
				format: "e164",
				check: "string_format",
				abort: false,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _jwt(Class, params) {
			return new Class({
				type: "string",
				format: "jwt",
				check: "string_format",
				abort: false,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _isoDateTime(Class, params) {
			return new Class({
				type: "string",
				format: "datetime",
				check: "string_format",
				offset: false,
				local: false,
				precision: null,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _isoDate(Class, params) {
			return new Class({
				type: "string",
				format: "date",
				check: "string_format",
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _isoTime(Class, params) {
			return new Class({
				type: "string",
				format: "time",
				check: "string_format",
				precision: null,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _isoDuration(Class, params) {
			return new Class({
				type: "string",
				format: "duration",
				check: "string_format",
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _number(Class, params) {
			return new Class({
				type: "number",
				checks: [],
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _int(Class, params) {
			return new Class({
				type: "number",
				check: "number_format",
				abort: false,
				format: "safeint",
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _boolean(Class, params) {
			return new Class({
				type: "boolean",
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _undefined$1(Class, params) {
			return new Class({
				type: "undefined",
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _null$1(Class, params) {
			return new Class({
				type: "null",
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _any(Class) {
			return new Class({ type: "any" });
		}
		// @__NO_SIDE_EFFECTS__
		function _unknown(Class) {
			return new Class({ type: "unknown" });
		}
		// @__NO_SIDE_EFFECTS__
		function _never(Class, params) {
			return new Class({
				type: "never",
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _lt(value, params) {
			return new $ZodCheckLessThan({
				check: "less_than",
				...normalizeParams(params),
				value,
				inclusive: false
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _lte(value, params) {
			return new $ZodCheckLessThan({
				check: "less_than",
				...normalizeParams(params),
				value,
				inclusive: true
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _gt(value, params) {
			return new $ZodCheckGreaterThan({
				check: "greater_than",
				...normalizeParams(params),
				value,
				inclusive: false
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _gte(value, params) {
			return new $ZodCheckGreaterThan({
				check: "greater_than",
				...normalizeParams(params),
				value,
				inclusive: true
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _multipleOf(value, params) {
			return new $ZodCheckMultipleOf({
				check: "multiple_of",
				...normalizeParams(params),
				value
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _maxLength(maximum, params) {
			return new $ZodCheckMaxLength({
				check: "max_length",
				...normalizeParams(params),
				maximum
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _minLength(minimum, params) {
			return new $ZodCheckMinLength({
				check: "min_length",
				...normalizeParams(params),
				minimum
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _length(length, params) {
			return new $ZodCheckLengthEquals({
				check: "length_equals",
				...normalizeParams(params),
				length
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _regex(pattern, params) {
			return new $ZodCheckRegex({
				check: "string_format",
				format: "regex",
				...normalizeParams(params),
				pattern
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _lowercase(params) {
			return new $ZodCheckLowerCase({
				check: "string_format",
				format: "lowercase",
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _uppercase(params) {
			return new $ZodCheckUpperCase({
				check: "string_format",
				format: "uppercase",
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _includes(includes, params) {
			return new $ZodCheckIncludes({
				check: "string_format",
				format: "includes",
				...normalizeParams(params),
				includes
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _startsWith(prefix, params) {
			return new $ZodCheckStartsWith({
				check: "string_format",
				format: "starts_with",
				...normalizeParams(params),
				prefix
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _endsWith(suffix, params) {
			return new $ZodCheckEndsWith({
				check: "string_format",
				format: "ends_with",
				...normalizeParams(params),
				suffix
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _overwrite(tx) {
			return new $ZodCheckOverwrite({
				check: "overwrite",
				tx
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _normalize(form) {
			return /* @__PURE__ */ _overwrite((input) => input.normalize(form));
		}
		// @__NO_SIDE_EFFECTS__
		function _trim() {
			return /* @__PURE__ */ _overwrite((input) => input.trim());
		}
		// @__NO_SIDE_EFFECTS__
		function _toLowerCase() {
			return /* @__PURE__ */ _overwrite((input) => input.toLowerCase());
		}
		// @__NO_SIDE_EFFECTS__
		function _toUpperCase() {
			return /* @__PURE__ */ _overwrite((input) => input.toUpperCase());
		}
		// @__NO_SIDE_EFFECTS__
		function _slugify() {
			return /* @__PURE__ */ _overwrite((input) => slugify(input));
		}
		// @__NO_SIDE_EFFECTS__
		function _array(Class, element, params) {
			return new Class({
				type: "array",
				element,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _custom(Class, fn, _params) {
			const norm = normalizeParams(_params);
			norm.abort ?? (norm.abort = true);
			return new Class({
				type: "custom",
				check: "custom",
				fn,
				...norm
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _refine(Class, fn, _params) {
			return new Class({
				type: "custom",
				check: "custom",
				fn,
				...normalizeParams(_params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _superRefine(fn, params) {
			const ch = /* @__PURE__ */ _check((payload) => {
				payload.addIssue = (issue$2) => {
					if (typeof issue$2 === "string") payload.issues.push(issue(issue$2, payload.value, ch._zod.def));
					else {
						const _issue = issue$2;
						if (_issue.fatal) _issue.continue = false;
						_issue.code ?? (_issue.code = "custom");
						_issue.input ?? (_issue.input = payload.value);
						_issue.inst ?? (_issue.inst = ch);
						_issue.continue ?? (_issue.continue = !ch._zod.def.abort);
						payload.issues.push(issue(_issue));
					}
				};
				return fn(payload.value, payload);
			}, params);
			return ch;
		}
		// @__NO_SIDE_EFFECTS__
		function _check(fn, params) {
			const ch = new $ZodCheck({
				check: "custom",
				...normalizeParams(params)
			});
			ch._zod.check = fn;
			return ch;
		}
		//#endregion
		//#region ../../node_modules/.pnpm/zod@4.4.3/node_modules/zod/v4/core/to-json-schema.js
		function initializeContext(params) {
			let target = params?.target ?? "draft-2020-12";
			if (target === "draft-4") target = "draft-04";
			if (target === "draft-7") target = "draft-07";
			return {
				processors: params.processors ?? {},
				metadataRegistry: params?.metadata ?? globalRegistry,
				target,
				unrepresentable: params?.unrepresentable ?? "throw",
				override: params?.override ?? (() => {}),
				io: params?.io ?? "output",
				counter: 0,
				seen: /* @__PURE__ */ new Map(),
				cycles: params?.cycles ?? "ref",
				reused: params?.reused ?? "inline",
				external: params?.external ?? void 0
			};
		}
		function process(schema, ctx, _params = {
			path: [],
			schemaPath: []
		}) {
			var _a;
			const def = schema._zod.def;
			const seen = ctx.seen.get(schema);
			if (seen) {
				seen.count++;
				if (_params.schemaPath.includes(schema)) seen.cycle = _params.path;
				return seen.schema;
			}
			const result = {
				schema: {},
				count: 1,
				cycle: void 0,
				path: _params.path
			};
			ctx.seen.set(schema, result);
			const overrideSchema = schema._zod.toJSONSchema?.();
			if (overrideSchema) result.schema = overrideSchema;
			else {
				const params = {
					..._params,
					schemaPath: [..._params.schemaPath, schema],
					path: _params.path
				};
				if (schema._zod.processJSONSchema) schema._zod.processJSONSchema(ctx, result.schema, params);
				else {
					const _json = result.schema;
					const processor = ctx.processors[def.type];
					if (!processor) throw new Error(`[toJSONSchema]: Non-representable type encountered: ${def.type}`);
					processor(schema, ctx, _json, params);
				}
				const parent = schema._zod.parent;
				if (parent) {
					if (!result.ref) result.ref = parent;
					process(parent, ctx, params);
					ctx.seen.get(parent).isParent = true;
				}
			}
			const meta = ctx.metadataRegistry.get(schema);
			if (meta) Object.assign(result.schema, meta);
			if (ctx.io === "input" && isTransforming(schema)) {
				delete result.schema.examples;
				delete result.schema.default;
			}
			if (ctx.io === "input" && "_prefault" in result.schema) (_a = result.schema).default ?? (_a.default = result.schema._prefault);
			delete result.schema._prefault;
			return ctx.seen.get(schema).schema;
		}
		function extractDefs(ctx, schema) {
			const root = ctx.seen.get(schema);
			if (!root) throw new Error("Unprocessed schema. This is a bug in Zod.");
			const idToSchema = /* @__PURE__ */ new Map();
			for (const entry of ctx.seen.entries()) {
				const id = ctx.metadataRegistry.get(entry[0])?.id;
				if (id) {
					const existing = idToSchema.get(id);
					if (existing && existing !== entry[0]) throw new Error(`Duplicate schema id "${id}" detected during JSON Schema conversion. Two different schemas cannot share the same id when converted together.`);
					idToSchema.set(id, entry[0]);
				}
			}
			const makeURI = (entry) => {
				const defsSegment = ctx.target === "draft-2020-12" ? "$defs" : "definitions";
				if (ctx.external) {
					const externalId = ctx.external.registry.get(entry[0])?.id;
					const uriGenerator = ctx.external.uri ?? ((id) => id);
					if (externalId) return { ref: uriGenerator(externalId) };
					const id = entry[1].defId ?? entry[1].schema.id ?? `schema${ctx.counter++}`;
					entry[1].defId = id;
					return {
						defId: id,
						ref: `${uriGenerator("__shared")}#/${defsSegment}/${id}`
					};
				}
				if (entry[1] === root) return { ref: "#" };
				const defUriPrefix = `#/${defsSegment}/`;
				const defId = entry[1].schema.id ?? `__schema${ctx.counter++}`;
				return {
					defId,
					ref: defUriPrefix + defId
				};
			};
			const extractToDef = (entry) => {
				if (entry[1].schema.$ref) return;
				const seen = entry[1];
				const { ref, defId } = makeURI(entry);
				seen.def = { ...seen.schema };
				if (defId) seen.defId = defId;
				const schema = seen.schema;
				for (const key in schema) delete schema[key];
				schema.$ref = ref;
			};
			if (ctx.cycles === "throw") for (const entry of ctx.seen.entries()) {
				const seen = entry[1];
				if (seen.cycle) throw new Error(`Cycle detected: #/${seen.cycle?.join("/")}/<root>

Set the \`cycles\` parameter to \`"ref"\` to resolve cyclical schemas with defs.`);
			}
			for (const entry of ctx.seen.entries()) {
				const seen = entry[1];
				if (schema === entry[0]) {
					extractToDef(entry);
					continue;
				}
				if (ctx.external) {
					const ext = ctx.external.registry.get(entry[0])?.id;
					if (schema !== entry[0] && ext) {
						extractToDef(entry);
						continue;
					}
				}
				if (ctx.metadataRegistry.get(entry[0])?.id) {
					extractToDef(entry);
					continue;
				}
				if (seen.cycle) {
					extractToDef(entry);
					continue;
				}
				if (seen.count > 1) {
					if (ctx.reused === "ref") {
						extractToDef(entry);
						continue;
					}
				}
			}
		}
		function finalize(ctx, schema) {
			const root = ctx.seen.get(schema);
			if (!root) throw new Error("Unprocessed schema. This is a bug in Zod.");
			const flattenRef = (zodSchema) => {
				const seen = ctx.seen.get(zodSchema);
				if (seen.ref === null) return;
				const schema = seen.def ?? seen.schema;
				const _cached = { ...schema };
				const ref = seen.ref;
				seen.ref = null;
				if (ref) {
					flattenRef(ref);
					const refSeen = ctx.seen.get(ref);
					const refSchema = refSeen.schema;
					if (refSchema.$ref && (ctx.target === "draft-07" || ctx.target === "draft-04" || ctx.target === "openapi-3.0")) {
						schema.allOf = schema.allOf ?? [];
						schema.allOf.push(refSchema);
					} else Object.assign(schema, refSchema);
					Object.assign(schema, _cached);
					if (zodSchema._zod.parent === ref) for (const key in schema) {
						if (key === "$ref" || key === "allOf") continue;
						if (!(key in _cached)) delete schema[key];
					}
					if (refSchema.$ref && refSeen.def) for (const key in schema) {
						if (key === "$ref" || key === "allOf") continue;
						if (key in refSeen.def && JSON.stringify(schema[key]) === JSON.stringify(refSeen.def[key])) delete schema[key];
					}
				}
				const parent = zodSchema._zod.parent;
				if (parent && parent !== ref) {
					flattenRef(parent);
					const parentSeen = ctx.seen.get(parent);
					if (parentSeen?.schema.$ref) {
						schema.$ref = parentSeen.schema.$ref;
						if (parentSeen.def) for (const key in schema) {
							if (key === "$ref" || key === "allOf") continue;
							if (key in parentSeen.def && JSON.stringify(schema[key]) === JSON.stringify(parentSeen.def[key])) delete schema[key];
						}
					}
				}
				ctx.override({
					zodSchema,
					jsonSchema: schema,
					path: seen.path ?? []
				});
			};
			for (const entry of [...ctx.seen.entries()].reverse()) flattenRef(entry[0]);
			const result = {};
			if (ctx.target === "draft-2020-12") result.$schema = "https://json-schema.org/draft/2020-12/schema";
			else if (ctx.target === "draft-07") result.$schema = "http://json-schema.org/draft-07/schema#";
			else if (ctx.target === "draft-04") result.$schema = "http://json-schema.org/draft-04/schema#";
			else if (ctx.target === "openapi-3.0") {}
			if (ctx.external?.uri) {
				const id = ctx.external.registry.get(schema)?.id;
				if (!id) throw new Error("Schema is missing an `id` property");
				result.$id = ctx.external.uri(id);
			}
			Object.assign(result, root.def ?? root.schema);
			const rootMetaId = ctx.metadataRegistry.get(schema)?.id;
			if (rootMetaId !== void 0 && result.id === rootMetaId) delete result.id;
			const defs = ctx.external?.defs ?? {};
			for (const entry of ctx.seen.entries()) {
				const seen = entry[1];
				if (seen.def && seen.defId) {
					if (seen.def.id === seen.defId) delete seen.def.id;
					defs[seen.defId] = seen.def;
				}
			}
			if (ctx.external) {} else if (Object.keys(defs).length > 0) {
				if (ctx.target === "draft-2020-12") result.$defs = defs;
				else result.definitions = defs;
			}
			try {
				const finalized = JSON.parse(JSON.stringify(result));
				Object.defineProperty(finalized, "~standard", {
					value: {
						...schema["~standard"],
						jsonSchema: {
							input: createStandardJSONSchemaMethod(schema, "input", ctx.processors),
							output: createStandardJSONSchemaMethod(schema, "output", ctx.processors)
						}
					},
					enumerable: false,
					writable: false
				});
				return finalized;
			} catch (_err) {
				throw new Error("Error converting schema to JSON.");
			}
		}
		function isTransforming(_schema, _ctx) {
			const ctx = _ctx ?? { seen: /* @__PURE__ */ new Set() };
			if (ctx.seen.has(_schema)) return false;
			ctx.seen.add(_schema);
			const def = _schema._zod.def;
			if (def.type === "transform") return true;
			if (def.type === "array") return isTransforming(def.element, ctx);
			if (def.type === "set") return isTransforming(def.valueType, ctx);
			if (def.type === "lazy") return isTransforming(def.getter(), ctx);
			if (def.type === "promise" || def.type === "optional" || def.type === "nonoptional" || def.type === "nullable" || def.type === "readonly" || def.type === "default" || def.type === "prefault") return isTransforming(def.innerType, ctx);
			if (def.type === "intersection") return isTransforming(def.left, ctx) || isTransforming(def.right, ctx);
			if (def.type === "record" || def.type === "map") return isTransforming(def.keyType, ctx) || isTransforming(def.valueType, ctx);
			if (def.type === "pipe") {
				if (_schema._zod.traits.has("$ZodCodec")) return true;
				return isTransforming(def.in, ctx) || isTransforming(def.out, ctx);
			}
			if (def.type === "object") {
				for (const key in def.shape) if (isTransforming(def.shape[key], ctx)) return true;
				return false;
			}
			if (def.type === "union") {
				for (const option of def.options) if (isTransforming(option, ctx)) return true;
				return false;
			}
			if (def.type === "tuple") {
				for (const item of def.items) if (isTransforming(item, ctx)) return true;
				if (def.rest && isTransforming(def.rest, ctx)) return true;
				return false;
			}
			return false;
		}
		/**
		* Creates a toJSONSchema method for a schema instance.
		* This encapsulates the logic of initializing context, processing, extracting defs, and finalizing.
		*/
		const createToJSONSchemaMethod = (schema, processors = {}) => (params) => {
			const ctx = initializeContext({
				...params,
				processors
			});
			process(schema, ctx);
			extractDefs(ctx, schema);
			return finalize(ctx, schema);
		};
		const createStandardJSONSchemaMethod = (schema, io, processors = {}) => (params) => {
			const { libraryOptions, target } = params ?? {};
			const ctx = initializeContext({
				...libraryOptions ?? {},
				target,
				io,
				processors
			});
			process(schema, ctx);
			extractDefs(ctx, schema);
			return finalize(ctx, schema);
		};
		//#endregion
		//#region ../../node_modules/.pnpm/zod@4.4.3/node_modules/zod/v4/core/json-schema-processors.js
		const formatMap = {
			guid: "uuid",
			url: "uri",
			datetime: "date-time",
			json_string: "json-string",
			regex: ""
		};
		const stringProcessor = (schema, ctx, _json, _params) => {
			const json = _json;
			json.type = "string";
			const { minimum, maximum, format, patterns, contentEncoding } = schema._zod.bag;
			if (typeof minimum === "number") json.minLength = minimum;
			if (typeof maximum === "number") json.maxLength = maximum;
			if (format) {
				json.format = formatMap[format] ?? format;
				if (json.format === "") delete json.format;
				if (format === "time") delete json.format;
			}
			if (contentEncoding) json.contentEncoding = contentEncoding;
			if (patterns && patterns.size > 0) {
				const regexes = [...patterns];
				if (regexes.length === 1) json.pattern = regexes[0].source;
				else if (regexes.length > 1) json.allOf = [...regexes.map((regex) => ({
					...ctx.target === "draft-07" || ctx.target === "draft-04" || ctx.target === "openapi-3.0" ? { type: "string" } : {},
					pattern: regex.source
				}))];
			}
		};
		const numberProcessor = (schema, ctx, _json, _params) => {
			const json = _json;
			const { minimum, maximum, format, multipleOf, exclusiveMaximum, exclusiveMinimum } = schema._zod.bag;
			if (typeof format === "string" && format.includes("int")) json.type = "integer";
			else json.type = "number";
			const exMin = typeof exclusiveMinimum === "number" && exclusiveMinimum >= (minimum ?? Number.NEGATIVE_INFINITY);
			const exMax = typeof exclusiveMaximum === "number" && exclusiveMaximum <= (maximum ?? Number.POSITIVE_INFINITY);
			const legacy = ctx.target === "draft-04" || ctx.target === "openapi-3.0";
			if (exMin) {
				if (legacy) {
					json.minimum = exclusiveMinimum;
					json.exclusiveMinimum = true;
				} else json.exclusiveMinimum = exclusiveMinimum;
			} else if (typeof minimum === "number") json.minimum = minimum;
			if (exMax) {
				if (legacy) {
					json.maximum = exclusiveMaximum;
					json.exclusiveMaximum = true;
				} else json.exclusiveMaximum = exclusiveMaximum;
			} else if (typeof maximum === "number") json.maximum = maximum;
			if (typeof multipleOf === "number") json.multipleOf = multipleOf;
		};
		const booleanProcessor = (_schema, _ctx, json, _params) => {
			json.type = "boolean";
		};
		const nullProcessor = (_schema, ctx, json, _params) => {
			if (ctx.target === "openapi-3.0") {
				json.type = "string";
				json.nullable = true;
				json.enum = [null];
			} else json.type = "null";
		};
		const undefinedProcessor = (_schema, ctx, _json, _params) => {
			if (ctx.unrepresentable === "throw") throw new Error("Undefined cannot be represented in JSON Schema");
		};
		const neverProcessor = (_schema, _ctx, json, _params) => {
			json.not = {};
		};
		const enumProcessor = (schema, _ctx, json, _params) => {
			const def = schema._zod.def;
			const values = getEnumValues(def.entries);
			if (values.every((v) => typeof v === "number")) json.type = "number";
			if (values.every((v) => typeof v === "string")) json.type = "string";
			json.enum = values;
		};
		const literalProcessor = (schema, ctx, json, _params) => {
			const def = schema._zod.def;
			const vals = [];
			for (const val of def.values) if (val === void 0) {
				if (ctx.unrepresentable === "throw") throw new Error("Literal `undefined` cannot be represented in JSON Schema");
			} else if (typeof val === "bigint") {
				if (ctx.unrepresentable === "throw") throw new Error("BigInt literals cannot be represented in JSON Schema");
				else vals.push(Number(val));
			} else vals.push(val);
			if (vals.length === 0) {} else if (vals.length === 1) {
				const val = vals[0];
				json.type = val === null ? "null" : typeof val;
				if (ctx.target === "draft-04" || ctx.target === "openapi-3.0") json.enum = [val];
				else json.const = val;
			} else {
				if (vals.every((v) => typeof v === "number")) json.type = "number";
				if (vals.every((v) => typeof v === "string")) json.type = "string";
				if (vals.every((v) => typeof v === "boolean")) json.type = "boolean";
				if (vals.every((v) => v === null)) json.type = "null";
				json.enum = vals;
			}
		};
		const customProcessor = (_schema, ctx, _json, _params) => {
			if (ctx.unrepresentable === "throw") throw new Error("Custom types cannot be represented in JSON Schema");
		};
		const transformProcessor = (_schema, ctx, _json, _params) => {
			if (ctx.unrepresentable === "throw") throw new Error("Transforms cannot be represented in JSON Schema");
		};
		const arrayProcessor = (schema, ctx, _json, params) => {
			const json = _json;
			const def = schema._zod.def;
			const { minimum, maximum } = schema._zod.bag;
			if (typeof minimum === "number") json.minItems = minimum;
			if (typeof maximum === "number") json.maxItems = maximum;
			json.type = "array";
			json.items = process(def.element, ctx, {
				...params,
				path: [...params.path, "items"]
			});
		};
		const objectProcessor = (schema, ctx, _json, params) => {
			const json = _json;
			const def = schema._zod.def;
			json.type = "object";
			json.properties = {};
			const shape = def.shape;
			for (const key in shape) json.properties[key] = process(shape[key], ctx, {
				...params,
				path: [
					...params.path,
					"properties",
					key
				]
			});
			const allKeys = new Set(Object.keys(shape));
			const requiredKeys = new Set([...allKeys].filter((key) => {
				const v = def.shape[key]._zod;
				if (ctx.io === "input") return v.optin === void 0;
				else return v.optout === void 0;
			}));
			if (requiredKeys.size > 0) json.required = Array.from(requiredKeys);
			if (def.catchall?._zod.def.type === "never") json.additionalProperties = false;
			else if (!def.catchall) {
				if (ctx.io === "output") json.additionalProperties = false;
			} else if (def.catchall) json.additionalProperties = process(def.catchall, ctx, {
				...params,
				path: [...params.path, "additionalProperties"]
			});
		};
		const unionProcessor = (schema, ctx, json, params) => {
			const def = schema._zod.def;
			const isExclusive = def.inclusive === false;
			const options = def.options.map((x, i) => process(x, ctx, {
				...params,
				path: [
					...params.path,
					isExclusive ? "oneOf" : "anyOf",
					i
				]
			}));
			if (isExclusive) json.oneOf = options;
			else json.anyOf = options;
		};
		const intersectionProcessor = (schema, ctx, json, params) => {
			const def = schema._zod.def;
			const a = process(def.left, ctx, {
				...params,
				path: [
					...params.path,
					"allOf",
					0
				]
			});
			const b = process(def.right, ctx, {
				...params,
				path: [
					...params.path,
					"allOf",
					1
				]
			});
			const isSimpleIntersection = (val) => "allOf" in val && Object.keys(val).length === 1;
			json.allOf = [...isSimpleIntersection(a) ? a.allOf : [a], ...isSimpleIntersection(b) ? b.allOf : [b]];
		};
		const recordProcessor = (schema, ctx, _json, params) => {
			const json = _json;
			const def = schema._zod.def;
			json.type = "object";
			const keyType = def.keyType;
			const patterns = keyType._zod.bag?.patterns;
			if (def.mode === "loose" && patterns && patterns.size > 0) {
				const valueSchema = process(def.valueType, ctx, {
					...params,
					path: [
						...params.path,
						"patternProperties",
						"*"
					]
				});
				json.patternProperties = {};
				for (const pattern of patterns) json.patternProperties[pattern.source] = valueSchema;
			} else {
				if (ctx.target === "draft-07" || ctx.target === "draft-2020-12") json.propertyNames = process(def.keyType, ctx, {
					...params,
					path: [...params.path, "propertyNames"]
				});
				json.additionalProperties = process(def.valueType, ctx, {
					...params,
					path: [...params.path, "additionalProperties"]
				});
			}
			const keyValues = keyType._zod.values;
			if (keyValues) {
				const validKeyValues = [...keyValues].filter((v) => typeof v === "string" || typeof v === "number");
				if (validKeyValues.length > 0) json.required = validKeyValues;
			}
		};
		const nullableProcessor = (schema, ctx, json, params) => {
			const def = schema._zod.def;
			const inner = process(def.innerType, ctx, params);
			const seen = ctx.seen.get(schema);
			if (ctx.target === "openapi-3.0") {
				seen.ref = def.innerType;
				json.nullable = true;
			} else json.anyOf = [inner, { type: "null" }];
		};
		const nonoptionalProcessor = (schema, ctx, _json, params) => {
			const def = schema._zod.def;
			process(def.innerType, ctx, params);
			const seen = ctx.seen.get(schema);
			seen.ref = def.innerType;
		};
		const defaultProcessor = (schema, ctx, json, params) => {
			const def = schema._zod.def;
			process(def.innerType, ctx, params);
			const seen = ctx.seen.get(schema);
			seen.ref = def.innerType;
			json.default = JSON.parse(JSON.stringify(def.defaultValue));
		};
		const prefaultProcessor = (schema, ctx, json, params) => {
			const def = schema._zod.def;
			process(def.innerType, ctx, params);
			const seen = ctx.seen.get(schema);
			seen.ref = def.innerType;
			if (ctx.io === "input") json._prefault = JSON.parse(JSON.stringify(def.defaultValue));
		};
		const catchProcessor = (schema, ctx, json, params) => {
			const def = schema._zod.def;
			process(def.innerType, ctx, params);
			const seen = ctx.seen.get(schema);
			seen.ref = def.innerType;
			let catchValue;
			try {
				catchValue = def.catchValue(void 0);
			} catch {
				throw new Error("Dynamic catch values are not supported in JSON Schema");
			}
			json.default = catchValue;
		};
		const pipeProcessor = (schema, ctx, _json, params) => {
			const def = schema._zod.def;
			const inIsTransform = def.in._zod.traits.has("$ZodTransform");
			const innerType = ctx.io === "input" ? inIsTransform ? def.out : def.in : def.out;
			process(innerType, ctx, params);
			const seen = ctx.seen.get(schema);
			seen.ref = innerType;
		};
		const readonlyProcessor = (schema, ctx, json, params) => {
			const def = schema._zod.def;
			process(def.innerType, ctx, params);
			const seen = ctx.seen.get(schema);
			seen.ref = def.innerType;
			json.readOnly = true;
		};
		const optionalProcessor = (schema, ctx, _json, params) => {
			const def = schema._zod.def;
			process(def.innerType, ctx, params);
			const seen = ctx.seen.get(schema);
			seen.ref = def.innerType;
		};
		//#endregion
		//#region ../../node_modules/.pnpm/zod@4.4.3/node_modules/zod/v4/classic/iso.js
		const ZodISODateTime = /*@__PURE__*/ $constructor("ZodISODateTime", (inst, def) => {
			$ZodISODateTime.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		function datetime(params) {
			return /* @__PURE__ */ _isoDateTime(ZodISODateTime, params);
		}
		const ZodISODate = /*@__PURE__*/ $constructor("ZodISODate", (inst, def) => {
			$ZodISODate.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		function date(params) {
			return /* @__PURE__ */ _isoDate(ZodISODate, params);
		}
		const ZodISOTime = /*@__PURE__*/ $constructor("ZodISOTime", (inst, def) => {
			$ZodISOTime.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		function time(params) {
			return /* @__PURE__ */ _isoTime(ZodISOTime, params);
		}
		const ZodISODuration = /*@__PURE__*/ $constructor("ZodISODuration", (inst, def) => {
			$ZodISODuration.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		function duration(params) {
			return /* @__PURE__ */ _isoDuration(ZodISODuration, params);
		}
		//#endregion
		//#region ../../node_modules/.pnpm/zod@4.4.3/node_modules/zod/v4/classic/errors.js
		const initializer = (inst, issues) => {
			$ZodError.init(inst, issues);
			inst.name = "ZodError";
			Object.defineProperties(inst, {
				format: { value: (mapper) => formatError(inst, mapper) },
				flatten: { value: (mapper) => flattenError(inst, mapper) },
				addIssue: { value: (issue) => {
					inst.issues.push(issue);
					inst.message = JSON.stringify(inst.issues, jsonStringifyReplacer, 2);
				} },
				addIssues: { value: (issues) => {
					inst.issues.push(...issues);
					inst.message = JSON.stringify(inst.issues, jsonStringifyReplacer, 2);
				} },
				isEmpty: { get() {
					return inst.issues.length === 0;
				} }
			});
		};
		const ZodRealError = /*@__PURE__*/ $constructor("ZodError", initializer, { Parent: Error });
		//#endregion
		//#region ../../node_modules/.pnpm/zod@4.4.3/node_modules/zod/v4/classic/parse.js
		const parse = /* @__PURE__ */ _parse(ZodRealError);
		const parseAsync = /* @__PURE__ */ _parseAsync(ZodRealError);
		const safeParse$1 = /* @__PURE__ */ _safeParse(ZodRealError);
		const safeParseAsync = /* @__PURE__ */ _safeParseAsync(ZodRealError);
		const encode = /* @__PURE__ */ _encode(ZodRealError);
		const decode = /* @__PURE__ */ _decode(ZodRealError);
		const encodeAsync = /* @__PURE__ */ _encodeAsync(ZodRealError);
		const decodeAsync = /* @__PURE__ */ _decodeAsync(ZodRealError);
		const safeEncode = /* @__PURE__ */ _safeEncode(ZodRealError);
		const safeDecode = /* @__PURE__ */ _safeDecode(ZodRealError);
		const safeEncodeAsync = /* @__PURE__ */ _safeEncodeAsync(ZodRealError);
		const safeDecodeAsync = /* @__PURE__ */ _safeDecodeAsync(ZodRealError);
		//#endregion
		//#region ../../node_modules/.pnpm/zod@4.4.3/node_modules/zod/v4/classic/schemas.js
		const _installedGroups = /* @__PURE__ */ new WeakMap();
		function _installLazyMethods(inst, group, methods) {
			const proto = Object.getPrototypeOf(inst);
			let installed = _installedGroups.get(proto);
			if (!installed) {
				installed = /* @__PURE__ */ new Set();
				_installedGroups.set(proto, installed);
			}
			if (installed.has(group)) return;
			installed.add(group);
			for (const key in methods) {
				const fn = methods[key];
				Object.defineProperty(proto, key, {
					configurable: true,
					enumerable: false,
					get() {
						const bound = fn.bind(this);
						Object.defineProperty(this, key, {
							configurable: true,
							writable: true,
							enumerable: true,
							value: bound
						});
						return bound;
					},
					set(v) {
						Object.defineProperty(this, key, {
							configurable: true,
							writable: true,
							enumerable: true,
							value: v
						});
					}
				});
			}
		}
		const ZodType = /*@__PURE__*/ $constructor("ZodType", (inst, def) => {
			$ZodType.init(inst, def);
			Object.assign(inst["~standard"], { jsonSchema: {
				input: createStandardJSONSchemaMethod(inst, "input"),
				output: createStandardJSONSchemaMethod(inst, "output")
			} });
			inst.toJSONSchema = createToJSONSchemaMethod(inst, {});
			inst.def = def;
			inst.type = def.type;
			Object.defineProperty(inst, "_def", { value: def });
			inst.parse = (data, params) => parse(inst, data, params, { callee: inst.parse });
			inst.safeParse = (data, params) => safeParse$1(inst, data, params);
			inst.parseAsync = async (data, params) => parseAsync(inst, data, params, { callee: inst.parseAsync });
			inst.safeParseAsync = async (data, params) => safeParseAsync(inst, data, params);
			inst.spa = inst.safeParseAsync;
			inst.encode = (data, params) => encode(inst, data, params);
			inst.decode = (data, params) => decode(inst, data, params);
			inst.encodeAsync = async (data, params) => encodeAsync(inst, data, params);
			inst.decodeAsync = async (data, params) => decodeAsync(inst, data, params);
			inst.safeEncode = (data, params) => safeEncode(inst, data, params);
			inst.safeDecode = (data, params) => safeDecode(inst, data, params);
			inst.safeEncodeAsync = async (data, params) => safeEncodeAsync(inst, data, params);
			inst.safeDecodeAsync = async (data, params) => safeDecodeAsync(inst, data, params);
			_installLazyMethods(inst, "ZodType", {
				check(...chks) {
					const def = this.def;
					return this.clone(mergeDefs(def, { checks: [...def.checks ?? [], ...chks.map((ch) => typeof ch === "function" ? { _zod: {
						check: ch,
						def: { check: "custom" },
						onattach: []
					} } : ch)] }), { parent: true });
				},
				with(...chks) {
					return this.check(...chks);
				},
				clone(def, params) {
					return clone(this, def, params);
				},
				brand() {
					return this;
				},
				register(reg, meta) {
					reg.add(this, meta);
					return this;
				},
				refine(check, params) {
					return this.check(refine(check, params));
				},
				superRefine(refinement, params) {
					return this.check(superRefine(refinement, params));
				},
				overwrite(fn) {
					return this.check(/* @__PURE__ */ _overwrite(fn));
				},
				optional() {
					return optional(this);
				},
				exactOptional() {
					return exactOptional(this);
				},
				nullable() {
					return nullable(this);
				},
				nullish() {
					return optional(nullable(this));
				},
				nonoptional(params) {
					return nonoptional(this, params);
				},
				array() {
					return array(this);
				},
				or(arg) {
					return union([this, arg]);
				},
				and(arg) {
					return intersection(this, arg);
				},
				transform(tx) {
					return pipe(this, transform(tx));
				},
				default(d) {
					return _default(this, d);
				},
				prefault(d) {
					return prefault(this, d);
				},
				catch(params) {
					return _catch(this, params);
				},
				pipe(target) {
					return pipe(this, target);
				},
				readonly() {
					return readonly(this);
				},
				describe(description) {
					const cl = this.clone();
					globalRegistry.add(cl, { description });
					return cl;
				},
				meta(...args) {
					if (args.length === 0) return globalRegistry.get(this);
					const cl = this.clone();
					globalRegistry.add(cl, args[0]);
					return cl;
				},
				isOptional() {
					return this.safeParse(void 0).success;
				},
				isNullable() {
					return this.safeParse(null).success;
				},
				apply(fn) {
					return fn(this);
				}
			});
			Object.defineProperty(inst, "description", {
				get() {
					return globalRegistry.get(inst)?.description;
				},
				configurable: true
			});
			return inst;
		});
		/** @internal */
		const _ZodString = /*@__PURE__*/ $constructor("_ZodString", (inst, def) => {
			$ZodString.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => stringProcessor(inst, ctx, json, params);
			const bag = inst._zod.bag;
			inst.format = bag.format ?? null;
			inst.minLength = bag.minimum ?? null;
			inst.maxLength = bag.maximum ?? null;
			_installLazyMethods(inst, "_ZodString", {
				regex(...args) {
					return this.check(/* @__PURE__ */ _regex(...args));
				},
				includes(...args) {
					return this.check(/* @__PURE__ */ _includes(...args));
				},
				startsWith(...args) {
					return this.check(/* @__PURE__ */ _startsWith(...args));
				},
				endsWith(...args) {
					return this.check(/* @__PURE__ */ _endsWith(...args));
				},
				min(...args) {
					return this.check(/* @__PURE__ */ _minLength(...args));
				},
				max(...args) {
					return this.check(/* @__PURE__ */ _maxLength(...args));
				},
				length(...args) {
					return this.check(/* @__PURE__ */ _length(...args));
				},
				nonempty(...args) {
					return this.check(/* @__PURE__ */ _minLength(1, ...args));
				},
				lowercase(params) {
					return this.check(/* @__PURE__ */ _lowercase(params));
				},
				uppercase(params) {
					return this.check(/* @__PURE__ */ _uppercase(params));
				},
				trim() {
					return this.check(/* @__PURE__ */ _trim());
				},
				normalize(...args) {
					return this.check(/* @__PURE__ */ _normalize(...args));
				},
				toLowerCase() {
					return this.check(/* @__PURE__ */ _toLowerCase());
				},
				toUpperCase() {
					return this.check(/* @__PURE__ */ _toUpperCase());
				},
				slugify() {
					return this.check(/* @__PURE__ */ _slugify());
				}
			});
		});
		const ZodString = /*@__PURE__*/ $constructor("ZodString", (inst, def) => {
			$ZodString.init(inst, def);
			_ZodString.init(inst, def);
			inst.email = (params) => inst.check(/* @__PURE__ */ _email(ZodEmail, params));
			inst.url = (params) => inst.check(/* @__PURE__ */ _url(ZodURL, params));
			inst.jwt = (params) => inst.check(/* @__PURE__ */ _jwt(ZodJWT, params));
			inst.emoji = (params) => inst.check(/* @__PURE__ */ _emoji(ZodEmoji, params));
			inst.guid = (params) => inst.check(/* @__PURE__ */ _guid(ZodGUID, params));
			inst.uuid = (params) => inst.check(/* @__PURE__ */ _uuid(ZodUUID, params));
			inst.uuidv4 = (params) => inst.check(/* @__PURE__ */ _uuidv4(ZodUUID, params));
			inst.uuidv6 = (params) => inst.check(/* @__PURE__ */ _uuidv6(ZodUUID, params));
			inst.uuidv7 = (params) => inst.check(/* @__PURE__ */ _uuidv7(ZodUUID, params));
			inst.nanoid = (params) => inst.check(/* @__PURE__ */ _nanoid(ZodNanoID, params));
			inst.guid = (params) => inst.check(/* @__PURE__ */ _guid(ZodGUID, params));
			inst.cuid = (params) => inst.check(/* @__PURE__ */ _cuid(ZodCUID, params));
			inst.cuid2 = (params) => inst.check(/* @__PURE__ */ _cuid2(ZodCUID2, params));
			inst.ulid = (params) => inst.check(/* @__PURE__ */ _ulid(ZodULID, params));
			inst.base64 = (params) => inst.check(/* @__PURE__ */ _base64(ZodBase64, params));
			inst.base64url = (params) => inst.check(/* @__PURE__ */ _base64url(ZodBase64URL, params));
			inst.xid = (params) => inst.check(/* @__PURE__ */ _xid(ZodXID, params));
			inst.ksuid = (params) => inst.check(/* @__PURE__ */ _ksuid(ZodKSUID, params));
			inst.ipv4 = (params) => inst.check(/* @__PURE__ */ _ipv4(ZodIPv4, params));
			inst.ipv6 = (params) => inst.check(/* @__PURE__ */ _ipv6(ZodIPv6, params));
			inst.cidrv4 = (params) => inst.check(/* @__PURE__ */ _cidrv4(ZodCIDRv4, params));
			inst.cidrv6 = (params) => inst.check(/* @__PURE__ */ _cidrv6(ZodCIDRv6, params));
			inst.e164 = (params) => inst.check(/* @__PURE__ */ _e164(ZodE164, params));
			inst.datetime = (params) => inst.check(datetime(params));
			inst.date = (params) => inst.check(date(params));
			inst.time = (params) => inst.check(time(params));
			inst.duration = (params) => inst.check(duration(params));
		});
		function string(params) {
			return /* @__PURE__ */ _string(ZodString, params);
		}
		const ZodStringFormat = /*@__PURE__*/ $constructor("ZodStringFormat", (inst, def) => {
			$ZodStringFormat.init(inst, def);
			_ZodString.init(inst, def);
		});
		const ZodEmail = /*@__PURE__*/ $constructor("ZodEmail", (inst, def) => {
			$ZodEmail.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		const ZodGUID = /*@__PURE__*/ $constructor("ZodGUID", (inst, def) => {
			$ZodGUID.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		const ZodUUID = /*@__PURE__*/ $constructor("ZodUUID", (inst, def) => {
			$ZodUUID.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		const ZodURL = /*@__PURE__*/ $constructor("ZodURL", (inst, def) => {
			$ZodURL.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		const ZodEmoji = /*@__PURE__*/ $constructor("ZodEmoji", (inst, def) => {
			$ZodEmoji.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		const ZodNanoID = /*@__PURE__*/ $constructor("ZodNanoID", (inst, def) => {
			$ZodNanoID.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		/**
		* @deprecated CUID v1 is deprecated by its authors due to information leakage
		* (timestamps embedded in the id). Use {@link ZodCUID2} instead.
		* See https://github.com/paralleldrive/cuid.
		*/
		const ZodCUID = /*@__PURE__*/ $constructor("ZodCUID", (inst, def) => {
			$ZodCUID.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		const ZodCUID2 = /*@__PURE__*/ $constructor("ZodCUID2", (inst, def) => {
			$ZodCUID2.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		const ZodULID = /*@__PURE__*/ $constructor("ZodULID", (inst, def) => {
			$ZodULID.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		const ZodXID = /*@__PURE__*/ $constructor("ZodXID", (inst, def) => {
			$ZodXID.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		const ZodKSUID = /*@__PURE__*/ $constructor("ZodKSUID", (inst, def) => {
			$ZodKSUID.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		const ZodIPv4 = /*@__PURE__*/ $constructor("ZodIPv4", (inst, def) => {
			$ZodIPv4.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		const ZodIPv6 = /*@__PURE__*/ $constructor("ZodIPv6", (inst, def) => {
			$ZodIPv6.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		const ZodCIDRv4 = /*@__PURE__*/ $constructor("ZodCIDRv4", (inst, def) => {
			$ZodCIDRv4.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		const ZodCIDRv6 = /*@__PURE__*/ $constructor("ZodCIDRv6", (inst, def) => {
			$ZodCIDRv6.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		const ZodBase64 = /*@__PURE__*/ $constructor("ZodBase64", (inst, def) => {
			$ZodBase64.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		const ZodBase64URL = /*@__PURE__*/ $constructor("ZodBase64URL", (inst, def) => {
			$ZodBase64URL.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		const ZodE164 = /*@__PURE__*/ $constructor("ZodE164", (inst, def) => {
			$ZodE164.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		const ZodJWT = /*@__PURE__*/ $constructor("ZodJWT", (inst, def) => {
			$ZodJWT.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		const ZodNumber = /*@__PURE__*/ $constructor("ZodNumber", (inst, def) => {
			$ZodNumber.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => numberProcessor(inst, ctx, json, params);
			_installLazyMethods(inst, "ZodNumber", {
				gt(value, params) {
					return this.check(/* @__PURE__ */ _gt(value, params));
				},
				gte(value, params) {
					return this.check(/* @__PURE__ */ _gte(value, params));
				},
				min(value, params) {
					return this.check(/* @__PURE__ */ _gte(value, params));
				},
				lt(value, params) {
					return this.check(/* @__PURE__ */ _lt(value, params));
				},
				lte(value, params) {
					return this.check(/* @__PURE__ */ _lte(value, params));
				},
				max(value, params) {
					return this.check(/* @__PURE__ */ _lte(value, params));
				},
				int(params) {
					return this.check(int(params));
				},
				safe(params) {
					return this.check(int(params));
				},
				positive(params) {
					return this.check(/* @__PURE__ */ _gt(0, params));
				},
				nonnegative(params) {
					return this.check(/* @__PURE__ */ _gte(0, params));
				},
				negative(params) {
					return this.check(/* @__PURE__ */ _lt(0, params));
				},
				nonpositive(params) {
					return this.check(/* @__PURE__ */ _lte(0, params));
				},
				multipleOf(value, params) {
					return this.check(/* @__PURE__ */ _multipleOf(value, params));
				},
				step(value, params) {
					return this.check(/* @__PURE__ */ _multipleOf(value, params));
				},
				finite() {
					return this;
				}
			});
			const bag = inst._zod.bag;
			inst.minValue = Math.max(bag.minimum ?? Number.NEGATIVE_INFINITY, bag.exclusiveMinimum ?? Number.NEGATIVE_INFINITY) ?? null;
			inst.maxValue = Math.min(bag.maximum ?? Number.POSITIVE_INFINITY, bag.exclusiveMaximum ?? Number.POSITIVE_INFINITY) ?? null;
			inst.isInt = (bag.format ?? "").includes("int") || Number.isSafeInteger(bag.multipleOf ?? .5);
			inst.isFinite = true;
			inst.format = bag.format ?? null;
		});
		function number(params) {
			return /* @__PURE__ */ _number(ZodNumber, params);
		}
		const ZodNumberFormat = /*@__PURE__*/ $constructor("ZodNumberFormat", (inst, def) => {
			$ZodNumberFormat.init(inst, def);
			ZodNumber.init(inst, def);
		});
		function int(params) {
			return /* @__PURE__ */ _int(ZodNumberFormat, params);
		}
		const ZodBoolean = /*@__PURE__*/ $constructor("ZodBoolean", (inst, def) => {
			$ZodBoolean.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => booleanProcessor(inst, ctx, json, params);
		});
		function boolean(params) {
			return /* @__PURE__ */ _boolean(ZodBoolean, params);
		}
		const ZodUndefined = /*@__PURE__*/ $constructor("ZodUndefined", (inst, def) => {
			$ZodUndefined.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => undefinedProcessor(inst, ctx, json, params);
		});
		function _undefined(params) {
			return /* @__PURE__ */ _undefined$1(ZodUndefined, params);
		}
		const ZodNull = /*@__PURE__*/ $constructor("ZodNull", (inst, def) => {
			$ZodNull.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => nullProcessor(inst, ctx, json, params);
		});
		function _null(params) {
			return /* @__PURE__ */ _null$1(ZodNull, params);
		}
		const ZodAny = /*@__PURE__*/ $constructor("ZodAny", (inst, def) => {
			$ZodAny.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => void 0;
		});
		function any() {
			return /* @__PURE__ */ _any(ZodAny);
		}
		const ZodUnknown = /*@__PURE__*/ $constructor("ZodUnknown", (inst, def) => {
			$ZodUnknown.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => void 0;
		});
		function unknown() {
			return /* @__PURE__ */ _unknown(ZodUnknown);
		}
		const ZodNever = /*@__PURE__*/ $constructor("ZodNever", (inst, def) => {
			$ZodNever.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => neverProcessor(inst, ctx, json, params);
		});
		function never(params) {
			return /* @__PURE__ */ _never(ZodNever, params);
		}
		const ZodArray = /*@__PURE__*/ $constructor("ZodArray", (inst, def) => {
			$ZodArray.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => arrayProcessor(inst, ctx, json, params);
			inst.element = def.element;
			_installLazyMethods(inst, "ZodArray", {
				min(n, params) {
					return this.check(/* @__PURE__ */ _minLength(n, params));
				},
				nonempty(params) {
					return this.check(/* @__PURE__ */ _minLength(1, params));
				},
				max(n, params) {
					return this.check(/* @__PURE__ */ _maxLength(n, params));
				},
				length(n, params) {
					return this.check(/* @__PURE__ */ _length(n, params));
				},
				unwrap() {
					return this.element;
				}
			});
		});
		function array(element, params) {
			return /* @__PURE__ */ _array(ZodArray, element, params);
		}
		const ZodObject = /*@__PURE__*/ $constructor("ZodObject", (inst, def) => {
			$ZodObjectJIT.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => objectProcessor(inst, ctx, json, params);
			defineLazy(inst, "shape", () => {
				return def.shape;
			});
			_installLazyMethods(inst, "ZodObject", {
				keyof() {
					return _enum(Object.keys(this._zod.def.shape));
				},
				catchall(catchall) {
					return this.clone({
						...this._zod.def,
						catchall
					});
				},
				passthrough() {
					return this.clone({
						...this._zod.def,
						catchall: unknown()
					});
				},
				loose() {
					return this.clone({
						...this._zod.def,
						catchall: unknown()
					});
				},
				strict() {
					return this.clone({
						...this._zod.def,
						catchall: never()
					});
				},
				strip() {
					return this.clone({
						...this._zod.def,
						catchall: void 0
					});
				},
				extend(incoming) {
					return extend(this, incoming);
				},
				safeExtend(incoming) {
					return safeExtend(this, incoming);
				},
				merge(other) {
					return merge(this, other);
				},
				pick(mask) {
					return pick(this, mask);
				},
				omit(mask) {
					return omit(this, mask);
				},
				partial(...args) {
					return partial(ZodOptional, this, args[0]);
				},
				required(...args) {
					return required(ZodNonOptional, this, args[0]);
				}
			});
		});
		function object(shape, params) {
			const def = {
				type: "object",
				shape: shape ?? {},
				...normalizeParams(params)
			};
			return new ZodObject(def);
		}
		function looseObject(shape, params) {
			return new ZodObject({
				type: "object",
				shape,
				catchall: unknown(),
				...normalizeParams(params)
			});
		}
		const ZodUnion = /*@__PURE__*/ $constructor("ZodUnion", (inst, def) => {
			$ZodUnion.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => unionProcessor(inst, ctx, json, params);
			inst.options = def.options;
		});
		function union(options, params) {
			return new ZodUnion({
				type: "union",
				options,
				...normalizeParams(params)
			});
		}
		const ZodDiscriminatedUnion = /*@__PURE__*/ $constructor("ZodDiscriminatedUnion", (inst, def) => {
			ZodUnion.init(inst, def);
			$ZodDiscriminatedUnion.init(inst, def);
		});
		function discriminatedUnion(discriminator, options, params) {
			return new ZodDiscriminatedUnion({
				type: "union",
				options,
				discriminator,
				...normalizeParams(params)
			});
		}
		const ZodIntersection = /*@__PURE__*/ $constructor("ZodIntersection", (inst, def) => {
			$ZodIntersection.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => intersectionProcessor(inst, ctx, json, params);
		});
		function intersection(left, right) {
			return new ZodIntersection({
				type: "intersection",
				left,
				right
			});
		}
		const ZodRecord = /*@__PURE__*/ $constructor("ZodRecord", (inst, def) => {
			$ZodRecord.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => recordProcessor(inst, ctx, json, params);
			inst.keyType = def.keyType;
			inst.valueType = def.valueType;
		});
		function record$1(keyType, valueType, params) {
			if (!valueType || !valueType._zod) return new ZodRecord({
				type: "record",
				keyType: string(),
				valueType: keyType,
				...normalizeParams(valueType)
			});
			return new ZodRecord({
				type: "record",
				keyType,
				valueType,
				...normalizeParams(params)
			});
		}
		const ZodEnum = /*@__PURE__*/ $constructor("ZodEnum", (inst, def) => {
			$ZodEnum.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => enumProcessor(inst, ctx, json, params);
			inst.enum = def.entries;
			inst.options = Object.values(def.entries);
			const keys = new Set(Object.keys(def.entries));
			inst.extract = (values, params) => {
				const newEntries = {};
				for (const value of values) if (keys.has(value)) newEntries[value] = def.entries[value];
				else throw new Error(`Key ${value} not found in enum`);
				return new ZodEnum({
					...def,
					checks: [],
					...normalizeParams(params),
					entries: newEntries
				});
			};
			inst.exclude = (values, params) => {
				const newEntries = { ...def.entries };
				for (const value of values) if (keys.has(value)) delete newEntries[value];
				else throw new Error(`Key ${value} not found in enum`);
				return new ZodEnum({
					...def,
					checks: [],
					...normalizeParams(params),
					entries: newEntries
				});
			};
		});
		function _enum(values, params) {
			const entries = Array.isArray(values) ? Object.fromEntries(values.map((v) => [v, v])) : values;
			return new ZodEnum({
				type: "enum",
				entries,
				...normalizeParams(params)
			});
		}
		const ZodLiteral = /*@__PURE__*/ $constructor("ZodLiteral", (inst, def) => {
			$ZodLiteral.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => literalProcessor(inst, ctx, json, params);
			inst.values = new Set(def.values);
			Object.defineProperty(inst, "value", { get() {
				if (def.values.length > 1) throw new Error("This schema contains multiple valid literal values. Use `.values` instead.");
				return def.values[0];
			} });
		});
		function literal(value, params) {
			return new ZodLiteral({
				type: "literal",
				values: Array.isArray(value) ? value : [value],
				...normalizeParams(params)
			});
		}
		const ZodTransform = /*@__PURE__*/ $constructor("ZodTransform", (inst, def) => {
			$ZodTransform.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => transformProcessor(inst, ctx, json, params);
			inst._zod.parse = (payload, _ctx) => {
				if (_ctx.direction === "backward") throw new $ZodEncodeError(inst.constructor.name);
				payload.addIssue = (issue$1) => {
					if (typeof issue$1 === "string") payload.issues.push(issue(issue$1, payload.value, def));
					else {
						const _issue = issue$1;
						if (_issue.fatal) _issue.continue = false;
						_issue.code ?? (_issue.code = "custom");
						_issue.input ?? (_issue.input = payload.value);
						_issue.inst ?? (_issue.inst = inst);
						payload.issues.push(issue(_issue));
					}
				};
				const output = def.transform(payload.value, payload);
				if (output instanceof Promise) return output.then((output) => {
					payload.value = output;
					payload.fallback = true;
					return payload;
				});
				payload.value = output;
				payload.fallback = true;
				return payload;
			};
		});
		function transform(fn) {
			return new ZodTransform({
				type: "transform",
				transform: fn
			});
		}
		const ZodOptional = /*@__PURE__*/ $constructor("ZodOptional", (inst, def) => {
			$ZodOptional.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => optionalProcessor(inst, ctx, json, params);
			inst.unwrap = () => inst._zod.def.innerType;
		});
		function optional(innerType) {
			return new ZodOptional({
				type: "optional",
				innerType
			});
		}
		const ZodExactOptional = /*@__PURE__*/ $constructor("ZodExactOptional", (inst, def) => {
			$ZodExactOptional.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => optionalProcessor(inst, ctx, json, params);
			inst.unwrap = () => inst._zod.def.innerType;
		});
		function exactOptional(innerType) {
			return new ZodExactOptional({
				type: "optional",
				innerType
			});
		}
		const ZodNullable = /*@__PURE__*/ $constructor("ZodNullable", (inst, def) => {
			$ZodNullable.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => nullableProcessor(inst, ctx, json, params);
			inst.unwrap = () => inst._zod.def.innerType;
		});
		function nullable(innerType) {
			return new ZodNullable({
				type: "nullable",
				innerType
			});
		}
		const ZodDefault = /*@__PURE__*/ $constructor("ZodDefault", (inst, def) => {
			$ZodDefault.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => defaultProcessor(inst, ctx, json, params);
			inst.unwrap = () => inst._zod.def.innerType;
			inst.removeDefault = inst.unwrap;
		});
		function _default(innerType, defaultValue) {
			return new ZodDefault({
				type: "default",
				innerType,
				get defaultValue() {
					return typeof defaultValue === "function" ? defaultValue() : shallowClone(defaultValue);
				}
			});
		}
		const ZodPrefault = /*@__PURE__*/ $constructor("ZodPrefault", (inst, def) => {
			$ZodPrefault.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => prefaultProcessor(inst, ctx, json, params);
			inst.unwrap = () => inst._zod.def.innerType;
		});
		function prefault(innerType, defaultValue) {
			return new ZodPrefault({
				type: "prefault",
				innerType,
				get defaultValue() {
					return typeof defaultValue === "function" ? defaultValue() : shallowClone(defaultValue);
				}
			});
		}
		const ZodNonOptional = /*@__PURE__*/ $constructor("ZodNonOptional", (inst, def) => {
			$ZodNonOptional.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => nonoptionalProcessor(inst, ctx, json, params);
			inst.unwrap = () => inst._zod.def.innerType;
		});
		function nonoptional(innerType, params) {
			return new ZodNonOptional({
				type: "nonoptional",
				innerType,
				...normalizeParams(params)
			});
		}
		const ZodCatch = /*@__PURE__*/ $constructor("ZodCatch", (inst, def) => {
			$ZodCatch.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => catchProcessor(inst, ctx, json, params);
			inst.unwrap = () => inst._zod.def.innerType;
			inst.removeCatch = inst.unwrap;
		});
		function _catch(innerType, catchValue) {
			return new ZodCatch({
				type: "catch",
				innerType,
				catchValue: typeof catchValue === "function" ? catchValue : () => catchValue
			});
		}
		const ZodPipe = /*@__PURE__*/ $constructor("ZodPipe", (inst, def) => {
			$ZodPipe.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => pipeProcessor(inst, ctx, json, params);
			inst.in = def.in;
			inst.out = def.out;
		});
		function pipe(in_, out) {
			return new ZodPipe({
				type: "pipe",
				in: in_,
				out
			});
		}
		const ZodPreprocess = /*@__PURE__*/ $constructor("ZodPreprocess", (inst, def) => {
			ZodPipe.init(inst, def);
			$ZodPreprocess.init(inst, def);
		});
		const ZodReadonly = /*@__PURE__*/ $constructor("ZodReadonly", (inst, def) => {
			$ZodReadonly.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => readonlyProcessor(inst, ctx, json, params);
			inst.unwrap = () => inst._zod.def.innerType;
		});
		function readonly(innerType) {
			return new ZodReadonly({
				type: "readonly",
				innerType
			});
		}
		const ZodCustom = /*@__PURE__*/ $constructor("ZodCustom", (inst, def) => {
			$ZodCustom.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => customProcessor(inst, ctx, json, params);
		});
		function custom(fn, _params) {
			return /* @__PURE__ */ _custom(ZodCustom, fn ?? (() => true), _params);
		}
		function refine(fn, _params = {}) {
			return /* @__PURE__ */ _refine(ZodCustom, fn, _params);
		}
		function superRefine(fn, params) {
			return /* @__PURE__ */ _superRefine(fn, params);
		}
		function preprocess(fn, schema) {
			return new ZodPreprocess({
				type: "pipe",
				in: transform(fn),
				out: schema
			});
		}
		//#endregion
		//#region ../../node_modules/.pnpm/@modelcontextprotocol+sdk@1.30.0_zod@4.4.3/node_modules/@modelcontextprotocol/sdk/dist/esm/types.js
		const RELATED_TASK_META_KEY = "io.modelcontextprotocol/related-task";
		/**
		* Assert 'object' type schema.
		*
		* @internal
		*/
		const AssertObjectSchema = custom((v) => v !== null && (typeof v === "object" || typeof v === "function"));
		/**
		* A progress token, used to associate progress notifications with the original request.
		*/
		const ProgressTokenSchema = union([string(), number().int()]);
		/**
		* An opaque token used to represent a cursor for pagination.
		*/
		const CursorSchema = string();
		looseObject({
			/**
			* Requested duration in milliseconds to retain task from creation.
			*/
			ttl: number().optional(),
			/**
			* Time in milliseconds to wait between task status requests.
			*/
			pollInterval: number().optional()
		});
		const TaskMetadataSchema = object({ ttl: number().optional() });
		/**
		* Metadata for associating messages with a task.
		* Include this in the `_meta` field under the key `io.modelcontextprotocol/related-task`.
		*/
		const RelatedTaskMetadataSchema = object({ taskId: string() });
		const RequestMetaSchema = looseObject({
			/**
			* If specified, the caller is requesting out-of-band progress notifications for this request (as represented by notifications/progress). The value of this parameter is an opaque token that will be attached to any subsequent notifications. The receiver is not obligated to provide these notifications.
			*/
			progressToken: ProgressTokenSchema.optional(),
			/**
			* If specified, this request is related to the provided task.
			*/
			[RELATED_TASK_META_KEY]: RelatedTaskMetadataSchema.optional()
		});
		/**
		* Common params for any request.
		*/
		const BaseRequestParamsSchema = object({ 
		/**
		* See [General fields: `_meta`](/specification/draft/basic/index#meta) for notes on `_meta` usage.
		*/
_meta: RequestMetaSchema.optional() });
		/**
		* Common params for any task-augmented request.
		*/
		const TaskAugmentedRequestParamsSchema = BaseRequestParamsSchema.extend({ 
		/**
		* If specified, the caller is requesting task-augmented execution for this request.
		* The request will return a CreateTaskResult immediately, and the actual result can be
		* retrieved later via tasks/result.
		*
		* Task augmentation is subject to capability negotiation - receivers MUST declare support
		* for task augmentation of specific request types in their capabilities.
		*/
task: TaskMetadataSchema.optional() });
		/**
		* Checks if a value is a valid TaskAugmentedRequestParams.
		* @param value - The value to check.
		*
		* @returns True if the value is a valid TaskAugmentedRequestParams, false otherwise.
		*/
		const isTaskAugmentedRequestParams = (value) => TaskAugmentedRequestParamsSchema.safeParse(value).success;
		const RequestSchema = object({
			method: string(),
			params: BaseRequestParamsSchema.loose().optional()
		});
		const NotificationsParamsSchema = object({ 
		/**
		* See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
		* for notes on _meta usage.
		*/
_meta: RequestMetaSchema.optional() });
		const NotificationSchema = object({
			method: string(),
			params: NotificationsParamsSchema.loose().optional()
		});
		const ResultSchema = looseObject({ 
		/**
		* See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
		* for notes on _meta usage.
		*/
_meta: RequestMetaSchema.optional() });
		/**
		* A uniquely identifying ID for a request in JSON-RPC.
		*/
		const RequestIdSchema = union([string(), number().int()]);
		/**
		* A request that expects a response.
		*/
		const JSONRPCRequestSchema = object({
			jsonrpc: literal("2.0"),
			id: RequestIdSchema,
			...RequestSchema.shape
		}).strict();
		const isJSONRPCRequest = (value) => JSONRPCRequestSchema.safeParse(value).success;
		/**
		* A notification which does not expect a response.
		*/
		const JSONRPCNotificationSchema = object({
			jsonrpc: literal("2.0"),
			...NotificationSchema.shape
		}).strict();
		const isJSONRPCNotification = (value) => JSONRPCNotificationSchema.safeParse(value).success;
		/**
		* A successful (non-error) response to a request.
		*/
		const JSONRPCResultResponseSchema = object({
			jsonrpc: literal("2.0"),
			id: RequestIdSchema,
			result: ResultSchema
		}).strict();
		/**
		* Checks if a value is a valid JSONRPCResultResponse.
		* @param value - The value to check.
		*
		* @returns True if the value is a valid JSONRPCResultResponse, false otherwise.
		*/
		const isJSONRPCResultResponse = (value) => JSONRPCResultResponseSchema.safeParse(value).success;
		/**
		* Error codes defined by the JSON-RPC specification.
		*/
		var ErrorCode;
		(function(ErrorCode) {
			ErrorCode[ErrorCode["ConnectionClosed"] = -32e3] = "ConnectionClosed";
			ErrorCode[ErrorCode["RequestTimeout"] = -32001] = "RequestTimeout";
			ErrorCode[ErrorCode["ParseError"] = -32700] = "ParseError";
			ErrorCode[ErrorCode["InvalidRequest"] = -32600] = "InvalidRequest";
			ErrorCode[ErrorCode["MethodNotFound"] = -32601] = "MethodNotFound";
			ErrorCode[ErrorCode["InvalidParams"] = -32602] = "InvalidParams";
			ErrorCode[ErrorCode["InternalError"] = -32603] = "InternalError";
			ErrorCode[ErrorCode["UrlElicitationRequired"] = -32042] = "UrlElicitationRequired";
		})(ErrorCode || (ErrorCode = {}));
		/**
		* A response to a request that indicates an error occurred.
		*/
		const JSONRPCErrorResponseSchema = object({
			jsonrpc: literal("2.0"),
			id: RequestIdSchema.optional(),
			error: object({
				/**
				* The error type that occurred.
				*/
				code: number().int(),
				/**
				* A short description of the error. The message SHOULD be limited to a concise single sentence.
				*/
				message: string(),
				/**
				* Additional information about the error. The value of this member is defined by the sender (e.g. detailed error information, nested errors etc.).
				*/
				data: unknown().optional()
			})
		}).strict();
		/**
		* Checks if a value is a valid JSONRPCErrorResponse.
		* @param value - The value to check.
		*
		* @returns True if the value is a valid JSONRPCErrorResponse, false otherwise.
		*/
		const isJSONRPCErrorResponse = (value) => JSONRPCErrorResponseSchema.safeParse(value).success;
		const JSONRPCMessageSchema = union([
			JSONRPCRequestSchema,
			JSONRPCNotificationSchema,
			JSONRPCResultResponseSchema,
			JSONRPCErrorResponseSchema
		]);
		union([JSONRPCResultResponseSchema, JSONRPCErrorResponseSchema]);
		/**
		* A response that indicates success but carries no data.
		*/
		const EmptyResultSchema = ResultSchema.strict();
		const CancelledNotificationParamsSchema = NotificationsParamsSchema.extend({
			/**
			* The ID of the request to cancel.
			*
			* This MUST correspond to the ID of a request previously issued in the same direction.
			*/
			requestId: RequestIdSchema.optional(),
			/**
			* An optional string describing the reason for the cancellation. This MAY be logged or presented to the user.
			*/
			reason: string().optional()
		});
		/**
		* This notification can be sent by either side to indicate that it is cancelling a previously-issued request.
		*
		* The request SHOULD still be in-flight, but due to communication latency, it is always possible that this notification MAY arrive after the request has already finished.
		*
		* This notification indicates that the result will be unused, so any associated processing SHOULD cease.
		*
		* A client MUST NOT attempt to cancel its `initialize` request.
		*/
		const CancelledNotificationSchema = NotificationSchema.extend({
			method: literal("notifications/cancelled"),
			params: CancelledNotificationParamsSchema
		});
		/**
		* Base schema to add `icons` property.
		*
		*/
		const IconsSchema = object({ 
		/**
		* Optional set of sized icons that the client can display in a user interface.
		*
		* Clients that support rendering icons MUST support at least the following MIME types:
		* - `image/png` - PNG images (safe, universal compatibility)
		* - `image/jpeg` (and `image/jpg`) - JPEG images (safe, universal compatibility)
		*
		* Clients that support rendering icons SHOULD also support:
		* - `image/svg+xml` - SVG images (scalable but requires security precautions)
		* - `image/webp` - WebP images (modern, efficient format)
		*/
icons: array(object({
			/**
			* URL or data URI for the icon.
			*/
			src: string(),
			/**
			* Optional MIME type for the icon.
			*/
			mimeType: string().optional(),
			/**
			* Optional array of strings that specify sizes at which the icon can be used.
			* Each string should be in WxH format (e.g., `"48x48"`, `"96x96"`) or `"any"` for scalable formats like SVG.
			*
			* If not provided, the client should assume that the icon can be used at any size.
			*/
			sizes: array(string()).optional(),
			/**
			* Optional specifier for the theme this icon is designed for. `light` indicates
			* the icon is designed to be used with a light background, and `dark` indicates
			* the icon is designed to be used with a dark background.
			*
			* If not provided, the client should assume the icon can be used with any theme.
			*/
			theme: _enum(["light", "dark"]).optional()
		})).optional() });
		/**
		* Base metadata interface for common properties across resources, tools, prompts, and implementations.
		*/
		const BaseMetadataSchema = object({
			/** Intended for programmatic or logical use, but used as a display name in past specs or fallback */
			name: string(),
			/**
			* Intended for UI and end-user contexts — optimized to be human-readable and easily understood,
			* even by those unfamiliar with domain-specific terminology.
			*
			* If not provided, the name should be used for display (except for Tool,
			* where `annotations.title` should be given precedence over using `name`,
			* if present).
			*/
			title: string().optional()
		});
		/**
		* Describes the name and version of an MCP implementation.
		*/
		const ImplementationSchema = BaseMetadataSchema.extend({
			...BaseMetadataSchema.shape,
			...IconsSchema.shape,
			version: string(),
			/**
			* An optional URL of the website for this implementation.
			*/
			websiteUrl: string().optional(),
			/**
			* An optional human-readable description of what this implementation does.
			*
			* This can be used by clients or servers to provide context about their purpose
			* and capabilities. For example, a server might describe the types of resources
			* or tools it provides, while a client might describe its intended use case.
			*/
			description: string().optional()
		});
		const ElicitationCapabilitySchema = preprocess((value) => {
			if (value && typeof value === "object" && !Array.isArray(value)) {
				if (Object.keys(value).length === 0) return { form: {} };
			}
			return value;
		}, intersection(object({
			form: intersection(object({ applyDefaults: boolean().optional() }), record$1(string(), unknown())).optional(),
			url: AssertObjectSchema.optional()
		}), record$1(string(), unknown()).optional()));
		/**
		* Task capabilities for clients, indicating which request types support task creation.
		*/
		const ClientTasksCapabilitySchema = looseObject({
			/**
			* Present if the client supports listing tasks.
			*/
			list: AssertObjectSchema.optional(),
			/**
			* Present if the client supports cancelling tasks.
			*/
			cancel: AssertObjectSchema.optional(),
			/**
			* Capabilities for task creation on specific request types.
			*/
			requests: looseObject({
				/**
				* Task support for sampling requests.
				*/
				sampling: looseObject({ createMessage: AssertObjectSchema.optional() }).optional(),
				/**
				* Task support for elicitation requests.
				*/
				elicitation: looseObject({ create: AssertObjectSchema.optional() }).optional()
			}).optional()
		});
		/**
		* Task capabilities for servers, indicating which request types support task creation.
		*/
		const ServerTasksCapabilitySchema = looseObject({
			/**
			* Present if the server supports listing tasks.
			*/
			list: AssertObjectSchema.optional(),
			/**
			* Present if the server supports cancelling tasks.
			*/
			cancel: AssertObjectSchema.optional(),
			/**
			* Capabilities for task creation on specific request types.
			*/
			requests: looseObject({ 
			/**
			* Task support for tool requests.
			*/
tools: looseObject({ call: AssertObjectSchema.optional() }).optional() }).optional()
		});
		/**
		* Capabilities a client may support. Known capabilities are defined here, in this schema, but this is not a closed set: any client can define its own, additional capabilities.
		*/
		const ClientCapabilitiesSchema = object({
			/**
			* Experimental, non-standard capabilities that the client supports.
			*/
			experimental: record$1(string(), AssertObjectSchema).optional(),
			/**
			* Present if the client supports sampling from an LLM.
			*/
			sampling: object({
				/**
				* Present if the client supports context inclusion via includeContext parameter.
				* If not declared, servers SHOULD only use `includeContext: "none"` (or omit it).
				*/
				context: AssertObjectSchema.optional(),
				/**
				* Present if the client supports tool use via tools and toolChoice parameters.
				*/
				tools: AssertObjectSchema.optional()
			}).optional(),
			/**
			* Present if the client supports eliciting user input.
			*/
			elicitation: ElicitationCapabilitySchema.optional(),
			/**
			* Present if the client supports listing roots.
			*/
			roots: object({ 
			/**
			* Whether the client supports issuing notifications for changes to the roots list.
			*/
listChanged: boolean().optional() }).optional(),
			/**
			* Present if the client supports task creation.
			*/
			tasks: ClientTasksCapabilitySchema.optional(),
			/**
			* Extensions that the client supports. Keys are extension identifiers (vendor-prefix/extension-name).
			*/
			extensions: record$1(string(), AssertObjectSchema).optional()
		});
		const InitializeRequestParamsSchema = BaseRequestParamsSchema.extend({
			/**
			* The latest version of the Model Context Protocol that the client supports. The client MAY decide to support older versions as well.
			*/
			protocolVersion: string(),
			capabilities: ClientCapabilitiesSchema,
			clientInfo: ImplementationSchema
		});
		/**
		* This request is sent from the client to the server when it first connects, asking it to begin initialization.
		*/
		const InitializeRequestSchema = RequestSchema.extend({
			method: literal("initialize"),
			params: InitializeRequestParamsSchema
		});
		/**
		* Capabilities that a server may support. Known capabilities are defined here, in this schema, but this is not a closed set: any server can define its own, additional capabilities.
		*/
		const ServerCapabilitiesSchema = object({
			/**
			* Experimental, non-standard capabilities that the server supports.
			*/
			experimental: record$1(string(), AssertObjectSchema).optional(),
			/**
			* Present if the server supports sending log messages to the client.
			*/
			logging: AssertObjectSchema.optional(),
			/**
			* Present if the server supports sending completions to the client.
			*/
			completions: AssertObjectSchema.optional(),
			/**
			* Present if the server offers any prompt templates.
			*/
			prompts: object({ 
			/**
			* Whether this server supports issuing notifications for changes to the prompt list.
			*/
listChanged: boolean().optional() }).optional(),
			/**
			* Present if the server offers any resources to read.
			*/
			resources: object({
				/**
				* Whether this server supports clients subscribing to resource updates.
				*/
				subscribe: boolean().optional(),
				/**
				* Whether this server supports issuing notifications for changes to the resource list.
				*/
				listChanged: boolean().optional()
			}).optional(),
			/**
			* Present if the server offers any tools to call.
			*/
			tools: object({ 
			/**
			* Whether this server supports issuing notifications for changes to the tool list.
			*/
listChanged: boolean().optional() }).optional(),
			/**
			* Present if the server supports task creation.
			*/
			tasks: ServerTasksCapabilitySchema.optional(),
			/**
			* Extensions that the server supports. Keys are extension identifiers (vendor-prefix/extension-name).
			*/
			extensions: record$1(string(), AssertObjectSchema).optional()
		});
		/**
		* After receiving an initialize request from the client, the server sends this response.
		*/
		const InitializeResultSchema = ResultSchema.extend({
			/**
			* The version of the Model Context Protocol that the server wants to use. This may not match the version that the client requested. If the client cannot support this version, it MUST disconnect.
			*/
			protocolVersion: string(),
			capabilities: ServerCapabilitiesSchema,
			serverInfo: ImplementationSchema,
			/**
			* Instructions describing how to use the server and its features.
			*
			* This can be used by clients to improve the LLM's understanding of available tools, resources, etc. It can be thought of like a "hint" to the model. For example, this information MAY be added to the system prompt.
			*/
			instructions: string().optional()
		});
		/**
		* This notification is sent from the client to the server after initialization has finished.
		*/
		const InitializedNotificationSchema = NotificationSchema.extend({
			method: literal("notifications/initialized"),
			params: NotificationsParamsSchema.optional()
		});
		/**
		* A ping, issued by either the server or the client, to check that the other party is still alive. The receiver must promptly respond, or else may be disconnected.
		*/
		const PingRequestSchema = RequestSchema.extend({
			method: literal("ping"),
			params: BaseRequestParamsSchema.optional()
		});
		const ProgressSchema = object({
			/**
			* The progress thus far. This should increase every time progress is made, even if the total is unknown.
			*/
			progress: number(),
			/**
			* Total number of items to process (or total progress required), if known.
			*/
			total: optional(number()),
			/**
			* An optional message describing the current progress.
			*/
			message: optional(string())
		});
		const ProgressNotificationParamsSchema = object({
			...NotificationsParamsSchema.shape,
			...ProgressSchema.shape,
			/**
			* The progress token which was given in the initial request, used to associate this notification with the request that is proceeding.
			*/
			progressToken: ProgressTokenSchema
		});
		/**
		* An out-of-band notification used to inform the receiver of a progress update for a long-running request.
		*
		* @category notifications/progress
		*/
		const ProgressNotificationSchema = NotificationSchema.extend({
			method: literal("notifications/progress"),
			params: ProgressNotificationParamsSchema
		});
		const PaginatedRequestParamsSchema = BaseRequestParamsSchema.extend({ 
		/**
		* An opaque token representing the current pagination position.
		* If provided, the server should return results starting after this cursor.
		*/
cursor: CursorSchema.optional() });
		const PaginatedRequestSchema = RequestSchema.extend({ params: PaginatedRequestParamsSchema.optional() });
		const PaginatedResultSchema = ResultSchema.extend({ 
		/**
		* An opaque token representing the pagination position after the last returned result.
		* If present, there may be more results available.
		*/
nextCursor: CursorSchema.optional() });
		/**
		* The status of a task.
		* */
		const TaskStatusSchema = _enum([
			"working",
			"input_required",
			"completed",
			"failed",
			"cancelled"
		]);
		/**
		* A pollable state object associated with a request.
		*/
		const TaskSchema = object({
			taskId: string(),
			status: TaskStatusSchema,
			/**
			* Time in milliseconds to keep task results available after completion.
			* If null, the task has unlimited lifetime until manually cleaned up.
			*/
			ttl: union([number(), _null()]),
			/**
			* ISO 8601 timestamp when the task was created.
			*/
			createdAt: string(),
			/**
			* ISO 8601 timestamp when the task was last updated.
			*/
			lastUpdatedAt: string(),
			pollInterval: optional(number()),
			/**
			* Optional diagnostic message for failed tasks or other status information.
			*/
			statusMessage: optional(string())
		});
		/**
		* Result returned when a task is created, containing the task data wrapped in a task field.
		*/
		const CreateTaskResultSchema = ResultSchema.extend({ task: TaskSchema });
		/**
		* Parameters for task status notification.
		*/
		const TaskStatusNotificationParamsSchema = NotificationsParamsSchema.merge(TaskSchema);
		/**
		* A notification sent when a task's status changes.
		*/
		const TaskStatusNotificationSchema = NotificationSchema.extend({
			method: literal("notifications/tasks/status"),
			params: TaskStatusNotificationParamsSchema
		});
		/**
		* A request to get the state of a specific task.
		*/
		const GetTaskRequestSchema = RequestSchema.extend({
			method: literal("tasks/get"),
			params: BaseRequestParamsSchema.extend({ taskId: string() })
		});
		/**
		* The response to a tasks/get request.
		*/
		const GetTaskResultSchema = ResultSchema.merge(TaskSchema);
		/**
		* A request to get the result of a specific task.
		*/
		const GetTaskPayloadRequestSchema = RequestSchema.extend({
			method: literal("tasks/result"),
			params: BaseRequestParamsSchema.extend({ taskId: string() })
		});
		ResultSchema.loose();
		/**
		* A request to list tasks.
		*/
		const ListTasksRequestSchema = PaginatedRequestSchema.extend({ method: literal("tasks/list") });
		/**
		* The response to a tasks/list request.
		*/
		const ListTasksResultSchema = PaginatedResultSchema.extend({ tasks: array(TaskSchema) });
		/**
		* A request to cancel a specific task.
		*/
		const CancelTaskRequestSchema = RequestSchema.extend({
			method: literal("tasks/cancel"),
			params: BaseRequestParamsSchema.extend({ taskId: string() })
		});
		/**
		* The response to a tasks/cancel request.
		*/
		const CancelTaskResultSchema = ResultSchema.merge(TaskSchema);
		/**
		* The contents of a specific resource or sub-resource.
		*/
		const ResourceContentsSchema = object({
			/**
			* The URI of this resource.
			*/
			uri: string(),
			/**
			* The MIME type of this resource, if known.
			*/
			mimeType: optional(string()),
			/**
			* See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
			* for notes on _meta usage.
			*/
			_meta: record$1(string(), unknown()).optional()
		});
		const TextResourceContentsSchema = ResourceContentsSchema.extend({ 
		/**
		* The text of the item. This must only be set if the item can actually be represented as text (not binary data).
		*/
text: string() });
		/**
		* A Zod schema for validating Base64 strings that is more performant and
		* robust for very large inputs than the default regex-based check. It avoids
		* stack overflows by using the native `atob` function for validation.
		*/
		const Base64Schema = string().refine((val) => {
			try {
				atob(val);
				return true;
			} catch {
				return false;
			}
		}, { message: "Invalid Base64 string" });
		const BlobResourceContentsSchema = ResourceContentsSchema.extend({ 
		/**
		* A base64-encoded string representing the binary data of the item.
		*/
blob: Base64Schema });
		/**
		* The sender or recipient of messages and data in a conversation.
		*/
		const RoleSchema = _enum(["user", "assistant"]);
		/**
		* Optional annotations providing clients additional context about a resource.
		*/
		const AnnotationsSchema = object({
			/**
			* Intended audience(s) for the resource.
			*/
			audience: array(RoleSchema).optional(),
			/**
			* Importance hint for the resource, from 0 (least) to 1 (most).
			*/
			priority: number().min(0).max(1).optional(),
			/**
			* ISO 8601 timestamp for the most recent modification.
			*/
			lastModified: datetime({ offset: true }).optional()
		});
		/**
		* A known resource that the server is capable of reading.
		*/
		const ResourceSchema = object({
			...BaseMetadataSchema.shape,
			...IconsSchema.shape,
			/**
			* The URI of this resource.
			*/
			uri: string(),
			/**
			* A description of what this resource represents.
			*
			* This can be used by clients to improve the LLM's understanding of available resources. It can be thought of like a "hint" to the model.
			*/
			description: optional(string()),
			/**
			* The MIME type of this resource, if known.
			*/
			mimeType: optional(string()),
			/**
			* The size of the raw resource content, in bytes (i.e., before base64 encoding or any tokenization), if known.
			*
			* This can be used by Hosts to display file sizes and estimate context window usage.
			*/
			size: optional(number()),
			/**
			* Optional annotations for the client.
			*/
			annotations: AnnotationsSchema.optional(),
			/**
			* See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
			* for notes on _meta usage.
			*/
			_meta: optional(looseObject({}))
		});
		/**
		* A template description for resources available on the server.
		*/
		const ResourceTemplateSchema = object({
			...BaseMetadataSchema.shape,
			...IconsSchema.shape,
			/**
			* A URI template (according to RFC 6570) that can be used to construct resource URIs.
			*/
			uriTemplate: string(),
			/**
			* A description of what this template is for.
			*
			* This can be used by clients to improve the LLM's understanding of available resources. It can be thought of like a "hint" to the model.
			*/
			description: optional(string()),
			/**
			* The MIME type for all resources that match this template. This should only be included if all resources matching this template have the same type.
			*/
			mimeType: optional(string()),
			/**
			* Optional annotations for the client.
			*/
			annotations: AnnotationsSchema.optional(),
			/**
			* See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
			* for notes on _meta usage.
			*/
			_meta: optional(looseObject({}))
		});
		/**
		* Sent from the client to request a list of resources the server has.
		*/
		const ListResourcesRequestSchema = PaginatedRequestSchema.extend({ method: literal("resources/list") });
		/**
		* The server's response to a resources/list request from the client.
		*/
		const ListResourcesResultSchema = PaginatedResultSchema.extend({ resources: array(ResourceSchema) });
		/**
		* Sent from the client to request a list of resource templates the server has.
		*/
		const ListResourceTemplatesRequestSchema = PaginatedRequestSchema.extend({ method: literal("resources/templates/list") });
		/**
		* The server's response to a resources/templates/list request from the client.
		*/
		const ListResourceTemplatesResultSchema = PaginatedResultSchema.extend({ resourceTemplates: array(ResourceTemplateSchema) });
		const ResourceRequestParamsSchema = BaseRequestParamsSchema.extend({ 
		/**
		* The URI of the resource to read. The URI can use any protocol; it is up to the server how to interpret it.
		*
		* @format uri
		*/
uri: string() });
		/**
		* Parameters for a `resources/read` request.
		*/
		const ReadResourceRequestParamsSchema = ResourceRequestParamsSchema;
		/**
		* Sent from the client to the server, to read a specific resource URI.
		*/
		const ReadResourceRequestSchema = RequestSchema.extend({
			method: literal("resources/read"),
			params: ReadResourceRequestParamsSchema
		});
		/**
		* The server's response to a resources/read request from the client.
		*/
		const ReadResourceResultSchema = ResultSchema.extend({ contents: array(union([TextResourceContentsSchema, BlobResourceContentsSchema])) });
		/**
		* An optional notification from the server to the client, informing it that the list of resources it can read from has changed. This may be issued by servers without any previous subscription from the client.
		*/
		const ResourceListChangedNotificationSchema = NotificationSchema.extend({
			method: literal("notifications/resources/list_changed"),
			params: NotificationsParamsSchema.optional()
		});
		const SubscribeRequestParamsSchema = ResourceRequestParamsSchema;
		/**
		* Sent from the client to request resources/updated notifications from the server whenever a particular resource changes.
		*/
		const SubscribeRequestSchema = RequestSchema.extend({
			method: literal("resources/subscribe"),
			params: SubscribeRequestParamsSchema
		});
		const UnsubscribeRequestParamsSchema = ResourceRequestParamsSchema;
		/**
		* Sent from the client to request cancellation of resources/updated notifications from the server. This should follow a previous resources/subscribe request.
		*/
		const UnsubscribeRequestSchema = RequestSchema.extend({
			method: literal("resources/unsubscribe"),
			params: UnsubscribeRequestParamsSchema
		});
		/**
		* Parameters for a `notifications/resources/updated` notification.
		*/
		const ResourceUpdatedNotificationParamsSchema = NotificationsParamsSchema.extend({ 
		/**
		* The URI of the resource that has been updated. This might be a sub-resource of the one that the client actually subscribed to.
		*/
uri: string() });
		/**
		* A notification from the server to the client, informing it that a resource has changed and may need to be read again. This should only be sent if the client previously sent a resources/subscribe request.
		*/
		const ResourceUpdatedNotificationSchema = NotificationSchema.extend({
			method: literal("notifications/resources/updated"),
			params: ResourceUpdatedNotificationParamsSchema
		});
		/**
		* Describes an argument that a prompt can accept.
		*/
		const PromptArgumentSchema = object({
			/**
			* The name of the argument.
			*/
			name: string(),
			/**
			* A human-readable description of the argument.
			*/
			description: optional(string()),
			/**
			* Whether this argument must be provided.
			*/
			required: optional(boolean())
		});
		/**
		* A prompt or prompt template that the server offers.
		*/
		const PromptSchema = object({
			...BaseMetadataSchema.shape,
			...IconsSchema.shape,
			/**
			* An optional description of what this prompt provides
			*/
			description: optional(string()),
			/**
			* A list of arguments to use for templating the prompt.
			*/
			arguments: optional(array(PromptArgumentSchema)),
			/**
			* See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
			* for notes on _meta usage.
			*/
			_meta: optional(looseObject({}))
		});
		/**
		* Sent from the client to request a list of prompts and prompt templates the server has.
		*/
		const ListPromptsRequestSchema = PaginatedRequestSchema.extend({ method: literal("prompts/list") });
		/**
		* The server's response to a prompts/list request from the client.
		*/
		const ListPromptsResultSchema = PaginatedResultSchema.extend({ prompts: array(PromptSchema) });
		/**
		* Parameters for a `prompts/get` request.
		*/
		const GetPromptRequestParamsSchema = BaseRequestParamsSchema.extend({
			/**
			* The name of the prompt or prompt template.
			*/
			name: string(),
			/**
			* Arguments to use for templating the prompt.
			*/
			arguments: record$1(string(), string()).optional()
		});
		/**
		* Used by the client to get a prompt provided by the server.
		*/
		const GetPromptRequestSchema = RequestSchema.extend({
			method: literal("prompts/get"),
			params: GetPromptRequestParamsSchema
		});
		/**
		* Text provided to or from an LLM.
		*/
		const TextContentSchema = object({
			type: literal("text"),
			/**
			* The text content of the message.
			*/
			text: string(),
			/**
			* Optional annotations for the client.
			*/
			annotations: AnnotationsSchema.optional(),
			/**
			* See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
			* for notes on _meta usage.
			*/
			_meta: record$1(string(), unknown()).optional()
		});
		/**
		* An image provided to or from an LLM.
		*/
		const ImageContentSchema = object({
			type: literal("image"),
			/**
			* The base64-encoded image data.
			*/
			data: Base64Schema,
			/**
			* The MIME type of the image. Different providers may support different image types.
			*/
			mimeType: string(),
			/**
			* Optional annotations for the client.
			*/
			annotations: AnnotationsSchema.optional(),
			/**
			* See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
			* for notes on _meta usage.
			*/
			_meta: record$1(string(), unknown()).optional()
		});
		/**
		* An Audio provided to or from an LLM.
		*/
		const AudioContentSchema = object({
			type: literal("audio"),
			/**
			* The base64-encoded audio data.
			*/
			data: Base64Schema,
			/**
			* The MIME type of the audio. Different providers may support different audio types.
			*/
			mimeType: string(),
			/**
			* Optional annotations for the client.
			*/
			annotations: AnnotationsSchema.optional(),
			/**
			* See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
			* for notes on _meta usage.
			*/
			_meta: record$1(string(), unknown()).optional()
		});
		/**
		* A tool call request from an assistant (LLM).
		* Represents the assistant's request to use a tool.
		*/
		const ToolUseContentSchema = object({
			type: literal("tool_use"),
			/**
			* The name of the tool to invoke.
			* Must match a tool name from the request's tools array.
			*/
			name: string(),
			/**
			* Unique identifier for this tool call.
			* Used to correlate with ToolResultContent in subsequent messages.
			*/
			id: string(),
			/**
			* Arguments to pass to the tool.
			* Must conform to the tool's inputSchema.
			*/
			input: record$1(string(), unknown()),
			/**
			* See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
			* for notes on _meta usage.
			*/
			_meta: record$1(string(), unknown()).optional()
		});
		/**
		* The contents of a resource, embedded into a prompt or tool call result.
		*/
		const EmbeddedResourceSchema = object({
			type: literal("resource"),
			resource: union([TextResourceContentsSchema, BlobResourceContentsSchema]),
			/**
			* Optional annotations for the client.
			*/
			annotations: AnnotationsSchema.optional(),
			/**
			* See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
			* for notes on _meta usage.
			*/
			_meta: record$1(string(), unknown()).optional()
		});
		/**
		* A resource that the server is capable of reading, included in a prompt or tool call result.
		*
		* Note: resource links returned by tools are not guaranteed to appear in the results of `resources/list` requests.
		*/
		const ResourceLinkSchema = ResourceSchema.extend({ type: literal("resource_link") });
		/**
		* A content block that can be used in prompts and tool results.
		*/
		const ContentBlockSchema = union([
			TextContentSchema,
			ImageContentSchema,
			AudioContentSchema,
			ResourceLinkSchema,
			EmbeddedResourceSchema
		]);
		/**
		* Describes a message returned as part of a prompt.
		*/
		const PromptMessageSchema = object({
			role: RoleSchema,
			content: ContentBlockSchema
		});
		/**
		* The server's response to a prompts/get request from the client.
		*/
		const GetPromptResultSchema = ResultSchema.extend({
			/**
			* An optional description for the prompt.
			*/
			description: string().optional(),
			messages: array(PromptMessageSchema)
		});
		/**
		* An optional notification from the server to the client, informing it that the list of prompts it offers has changed. This may be issued by servers without any previous subscription from the client.
		*/
		const PromptListChangedNotificationSchema = NotificationSchema.extend({
			method: literal("notifications/prompts/list_changed"),
			params: NotificationsParamsSchema.optional()
		});
		/**
		* Additional properties describing a Tool to clients.
		*
		* NOTE: all properties in ToolAnnotations are **hints**.
		* They are not guaranteed to provide a faithful description of
		* tool behavior (including descriptive properties like `title`).
		*
		* Clients should never make tool use decisions based on ToolAnnotations
		* received from untrusted servers.
		*/
		const ToolAnnotationsSchema = object({
			/**
			* A human-readable title for the tool.
			*/
			title: string().optional(),
			/**
			* If true, the tool does not modify its environment.
			*
			* Default: false
			*/
			readOnlyHint: boolean().optional(),
			/**
			* If true, the tool may perform destructive updates to its environment.
			* If false, the tool performs only additive updates.
			*
			* (This property is meaningful only when `readOnlyHint == false`)
			*
			* Default: true
			*/
			destructiveHint: boolean().optional(),
			/**
			* If true, calling the tool repeatedly with the same arguments
			* will have no additional effect on the its environment.
			*
			* (This property is meaningful only when `readOnlyHint == false`)
			*
			* Default: false
			*/
			idempotentHint: boolean().optional(),
			/**
			* If true, this tool may interact with an "open world" of external
			* entities. If false, the tool's domain of interaction is closed.
			* For example, the world of a web search tool is open, whereas that
			* of a memory tool is not.
			*
			* Default: true
			*/
			openWorldHint: boolean().optional()
		});
		/**
		* Execution-related properties for a tool.
		*/
		const ToolExecutionSchema = object({ 
		/**
		* Indicates the tool's preference for task-augmented execution.
		* - "required": Clients MUST invoke the tool as a task
		* - "optional": Clients MAY invoke the tool as a task or normal request
		* - "forbidden": Clients MUST NOT attempt to invoke the tool as a task
		*
		* If not present, defaults to "forbidden".
		*/
taskSupport: _enum([
			"required",
			"optional",
			"forbidden"
		]).optional() });
		/**
		* Definition for a tool the client can call.
		*/
		const ToolSchema = object({
			...BaseMetadataSchema.shape,
			...IconsSchema.shape,
			/**
			* A human-readable description of the tool.
			*/
			description: string().optional(),
			/**
			* A JSON Schema 2020-12 object defining the expected parameters for the tool.
			* Must have type: 'object' at the root level per MCP spec.
			*/
			inputSchema: object({
				type: literal("object"),
				properties: record$1(string(), AssertObjectSchema).optional(),
				required: array(string()).optional()
			}).catchall(unknown()),
			/**
			* An optional JSON Schema 2020-12 object defining the structure of the tool's output
			* returned in the structuredContent field of a CallToolResult.
			* Must have type: 'object' at the root level per MCP spec.
			*/
			outputSchema: object({
				type: literal("object"),
				properties: record$1(string(), AssertObjectSchema).optional(),
				required: array(string()).optional()
			}).catchall(unknown()).optional(),
			/**
			* Optional additional tool information.
			*/
			annotations: ToolAnnotationsSchema.optional(),
			/**
			* Execution-related properties for this tool.
			*/
			execution: ToolExecutionSchema.optional(),
			/**
			* See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
			* for notes on _meta usage.
			*/
			_meta: record$1(string(), unknown()).optional()
		});
		/**
		* Sent from the client to request a list of tools the server has.
		*/
		const ListToolsRequestSchema = PaginatedRequestSchema.extend({ method: literal("tools/list") });
		/**
		* The server's response to a tools/list request from the client.
		*/
		const ListToolsResultSchema = PaginatedResultSchema.extend({ tools: array(ToolSchema) });
		/**
		* The server's response to a tool call.
		*/
		const CallToolResultSchema = ResultSchema.extend({
			/**
			* A list of content objects that represent the result of the tool call.
			*
			* If the Tool does not define an outputSchema, this field MUST be present in the result.
			* For backwards compatibility, this field is always present, but it may be empty.
			*/
			content: array(ContentBlockSchema).default([]),
			/**
			* An object containing structured tool output.
			*
			* If the Tool defines an outputSchema, this field MUST be present in the result, and contain a JSON object that matches the schema.
			*/
			structuredContent: record$1(string(), unknown()).optional(),
			/**
			* Whether the tool call ended in an error.
			*
			* If not set, this is assumed to be false (the call was successful).
			*
			* Any errors that originate from the tool SHOULD be reported inside the result
			* object, with `isError` set to true, _not_ as an MCP protocol-level error
			* response. Otherwise, the LLM would not be able to see that an error occurred
			* and self-correct.
			*
			* However, any errors in _finding_ the tool, an error indicating that the
			* server does not support tool calls, or any other exceptional conditions,
			* should be reported as an MCP error response.
			*/
			isError: boolean().optional()
		});
		CallToolResultSchema.or(ResultSchema.extend({ toolResult: unknown() }));
		/**
		* Parameters for a `tools/call` request.
		*/
		const CallToolRequestParamsSchema = TaskAugmentedRequestParamsSchema.extend({
			/**
			* The name of the tool to call.
			*/
			name: string(),
			/**
			* Arguments to pass to the tool.
			*/
			arguments: record$1(string(), unknown()).optional()
		});
		/**
		* Used by the client to invoke a tool provided by the server.
		*/
		const CallToolRequestSchema = RequestSchema.extend({
			method: literal("tools/call"),
			params: CallToolRequestParamsSchema
		});
		/**
		* An optional notification from the server to the client, informing it that the list of tools it offers has changed. This may be issued by servers without any previous subscription from the client.
		*/
		const ToolListChangedNotificationSchema = NotificationSchema.extend({
			method: literal("notifications/tools/list_changed"),
			params: NotificationsParamsSchema.optional()
		});
		object({
			/**
			* If true, the list will be refreshed automatically when a list changed notification is received.
			* The callback will be called with the updated list.
			*
			* If false, the callback will be called with null items, allowing manual refresh.
			*
			* @default true
			*/
			autoRefresh: boolean().default(true),
			/**
			* Debounce time in milliseconds for list changed notification processing.
			*
			* Multiple notifications received within this timeframe will only trigger one refresh.
			* Set to 0 to disable debouncing.
			*
			* @default 300
			*/
			debounceMs: number().int().nonnegative().default(300)
		});
		/**
		* The severity of a log message.
		*/
		const LoggingLevelSchema = _enum([
			"debug",
			"info",
			"notice",
			"warning",
			"error",
			"critical",
			"alert",
			"emergency"
		]);
		/**
		* Parameters for a `logging/setLevel` request.
		*/
		const SetLevelRequestParamsSchema = BaseRequestParamsSchema.extend({ 
		/**
		* The level of logging that the client wants to receive from the server. The server should send all logs at this level and higher (i.e., more severe) to the client as notifications/logging/message.
		*/
level: LoggingLevelSchema });
		/**
		* A request from the client to the server, to enable or adjust logging.
		*/
		const SetLevelRequestSchema = RequestSchema.extend({
			method: literal("logging/setLevel"),
			params: SetLevelRequestParamsSchema
		});
		/**
		* Parameters for a `notifications/message` notification.
		*/
		const LoggingMessageNotificationParamsSchema = NotificationsParamsSchema.extend({
			/**
			* The severity of this log message.
			*/
			level: LoggingLevelSchema,
			/**
			* An optional name of the logger issuing this message.
			*/
			logger: string().optional(),
			/**
			* The data to be logged, such as a string message or an object. Any JSON serializable type is allowed here.
			*/
			data: unknown()
		});
		/**
		* Notification of a log message passed from server to client. If no logging/setLevel request has been sent from the client, the server MAY decide which messages to send automatically.
		*/
		const LoggingMessageNotificationSchema = NotificationSchema.extend({
			method: literal("notifications/message"),
			params: LoggingMessageNotificationParamsSchema
		});
		/**
		* The server's preferences for model selection, requested of the client during sampling.
		*/
		const ModelPreferencesSchema = object({
			/**
			* Optional hints to use for model selection.
			*/
			hints: array(object({ 
			/**
			* A hint for a model name.
			*/
name: string().optional() })).optional(),
			/**
			* How much to prioritize cost when selecting a model.
			*/
			costPriority: number().min(0).max(1).optional(),
			/**
			* How much to prioritize sampling speed (latency) when selecting a model.
			*/
			speedPriority: number().min(0).max(1).optional(),
			/**
			* How much to prioritize intelligence and capabilities when selecting a model.
			*/
			intelligencePriority: number().min(0).max(1).optional()
		});
		/**
		* Controls tool usage behavior in sampling requests.
		*/
		const ToolChoiceSchema = object({ 
		/**
		* Controls when tools are used:
		* - "auto": Model decides whether to use tools (default)
		* - "required": Model MUST use at least one tool before completing
		* - "none": Model MUST NOT use any tools
		*/
mode: _enum([
			"auto",
			"required",
			"none"
		]).optional() });
		/**
		* The result of a tool execution, provided by the user (server).
		* Represents the outcome of invoking a tool requested via ToolUseContent.
		*/
		const ToolResultContentSchema = object({
			type: literal("tool_result"),
			toolUseId: string().describe("The unique identifier for the corresponding tool call."),
			content: array(ContentBlockSchema).default([]),
			structuredContent: object({}).loose().optional(),
			isError: boolean().optional(),
			/**
			* See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
			* for notes on _meta usage.
			*/
			_meta: record$1(string(), unknown()).optional()
		});
		/**
		* Basic content types for sampling responses (without tool use).
		* Used for backwards-compatible CreateMessageResult when tools are not used.
		*/
		const SamplingContentSchema = discriminatedUnion("type", [
			TextContentSchema,
			ImageContentSchema,
			AudioContentSchema
		]);
		/**
		* Content block types allowed in sampling messages.
		* This includes text, image, audio, tool use requests, and tool results.
		*/
		const SamplingMessageContentBlockSchema = discriminatedUnion("type", [
			TextContentSchema,
			ImageContentSchema,
			AudioContentSchema,
			ToolUseContentSchema,
			ToolResultContentSchema
		]);
		/**
		* Describes a message issued to or received from an LLM API.
		*/
		const SamplingMessageSchema = object({
			role: RoleSchema,
			content: union([SamplingMessageContentBlockSchema, array(SamplingMessageContentBlockSchema)]),
			/**
			* See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
			* for notes on _meta usage.
			*/
			_meta: record$1(string(), unknown()).optional()
		});
		/**
		* Parameters for a `sampling/createMessage` request.
		*/
		const CreateMessageRequestParamsSchema = TaskAugmentedRequestParamsSchema.extend({
			messages: array(SamplingMessageSchema),
			/**
			* The server's preferences for which model to select. The client MAY modify or omit this request.
			*/
			modelPreferences: ModelPreferencesSchema.optional(),
			/**
			* An optional system prompt the server wants to use for sampling. The client MAY modify or omit this prompt.
			*/
			systemPrompt: string().optional(),
			/**
			* A request to include context from one or more MCP servers (including the caller), to be attached to the prompt.
			* The client MAY ignore this request.
			*
			* Default is "none". Values "thisServer" and "allServers" are soft-deprecated. Servers SHOULD only use these values if the client
			* declares ClientCapabilities.sampling.context. These values may be removed in future spec releases.
			*/
			includeContext: _enum([
				"none",
				"thisServer",
				"allServers"
			]).optional(),
			temperature: number().optional(),
			/**
			* The requested maximum number of tokens to sample (to prevent runaway completions).
			*
			* The client MAY choose to sample fewer tokens than the requested maximum.
			*/
			maxTokens: number().int(),
			stopSequences: array(string()).optional(),
			/**
			* Optional metadata to pass through to the LLM provider. The format of this metadata is provider-specific.
			*/
			metadata: AssertObjectSchema.optional(),
			/**
			* Tools that the model may use during generation.
			* The client MUST return an error if this field is provided but ClientCapabilities.sampling.tools is not declared.
			*/
			tools: array(ToolSchema).optional(),
			/**
			* Controls how the model uses tools.
			* The client MUST return an error if this field is provided but ClientCapabilities.sampling.tools is not declared.
			* Default is `{ mode: "auto" }`.
			*/
			toolChoice: ToolChoiceSchema.optional()
		});
		/**
		* A request from the server to sample an LLM via the client. The client has full discretion over which model to select. The client should also inform the user before beginning sampling, to allow them to inspect the request (human in the loop) and decide whether to approve it.
		*/
		const CreateMessageRequestSchema = RequestSchema.extend({
			method: literal("sampling/createMessage"),
			params: CreateMessageRequestParamsSchema
		});
		/**
		* The client's response to a sampling/create_message request from the server.
		* This is the backwards-compatible version that returns single content (no arrays).
		* Used when the request does not include tools.
		*/
		const CreateMessageResultSchema = ResultSchema.extend({
			/**
			* The name of the model that generated the message.
			*/
			model: string(),
			/**
			* The reason why sampling stopped, if known.
			*
			* Standard values:
			* - "endTurn": Natural end of the assistant's turn
			* - "stopSequence": A stop sequence was encountered
			* - "maxTokens": Maximum token limit was reached
			*
			* This field is an open string to allow for provider-specific stop reasons.
			*/
			stopReason: optional(_enum([
				"endTurn",
				"stopSequence",
				"maxTokens"
			]).or(string())),
			role: RoleSchema,
			/**
			* Response content. Single content block (text, image, or audio).
			*/
			content: SamplingContentSchema
		});
		/**
		* The client's response to a sampling/create_message request when tools were provided.
		* This version supports array content for tool use flows.
		*/
		const CreateMessageResultWithToolsSchema = ResultSchema.extend({
			/**
			* The name of the model that generated the message.
			*/
			model: string(),
			/**
			* The reason why sampling stopped, if known.
			*
			* Standard values:
			* - "endTurn": Natural end of the assistant's turn
			* - "stopSequence": A stop sequence was encountered
			* - "maxTokens": Maximum token limit was reached
			* - "toolUse": The model wants to use one or more tools
			*
			* This field is an open string to allow for provider-specific stop reasons.
			*/
			stopReason: optional(_enum([
				"endTurn",
				"stopSequence",
				"maxTokens",
				"toolUse"
			]).or(string())),
			role: RoleSchema,
			/**
			* Response content. May be a single block or array. May include ToolUseContent if stopReason is "toolUse".
			*/
			content: union([SamplingMessageContentBlockSchema, array(SamplingMessageContentBlockSchema)])
		});
		/**
		* Primitive schema definition for boolean fields.
		*/
		const BooleanSchemaSchema = object({
			type: literal("boolean"),
			title: string().optional(),
			description: string().optional(),
			default: boolean().optional()
		});
		/**
		* Primitive schema definition for string fields.
		*/
		const StringSchemaSchema = object({
			type: literal("string"),
			title: string().optional(),
			description: string().optional(),
			minLength: number().optional(),
			maxLength: number().optional(),
			format: _enum([
				"email",
				"uri",
				"date",
				"date-time"
			]).optional(),
			default: string().optional()
		});
		/**
		* Primitive schema definition for number fields.
		*/
		const NumberSchemaSchema = object({
			type: _enum(["number", "integer"]),
			title: string().optional(),
			description: string().optional(),
			minimum: number().optional(),
			maximum: number().optional(),
			default: number().optional()
		});
		/**
		* Schema for single-selection enumeration without display titles for options.
		*/
		const UntitledSingleSelectEnumSchemaSchema = object({
			type: literal("string"),
			title: string().optional(),
			description: string().optional(),
			enum: array(string()),
			default: string().optional()
		});
		/**
		* Schema for single-selection enumeration with display titles for each option.
		*/
		const TitledSingleSelectEnumSchemaSchema = object({
			type: literal("string"),
			title: string().optional(),
			description: string().optional(),
			oneOf: array(object({
				const: string(),
				title: string()
			})),
			default: string().optional()
		});
		/**
		* Union of all primitive schema definitions.
		*/
		const PrimitiveSchemaDefinitionSchema = union([
			union([
				object({
					type: literal("string"),
					title: string().optional(),
					description: string().optional(),
					enum: array(string()),
					enumNames: array(string()).optional(),
					default: string().optional()
				}),
				union([UntitledSingleSelectEnumSchemaSchema, TitledSingleSelectEnumSchemaSchema]),
				union([object({
					type: literal("array"),
					title: string().optional(),
					description: string().optional(),
					minItems: number().optional(),
					maxItems: number().optional(),
					items: object({
						type: literal("string"),
						enum: array(string())
					}),
					default: array(string()).optional()
				}), object({
					type: literal("array"),
					title: string().optional(),
					description: string().optional(),
					minItems: number().optional(),
					maxItems: number().optional(),
					items: object({ anyOf: array(object({
						const: string(),
						title: string()
					})) }),
					default: array(string()).optional()
				})])
			]),
			BooleanSchemaSchema,
			StringSchemaSchema,
			NumberSchemaSchema
		]);
		/**
		* The parameters for a request to elicit additional information from the user via the client.
		*/
		const ElicitRequestParamsSchema = union([TaskAugmentedRequestParamsSchema.extend({
			/**
			* The elicitation mode.
			*
			* Optional for backward compatibility. Clients MUST treat missing mode as "form".
			*/
			mode: literal("form").optional(),
			/**
			* The message to present to the user describing what information is being requested.
			*/
			message: string(),
			/**
			* A restricted subset of JSON Schema.
			* Only top-level properties are allowed, without nesting.
			*/
			requestedSchema: object({
				type: literal("object"),
				properties: record$1(string(), PrimitiveSchemaDefinitionSchema),
				required: array(string()).optional()
			})
		}), TaskAugmentedRequestParamsSchema.extend({
			/**
			* The elicitation mode.
			*/
			mode: literal("url"),
			/**
			* The message to present to the user explaining why the interaction is needed.
			*/
			message: string(),
			/**
			* The ID of the elicitation, which must be unique within the context of the server.
			* The client MUST treat this ID as an opaque value.
			*/
			elicitationId: string(),
			/**
			* The URL that the user should navigate to.
			*/
			url: string().url()
		})]);
		/**
		* A request from the server to elicit user input via the client.
		* The client should present the message and form fields to the user (form mode)
		* or navigate to a URL (URL mode).
		*/
		const ElicitRequestSchema = RequestSchema.extend({
			method: literal("elicitation/create"),
			params: ElicitRequestParamsSchema
		});
		/**
		* Parameters for a `notifications/elicitation/complete` notification.
		*
		* @category notifications/elicitation/complete
		*/
		const ElicitationCompleteNotificationParamsSchema = NotificationsParamsSchema.extend({ 
		/**
		* The ID of the elicitation that completed.
		*/
elicitationId: string() });
		/**
		* A notification from the server to the client, informing it of a completion of an out-of-band elicitation request.
		*
		* @category notifications/elicitation/complete
		*/
		const ElicitationCompleteNotificationSchema = NotificationSchema.extend({
			method: literal("notifications/elicitation/complete"),
			params: ElicitationCompleteNotificationParamsSchema
		});
		/**
		* The client's response to an elicitation/create request from the server.
		*/
		const ElicitResultSchema = ResultSchema.extend({
			/**
			* The user action in response to the elicitation.
			* - "accept": User submitted the form/confirmed the action
			* - "decline": User explicitly decline the action
			* - "cancel": User dismissed without making an explicit choice
			*/
			action: _enum([
				"accept",
				"decline",
				"cancel"
			]),
			/**
			* The submitted form data, only present when action is "accept".
			* Contains values matching the requested schema.
			* Per MCP spec, content is "typically omitted" for decline/cancel actions.
			* We normalize null to undefined for leniency while maintaining type compatibility.
			*/
			content: preprocess((val) => val === null ? void 0 : val, record$1(string(), union([
				string(),
				number(),
				boolean(),
				array(string())
			])).optional())
		});
		/**
		* A reference to a resource or resource template definition.
		*/
		const ResourceTemplateReferenceSchema = object({
			type: literal("ref/resource"),
			/**
			* The URI or URI template of the resource.
			*/
			uri: string()
		});
		/**
		* Identifies a prompt.
		*/
		const PromptReferenceSchema = object({
			type: literal("ref/prompt"),
			/**
			* The name of the prompt or prompt template
			*/
			name: string()
		});
		/**
		* Parameters for a `completion/complete` request.
		*/
		const CompleteRequestParamsSchema = BaseRequestParamsSchema.extend({
			ref: union([PromptReferenceSchema, ResourceTemplateReferenceSchema]),
			/**
			* The argument's information
			*/
			argument: object({
				/**
				* The name of the argument
				*/
				name: string(),
				/**
				* The value of the argument to use for completion matching.
				*/
				value: string()
			}),
			context: object({ 
			/**
			* Previously-resolved variables in a URI template or prompt.
			*/
arguments: record$1(string(), string()).optional() }).optional()
		});
		/**
		* A request from the client to the server, to ask for completion options.
		*/
		const CompleteRequestSchema = RequestSchema.extend({
			method: literal("completion/complete"),
			params: CompleteRequestParamsSchema
		});
		/**
		* The server's response to a completion/complete request
		*/
		const CompleteResultSchema = ResultSchema.extend({ completion: looseObject({
			/**
			* An array of completion values. Must not exceed 100 items.
			*/
			values: array(string()).max(100),
			/**
			* The total number of completion options available. This can exceed the number of values actually sent in the response.
			*/
			total: optional(number().int()),
			/**
			* Indicates whether there are additional completion options beyond those provided in the current response, even if the exact total is unknown.
			*/
			hasMore: optional(boolean())
		}) });
		/**
		* Represents a root directory or file that the server can operate on.
		*/
		const RootSchema = object({
			/**
			* The URI identifying the root. This *must* start with file:// for now.
			*/
			uri: string().startsWith("file://"),
			/**
			* An optional name for the root.
			*/
			name: string().optional(),
			/**
			* See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
			* for notes on _meta usage.
			*/
			_meta: record$1(string(), unknown()).optional()
		});
		/**
		* Sent from the server to request a list of root URIs from the client.
		*/
		const ListRootsRequestSchema = RequestSchema.extend({
			method: literal("roots/list"),
			params: BaseRequestParamsSchema.optional()
		});
		/**
		* The client's response to a roots/list request from the server.
		*/
		const ListRootsResultSchema = ResultSchema.extend({ roots: array(RootSchema) });
		/**
		* A notification from the client to the server, informing it that the list of roots has changed.
		*/
		const RootsListChangedNotificationSchema = NotificationSchema.extend({
			method: literal("notifications/roots/list_changed"),
			params: NotificationsParamsSchema.optional()
		});
		union([
			PingRequestSchema,
			InitializeRequestSchema,
			CompleteRequestSchema,
			SetLevelRequestSchema,
			GetPromptRequestSchema,
			ListPromptsRequestSchema,
			ListResourcesRequestSchema,
			ListResourceTemplatesRequestSchema,
			ReadResourceRequestSchema,
			SubscribeRequestSchema,
			UnsubscribeRequestSchema,
			CallToolRequestSchema,
			ListToolsRequestSchema,
			GetTaskRequestSchema,
			GetTaskPayloadRequestSchema,
			ListTasksRequestSchema,
			CancelTaskRequestSchema
		]);
		union([
			CancelledNotificationSchema,
			ProgressNotificationSchema,
			InitializedNotificationSchema,
			RootsListChangedNotificationSchema,
			TaskStatusNotificationSchema
		]);
		union([
			EmptyResultSchema,
			CreateMessageResultSchema,
			CreateMessageResultWithToolsSchema,
			ElicitResultSchema,
			ListRootsResultSchema,
			GetTaskResultSchema,
			ListTasksResultSchema,
			CreateTaskResultSchema
		]);
		union([
			PingRequestSchema,
			CreateMessageRequestSchema,
			ElicitRequestSchema,
			ListRootsRequestSchema,
			GetTaskRequestSchema,
			GetTaskPayloadRequestSchema,
			ListTasksRequestSchema,
			CancelTaskRequestSchema
		]);
		union([
			CancelledNotificationSchema,
			ProgressNotificationSchema,
			LoggingMessageNotificationSchema,
			ResourceUpdatedNotificationSchema,
			ResourceListChangedNotificationSchema,
			ToolListChangedNotificationSchema,
			PromptListChangedNotificationSchema,
			TaskStatusNotificationSchema,
			ElicitationCompleteNotificationSchema
		]);
		union([
			EmptyResultSchema,
			InitializeResultSchema,
			CompleteResultSchema,
			GetPromptResultSchema,
			ListPromptsResultSchema,
			ListResourcesResultSchema,
			ListResourceTemplatesResultSchema,
			ReadResourceResultSchema,
			CallToolResultSchema,
			ListToolsResultSchema,
			GetTaskResultSchema,
			ListTasksResultSchema,
			CreateTaskResultSchema
		]);
		var McpError = class McpError extends Error {
			constructor(code, message, data) {
				super(`MCP error ${code}: ${message}`);
				this.code = code;
				this.data = data;
				this.name = "McpError";
			}
			/**
			* Factory method to create the appropriate error type based on the error code and data
			*/
			static fromError(code, message, data) {
				if (code === ErrorCode.UrlElicitationRequired && data) {
					const errorData = data;
					if (errorData.elicitations) return new UrlElicitationRequiredError(errorData.elicitations, message);
				}
				return new McpError(code, message, data);
			}
		};
		/**
		* Specialized error type when a tool requires a URL mode elicitation.
		* This makes it nicer for the client to handle since there is specific data to work with instead of just a code to check against.
		*/
		var UrlElicitationRequiredError = class extends McpError {
			constructor(elicitations, message = `URL elicitation${elicitations.length > 1 ? "s" : ""} required`) {
				super(ErrorCode.UrlElicitationRequired, message, { elicitations });
			}
			get elicitations() {
				return this.data?.elicitations ?? [];
			}
		};
		//#endregion
		//#region ../../node_modules/.pnpm/@modelcontextprotocol+sdk@1.30.0_zod@4.4.3/node_modules/@modelcontextprotocol/sdk/dist/esm/server/zod-compat.js
		function isZ4Schema(s) {
			return !!s._zod;
		}
		function safeParse(schema, data) {
			if (isZ4Schema(schema)) return safeParse$2(schema, data);
			return schema.safeParse(data);
		}
		function getObjectShape(schema) {
			if (!schema) return void 0;
			let rawShape;
			if (isZ4Schema(schema)) rawShape = schema._zod?.def?.shape;
			else rawShape = schema.shape;
			if (!rawShape) return void 0;
			if (typeof rawShape === "function") try {
				return rawShape();
			} catch {
				return;
			}
			return rawShape;
		}
		/**
		* Gets the literal value from a schema, if it's a literal schema.
		* Works with both Zod v3 and v4.
		* Returns undefined if the schema is not a literal or the value cannot be determined.
		*/
		function getLiteralValue(schema) {
			if (isZ4Schema(schema)) {
				const def = schema._zod?.def;
				if (def) {
					if (def.value !== void 0) return def.value;
					if (Array.isArray(def.values) && def.values.length > 0) return def.values[0];
				}
			}
			const def = schema._def;
			if (def) {
				if (def.value !== void 0) return def.value;
				if (Array.isArray(def.values) && def.values.length > 0) return def.values[0];
			}
			const directValue = schema.value;
			if (directValue !== void 0) return directValue;
		}
		//#endregion
		//#region ../../node_modules/.pnpm/@modelcontextprotocol+sdk@1.30.0_zod@4.4.3/node_modules/@modelcontextprotocol/sdk/dist/esm/experimental/tasks/interfaces.js
		/**
		* Experimental task interfaces for MCP SDK.
		* WARNING: These APIs are experimental and may change without notice.
		*/
		/**
		* Checks if a task status represents a terminal state.
		* Terminal states are those where the task has finished and will not change.
		*
		* @param status - The task status to check
		* @returns True if the status is terminal (completed, failed, or cancelled)
		* @experimental
		*/
		function isTerminal(status) {
			return status === "completed" || status === "failed" || status === "cancelled";
		}
		//#endregion
		//#region ../../node_modules/.pnpm/@modelcontextprotocol+sdk@1.30.0_zod@4.4.3/node_modules/@modelcontextprotocol/sdk/dist/esm/server/zod-json-schema-compat.js
		function getMethodLiteral(schema) {
			const methodSchema = getObjectShape(schema)?.method;
			if (!methodSchema) throw new Error("Schema is missing a method literal");
			const value = getLiteralValue(methodSchema);
			if (typeof value !== "string") throw new Error("Schema method literal must be a string");
			return value;
		}
		function parseWithCompat(schema, data) {
			const result = safeParse(schema, data);
			if (!result.success) throw result.error;
			return result.data;
		}
		/**
		* Implements MCP protocol framing on top of a pluggable transport, including
		* features like request/response linking, notifications, and progress.
		*/
		var Protocol = class {
			constructor(_options) {
				this._options = _options;
				this._requestMessageId = 0;
				this._requestHandlers = /* @__PURE__ */ new Map();
				this._requestHandlerAbortControllers = /* @__PURE__ */ new Map();
				this._notificationHandlers = /* @__PURE__ */ new Map();
				this._responseHandlers = /* @__PURE__ */ new Map();
				this._progressHandlers = /* @__PURE__ */ new Map();
				this._timeoutInfo = /* @__PURE__ */ new Map();
				this._pendingDebouncedNotifications = /* @__PURE__ */ new Set();
				this._taskProgressTokens = /* @__PURE__ */ new Map();
				this._requestResolvers = /* @__PURE__ */ new Map();
				this.setNotificationHandler(CancelledNotificationSchema, (notification) => {
					this._oncancel(notification);
				});
				this.setNotificationHandler(ProgressNotificationSchema, (notification) => {
					this._onprogress(notification);
				});
				this.setRequestHandler(PingRequestSchema, (_request) => ({}));
				this._taskStore = _options?.taskStore;
				this._taskMessageQueue = _options?.taskMessageQueue;
				if (this._taskStore) {
					this.setRequestHandler(GetTaskRequestSchema, async (request, extra) => {
						const task = await this._taskStore.getTask(request.params.taskId, extra.sessionId);
						if (!task) throw new McpError(ErrorCode.InvalidParams, "Failed to retrieve task: Task not found");
						return { ...task };
					});
					this.setRequestHandler(GetTaskPayloadRequestSchema, async (request, extra) => {
						const handleTaskResult = async () => {
							const taskId = request.params.taskId;
							if (this._taskMessageQueue) {
								let queuedMessage;
								while (queuedMessage = await this._taskMessageQueue.dequeue(taskId, extra.sessionId)) {
									if (queuedMessage.type === "response" || queuedMessage.type === "error") {
										const message = queuedMessage.message;
										const requestId = message.id;
										const resolver = this._requestResolvers.get(requestId);
										if (resolver) {
											this._requestResolvers.delete(requestId);
											if (queuedMessage.type === "response") resolver(message);
											else {
												const errorMessage = message;
												resolver(new McpError(errorMessage.error.code, errorMessage.error.message, errorMessage.error.data));
											}
										} else {
											const messageType = queuedMessage.type === "response" ? "Response" : "Error";
											this._onerror(/* @__PURE__ */ new Error(`${messageType} handler missing for request ${requestId}`));
										}
										continue;
									}
									await this._transport?.send(queuedMessage.message, { relatedRequestId: extra.requestId });
								}
							}
							const task = await this._taskStore.getTask(taskId, extra.sessionId);
							if (!task) throw new McpError(ErrorCode.InvalidParams, `Task not found: ${taskId}`);
							if (!isTerminal(task.status)) {
								await this._waitForTaskUpdate(taskId, extra.signal);
								return await handleTaskResult();
							}
							if (isTerminal(task.status)) {
								const result = await this._taskStore.getTaskResult(taskId, extra.sessionId);
								this._clearTaskQueue(taskId);
								return {
									...result,
									_meta: {
										...result._meta,
										[RELATED_TASK_META_KEY]: { taskId }
									}
								};
							}
							return await handleTaskResult();
						};
						return await handleTaskResult();
					});
					this.setRequestHandler(ListTasksRequestSchema, async (request, extra) => {
						try {
							const { tasks, nextCursor } = await this._taskStore.listTasks(request.params?.cursor, extra.sessionId);
							return {
								tasks,
								nextCursor,
								_meta: {}
							};
						} catch (error) {
							throw new McpError(ErrorCode.InvalidParams, `Failed to list tasks: ${error instanceof Error ? error.message : String(error)}`);
						}
					});
					this.setRequestHandler(CancelTaskRequestSchema, async (request, extra) => {
						try {
							const task = await this._taskStore.getTask(request.params.taskId, extra.sessionId);
							if (!task) throw new McpError(ErrorCode.InvalidParams, `Task not found: ${request.params.taskId}`);
							if (isTerminal(task.status)) throw new McpError(ErrorCode.InvalidParams, `Cannot cancel task in terminal status: ${task.status}`);
							await this._taskStore.updateTaskStatus(request.params.taskId, "cancelled", "Client cancelled task execution.", extra.sessionId);
							this._clearTaskQueue(request.params.taskId);
							const cancelledTask = await this._taskStore.getTask(request.params.taskId, extra.sessionId);
							if (!cancelledTask) throw new McpError(ErrorCode.InvalidParams, `Task not found after cancellation: ${request.params.taskId}`);
							return {
								_meta: {},
								...cancelledTask
							};
						} catch (error) {
							if (error instanceof McpError) throw error;
							throw new McpError(ErrorCode.InvalidRequest, `Failed to cancel task: ${error instanceof Error ? error.message : String(error)}`);
						}
					});
				}
			}
			async _oncancel(notification) {
				if (!notification.params.requestId) return;
				this._requestHandlerAbortControllers.get(notification.params.requestId)?.abort(notification.params.reason);
			}
			_setupTimeout(messageId, timeout, maxTotalTimeout, onTimeout, resetTimeoutOnProgress = false) {
				this._timeoutInfo.set(messageId, {
					timeoutId: setTimeout(onTimeout, timeout),
					startTime: Date.now(),
					timeout,
					maxTotalTimeout,
					resetTimeoutOnProgress,
					onTimeout
				});
			}
			_resetTimeout(messageId) {
				const info = this._timeoutInfo.get(messageId);
				if (!info) return false;
				const totalElapsed = Date.now() - info.startTime;
				if (info.maxTotalTimeout && totalElapsed >= info.maxTotalTimeout) {
					this._timeoutInfo.delete(messageId);
					throw McpError.fromError(ErrorCode.RequestTimeout, "Maximum total timeout exceeded", {
						maxTotalTimeout: info.maxTotalTimeout,
						totalElapsed
					});
				}
				clearTimeout(info.timeoutId);
				info.timeoutId = setTimeout(info.onTimeout, info.timeout);
				return true;
			}
			_cleanupTimeout(messageId) {
				const info = this._timeoutInfo.get(messageId);
				if (info) {
					clearTimeout(info.timeoutId);
					this._timeoutInfo.delete(messageId);
				}
			}
			/**
			* Attaches to the given transport, starts it, and starts listening for messages.
			*
			* The Protocol object assumes ownership of the Transport, replacing any callbacks that have already been set, and expects that it is the only user of the Transport instance going forward.
			*/
			async connect(transport) {
				if (this._transport) throw new Error("Already connected to a transport. Call close() before connecting to a new transport, or use a separate Protocol instance per connection.");
				this._transport = transport;
				const _onclose = this.transport?.onclose;
				this._transport.onclose = () => {
					_onclose?.();
					this._onclose();
				};
				const _onerror = this.transport?.onerror;
				this._transport.onerror = (error) => {
					_onerror?.(error);
					this._onerror(error);
				};
				const _onmessage = this._transport?.onmessage;
				this._transport.onmessage = (message, extra) => {
					_onmessage?.(message, extra);
					if (isJSONRPCResultResponse(message) || isJSONRPCErrorResponse(message)) this._onresponse(message);
					else if (isJSONRPCRequest(message)) this._onrequest(message, extra);
					else if (isJSONRPCNotification(message)) this._onnotification(message);
					else this._onerror(/* @__PURE__ */ new Error(`Unknown message type: ${JSON.stringify(message)}`));
				};
				await this._transport.start();
			}
			_onclose() {
				const responseHandlers = this._responseHandlers;
				this._responseHandlers = /* @__PURE__ */ new Map();
				this._progressHandlers.clear();
				this._taskProgressTokens.clear();
				this._pendingDebouncedNotifications.clear();
				for (const info of this._timeoutInfo.values()) clearTimeout(info.timeoutId);
				this._timeoutInfo.clear();
				for (const controller of this._requestHandlerAbortControllers.values()) controller.abort();
				this._requestHandlerAbortControllers.clear();
				const error = McpError.fromError(ErrorCode.ConnectionClosed, "Connection closed");
				this._transport = void 0;
				this.onclose?.();
				for (const handler of responseHandlers.values()) handler(error);
			}
			_onerror(error) {
				this.onerror?.(error);
			}
			_onnotification(notification) {
				const handler = this._notificationHandlers.get(notification.method) ?? this.fallbackNotificationHandler;
				if (handler === void 0) return;
				Promise.resolve().then(() => handler(notification)).catch((error) => this._onerror(/* @__PURE__ */ new Error(`Uncaught error in notification handler: ${error}`)));
			}
			_onrequest(request, extra) {
				const handler = this._requestHandlers.get(request.method) ?? this.fallbackRequestHandler;
				const capturedTransport = this._transport;
				const relatedTaskId = request.params?._meta?.[RELATED_TASK_META_KEY]?.taskId;
				if (handler === void 0) {
					const errorResponse = {
						jsonrpc: "2.0",
						id: request.id,
						error: {
							code: ErrorCode.MethodNotFound,
							message: "Method not found"
						}
					};
					if (relatedTaskId && this._taskMessageQueue) this._enqueueTaskMessage(relatedTaskId, {
						type: "error",
						message: errorResponse,
						timestamp: Date.now()
					}, capturedTransport?.sessionId).catch((error) => this._onerror(/* @__PURE__ */ new Error(`Failed to enqueue error response: ${error}`)));
					else capturedTransport?.send(errorResponse).catch((error) => this._onerror(/* @__PURE__ */ new Error(`Failed to send an error response: ${error}`)));
					return;
				}
				const abortController = new AbortController();
				this._requestHandlerAbortControllers.set(request.id, abortController);
				const taskCreationParams = isTaskAugmentedRequestParams(request.params) ? request.params.task : void 0;
				const taskStore = this._taskStore ? this.requestTaskStore(request, capturedTransport?.sessionId) : void 0;
				const fullExtra = {
					signal: abortController.signal,
					sessionId: capturedTransport?.sessionId,
					_meta: request.params?._meta,
					sendNotification: async (notification) => {
						if (abortController.signal.aborted) return;
						const notificationOptions = { relatedRequestId: request.id };
						if (relatedTaskId) notificationOptions.relatedTask = { taskId: relatedTaskId };
						await this.notification(notification, notificationOptions);
					},
					sendRequest: async (r, resultSchema, options) => {
						if (abortController.signal.aborted) throw new McpError(ErrorCode.ConnectionClosed, "Request was cancelled");
						const requestOptions = {
							...options,
							relatedRequestId: request.id
						};
						if (relatedTaskId && !requestOptions.relatedTask) requestOptions.relatedTask = { taskId: relatedTaskId };
						const effectiveTaskId = requestOptions.relatedTask?.taskId ?? relatedTaskId;
						if (effectiveTaskId && taskStore) await taskStore.updateTaskStatus(effectiveTaskId, "input_required");
						return await this.request(r, resultSchema, requestOptions);
					},
					authInfo: extra?.authInfo,
					requestId: request.id,
					requestInfo: extra?.requestInfo,
					taskId: relatedTaskId,
					taskStore,
					taskRequestedTtl: taskCreationParams?.ttl,
					closeSSEStream: extra?.closeSSEStream,
					closeStandaloneSSEStream: extra?.closeStandaloneSSEStream
				};
				Promise.resolve().then(() => {
					if (taskCreationParams) this.assertTaskHandlerCapability(request.method);
				}).then(() => handler(request, fullExtra)).then(async (result) => {
					if (abortController.signal.aborted) return;
					const response = {
						result,
						jsonrpc: "2.0",
						id: request.id
					};
					if (relatedTaskId && this._taskMessageQueue) await this._enqueueTaskMessage(relatedTaskId, {
						type: "response",
						message: response,
						timestamp: Date.now()
					}, capturedTransport?.sessionId);
					else await capturedTransport?.send(response);
				}, async (error) => {
					if (abortController.signal.aborted) return;
					const errorResponse = {
						jsonrpc: "2.0",
						id: request.id,
						error: {
							code: Number.isSafeInteger(error["code"]) ? error["code"] : ErrorCode.InternalError,
							message: error.message ?? "Internal error",
							...error["data"] !== void 0 && { data: error["data"] }
						}
					};
					if (relatedTaskId && this._taskMessageQueue) await this._enqueueTaskMessage(relatedTaskId, {
						type: "error",
						message: errorResponse,
						timestamp: Date.now()
					}, capturedTransport?.sessionId);
					else await capturedTransport?.send(errorResponse);
				}).catch((error) => this._onerror(/* @__PURE__ */ new Error(`Failed to send response: ${error}`))).finally(() => {
					if (this._requestHandlerAbortControllers.get(request.id) === abortController) this._requestHandlerAbortControllers.delete(request.id);
				});
			}
			_onprogress(notification) {
				const { progressToken, ...params } = notification.params;
				const messageId = Number(progressToken);
				const handler = this._progressHandlers.get(messageId);
				if (!handler) {
					this._onerror(/* @__PURE__ */ new Error(`Received a progress notification for an unknown token: ${JSON.stringify(notification)}`));
					return;
				}
				const responseHandler = this._responseHandlers.get(messageId);
				const timeoutInfo = this._timeoutInfo.get(messageId);
				if (timeoutInfo && responseHandler && timeoutInfo.resetTimeoutOnProgress) try {
					this._resetTimeout(messageId);
				} catch (error) {
					this._responseHandlers.delete(messageId);
					this._progressHandlers.delete(messageId);
					this._cleanupTimeout(messageId);
					responseHandler(error);
					return;
				}
				handler(params);
			}
			_onresponse(response) {
				const messageId = Number(response.id);
				const resolver = this._requestResolvers.get(messageId);
				if (resolver) {
					this._requestResolvers.delete(messageId);
					if (isJSONRPCResultResponse(response)) resolver(response);
					else resolver(new McpError(response.error.code, response.error.message, response.error.data));
					return;
				}
				const handler = this._responseHandlers.get(messageId);
				if (handler === void 0) {
					this._onerror(/* @__PURE__ */ new Error(`Received a response for an unknown message ID: ${JSON.stringify(response)}`));
					return;
				}
				this._responseHandlers.delete(messageId);
				this._cleanupTimeout(messageId);
				let isTaskResponse = false;
				if (isJSONRPCResultResponse(response) && response.result && typeof response.result === "object") {
					const result = response.result;
					if (result.task && typeof result.task === "object") {
						const task = result.task;
						if (typeof task.taskId === "string") {
							isTaskResponse = true;
							this._taskProgressTokens.set(task.taskId, messageId);
						}
					}
				}
				if (!isTaskResponse) this._progressHandlers.delete(messageId);
				if (isJSONRPCResultResponse(response)) handler(response);
				else handler(McpError.fromError(response.error.code, response.error.message, response.error.data));
			}
			get transport() {
				return this._transport;
			}
			/**
			* Closes the connection.
			*/
			async close() {
				await this._transport?.close();
			}
			/**
			* Sends a request and returns an AsyncGenerator that yields response messages.
			* The generator is guaranteed to end with either a 'result' or 'error' message.
			*
			* @example
			* ```typescript
			* const stream = protocol.requestStream(request, resultSchema, options);
			* for await (const message of stream) {
			*   switch (message.type) {
			*     case 'taskCreated':
			*       console.log('Task created:', message.task.taskId);
			*       break;
			*     case 'taskStatus':
			*       console.log('Task status:', message.task.status);
			*       break;
			*     case 'result':
			*       console.log('Final result:', message.result);
			*       break;
			*     case 'error':
			*       console.error('Error:', message.error);
			*       break;
			*   }
			* }
			* ```
			*
			* @experimental Use `client.experimental.tasks.requestStream()` to access this method.
			*/
			async *requestStream(request, resultSchema, options) {
				const { task } = options ?? {};
				if (!task) {
					try {
						yield {
							type: "result",
							result: await this.request(request, resultSchema, options)
						};
					} catch (error) {
						yield {
							type: "error",
							error: error instanceof McpError ? error : new McpError(ErrorCode.InternalError, String(error))
						};
					}
					return;
				}
				let taskId;
				try {
					const createResult = await this.request(request, CreateTaskResultSchema, options);
					if (createResult.task) {
						taskId = createResult.task.taskId;
						yield {
							type: "taskCreated",
							task: createResult.task
						};
					} else throw new McpError(ErrorCode.InternalError, "Task creation did not return a task");
					while (true) {
						const task = await this.getTask({ taskId }, options);
						yield {
							type: "taskStatus",
							task
						};
						if (isTerminal(task.status)) {
							if (task.status === "completed") yield {
								type: "result",
								result: await this.getTaskResult({ taskId }, resultSchema, options)
							};
							else if (task.status === "failed") yield {
								type: "error",
								error: new McpError(ErrorCode.InternalError, `Task ${taskId} failed`)
							};
							else if (task.status === "cancelled") yield {
								type: "error",
								error: new McpError(ErrorCode.InternalError, `Task ${taskId} was cancelled`)
							};
							return;
						}
						if (task.status === "input_required") {
							yield {
								type: "result",
								result: await this.getTaskResult({ taskId }, resultSchema, options)
							};
							return;
						}
						const pollInterval = task.pollInterval ?? this._options?.defaultTaskPollInterval ?? 1e3;
						await new Promise((resolve) => setTimeout(resolve, pollInterval));
						options?.signal?.throwIfAborted();
					}
				} catch (error) {
					yield {
						type: "error",
						error: error instanceof McpError ? error : new McpError(ErrorCode.InternalError, String(error))
					};
				}
			}
			/**
			* Sends a request and waits for a response.
			*
			* Do not use this method to emit notifications! Use notification() instead.
			*/
			request(request, resultSchema, options) {
				const { relatedRequestId, resumptionToken, onresumptiontoken, task, relatedTask } = options ?? {};
				return new Promise((resolve, reject) => {
					const earlyReject = (error) => {
						reject(error);
					};
					if (!this._transport) {
						earlyReject(/* @__PURE__ */ new Error("Not connected"));
						return;
					}
					if (this._options?.enforceStrictCapabilities === true) try {
						this.assertCapabilityForMethod(request.method);
						if (task) this.assertTaskCapability(request.method);
					} catch (e) {
						earlyReject(e);
						return;
					}
					options?.signal?.throwIfAborted();
					const messageId = this._requestMessageId++;
					const jsonrpcRequest = {
						...request,
						jsonrpc: "2.0",
						id: messageId
					};
					if (options?.onprogress) {
						this._progressHandlers.set(messageId, options.onprogress);
						jsonrpcRequest.params = {
							...request.params,
							_meta: {
								...request.params?._meta || {},
								progressToken: messageId
							}
						};
					}
					if (task) jsonrpcRequest.params = {
						...jsonrpcRequest.params,
						task
					};
					if (relatedTask) jsonrpcRequest.params = {
						...jsonrpcRequest.params,
						_meta: {
							...jsonrpcRequest.params?._meta || {},
							[RELATED_TASK_META_KEY]: relatedTask
						}
					};
					const cancel = (reason) => {
						this._responseHandlers.delete(messageId);
						this._progressHandlers.delete(messageId);
						this._cleanupTimeout(messageId);
						this._transport?.send({
							jsonrpc: "2.0",
							method: "notifications/cancelled",
							params: {
								requestId: messageId,
								reason: String(reason)
							}
						}, {
							relatedRequestId,
							resumptionToken,
							onresumptiontoken
						}).catch((error) => this._onerror(/* @__PURE__ */ new Error(`Failed to send cancellation: ${error}`)));
						reject(reason instanceof McpError ? reason : new McpError(ErrorCode.RequestTimeout, String(reason)));
					};
					this._responseHandlers.set(messageId, (response) => {
						if (options?.signal?.aborted) return;
						if (response instanceof Error) return reject(response);
						try {
							const parseResult = safeParse(resultSchema, response.result);
							if (!parseResult.success) reject(parseResult.error);
							else resolve(parseResult.data);
						} catch (error) {
							reject(error);
						}
					});
					options?.signal?.addEventListener("abort", () => {
						cancel(options?.signal?.reason);
					});
					const timeout = options?.timeout ?? 6e4;
					const timeoutHandler = () => cancel(McpError.fromError(ErrorCode.RequestTimeout, "Request timed out", { timeout }));
					this._setupTimeout(messageId, timeout, options?.maxTotalTimeout, timeoutHandler, options?.resetTimeoutOnProgress ?? false);
					const relatedTaskId = relatedTask?.taskId;
					if (relatedTaskId) {
						const responseResolver = (response) => {
							const handler = this._responseHandlers.get(messageId);
							if (handler) handler(response);
							else this._onerror(/* @__PURE__ */ new Error(`Response handler missing for side-channeled request ${messageId}`));
						};
						this._requestResolvers.set(messageId, responseResolver);
						this._enqueueTaskMessage(relatedTaskId, {
							type: "request",
							message: jsonrpcRequest,
							timestamp: Date.now()
						}).catch((error) => {
							this._cleanupTimeout(messageId);
							reject(error);
						});
					} else this._transport.send(jsonrpcRequest, {
						relatedRequestId,
						resumptionToken,
						onresumptiontoken
					}).catch((error) => {
						this._cleanupTimeout(messageId);
						reject(error);
					});
				});
			}
			/**
			* Gets the current status of a task.
			*
			* @experimental Use `client.experimental.tasks.getTask()` to access this method.
			*/
			async getTask(params, options) {
				return this.request({
					method: "tasks/get",
					params
				}, GetTaskResultSchema, options);
			}
			/**
			* Retrieves the result of a completed task.
			*
			* @experimental Use `client.experimental.tasks.getTaskResult()` to access this method.
			*/
			async getTaskResult(params, resultSchema, options) {
				return this.request({
					method: "tasks/result",
					params
				}, resultSchema, options);
			}
			/**
			* Lists tasks, optionally starting from a pagination cursor.
			*
			* @experimental Use `client.experimental.tasks.listTasks()` to access this method.
			*/
			async listTasks(params, options) {
				return this.request({
					method: "tasks/list",
					params
				}, ListTasksResultSchema, options);
			}
			/**
			* Cancels a specific task.
			*
			* @experimental Use `client.experimental.tasks.cancelTask()` to access this method.
			*/
			async cancelTask(params, options) {
				return this.request({
					method: "tasks/cancel",
					params
				}, CancelTaskResultSchema, options);
			}
			/**
			* Emits a notification, which is a one-way message that does not expect a response.
			*/
			async notification(notification, options) {
				if (!this._transport) throw new Error("Not connected");
				this.assertNotificationCapability(notification.method);
				const relatedTaskId = options?.relatedTask?.taskId;
				if (relatedTaskId) {
					const jsonrpcNotification = {
						...notification,
						jsonrpc: "2.0",
						params: {
							...notification.params,
							_meta: {
								...notification.params?._meta || {},
								[RELATED_TASK_META_KEY]: options.relatedTask
							}
						}
					};
					await this._enqueueTaskMessage(relatedTaskId, {
						type: "notification",
						message: jsonrpcNotification,
						timestamp: Date.now()
					});
					return;
				}
				if ((this._options?.debouncedNotificationMethods ?? []).includes(notification.method) && !notification.params && !options?.relatedRequestId && !options?.relatedTask) {
					if (this._pendingDebouncedNotifications.has(notification.method)) return;
					this._pendingDebouncedNotifications.add(notification.method);
					Promise.resolve().then(() => {
						this._pendingDebouncedNotifications.delete(notification.method);
						if (!this._transport) return;
						let jsonrpcNotification = {
							...notification,
							jsonrpc: "2.0"
						};
						if (options?.relatedTask) jsonrpcNotification = {
							...jsonrpcNotification,
							params: {
								...jsonrpcNotification.params,
								_meta: {
									...jsonrpcNotification.params?._meta || {},
									[RELATED_TASK_META_KEY]: options.relatedTask
								}
							}
						};
						this._transport?.send(jsonrpcNotification, options).catch((error) => this._onerror(error));
					});
					return;
				}
				let jsonrpcNotification = {
					...notification,
					jsonrpc: "2.0"
				};
				if (options?.relatedTask) jsonrpcNotification = {
					...jsonrpcNotification,
					params: {
						...jsonrpcNotification.params,
						_meta: {
							...jsonrpcNotification.params?._meta || {},
							[RELATED_TASK_META_KEY]: options.relatedTask
						}
					}
				};
				await this._transport.send(jsonrpcNotification, options);
			}
			/**
			* Registers a handler to invoke when this protocol object receives a request with the given method.
			*
			* Note that this will replace any previous request handler for the same method.
			*/
			setRequestHandler(requestSchema, handler) {
				const method = getMethodLiteral(requestSchema);
				this.assertRequestHandlerCapability(method);
				this._requestHandlers.set(method, (request, extra) => {
					const parsed = parseWithCompat(requestSchema, request);
					return Promise.resolve(handler(parsed, extra));
				});
			}
			/**
			* Removes the request handler for the given method.
			*/
			removeRequestHandler(method) {
				this._requestHandlers.delete(method);
			}
			/**
			* Asserts that a request handler has not already been set for the given method, in preparation for a new one being automatically installed.
			*/
			assertCanSetRequestHandler(method) {
				if (this._requestHandlers.has(method)) throw new Error(`A request handler for ${method} already exists, which would be overridden`);
			}
			/**
			* Registers a handler to invoke when this protocol object receives a notification with the given method.
			*
			* Note that this will replace any previous notification handler for the same method.
			*/
			setNotificationHandler(notificationSchema, handler) {
				const method = getMethodLiteral(notificationSchema);
				this._notificationHandlers.set(method, (notification) => {
					const parsed = parseWithCompat(notificationSchema, notification);
					return Promise.resolve(handler(parsed));
				});
			}
			/**
			* Removes the notification handler for the given method.
			*/
			removeNotificationHandler(method) {
				this._notificationHandlers.delete(method);
			}
			/**
			* Cleans up the progress handler associated with a task.
			* This should be called when a task reaches a terminal status.
			*/
			_cleanupTaskProgressHandler(taskId) {
				const progressToken = this._taskProgressTokens.get(taskId);
				if (progressToken !== void 0) {
					this._progressHandlers.delete(progressToken);
					this._taskProgressTokens.delete(taskId);
				}
			}
			/**
			* Enqueues a task-related message for side-channel delivery via tasks/result.
			* @param taskId The task ID to associate the message with
			* @param message The message to enqueue
			* @param sessionId Optional session ID for binding the operation to a specific session
			* @throws Error if taskStore is not configured or if enqueue fails (e.g., queue overflow)
			*
			* Note: If enqueue fails, it's the TaskMessageQueue implementation's responsibility to handle
			* the error appropriately (e.g., by failing the task, logging, etc.). The Protocol layer
			* simply propagates the error.
			*/
			async _enqueueTaskMessage(taskId, message, sessionId) {
				if (!this._taskStore || !this._taskMessageQueue) throw new Error("Cannot enqueue task message: taskStore and taskMessageQueue are not configured");
				const maxQueueSize = this._options?.maxTaskQueueSize;
				await this._taskMessageQueue.enqueue(taskId, message, sessionId, maxQueueSize);
			}
			/**
			* Clears the message queue for a task and rejects any pending request resolvers.
			* @param taskId The task ID whose queue should be cleared
			* @param sessionId Optional session ID for binding the operation to a specific session
			*/
			async _clearTaskQueue(taskId, sessionId) {
				if (this._taskMessageQueue) {
					const messages = await this._taskMessageQueue.dequeueAll(taskId, sessionId);
					for (const message of messages) if (message.type === "request" && isJSONRPCRequest(message.message)) {
						const requestId = message.message.id;
						const resolver = this._requestResolvers.get(requestId);
						if (resolver) {
							resolver(new McpError(ErrorCode.InternalError, "Task cancelled or completed"));
							this._requestResolvers.delete(requestId);
						} else this._onerror(/* @__PURE__ */ new Error(`Resolver missing for request ${requestId} during task ${taskId} cleanup`));
					}
				}
			}
			/**
			* Waits for a task update (new messages or status change) with abort signal support.
			* Uses polling to check for updates at the task's configured poll interval.
			* @param taskId The task ID to wait for
			* @param signal Abort signal to cancel the wait
			* @returns Promise that resolves when an update occurs or rejects if aborted
			*/
			async _waitForTaskUpdate(taskId, signal) {
				let interval = this._options?.defaultTaskPollInterval ?? 1e3;
				try {
					const task = await this._taskStore?.getTask(taskId);
					if (task?.pollInterval) interval = task.pollInterval;
				} catch {}
				return new Promise((resolve, reject) => {
					if (signal.aborted) {
						reject(new McpError(ErrorCode.InvalidRequest, "Request cancelled"));
						return;
					}
					const timeoutId = setTimeout(resolve, interval);
					signal.addEventListener("abort", () => {
						clearTimeout(timeoutId);
						reject(new McpError(ErrorCode.InvalidRequest, "Request cancelled"));
					}, { once: true });
				});
			}
			requestTaskStore(request, sessionId) {
				const taskStore = this._taskStore;
				if (!taskStore) throw new Error("No task store configured");
				return {
					createTask: async (taskParams) => {
						if (!request) throw new Error("No request provided");
						return await taskStore.createTask(taskParams, request.id, {
							method: request.method,
							params: request.params
						}, sessionId);
					},
					getTask: async (taskId) => {
						const task = await taskStore.getTask(taskId, sessionId);
						if (!task) throw new McpError(ErrorCode.InvalidParams, "Failed to retrieve task: Task not found");
						return task;
					},
					storeTaskResult: async (taskId, status, result) => {
						await taskStore.storeTaskResult(taskId, status, result, sessionId);
						const task = await taskStore.getTask(taskId, sessionId);
						if (task) {
							const notification = TaskStatusNotificationSchema.parse({
								method: "notifications/tasks/status",
								params: task
							});
							await this.notification(notification);
							if (isTerminal(task.status)) this._cleanupTaskProgressHandler(taskId);
						}
					},
					getTaskResult: (taskId) => {
						return taskStore.getTaskResult(taskId, sessionId);
					},
					updateTaskStatus: async (taskId, status, statusMessage) => {
						const task = await taskStore.getTask(taskId, sessionId);
						if (!task) throw new McpError(ErrorCode.InvalidParams, `Task "${taskId}" not found - it may have been cleaned up`);
						if (isTerminal(task.status)) throw new McpError(ErrorCode.InvalidParams, `Cannot update task "${taskId}" from terminal status "${task.status}" to "${status}". Terminal states (completed, failed, cancelled) cannot transition to other states.`);
						await taskStore.updateTaskStatus(taskId, status, statusMessage, sessionId);
						const updatedTask = await taskStore.getTask(taskId, sessionId);
						if (updatedTask) {
							const notification = TaskStatusNotificationSchema.parse({
								method: "notifications/tasks/status",
								params: updatedTask
							});
							await this.notification(notification);
							if (isTerminal(updatedTask.status)) this._cleanupTaskProgressHandler(taskId);
						}
					},
					listTasks: (cursor) => {
						return taskStore.listTasks(cursor, sessionId);
					}
				};
			}
		};
		//#endregion
		//#region ../../node_modules/.pnpm/@modelcontextprotocol+ext-apps@1.7.5_@modelcontextprotocol+sdk@1.30.0_zod@4.4.3__react-_e8fcc2452f12c4dd2d3ca2c62e8338d4/node_modules/@modelcontextprotocol/ext-apps/dist/src/app-bridge.js
		((X) => typeof require < "u" ? require : typeof Proxy < "u" ? new Proxy(X, { get: (Y, Z) => (typeof require < "u" ? require : Y)[Z] }) : X)(function(X) {
			if (typeof require < "u") return require.apply(this, arguments);
			throw Error("Dynamic require of \"" + X + "\" is not supported");
		});
		var _ = class extends Protocol {
			_registeredMethods = /* @__PURE__ */ new Set();
			_eventSlots = /* @__PURE__ */ new Map();
			onEventDispatch(X, Y) {}
			_ensureEventSlot(X) {
				let Y = this._eventSlots.get(X);
				if (!Y) {
					let Z = this.eventSchemas[X];
					if (!Z) throw Error(`Unknown event: ${String(X)}`);
					Y = { listeners: [] }, this._eventSlots.set(X, Y);
					let $ = Z.shape.method.value;
					this._registeredMethods.add($);
					let J = Y;
					super.setNotificationHandler(Z, (K) => {
						let D = K.params;
						this.onEventDispatch(X, D), J.onHandler?.(D);
						for (let G of [...J.listeners]) G(D);
					});
				}
				return Y;
			}
			setEventHandler(X, Y) {
				let Z = this._ensureEventSlot(X);
				if (Z.onHandler && Y) console.warn(`[MCP Apps] on${String(X)} handler replaced. Use addEventListener("${String(X)}", …) to add multiple listeners without replacing.`);
				Z.onHandler = Y;
			}
			getEventHandler(X) {
				return this._eventSlots.get(X)?.onHandler;
			}
			addEventListener(X, Y) {
				this._ensureEventSlot(X).listeners.push(Y);
			}
			removeEventListener(X, Y) {
				let Z = this._eventSlots.get(X);
				if (!Z) return;
				let $ = Z.listeners.indexOf(Y);
				if ($ !== -1) Z.listeners.splice($, 1);
			}
			setRequestHandler = (X, Y) => {
				this._assertMethodNotRegistered(X, "setRequestHandler"), super.setRequestHandler(X, Y);
			};
			setNotificationHandler = (X, Y) => {
				this._assertMethodNotRegistered(X, "setNotificationHandler"), super.setNotificationHandler(X, Y);
			};
			warnIfRequestHandlerReplaced(X, Y, Z) {
				if (Y && Z) console.warn(`[MCP Apps] ${X} handler replaced. Previous handler will no longer be called.`);
			}
			replaceRequestHandler = (X, Y) => {
				let Z = X.shape.method.value;
				this._registeredMethods.add(Z), super.setRequestHandler(X, Y);
			};
			_assertMethodNotRegistered(X, Y) {
				let Z = X.shape.method.value;
				if (this._registeredMethods.has(Z)) throw Error(`Handler for "${Z}" already registered (via ${Y}). Use addEventListener() to attach multiple listeners, or the on* setter for replace semantics.`);
				this._registeredMethods.add(Z);
			}
		};
		var j = "2026-01-26";
		var r = union([literal("light"), literal("dark")]).describe("Color theme preference for the host environment.");
		var B = union([
			literal("inline"),
			literal("fullscreen"),
			literal("pip")
		]).describe("Display mode for UI presentation.");
		var RQ = record$1(union([
			literal("--color-background-primary"),
			literal("--color-background-secondary"),
			literal("--color-background-tertiary"),
			literal("--color-background-inverse"),
			literal("--color-background-ghost"),
			literal("--color-background-info"),
			literal("--color-background-danger"),
			literal("--color-background-success"),
			literal("--color-background-warning"),
			literal("--color-background-disabled"),
			literal("--color-text-primary"),
			literal("--color-text-secondary"),
			literal("--color-text-tertiary"),
			literal("--color-text-inverse"),
			literal("--color-text-ghost"),
			literal("--color-text-info"),
			literal("--color-text-danger"),
			literal("--color-text-success"),
			literal("--color-text-warning"),
			literal("--color-text-disabled"),
			literal("--color-border-primary"),
			literal("--color-border-secondary"),
			literal("--color-border-tertiary"),
			literal("--color-border-inverse"),
			literal("--color-border-ghost"),
			literal("--color-border-info"),
			literal("--color-border-danger"),
			literal("--color-border-success"),
			literal("--color-border-warning"),
			literal("--color-border-disabled"),
			literal("--color-ring-primary"),
			literal("--color-ring-secondary"),
			literal("--color-ring-inverse"),
			literal("--color-ring-info"),
			literal("--color-ring-danger"),
			literal("--color-ring-success"),
			literal("--color-ring-warning"),
			literal("--font-sans"),
			literal("--font-mono"),
			literal("--font-weight-normal"),
			literal("--font-weight-medium"),
			literal("--font-weight-semibold"),
			literal("--font-weight-bold"),
			literal("--font-text-xs-size"),
			literal("--font-text-sm-size"),
			literal("--font-text-md-size"),
			literal("--font-text-lg-size"),
			literal("--font-heading-xs-size"),
			literal("--font-heading-sm-size"),
			literal("--font-heading-md-size"),
			literal("--font-heading-lg-size"),
			literal("--font-heading-xl-size"),
			literal("--font-heading-2xl-size"),
			literal("--font-heading-3xl-size"),
			literal("--font-text-xs-line-height"),
			literal("--font-text-sm-line-height"),
			literal("--font-text-md-line-height"),
			literal("--font-text-lg-line-height"),
			literal("--font-heading-xs-line-height"),
			literal("--font-heading-sm-line-height"),
			literal("--font-heading-md-line-height"),
			literal("--font-heading-lg-line-height"),
			literal("--font-heading-xl-line-height"),
			literal("--font-heading-2xl-line-height"),
			literal("--font-heading-3xl-line-height"),
			literal("--border-radius-xs"),
			literal("--border-radius-sm"),
			literal("--border-radius-md"),
			literal("--border-radius-lg"),
			literal("--border-radius-xl"),
			literal("--border-radius-full"),
			literal("--border-width-regular"),
			literal("--shadow-hairline"),
			literal("--shadow-sm"),
			literal("--shadow-md"),
			literal("--shadow-lg")
		]).describe("CSS variable keys available to MCP apps for theming.").describe(`Style variables for theming MCP apps.

Individual style keys are optional - hosts may provide any subset of these values.
Values are strings containing CSS values (colors, sizes, font stacks, etc.).

Note: This type uses \`Record<K, string | undefined>\` rather than \`Partial<Record<K, string>>\`
for compatibility with Zod schema generation. Both are functionally equivalent for validation.`), union([string(), _undefined()]).describe(`Style variables for theming MCP apps.

Individual style keys are optional - hosts may provide any subset of these values.
Values are strings containing CSS values (colors, sizes, font stacks, etc.).

Note: This type uses \`Record<K, string | undefined>\` rather than \`Partial<Record<K, string>>\`
for compatibility with Zod schema generation. Both are functionally equivalent for validation.`)).describe(`Style variables for theming MCP apps.

Individual style keys are optional - hosts may provide any subset of these values.
Values are strings containing CSS values (colors, sizes, font stacks, etc.).

Note: This type uses \`Record<K, string | undefined>\` rather than \`Partial<Record<K, string>>\`
for compatibility with Zod schema generation. Both are functionally equivalent for validation.`);
		var L = object({
			method: literal("ui/open-link"),
			params: object({ url: string().describe("URL to open in the host's browser") })
		});
		object({ isError: boolean().optional().describe("True if the host failed to open the URL (e.g., due to security policy).") }).passthrough();
		object({ isError: boolean().optional().describe("True if the download failed (e.g., user cancelled or host denied).") }).passthrough();
		object({ isError: boolean().optional().describe("True if the host rejected or failed to deliver the message.") }).passthrough();
		var w = object({
			method: literal("ui/notifications/sandbox-proxy-ready"),
			params: object({})
		});
		var O = object({
			connectDomains: array(string()).optional().describe(`Origins for network requests (fetch/XHR/WebSocket).

- Maps to CSP \`connect-src\` directive
- Empty or omitted → no network connections (secure default)`),
			resourceDomains: array(string()).optional().describe("Origins for static resources (images, scripts, stylesheets, fonts, media).\n\n- Maps to CSP `img-src`, `script-src`, `style-src`, `font-src`, `media-src` directives\n- Wildcard subdomains supported: `https://*.example.com`\n- Empty or omitted → no network resources (secure default)"),
			frameDomains: array(string()).optional().describe("Origins for nested iframes.\n\n- Maps to CSP `frame-src` directive\n- Empty or omitted → no nested iframes allowed (`frame-src 'none'`)"),
			baseUriDomains: array(string()).optional().describe("Allowed base URIs for the document.\n\n- Maps to CSP `base-uri` directive\n- Empty or omitted → only same origin allowed (`base-uri 'self'`)")
		});
		var z = object({
			camera: object({}).optional().describe("Request camera access.\n\nMaps to Permission Policy `camera` feature."),
			microphone: object({}).optional().describe("Request microphone access.\n\nMaps to Permission Policy `microphone` feature."),
			geolocation: object({}).optional().describe("Request geolocation access.\n\nMaps to Permission Policy `geolocation` feature."),
			clipboardWrite: object({}).optional().describe("Request clipboard write access.\n\nMaps to Permission Policy `clipboard-write` feature.")
		});
		var H = object({
			method: literal("ui/notifications/size-changed"),
			params: object({
				width: number().optional().describe("New width in pixels."),
				height: number().optional().describe("New height in pixels.")
			})
		});
		object({
			method: literal("ui/notifications/tool-input"),
			params: object({ arguments: record$1(string(), unknown().describe("Complete tool call arguments as key-value pairs.")).optional().describe("Complete tool call arguments as key-value pairs.") })
		});
		object({
			method: literal("ui/notifications/tool-input-partial"),
			params: object({ arguments: record$1(string(), unknown().describe("Partial tool call arguments (incomplete, may change).")).optional().describe("Partial tool call arguments (incomplete, may change).") })
		});
		object({
			method: literal("ui/notifications/tool-cancelled"),
			params: object({ reason: string().optional().describe("Optional reason for the cancellation (e.g., \"user action\", \"timeout\").") })
		});
		var o = object({ fonts: string().optional() });
		var s = object({
			variables: RQ.optional().describe("CSS variables for theming the app."),
			css: o.optional().describe("CSS blocks that apps can inject.")
		});
		object({
			method: literal("ui/resource-teardown"),
			params: object({})
		});
		var S = record$1(string(), unknown());
		var F = object({
			text: object({}).optional().describe("Host supports text content blocks."),
			image: object({}).optional().describe("Host supports image content blocks."),
			audio: object({}).optional().describe("Host supports audio content blocks."),
			resource: object({}).optional().describe("Host supports resource content blocks."),
			resourceLink: object({}).optional().describe("Host supports resource link content blocks."),
			structuredContent: object({}).optional().describe("Host supports structured content.")
		});
		var q = object({
			method: literal("ui/notifications/request-teardown"),
			params: object({}).optional()
		});
		var t = object({
			experimental: record$1(string(), record$1(string(), any()).describe("Experimental features keyed by identifier.")).optional().describe("Experimental features keyed by identifier."),
			openLinks: object({}).optional().describe("Host supports opening external URLs."),
			downloadFile: object({}).optional().describe("Host supports file downloads via ui/download-file."),
			serverTools: object({ listChanged: boolean().optional().describe("Host supports tools/list_changed notifications.") }).optional().describe("Host can proxy tool calls to the MCP server."),
			serverResources: object({ listChanged: boolean().optional().describe("Host supports resources/list_changed notifications.") }).optional().describe("Host can proxy resource reads to the MCP server."),
			logging: object({}).optional().describe("Host accepts log messages."),
			sandbox: object({
				permissions: z.optional().describe("Permissions granted by the host (camera, microphone, geolocation)."),
				csp: O.optional().describe("CSP domains approved by the host.")
			}).optional().describe("Sandbox configuration applied by the host."),
			updateModelContext: F.optional().describe("Host accepts context updates (ui/update-model-context) to be included in the model's context for future turns."),
			message: F.optional().describe("Host supports receiving content messages (ui/message) from the view."),
			sampling: object({ tools: object({}).optional().describe("Host supports tool use via `tools` and `toolChoice` parameters.") }).optional().describe("Host supports LLM sampling (sampling/createMessage) from the view.\nMirrors the MCP `ClientCapabilities.sampling` shape so hosts can pass it through.")
		});
		var a = object({
			experimental: record$1(string(), record$1(string(), any()).describe("Experimental features keyed by identifier.")).optional().describe("Experimental features keyed by identifier."),
			tools: object({ listChanged: boolean().optional().describe("App supports tools/list_changed notifications.") }).optional().describe("App exposes MCP-style tools that the host can call."),
			availableDisplayModes: array(B).optional().describe("Display modes the app supports.")
		});
		var y = object({
			method: literal("ui/notifications/initialized"),
			params: object({}).optional()
		});
		object({
			csp: O.optional().describe("Content Security Policy configuration for UI resources."),
			permissions: z.optional().describe("Sandbox permissions requested by the UI resource."),
			domain: string().optional().describe(`Dedicated origin for view sandbox.

Useful when views need stable, dedicated origins for OAuth callbacks, CORS policies, or API key allowlists.

**Host-dependent:** The format and validation rules for this field are determined by each host. Servers MUST consult host-specific documentation for the expected domain format. Common patterns include:
- Hash-based subdomains (e.g., \`{hash}.claudemcpcontent.com\`)
- URL-derived subdomains (e.g., \`www-example-com.oaiusercontent.com\`)

If omitted, host uses default sandbox origin (typically per-conversation).`),
			prefersBorder: boolean().optional().describe(`Visual boundary preference - true if view prefers a visible border.

Boolean requesting whether a visible border and background is provided by the host. Specifying an explicit value for this is recommended because hosts' defaults may vary.

- \`true\`: request visible border + background
- \`false\`: request no visible border + background
- omitted: host decides border`)
		});
		var I = object({
			method: literal("ui/request-display-mode"),
			params: object({ mode: B.describe("The display mode being requested.") })
		});
		object({ mode: B.describe("The display mode that was actually set. May differ from requested if not supported.") }).passthrough();
		var e = union([literal("model"), literal("app")]).describe("Tool visibility scope - who can access the tool.");
		object({
			resourceUri: string().optional(),
			visibility: array(e).optional().describe(`Who can access this tool. Default: ["model", "app"]
- "model": Tool visible to and callable by the agent
- "app": Tool callable by the app from this server only`),
			csp: never().optional(),
			permissions: never().optional()
		});
		object({ mimeTypes: array(string()).optional().describe("Array of supported MIME types for UI resources.\nMust include `\"text/html;profile=mcp-app\"` for MCP Apps support.") });
		var f = object({
			method: literal("ui/download-file"),
			params: object({ contents: array(union([EmbeddedResourceSchema, ResourceLinkSchema])).describe("Resource contents to download — embedded (inline data) or linked (host fetches). Uses standard MCP resource types.") })
		});
		var k = object({
			method: literal("ui/message"),
			params: object({
				role: literal("user").describe("Message role, currently only \"user\" is supported."),
				content: array(ContentBlockSchema).describe("Message content blocks (text, image, etc.).")
			})
		});
		object({
			method: literal("ui/notifications/sandbox-resource-ready"),
			params: object({
				html: string().describe("HTML content to load into the inner iframe."),
				sandbox: string().optional().describe("Optional override for the inner iframe's sandbox attribute."),
				csp: O.optional().describe("CSP configuration from resource metadata."),
				permissions: z.optional().describe("Sandbox permissions from resource metadata.")
			})
		});
		object({
			method: literal("ui/notifications/tool-result"),
			params: CallToolResultSchema.describe("Standard MCP tool execution result.")
		});
		var x = object({
			toolInfo: object({
				id: RequestIdSchema.optional().describe("JSON-RPC id of the tools/call request."),
				tool: ToolSchema.describe("Tool definition including name, inputSchema, etc.")
			}).optional().describe("Metadata of the tool call that instantiated this App."),
			theme: r.optional().describe("Current color theme preference."),
			styles: s.optional().describe("Style configuration for theming the app."),
			displayMode: B.optional().describe("How the UI is currently displayed."),
			availableDisplayModes: array(B).optional().describe("Display modes the host supports."),
			containerDimensions: union([object({ height: number().describe("Fixed container height in pixels.") }), object({ maxHeight: union([number(), _undefined()]).optional().describe("Maximum container height in pixels.") })]).and(union([object({ width: number().describe("Fixed container width in pixels.") }), object({ maxWidth: union([number(), _undefined()]).optional().describe("Maximum container width in pixels.") })])).optional().describe(`Container dimensions. Represents the dimensions of the iframe or other
container holding the app. Specify either width or maxWidth, and either height or maxHeight.`),
			locale: string().optional().describe("User's language and region preference in BCP 47 format."),
			timeZone: string().optional().describe("User's timezone in IANA format."),
			userAgent: string().optional().describe("Host application identifier."),
			platform: union([
				literal("web"),
				literal("desktop"),
				literal("mobile")
			]).optional().describe("Platform type for responsive design decisions."),
			deviceCapabilities: object({
				touch: boolean().optional().describe("Whether the device supports touch input."),
				hover: boolean().optional().describe("Whether the device supports hover interactions.")
			}).optional().describe("Device input capabilities."),
			safeAreaInsets: object({
				top: number().describe("Top safe area inset in pixels."),
				right: number().describe("Right safe area inset in pixels."),
				bottom: number().describe("Bottom safe area inset in pixels."),
				left: number().describe("Left safe area inset in pixels.")
			}).optional().describe("Mobile safe area boundaries in pixels.")
		}).passthrough();
		object({
			method: literal("ui/notifications/host-context-changed"),
			params: x.describe("Partial context update containing only changed fields.")
		});
		var d = object({
			method: literal("ui/update-model-context"),
			params: object({
				content: array(ContentBlockSchema).optional().describe("Context content blocks (text, image, etc.)."),
				structuredContent: record$1(string(), unknown().describe("Structured content for machine-readable context data.")).optional().describe("Structured content for machine-readable context data.")
			})
		});
		var u = object({
			method: literal("ui/initialize"),
			params: object({
				appInfo: ImplementationSchema.describe("App identification (name and version)."),
				appCapabilities: a.describe("Features and capabilities this app provides."),
				protocolVersion: string().describe("Protocol version this app supports.")
			})
		});
		object({
			protocolVersion: string().describe("Negotiated protocol version string (e.g., \"2025-11-21\")."),
			hostInfo: ImplementationSchema.describe("Host application identification and version."),
			hostCapabilities: t.describe("Features and capabilities provided by the host."),
			hostContext: x.describe("Rich context about the host environment.")
		}).passthrough();
		var KX = [j];
		var DX = class extends _ {
			_client;
			_hostInfo;
			_capabilities;
			_appCapabilities;
			_hostContext = {};
			_appInfo;
			_initializedReceived = !1;
			_baseReplaceRequestHandler = this.replaceRequestHandler;
			replaceRequestHandler = (X, Y) => {
				this._baseReplaceRequestHandler(X, (Z, $) => {
					if (!this._initializedReceived) console.warn(`[ext-apps] AppBridge received '${Z.method}' before ui/notifications/initialized. The View is calling host methods before completing the handshake; it should await app.connect() first.`);
					return Y(Z, $);
				});
			};
			eventSchemas = {
				sizechange: H,
				sandboxready: w,
				initialized: y,
				requestteardown: q,
				loggingmessage: LoggingMessageNotificationSchema
			};
			constructor(X, Y, Z, $) {
				super($);
				this._client = X;
				this._hostInfo = Y;
				this._capabilities = Z;
				this.addEventListener("initialized", () => {
					this._initializedReceived = !0;
				}), this._hostContext = $?.hostContext || {}, this.setRequestHandler(u, (J) => this._oninitialize(J)), this.setRequestHandler(PingRequestSchema, (J, K) => {
					return this.onping?.(J.params, K), {};
				}), this.replaceRequestHandler(I, (J) => {
					return { mode: this._hostContext.displayMode ?? "inline" };
				});
			}
			getAppCapabilities() {
				return this._appCapabilities;
			}
			getAppVersion() {
				return this._appInfo;
			}
			onping;
			get onsizechange() {
				return this.getEventHandler("sizechange");
			}
			set onsizechange(X) {
				this.setEventHandler("sizechange", X);
			}
			get onsandboxready() {
				return this.getEventHandler("sandboxready");
			}
			set onsandboxready(X) {
				this.setEventHandler("sandboxready", X);
			}
			get oninitialized() {
				return this.getEventHandler("initialized");
			}
			set oninitialized(X) {
				this.setEventHandler("initialized", X);
			}
			_onmessage;
			get onmessage() {
				return this._onmessage;
			}
			set onmessage(X) {
				this.warnIfRequestHandlerReplaced("onmessage", this._onmessage, X), this._onmessage = X, this.replaceRequestHandler(k, async (Y, Z) => {
					if (!this._onmessage) throw Error("No onmessage handler set");
					return this._onmessage(Y.params, Z);
				});
			}
			_onopenlink;
			get onopenlink() {
				return this._onopenlink;
			}
			set onopenlink(X) {
				this.warnIfRequestHandlerReplaced("onopenlink", this._onopenlink, X), this._onopenlink = X, this.replaceRequestHandler(L, async (Y, Z) => {
					if (!this._onopenlink) throw Error("No onopenlink handler set");
					return this._onopenlink(Y.params, Z);
				});
			}
			_ondownloadfile;
			get ondownloadfile() {
				return this._ondownloadfile;
			}
			set ondownloadfile(X) {
				this.warnIfRequestHandlerReplaced("ondownloadfile", this._ondownloadfile, X), this._ondownloadfile = X, this.replaceRequestHandler(f, async (Y, Z) => {
					if (!this._ondownloadfile) throw Error("No ondownloadfile handler set");
					return this._ondownloadfile(Y.params, Z);
				});
			}
			get onrequestteardown() {
				return this.getEventHandler("requestteardown");
			}
			set onrequestteardown(X) {
				this.setEventHandler("requestteardown", X);
			}
			_onrequestdisplaymode;
			get onrequestdisplaymode() {
				return this._onrequestdisplaymode;
			}
			set onrequestdisplaymode(X) {
				this.warnIfRequestHandlerReplaced("onrequestdisplaymode", this._onrequestdisplaymode, X), this._onrequestdisplaymode = X, this.replaceRequestHandler(I, async (Y, Z) => {
					if (!this._onrequestdisplaymode) throw Error("No onrequestdisplaymode handler set");
					return this._onrequestdisplaymode(Y.params, Z);
				});
			}
			get onloggingmessage() {
				return this.getEventHandler("loggingmessage");
			}
			set onloggingmessage(X) {
				this.setEventHandler("loggingmessage", X);
			}
			_onupdatemodelcontext;
			get onupdatemodelcontext() {
				return this._onupdatemodelcontext;
			}
			set onupdatemodelcontext(X) {
				this.warnIfRequestHandlerReplaced("onupdatemodelcontext", this._onupdatemodelcontext, X), this._onupdatemodelcontext = X, this.replaceRequestHandler(d, async (Y, Z) => {
					if (!this._onupdatemodelcontext) throw Error("No onupdatemodelcontext handler set");
					return this._onupdatemodelcontext(Y.params, Z);
				});
			}
			_oncalltool;
			get oncalltool() {
				return this._oncalltool;
			}
			set oncalltool(X) {
				this.warnIfRequestHandlerReplaced("oncalltool", this._oncalltool, X), this._oncalltool = X, this.replaceRequestHandler(CallToolRequestSchema, async (Y, Z) => {
					if (!this._oncalltool) throw Error("No oncalltool handler set");
					return this._oncalltool(Y.params, Z);
				});
			}
			set oncreatesamplingmessage(X) {
				this.setRequestHandler(CreateMessageRequestSchema, async (Y, Z) => {
					return X(Y.params, Z);
				});
			}
			sendToolListChanged(X = {}) {
				return this.notification({
					method: "notifications/tools/list_changed",
					params: X
				});
			}
			_onlistresources;
			get onlistresources() {
				return this._onlistresources;
			}
			set onlistresources(X) {
				this.warnIfRequestHandlerReplaced("onlistresources", this._onlistresources, X), this._onlistresources = X, this.replaceRequestHandler(ListResourcesRequestSchema, async (Y, Z) => {
					if (!this._onlistresources) throw Error("No onlistresources handler set");
					return this._onlistresources(Y.params, Z);
				});
			}
			_onlistresourcetemplates;
			get onlistresourcetemplates() {
				return this._onlistresourcetemplates;
			}
			set onlistresourcetemplates(X) {
				this.warnIfRequestHandlerReplaced("onlistresourcetemplates", this._onlistresourcetemplates, X), this._onlistresourcetemplates = X, this.replaceRequestHandler(ListResourceTemplatesRequestSchema, async (Y, Z) => {
					if (!this._onlistresourcetemplates) throw Error("No onlistresourcetemplates handler set");
					return this._onlistresourcetemplates(Y.params, Z);
				});
			}
			_onreadresource;
			get onreadresource() {
				return this._onreadresource;
			}
			set onreadresource(X) {
				this.warnIfRequestHandlerReplaced("onreadresource", this._onreadresource, X), this._onreadresource = X, this.replaceRequestHandler(ReadResourceRequestSchema, async (Y, Z) => {
					if (!this._onreadresource) throw Error("No onreadresource handler set");
					return this._onreadresource(Y.params, Z);
				});
			}
			sendResourceListChanged(X = {}) {
				return this.notification({
					method: "notifications/resources/list_changed",
					params: X
				});
			}
			_onlistprompts;
			get onlistprompts() {
				return this._onlistprompts;
			}
			set onlistprompts(X) {
				this.warnIfRequestHandlerReplaced("onlistprompts", this._onlistprompts, X), this._onlistprompts = X, this.replaceRequestHandler(ListPromptsRequestSchema, async (Y, Z) => {
					if (!this._onlistprompts) throw Error("No onlistprompts handler set");
					return this._onlistprompts(Y.params, Z);
				});
			}
			sendPromptListChanged(X = {}) {
				return this.notification({
					method: "notifications/prompts/list_changed",
					params: X
				});
			}
			assertCapabilityForMethod(X) {}
			assertRequestHandlerCapability(X) {}
			assertNotificationCapability(X) {}
			assertTaskCapability(X) {
				throw Error("Tasks are not supported in MCP Apps");
			}
			assertTaskHandlerCapability(X) {
				throw Error("Task handlers are not supported in MCP Apps");
			}
			getCapabilities() {
				return this._capabilities;
			}
			async _oninitialize(X) {
				let Y = X.params.protocolVersion;
				if (this._appInfo !== void 0) console.warn("[ext-apps] AppBridge received a second ui/initialize. The View may be double-mounting (e.g. React StrictMode in dev) without closing the previous App instance. Responding normally; the latest appInfo/appCapabilities replace the previous values.");
				return this._appCapabilities = X.params.appCapabilities, this._appInfo = X.params.appInfo, {
					protocolVersion: KX.includes(Y) ? Y : j,
					hostCapabilities: this.getCapabilities(),
					hostInfo: this._hostInfo,
					hostContext: this._hostContext
				};
			}
			setHostContext(X) {
				let Y = {}, Z = !1;
				for (let $ of Object.keys(X)) {
					let J = this._hostContext[$], K = X[$];
					if (GX(J, K)) continue;
					Y[$] = K, Z = !0;
				}
				if (Z) this._hostContext = X, this.sendHostContextChange(Y);
			}
			sendHostContextChange(X) {
				return this.notification({
					method: "ui/notifications/host-context-changed",
					params: X
				});
			}
			sendToolInput(X) {
				return this.notification({
					method: "ui/notifications/tool-input",
					params: X
				});
			}
			sendToolInputPartial(X) {
				return this.notification({
					method: "ui/notifications/tool-input-partial",
					params: X
				});
			}
			sendToolResult(X) {
				return this.notification({
					method: "ui/notifications/tool-result",
					params: X
				});
			}
			sendToolCancelled(X) {
				return this.notification({
					method: "ui/notifications/tool-cancelled",
					params: X
				});
			}
			sendSandboxResourceReady(X) {
				return this.notification({
					method: "ui/notifications/sandbox-resource-ready",
					params: X
				});
			}
			teardownResource(X, Y) {
				return this.request({
					method: "ui/resource-teardown",
					params: X
				}, S, Y);
			}
			sendResourceTeardown = this.teardownResource;
			callTool(X, Y) {
				return this.request({
					method: "tools/call",
					params: X
				}, CallToolResultSchema, Y);
			}
			listTools(X, Y) {
				return this.request({
					method: "tools/list",
					params: X
				}, ListToolsResultSchema, Y);
			}
			async connect(X) {
				if (this.transport) throw Error("AppBridge is already connected. Call close() before connecting again.");
				if (this._initializedReceived = !1, this._client) {
					let Y = this._client.getServerCapabilities();
					if (!Y) throw Error("Client server capabilities not available");
					if (Y.tools) {
						if (this.oncalltool = async (Z, $) => {
							return this._client.request({
								method: "tools/call",
								params: Z
							}, CallToolResultSchema, { signal: $.signal });
						}, Y.tools.listChanged) this._client.setNotificationHandler(ToolListChangedNotificationSchema, (Z) => this.sendToolListChanged(Z.params));
					}
					if (Y.resources) {
						if (this.onlistresources = async (Z, $) => {
							return this._client.request({
								method: "resources/list",
								params: Z
							}, ListResourcesResultSchema, { signal: $.signal });
						}, this.onlistresourcetemplates = async (Z, $) => {
							return this._client.request({
								method: "resources/templates/list",
								params: Z
							}, ListResourceTemplatesResultSchema, { signal: $.signal });
						}, this.onreadresource = async (Z, $) => {
							return this._client.request({
								method: "resources/read",
								params: Z
							}, ReadResourceResultSchema, { signal: $.signal });
						}, Y.resources.listChanged) this._client.setNotificationHandler(ResourceListChangedNotificationSchema, (Z) => this.sendResourceListChanged(Z.params));
					}
					if (Y.prompts) {
						if (this.onlistprompts = async (Z, $) => {
							return this._client.request({
								method: "prompts/list",
								params: Z
							}, ListPromptsResultSchema, { signal: $.signal });
						}, Y.prompts.listChanged) this._client.setNotificationHandler(PromptListChangedNotificationSchema, (Z) => this.sendPromptListChanged(Z.params));
					}
				}
				return super.connect(X);
			}
		};
		function GX(X, Y) {
			return JSON.stringify(X) === JSON.stringify(Y);
		}
		//#endregion
		//#region ../mcp-apps/src/security.ts
		const MCP_APP_MIME = "text/html;profile=mcp-app";
		const MCP_APP_PRESENTATION_KIND = "openloop.dsh-mcp";
		function isUiResourceUri(uri) {
			return uri.startsWith("ui://") && uri.length > 5;
		}
		function validateUiBinding(binding, expectedServerId, expectedToolName) {
			if (!isUiResourceUri(binding.resourceUri) || binding.serverId !== expectedServerId || binding.toolName !== expectedToolName || binding.visibility !== void 0 && binding.visibility !== "inline" && binding.visibility !== "fullscreen") throw new Error("MCP App binding does not match the expected tool resource");
		}
		function validateAppHtml(html) {
			if (new TextEncoder().encode(html).byteLength > 8388608) throw new Error("MCP App resource exceeds the 8 MiB limit");
		}
		function isTrustedAppMessage(event, expectedSource, expectedOrigin) {
			if (event.source !== expectedSource || event.origin !== expectedOrigin) return false;
			return typeof event.data === "object" && event.data !== null && !Array.isArray(event.data);
		}
		function record(value) {
			return typeof value === "object" && value !== null && !Array.isArray(value) ? value : void 0;
		}
		function bindingFrom(value) {
			const binding = record(value);
			if (!binding || typeof binding.serverId !== "string" || typeof binding.toolName !== "string" || typeof binding.resourceUri !== "string") return void 0;
			if (binding.visibility !== void 0 && binding.visibility !== "inline" && binding.visibility !== "fullscreen") return void 0;
			const bindingMeta = record(binding._meta);
			return {
				serverId: binding.serverId,
				toolName: binding.toolName,
				resourceUri: binding.resourceUri,
				...binding.visibility === "fullscreen" ? { visibility: "fullscreen" } : {},
				...bindingMeta ? { _meta: bindingMeta } : {}
			};
		}
		function resultFrom(value) {
			const result = record(value);
			if (!result || typeof result.serverId !== "string" || typeof result.toolName !== "string" || !Array.isArray(result.content) || typeof result.isError !== "boolean") return void 0;
			const resourceValue = record(result.uiResource);
			const uiResource = resourceValue && typeof resourceValue.serverId === "string" && typeof resourceValue.resourceUri === "string" && typeof resourceValue.mimeType === "string" ? (() => {
				const resourceMeta = record(resourceValue._meta);
				if (typeof resourceValue.html === "string") return {
					serverId: resourceValue.serverId,
					resourceUri: resourceValue.resourceUri,
					mimeType: resourceValue.mimeType,
					html: resourceValue.html,
					...resourceMeta ? { _meta: resourceMeta } : {}
				};
				if (typeof resourceValue.resourceUrl === "string" && typeof resourceValue.callToolUrl === "string" && typeof resourceValue.documentUrl === "string" && resourceValue.resourceUrl.startsWith("/api/openloop/mcp-app/resource/") && resourceValue.documentUrl.startsWith("/api/openloop/mcp-app/document/") && resourceValue.callToolUrl.startsWith("/api/openloop/mcp-app/call/")) return {
					serverId: resourceValue.serverId,
					resourceUri: resourceValue.resourceUri,
					mimeType: resourceValue.mimeType,
					resourceUrl: resourceValue.resourceUrl,
					documentUrl: resourceValue.documentUrl,
					callToolUrl: resourceValue.callToolUrl,
					...resourceMeta ? { _meta: resourceMeta } : {}
				};
			})() : void 0;
			const structuredContent = record(result.structuredContent);
			const resultMeta = record(result._meta);
			return {
				serverId: result.serverId,
				toolName: result.toolName,
				content: result.content,
				...structuredContent ? { structuredContent } : {},
				isError: result.isError,
				...resultMeta ? { _meta: resultMeta } : {},
				...uiResource ? { uiResource } : {}
			};
		}
		function parseMcpAppPresentation(value, expectedCallName) {
			const envelope = record(value);
			if (!envelope || envelope.kind !== "openloop.dsh-mcp" || envelope.version !== 1 || envelope.callName !== expectedCallName) return void 0;
			if (typeof envelope.serverId !== "string" || typeof envelope.toolName !== "string") return void 0;
			if (expectedCallName !== `mcp__${envelope.serverId}__${envelope.toolName}`) return void 0;
			const result = resultFrom(envelope.result);
			if (!result || result.serverId !== envelope.serverId || result.toolName !== envelope.toolName) return void 0;
			const binding = bindingFrom(envelope.binding);
			const toolMeta = record(envelope.toolMeta);
			if (binding) {
				try {
					validateUiBinding(binding, envelope.serverId, envelope.toolName);
				} catch {
					return;
				}
				if (!result.uiResource || result.uiResource.resourceUri !== binding.resourceUri || result.uiResource.serverId !== binding.serverId) return void 0;
			} else if (result.uiResource) return;
			if (result.uiResource) {
				if (result.isError || result.uiResource.mimeType !== MCP_APP_MIME || result.uiResource.serverId !== envelope.serverId) return void 0;
				if ("html" in result.uiResource) try {
					validateAppHtml(result.uiResource.html);
				} catch {
					return;
				}
			}
			return {
				kind: MCP_APP_PRESENTATION_KIND,
				version: 1,
				callName: expectedCallName,
				serverId: envelope.serverId,
				toolName: envelope.toolName,
				...toolMeta ? { toolMeta } : {},
				...binding ? { binding } : {},
				result
			};
		}
		function textByteLength(value) {
			return new TextEncoder().encode(value).byteLength;
		}
		function parseMcpAppCodeDispatchPresentation(content, expectedCallName, expectedCallId) {
			if (!expectedCallId || expectedCallId.length > 512) return void 0;
			const candidates = [];
			let candidateIndex = -1;
			for (const [index, value] of content.entries()) {
				const block = record(value);
				if (block?.type !== "text" || typeof block.text !== "string" || !block.text.startsWith("⁣openloop.dsh-mcp/code-dispatch:v1:")) continue;
				candidates.push(block.text);
				candidateIndex = index;
			}
			if (candidates.length !== 1 || candidateIndex <= 0 || candidateIndex !== content.length - 1) return void 0;
			const envelopeText = candidates[0];
			if (envelopeText === void 0 || textByteLength(envelopeText) > 262144) return void 0;
			let envelope;
			try {
				envelope = JSON.parse(envelopeText.slice(35));
			} catch {
				return;
			}
			const value = record(envelope);
			if (!value || Object.keys(value).length !== 5 || value.kind !== "openloop.dsh-mcp/code-dispatch" || value.version !== 1 || value.callId !== expectedCallId || value.callName !== expectedCallName) return void 0;
			const presentation = parseMcpAppPresentation(value.presentation, expectedCallName);
			if (!presentation?.result.uiResource) return void 0;
			return {
				presentation,
				envelopeText
			};
		}
		/**
		* Resolve the cross-origin App document URL for the sandboxed iframe.
		*
		* The App document is served from the same DSH origin, so the host swaps the
		* loopback hostname (127.0.0.1 <-> localhost) to place the App on a distinct
		* origin while `allow-same-origin` stays available for App storage.
		*
		* Fail-closed: when the App document would still share the host origin (for
		* example a non-loopback or IPv6-loopback deployment where the swap does not
		* apply), return undefined so the caller falls back to the opaque-origin
		* srcDoc path without `allow-same-origin` instead of granting the App
		* same-origin access to the DSH host.
		*/
		function resolveAppDocumentUrl(documentUrl, locationHref) {
			const locationUrl = new URL(locationHref);
			const url = new URL(documentUrl, locationHref);
			if (url.origin === locationUrl.origin) {
				if (url.hostname === "127.0.0.1" || url.hostname === "localhost") url.hostname = url.hostname === "127.0.0.1" ? "localhost" : "127.0.0.1";
				if (url.origin === locationUrl.origin) return void 0;
			}
			return url.href;
		}
		function metadataPolicy(meta) {
			const ui = record(meta?.ui);
			const csp = record(ui?.csp);
			const permissions = record(ui?.permissions);
			const sources = (key) => Array.isArray(csp?.[key]) ? (csp?.[key]).filter((value) => typeof value === "string") : [];
			const resource = sources("resourceDomains");
			const connect = sources("connectDomains");
			const frames = sources("frameDomains");
			const directive = (name, values) => `${name} ${values.length > 0 ? values.join(" ") : "'none'"}`;
			const policy = [
				"default-src 'none'",
				directive("script-src", ["'unsafe-inline'", ...resource]),
				directive("style-src", ["'unsafe-inline'", ...resource]),
				directive("img-src", [
					"data:",
					"blob:",
					...resource
				]),
				directive("media-src", [
					"data:",
					"blob:",
					...resource
				]),
				directive("font-src", ["data:", ...resource]),
				directive("worker-src", ["blob:", ...resource]),
				directive("connect-src", connect),
				directive("frame-src", frames),
				"object-src 'none'",
				"base-uri 'none'",
				"form-action 'none'"
			].join("; ");
			const allow = [];
			if (record(permissions?.clipboardWrite)) allow.push("clipboard-write");
			if (record(permissions?.camera)) allow.push("camera");
			if (record(permissions?.microphone)) allow.push("microphone");
			if (record(permissions?.geolocation)) allow.push("geolocation");
			return {
				csp: policy,
				allow: allow.join("; ")
			};
		}
		function sandboxAllow(meta) {
			return metadataPolicy(meta).allow;
		}
		function buildSandboxDocument(html, meta) {
			validateAppHtml(html);
			const policy = metadataPolicy(meta);
			return `<!doctype html><html><head><meta charset="utf-8">${`<meta http-equiv="Content-Security-Policy" content=${JSON.stringify(policy.csp)}>`}</head><body>${html}</body></html>`;
		}
		function resourceAsReadResult(resource) {
			if (resource.mimeType !== MCP_APP_MIME) throw new Error(`Unexpected MCP App MIME: ${resource.mimeType}`);
			return { contents: [{
				uri: resource.resourceUri,
				mimeType: resource.mimeType,
				text: resource.html,
				...resource._meta ? { _meta: resource._meta } : {}
			}] };
		}
		function unsupportedAppToolCallResult() {
			return {
				content: [{
					type: "text",
					text: "MCP App tool calls are disabled in this DSH host; invoke the ordinary bound MCP tool instead."
				}],
				isError: true
			};
		}
		//#endregion
		//#region ../mcp-apps/src/client/transport.ts
		var SecurePostMessageTransport = class {
			eventTarget;
			eventSource;
			expectedOrigin;
			listener = (event) => {
				if (!isTrustedAppMessage(event, this.eventSource, this.expectedOrigin)) return;
				const parsed = JSONRPCMessageSchema.safeParse(event.data);
				if (!parsed.success) {
					this.onerror?.(/* @__PURE__ */ new Error("MCP App message failed JSON-RPC validation"));
					return;
				}
				this.onmessage?.(parsed.data, {});
			};
			onclose;
			onerror;
			onmessage;
			sessionId;
			setProtocolVersion;
			constructor(eventTarget, eventSource, expectedOrigin) {
				this.eventTarget = eventTarget;
				this.eventSource = eventSource;
				this.expectedOrigin = expectedOrigin;
			}
			async start() {
				this.eventTarget.addEventListener("message", this.listener);
			}
			async send(message, _options) {
				this.eventSource.postMessage(message, this.expectedOrigin === "null" ? "*" : this.expectedOrigin);
			}
			async close() {
				this.eventTarget.removeEventListener("message", this.listener);
				this.onclose?.();
			}
		};
		//#endregion
		//#region ../mcp-apps/src/client/index.tsx
		function firstText(content, hiddenText) {
			for (const part of content) if (typeof part === "object" && part !== null && part.type === "text" && typeof part.text === "string") {
				const text = part.text;
				if (typeof text !== "string") continue;
				if (text !== hiddenText && !text.startsWith("⁣openloop.dsh-mcp/code-dispatch:v1:")) return text;
			}
		}
		function AppFrame({ callId, presentation, toolArgumentsRaw }) {
			const [height, setHeight] = (0, react.useState)(560);
			const [displayMode, setDisplayMode] = (0, react.useState)("inline");
			const displayModeRef = (0, react.useRef)("inline");
			const suppressFullscreenUntilRef = (0, react.useRef)(0);
			const bridgeRef = (0, react.useRef)();
			const initialResource = presentation.result.uiResource;
			const [refreshedResource, setRefreshedResource] = (0, react.useState)();
			const resource = refreshedResource ?? initialResource;
			const [hydrated, setHydrated] = (0, react.useState)(() => resource && "html" in resource ? resource : void 0);
			const [frameReady, setFrameReady] = (0, react.useState)(false);
			const toolArguments = (0, react.useMemo)(() => {
				if (!toolArgumentsRaw) return {};
				try {
					const parsed = JSON.parse(toolArgumentsRaw);
					return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed) ? parsed : {};
				} catch {
					return {};
				}
			}, [toolArgumentsRaw]);
			(0, react.useEffect)(() => {
				setRefreshedResource(void 0);
				displayModeRef.current = "inline";
				setDisplayMode("inline");
			}, [presentation]);
			(0, react.useEffect)(() => {
				if (displayMode !== "fullscreen") return;
				const previousOverflow = document.body.style.overflow;
				document.body.style.overflow = "hidden";
				const closeOnEscape = (event) => {
					if (event.key !== "Escape") return;
					suppressFullscreenUntilRef.current = Date.now() + 1500;
					displayModeRef.current = "inline";
					setDisplayMode("inline");
				};
				window.addEventListener("keydown", closeOnEscape);
				return () => {
					window.removeEventListener("keydown", closeOnEscape);
					document.body.style.overflow = previousOverflow;
				};
			}, [displayMode]);
			(0, react.useEffect)(() => {
				setFrameReady(false);
				if (!resource) {
					setHydrated(void 0);
					return;
				}
				if ("html" in resource) {
					setHydrated(resource);
					return;
				}
				let cancelled = false;
				setHydrated(void 0);
				if (!refreshedResource) {
					fetch("/api/openloop/mcp-app/refresh", {
						method: "POST",
						credentials: "same-origin",
						headers: {
							"Content-Type": "application/json",
							Accept: "application/json"
						},
						body: JSON.stringify({
							serverId: presentation.serverId,
							toolName: presentation.toolName,
							resourceUri: resource.resourceUri
						})
					}).then(async (response) => {
						if (!response.ok) throw new Error(`MCP App resource refresh failed: ${response.status}`);
						const value = await response.json();
						if (typeof value.resourceUrl !== "string" || typeof value.documentUrl !== "string" || typeof value.callToolUrl !== "string" || value.serverId !== presentation.serverId || value.resourceUri !== resource.resourceUri || value.mimeType !== resource.mimeType) throw new Error("MCP App resource refresh returned an invalid reference");
						if (!cancelled) setRefreshedResource(value);
					}).catch(() => {
						if (!cancelled) setHydrated(void 0);
					});
					return () => {
						cancelled = true;
					};
				}
				fetch(resource.resourceUrl, {
					credentials: "same-origin",
					headers: { Accept: "application/json" }
				}).then(async (response) => {
					if (!response.ok) throw new Error(`MCP App resource fetch failed: ${response.status}`);
					const value = await response.json();
					if (typeof value.html !== "string") throw new Error("MCP App resource response omitted HTML");
					if (!cancelled) setHydrated({
						serverId: resource.serverId,
						resourceUri: resource.resourceUri,
						mimeType: resource.mimeType,
						html: value.html,
						...resource._meta ? { _meta: resource._meta } : {}
					});
				}).catch(() => {
					if (!cancelled) setHydrated(void 0);
				});
				return () => {
					cancelled = true;
				};
			}, [
				resource,
				refreshedResource,
				presentation.serverId,
				presentation.toolName
			]);
			const doc = (0, react.useMemo)(() => hydrated ? buildSandboxDocument(hydrated.html, hydrated._meta) : "", [hydrated]);
			const documentUrl = (0, react.useMemo)(() => {
				if (!resource || !("documentUrl" in resource)) return void 0;
				return resolveAppDocumentUrl(resource.documentUrl, window.location.href);
			}, [resource]);
			(0, react.useEffect)(() => {
				const iframe = document.querySelector(`iframe[data-openloop-mcp-call="${CSS.escape(callId)}"]`);
				if (!iframe || !resource || !hydrated || !frameReady) return;
				let bridge;
				let transport;
				let cancelled = false;
				const connect = async () => {
					const source = iframe.contentWindow;
					if (!source || cancelled) return;
					transport = new SecurePostMessageTransport(window, source, documentUrl ? new URL(documentUrl).origin : "null");
					bridge = new DX(null, {
						name: "OpenLoop DSH MCP Apps Host",
						version: "0.1.0"
					}, {
						serverResources: {},
						serverTools: {},
						logging: {}
					}, { hostContext: {
						displayMode: displayModeRef.current,
						platform: "web",
						availableDisplayModes: ["inline", "fullscreen"],
						containerDimensions: {
							width: Math.max(1, iframe.clientWidth),
							height: Math.max(1, iframe.clientHeight)
						},
						toolInfo: { tool: {
							name: presentation.callName,
							inputSchema: { type: "object" }
						} }
					} });
					bridgeRef.current = bridge;
					bridge.oninitialized = () => {
						bridge?.sendToolInput({ arguments: toolArguments });
						bridge?.sendToolResult({
							content: presentation.result.content,
							...presentation.result.structuredContent ? { structuredContent: presentation.result.structuredContent } : {},
							...presentation.result._meta ? { _meta: presentation.result._meta } : {},
							...presentation.result.isError ? { isError: true } : {}
						});
					};
					bridge.onsizechange = ({ height: nextHeight }) => {
						if (displayModeRef.current === "inline" && typeof nextHeight === "number" && Number.isFinite(nextHeight)) setHeight(Math.max(96, Math.min(720, Math.ceil(nextHeight))));
					};
					bridge.onrequestdisplaymode = async ({ mode }) => {
						const nextMode = mode === "fullscreen" && Date.now() < suppressFullscreenUntilRef.current ? "inline" : mode === "fullscreen" || mode === "inline" ? mode : displayModeRef.current;
						displayModeRef.current = nextMode;
						setDisplayMode(nextMode);
						return { mode: nextMode };
					};
					bridge.onreadresource = async ({ uri }) => {
						if (uri !== resource.resourceUri || presentation.binding?.resourceUri !== uri) return { contents: [] };
						return resourceAsReadResult(hydrated);
					};
					bridge.onlistresources = async () => ({ resources: [{
						uri: resource.resourceUri,
						name: resource.resourceUri,
						mimeType: resource.mimeType
					}] });
					bridge.oncalltool = async ({ name, arguments: args }) => {
						if (!("callToolUrl" in resource)) return unsupportedAppToolCallResult();
						try {
							const response = await fetch(resource.callToolUrl, {
								method: "POST",
								credentials: "same-origin",
								headers: {
									"Content-Type": "application/json",
									Accept: "application/json"
								},
								body: JSON.stringify({
									name,
									arguments: args ?? {}
								})
							});
							if (!response.ok) return {
								content: [{
									type: "text",
									text: `MCP App tool call rejected (${response.status})`
								}],
								isError: true
							};
							return await response.json();
						} catch {
							return {
								content: [{
									type: "text",
									text: "MCP App tool call failed"
								}],
								isError: true
							};
						}
					};
					bridge.onopenlink = async () => ({ isError: true });
					bridge.onmessage = async () => ({ isError: true });
					await bridge.connect(transport);
				};
				connect().catch(() => void 0);
				return () => {
					cancelled = true;
					if (bridgeRef.current === bridge) bridgeRef.current = void 0;
					bridge?.teardownResource({}).catch(() => void 0);
					bridge?.close().catch(() => void 0);
					transport?.close().catch(() => void 0);
				};
			}, [
				callId,
				presentation,
				resource,
				hydrated,
				frameReady,
				documentUrl,
				toolArguments
			]);
			(0, react.useEffect)(() => {
				const iframe = document.querySelector(`iframe[data-openloop-mcp-call="${CSS.escape(callId)}"]`);
				const bridge = bridgeRef.current;
				if (!iframe || !bridge || !frameReady) return;
				bridge.setHostContext({
					displayMode,
					platform: "web",
					availableDisplayModes: ["inline", "fullscreen"],
					containerDimensions: {
						width: Math.max(1, iframe.clientWidth),
						height: Math.max(1, iframe.clientHeight)
					},
					toolInfo: { tool: {
						name: presentation.callName,
						inputSchema: { type: "object" }
					} }
				});
			}, [
				callId,
				displayMode,
				frameReady,
				height,
				presentation.callName
			]);
			if (!hydrated || !resource) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				style: {
					color: "var(--dsw-alias-label-caption)",
					fontSize: 12
				},
				children: "Loading MCP App…"
			});
			const fullscreen = displayMode === "fullscreen";
			const closeFullscreen = () => {
				suppressFullscreenUntilRef.current = Date.now() + 1500;
				displayModeRef.current = "inline";
				setDisplayMode("inline");
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				...fullscreen ? {
					"data-openloop-mcp-fullscreen": "",
					role: "dialog",
					"aria-modal": true,
					"aria-label": `${presentation.toolName} fullscreen editor`
				} : {},
				style: fullscreen ? {
					position: "fixed",
					inset: 0,
					zIndex: 2147483e3,
					display: "flex",
					flexDirection: "column",
					padding: 16,
					background: "rgba(0, 0, 0, 0.72)",
					backdropFilter: "blur(10px)"
				} : { width: "100%" },
				children: [fullscreen && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: {
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
						flex: "0 0 52px",
						padding: "0 16px",
						color: "var(--dsw-alias-label-primary)",
						background: "var(--dsw-alias-bg-layer-1)",
						border: "1px solid var(--dsw-alias-border-l2)",
						borderBottom: 0,
						borderRadius: "14px 14px 0 0"
					},
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: presentation.toolName }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						"aria-label": "Close fullscreen editor",
						onClick: closeFullscreen,
						style: {
							minWidth: 72,
							height: 34,
							padding: "0 14px",
							color: "inherit",
							background: "var(--dsw-alias-bg-layer-2)",
							border: "1px solid var(--dsw-alias-border-l2)",
							borderRadius: 9,
							cursor: "pointer"
						},
						children: "Close"
					})]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("iframe", {
					"data-openloop-mcp-call": callId,
					title: `${presentation.toolName} MCP App`,
					sandbox: documentUrl ? "allow-scripts allow-same-origin" : "allow-scripts",
					allow: sandboxAllow(hydrated._meta),
					referrerPolicy: "no-referrer",
					...documentUrl ? { src: documentUrl } : { srcDoc: doc },
					onLoad: () => setFrameReady(true),
					style: {
						display: "block",
						width: "100%",
						height: fullscreen ? "calc(100vh - 84px)" : height,
						flex: fullscreen ? "1 1 auto" : void 0,
						minHeight: fullscreen ? 0 : void 0,
						border: fullscreen ? "1px solid var(--dsw-alias-border-l2)" : 0,
						borderRadius: fullscreen ? "0 0 14px 14px" : 0,
						background: fullscreen ? "#fff" : "transparent"
					}
				})]
			});
		}
		function McpAppCard({ callId, toolName, block }) {
			if (!("kind" in block)) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				style: {
					color: "var(--dsw-alias-label-caption)",
					fontSize: 12
				},
				children: "MCP App · calling…"
			});
			if (block.isError) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				style: {
					color: "var(--dsw-alias-label-caption)",
					fontSize: 12
				},
				children: firstText(block.content) ?? "MCP App call failed"
			});
			const codePresentation = parseMcpAppCodeDispatchPresentation(block.content, toolName, callId);
			const presentation = parseMcpAppPresentation(block.meta, toolName) ?? codePresentation?.presentation;
			if (!presentation?.result.uiResource) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				style: {
					color: "var(--dsw-alias-label-caption)",
					fontSize: 12
				},
				children: firstText(block.content, codePresentation?.envelopeText) ?? "MCP App unavailable"
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("section", {
				style: {
					width: "100%",
					overflow: "hidden",
					border: "1px solid var(--dsw-alias-border-l2)",
					borderRadius: 12,
					background: "var(--dsw-alias-bg-layer-1)"
				},
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(AppFrame, {
					callId,
					presentation,
					...block.call?.argsRaw ? { toolArgumentsRaw: block.call.argsRaw } : {}
				})
			});
		}
		function registerMcpAppToolViews(ctx, toolNames) {
			const names = [...new Set(toolNames)];
			if (names.length === 0) return;
			if (names.some((toolName) => typeof toolName !== "string" || toolName.length === 0)) throw new Error("MCP App tool registration requires non-empty wire tool names");
			ctx.slots.inject("tool.call.toolview", function* () {
				for (const toolName of names) yield ctx.slots.register({
					name: "tool.call.toolview",
					key: toolName
				}, McpAppCard);
			});
		}
		function apply$1(ctx, options = {}) {
			registerMcpAppToolViews(ctx, options.toolNames ?? []);
		}
		//#endregion
		//#region src/client/index.tsx
		const MCP_APP_TOOL_NAMES = [
			"mcp__fixture__mcp_app_tool",
			"mcp__tldraw__tldraw_create_view",
			"mcp__tldraw__tldraw_patch_shapes",
			"mcp__tldraw__tldraw_open_canvas",
			"mcp__tldraw__tldraw_patch_diagram",
			"mcp__excalidraw__create_view"
		];
		const name = "openloop-dsh-mcp";
		const inject = ["slots"];
		function apply(ctx) {
			apply$1(ctx, { toolNames: MCP_APP_TOOL_NAMES });
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		exports.name = name;
		return module.exports;
	}
});
