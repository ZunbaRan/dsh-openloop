//#region src/api-usage.ts
const WINDOW_MS_DEFAULT = 864e5;
const GLOBAL_KEY = "__openloopApiUsage";
function store() {
	const g = globalThis;
	let s = g[GLOBAL_KEY];
	if (s === void 0) {
		s = {
			stats: /* @__PURE__ */ new Map(),
			windowMs: WINDOW_MS_DEFAULT
		};
		g[GLOBAL_KEY] = s;
	}
	return s;
}
/** 聚合快照（app 端点输出；prune 掉窗口外记录但保留计数）。 */
function snapshotApiUsage() {
	const s = store();
	const now = Date.now();
	const sources = [];
	for (const stat of s.stats.values()) {
		const recent = stat.records.filter((r) => now - r.at <= s.windowMs);
		if (stat.total === 0 && recent.length === 0) continue;
		const avg = recent.length > 0 ? Math.round(recent.reduce((n, r) => n + r.ms, 0) / recent.length) : null;
		sources.push({
			source: stat.source,
			kind: stat.kind,
			total: stat.total,
			failures: stat.failures,
			avgMs: avg,
			recent: recent.map((r) => ({
				at: r.at,
				ok: r.ok,
				ms: r.ms
			}))
		});
	}
	sources.sort((a, b) => b.total - a.total);
	return {
		windowMs: s.windowMs,
		sources
	};
}
//#endregion
export { snapshotApiUsage };
