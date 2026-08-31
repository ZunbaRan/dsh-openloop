import { spawn } from "node:child_process";
import { join } from "node:path";
import { readdir, stat } from "node:fs/promises";
//#region src/agent-activity.ts
/**
* Agent 行为流水聚合（自管理四件套之四，2026-08-31）——「我的 Agent 在为我工作」。
*
* 数据源：DSH 会话日志（.dsh/sessions/<cwd-slug>/session-xxx/session.jsonl.zstd）。
* 扫描最近 N 个会话（mtime 新→旧），解出 tool/call 行（name + time + turn），
* 聚合成「最近动作」时间线与「工具热度」两视图。
*
* 性能纪律：zstd 解压在子进程（spawn zstd -dc），单会话限最近 2000 行内取
* tool/call（大日志截断尾部——最新事件在文件尾）；结果内存缓存 30s
* （监控语义不需实时）；目录不存在返回空。
*/
const MAX_SESSIONS = 8;
const MAX_ACTIONS = 60;
const CACHE_TTL_MS = 3e4;
let cache;
/** 解压单会话日志（子进程 zstd；失败/缺二进制返回 null）。 */
function decompress(path) {
	return new Promise((resolve) => {
		try {
			const child = spawn("zstd", ["-dc", path], { stdio: [
				"ignore",
				"pipe",
				"ignore"
			] });
			let out = "";
			let done = false;
			const finish = (value) => {
				if (done) return;
				done = true;
				resolve(value);
			};
			child.stdout.on("data", (chunk) => {
				out += chunk.toString("utf8");
			});
			child.on("error", () => finish(null));
			child.on("close", (code) => finish(code === 0 ? out : null));
			child.stdout.on("data", () => {
				if (out.length > 16777216) {
					child.kill();
					finish(null);
				}
			});
		} catch {
			resolve(null);
		}
	});
}
/** 单会话提取 tool/call（尾部 MAX_ACTIONS*4 行窗口内）。 */
function extractCalls(text, workspace) {
	const window = text.split("\n").filter((l) => l.length > 0).slice(-8e3);
	const actions = [];
	for (const line of window) try {
		const obj = JSON.parse(line);
		if (obj?.type !== "tool/call") continue;
		const tool = typeof obj.data?.name === "string" ? obj.data.name : "unknown";
		const at = typeof obj.time === "number" ? obj.time : Date.now();
		actions.push({
			at,
			tool,
			workspace
		});
	} catch {}
	return actions;
}
async function snapshotAgentActivity(sessionsDir) {
	if (cache !== void 0 && Date.now() - cache.at < CACHE_TTL_MS) return cache.snapshot;
	const empty = {
		generatedAt: Date.now(),
		sessionsScanned: 0,
		actions: [],
		toolHeat: []
	};
	let entries;
	try {
		entries = await readdir(sessionsDir);
	} catch {
		cache = {
			at: Date.now(),
			snapshot: empty
		};
		return empty;
	}
	const withMtime = await Promise.all(entries.map(async (name) => {
		try {
			return {
				name,
				mtime: (await stat(join(sessionsDir, name))).mtimeMs
			};
		} catch {
			return {
				name,
				mtime: 0
			};
		}
	}));
	withMtime.sort((a, b) => b.mtime - a.mtime);
	const actions = [];
	let scanned = 0;
	for (const { name } of withMtime.slice(0, MAX_SESSIONS)) {
		let sessionDirs;
		try {
			sessionDirs = await readdir(join(sessionsDir, name));
		} catch {
			continue;
		}
		for (const sessionDir of sessionDirs.filter((d) => d.startsWith("session-")).slice(-3)) {
			const logPath = join(sessionsDir, name, sessionDir, "session.jsonl.zstd");
			try {
				await stat(logPath);
			} catch {
				continue;
			}
			const text = await decompress(logPath);
			if (text === null) continue;
			scanned++;
			actions.push(...extractCalls(text, name.replace(/^--/, "").replace(/--/g, "/")));
		}
	}
	actions.sort((a, b) => b.at - a.at);
	const heat = /* @__PURE__ */ new Map();
	for (const a of actions) heat.set(a.tool, (heat.get(a.tool) ?? 0) + 1);
	const snapshot = {
		generatedAt: Date.now(),
		sessionsScanned: scanned,
		actions: actions.slice(0, MAX_ACTIONS),
		toolHeat: [...heat.entries()].map(([tool, count]) => ({
			tool,
			count
		})).sort((a, b) => b.count - a.count).slice(0, 12)
	};
	cache = {
		at: Date.now(),
		snapshot
	};
	return snapshot;
}
//#endregion
export { snapshotAgentActivity };
