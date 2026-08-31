import "node:module";
//#region \0rolldown/runtime.js
var __defProp = Object.defineProperty;
var __exportAll = (all, no_symbols) => {
	let target = {};
	for (var name in all) __defProp(target, name, {
		get: all[name],
		enumerable: true
	});
	if (!no_symbols) __defProp(target, Symbol.toStringTag, { value: "Module" });
	return target;
};
//#endregion
//#region src/event-log.ts
var event_log_exports = /* @__PURE__ */ __exportAll({
	createEventRecorder: () => createEventRecorder,
	createPbEventReader: () => createPbEventReader,
	createPbEventWriter: () => createPbEventWriter,
	ringAppend: () => ringAppend,
	ringSnapshot: () => ringSnapshot
});
const GLOBAL_KEY = "__openloopEventLog";
const CAP_DEFAULT = 200;
/** 降级 ring（globalThis——PB 未就绪时的现场保底；正常路径不用） */
function fallbackRing() {
	const g = globalThis;
	let s = g[GLOBAL_KEY];
	if (s === void 0) {
		s = {
			events: [],
			cap: CAP_DEFAULT
		};
		g[GLOBAL_KEY] = s;
	}
	return s;
}
/** ring 快照（新→旧） */
function ringSnapshot(limit = 100) {
	return [...fallbackRing().events].reverse().slice(0, Math.max(1, limit));
}
function ringAppend(event) {
	const s = fallbackRing();
	s.events.push(event);
	if (s.events.length > s.cap) s.events.splice(0, s.events.length - s.cap);
}
/** 同步记录（app 包内部钩子用）：写 ring + 异步落 PB（writer 已注入时） */
function createEventRecorder(getWriter) {
	return (kind, level, text) => {
		const event = {
			at: Date.now(),
			kind,
			level,
			text
		};
		try {
			ringAppend(event);
		} catch {}
		const writer = getWriter();
		if (writer !== void 0) writer.append(event).catch(() => void 0);
	};
}
/** PB 事件 writer（批量合写缓冲：同 tick 多事件一次 POST，失败静默留 ring） */
function createPbEventWriter(getPb) {
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
			for (const e of batch) await pb.request("POST", "/api/collections/app_events/records", {
				at: e.at,
				kind: e.kind,
				level: e.level,
				text: e.text.slice(0, 500)
			});
		} catch {} finally {
			flushing = false;
			if (buffer.length > 0) flush();
		}
	};
	return { append(event) {
		buffer.push(event);
		if (buffer.length >= 8) return flush();
		return new Promise((resolve) => {
			setTimeout(() => {
				flush().finally(resolve);
			}, 50);
		});
	} };
}
/** PB 事件 reader（按 at 倒序取 limit 条） */
function createPbEventReader(getPb) {
	return { async list(limit) {
		const pb = getPb();
		if (pb === void 0) return ringSnapshot(limit);
		const params = new URLSearchParams({
			page: "1",
			perPage: String(Math.min(200, Math.max(1, limit))),
			sort: "-at"
		});
		return ((await pb.request("GET", `/api/collections/app_events/records?${params.toString()}`))?.items ?? []).map((r) => ({
			at: typeof r.at === "number" ? r.at : 0,
			kind: typeof r.kind === "string" ? r.kind : "registry",
			level: typeof r.level === "string" ? r.level : "info",
			text: typeof r.text === "string" ? r.text : ""
		})).filter((e) => e.at > 0 && e.text.length > 0);
	} };
}
//#endregion
export { ringAppend as a, event_log_exports as i, createPbEventReader as n, createPbEventWriter as r, createEventRecorder as t };
