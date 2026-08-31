//#region src/event-log.ts
const GLOBAL_KEY = "__openloopEventLog";
const CAP_DEFAULT = 200;
function store() {
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
/** 记一条系统事件（任意包；文本面向用户，中文短句）。失败静默。 */
function recordSystemEvent(kind, level, text) {
	try {
		const s = store();
		s.events.push({
			at: Date.now(),
			kind,
			level,
			text
		});
		if (s.events.length > s.cap) s.events.splice(0, s.events.length - s.cap);
	} catch {}
}
/** 快照（新→旧；limit 截断）。 */
function snapshotSystemEvents(limit = 100) {
	return [...store().events].reverse().slice(0, Math.max(1, limit));
}
//#endregion
export { recordSystemEvent, snapshotSystemEvents };
