import { defineTool, validateJsonSchemaValue, valueSchemaSpecToJsonSchema } from "@deepseek-ai/dsh-tools";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { BUNDLED_SKILL_RANK } from "@deepseek-ai/dsh-skill";
//#region src/skill.ts
const body = new URL("../assets/declarative-skill.md", import.meta.url);
const candidate = {
	name: "openloop-visual-declarative",
	description: "Choose and author bounded native Flow, Timeline, and Comparison documents for visualize_ui.",
	invocation: {
		modelInvocable: true,
		userInvocable: true
	},
	provider: "openloop-visual-declarative",
	source: "bundled",
	resourceBase: {
		kind: "directory",
		path: fileURLToPath(new URL("../assets/", import.meta.url))
	},
	rank: BUNDLED_SKILL_RANK,
	locator: body
};
const declarativeSkillProvider = {
	name: candidate.provider,
	list: () => Promise.resolve([candidate]),
	async get() {
		return {
			...candidate,
			content: await readFile(body, "utf8")
		};
	}
};
//#endregion
//#region src/document.ts
const VISUALIZE_UI_TOOL = "visualize_ui";
const TONES = [
	"neutral",
	"info",
	"success",
	"warning",
	"danger"
];
const headerProperties = {
	title: {
		type: "string",
		required: true,
		description: "Short user-facing title."
	},
	description: {
		type: "string",
		description: "One concise sentence explaining what to inspect."
	}
};
const DOCUMENT_SCHEMA = {
	oneOf: [
		{
			type: "object",
			additionalProperties: false,
			properties: {
				kind: {
					type: "string",
					const: "flow",
					required: true
				},
				...headerProperties,
				nodes: {
					type: "array",
					required: true,
					items: {
						type: "object",
						additionalProperties: false,
						properties: {
							id: {
								type: "string",
								required: true
							},
							label: {
								type: "string",
								required: true
							},
							detail: { type: "string" },
							tone: {
								type: "string",
								enum: [...TONES]
							}
						}
					}
				},
				edges: {
					type: "array",
					required: true,
					items: {
						type: "object",
						additionalProperties: false,
						properties: {
							from: {
								type: "string",
								required: true
							},
							to: {
								type: "string",
								required: true
							},
							label: { type: "string" }
						}
					}
				}
			}
		},
		{
			type: "object",
			additionalProperties: false,
			properties: {
				kind: {
					type: "string",
					const: "timeline",
					required: true
				},
				...headerProperties,
				items: {
					type: "array",
					required: true,
					items: {
						type: "object",
						additionalProperties: false,
						properties: {
							id: {
								type: "string",
								required: true
							},
							title: {
								type: "string",
								required: true
							},
							detail: { type: "string" },
							status: {
								type: "string",
								enum: [
									"past",
									"current",
									"future"
								]
							},
							time: { type: "string" }
						}
					}
				}
			}
		},
		{
			type: "object",
			additionalProperties: false,
			properties: {
				kind: {
					type: "string",
					const: "comparison",
					required: true
				},
				...headerProperties,
				columns: {
					type: "array",
					required: true,
					items: {
						type: "object",
						additionalProperties: false,
						properties: {
							id: {
								type: "string",
								required: true
							},
							title: {
								type: "string",
								required: true
							},
							subtitle: { type: "string" },
							recommended: { type: "boolean" }
						}
					}
				},
				rows: {
					type: "array",
					required: true,
					items: {
						type: "object",
						additionalProperties: false,
						properties: {
							label: {
								type: "string",
								required: true
							},
							values: {
								type: "array",
								required: true,
								items: { type: "string" }
							},
							emphasis: {
								type: "string",
								enum: ["normal", "strong"]
							}
						}
					}
				}
			}
		}
	],
	description: "A bounded native visualization document. Pick exactly one kind."
};
const VISUALIZE_PARAMETERS = {
	document: {
		type: "json",
		required: true,
		description: "A Flow, Timeline, or Comparison document. Pass a JSON object. A JSON-encoded string is also accepted for DSH provider compatibility."
	},
	mode: {
		type: "string",
		enum: ["inline", "wide"],
		description: "Use wide only when side-by-side comparison needs it."
	}
};
const OUTPUT_SCHEMA = {
	type: "object",
	additionalProperties: false,
	properties: {
		version: {
			type: "integer",
			const: 1,
			required: true
		},
		mode: {
			type: "string",
			enum: ["inline", "wide"],
			required: true
		},
		document: {
			...DOCUMENT_SCHEMA,
			required: true
		}
	}
};
function validateDocument(document) {
	nonEmpty(document.title, "title");
	if (document.title.length > 120) throw new Error("visualize_ui title must be at most 120 characters");
	if (document.description !== void 0 && document.description.length > 360) throw new Error("visualize_ui description must be at most 360 characters");
	if (document.kind === "flow") validateFlow(document);
	if (document.kind === "timeline") validateTimeline(document);
	if (document.kind === "comparison") validateComparison(document);
}
function validateFlow(document) {
	if (document.nodes.length < 2 || document.nodes.length > 12) throw new Error("flow requires 2–12 nodes");
	if (document.edges.length < 1 || document.edges.length > 20) throw new Error("flow requires 1–20 edges");
	const ids = uniqueIds(document.nodes.map((node) => node.id), "flow node");
	for (const node of document.nodes) {
		nonEmpty(node.label, `flow node ${node.id} label`);
		if (node.label.length > 80) throw new Error(`flow node ${node.id} label is too long`);
	}
	for (const edge of document.edges) {
		if (!ids.has(edge.from) || !ids.has(edge.to)) throw new Error(`flow edge ${edge.from} → ${edge.to} references an unknown node`);
		if (edge.from === edge.to) throw new Error(`flow edge ${edge.from} cannot point to itself`);
	}
}
function validateTimeline(document) {
	if (document.items.length < 2 || document.items.length > 16) throw new Error("timeline requires 2–16 items");
	uniqueIds(document.items.map((item) => item.id), "timeline item");
	for (const item of document.items) nonEmpty(item.title, `timeline item ${item.id} title`);
}
function validateComparison(document) {
	if (document.columns.length < 2 || document.columns.length > 4) throw new Error("comparison requires 2–4 columns");
	if (document.rows.length < 1 || document.rows.length > 12) throw new Error("comparison requires 1–12 rows");
	uniqueIds(document.columns.map((column) => column.id), "comparison column");
	if (document.columns.filter((column) => column.recommended === true).length > 1) throw new Error("comparison allows at most one recommended column");
	for (const row of document.rows) {
		nonEmpty(row.label, "comparison row label");
		if (row.values.length !== document.columns.length) throw new Error(`comparison row "${row.label}" has ${row.values.length} values for ${document.columns.length} columns`);
	}
}
function uniqueIds(ids, label) {
	const seen = /* @__PURE__ */ new Set();
	for (const id of ids) {
		nonEmpty(id, `${label} id`);
		if (seen.has(id)) throw new Error(`${label} id "${id}" is duplicated`);
		seen.add(id);
	}
	return seen;
}
function nonEmpty(value, label) {
	if (value.trim().length === 0) throw new Error(`${label} must not be empty`);
}
function declarativeMetaFrom(value) {
	if (typeof value !== "object" || value === null) return void 0;
	const record = value;
	if (record.kind !== "openloop.declarative" || record.version !== 1) return void 0;
	if (record.mode !== "inline" && record.mode !== "wide") return void 0;
	const document = record.document;
	if (typeof document !== "object" || document === null) return void 0;
	const kind = document.kind;
	if (kind !== "flow" && kind !== "timeline" && kind !== "comparison") return void 0;
	try {
		validateDocument(document);
	} catch {
		return;
	}
	return {
		kind: "openloop.declarative",
		version: 1,
		mode: record.mode,
		document
	};
}
//#endregion
//#region src/validation.ts
const DOCUMENT_JSON_SCHEMA = valueSchemaSpecToJsonSchema(DOCUMENT_SCHEMA);
function parseDocumentInput(input) {
	let candidate = input;
	if (typeof input === "string") {
		if (new TextEncoder().encode(input).byteLength > 64e3) throw new Error("visualize_ui document JSON must be at most 64 KB");
		try {
			candidate = JSON.parse(input);
		} catch (error) {
			throw new Error(`visualize_ui document is not valid JSON: ${error instanceof Error ? error.message : String(error)}`);
		}
	}
	const violations = validateJsonSchemaValue(DOCUMENT_JSON_SCHEMA, candidate, "document");
	if (violations.length > 0) throw new Error(`visualize_ui document is invalid: ${violations.join("; ")}`);
	const document = candidate;
	validateDocument(document);
	return document;
}
//#endregion
//#region src/index.ts
const name = "openloop-visual-declarative";
const inject = ["tools", "skills"];
function apply(ctx) {
	ctx.tools.register(defineTool({
		name: VISUALIZE_UI_TOOL,
		description: "Render one polished native Flow, Timeline, or Comparison in the conversation from bounded JSON. Use this for structured explanations; it executes no generated code. Load the openloop-visual-declarative skill before the first call.",
		parameters: VISUALIZE_PARAMETERS,
		output: {
			schema: OUTPUT_SCHEMA,
			render: (_args, value) => [{
				type: "text",
				text: `Rendered native ${value.document.kind} visualization: ${value.document.title}.`
			}],
			presentationMeta: (_args, value) => ({
				kind: "openloop.declarative",
				...value
			})
		},
		async execute(args) {
			const document = parseDocumentInput(args.document);
			return {
				version: 1,
				mode: args.mode ?? "inline",
				document
			};
		},
		presentCall: () => ({
			card: "generic",
			title: "OpenLoop Visual · rendering",
			kind: "other"
		}),
		presentResult(_args, result) {
			if (result.isError) return void 0;
			const meta = result.meta;
			return {
				card: "generic",
				title: typeof meta?.document?.title === "string" ? meta.document.title : "OpenLoop Visual"
			};
		}
	}));
	ctx.skills.registerProvider(() => declarativeSkillProvider);
}
//#endregion
export { DOCUMENT_SCHEMA, OUTPUT_SCHEMA, VISUALIZE_PARAMETERS, VISUALIZE_UI_TOOL, apply, declarativeMetaFrom, inject, name, validateDocument };
