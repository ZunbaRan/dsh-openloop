import { Context } from "@deepseek-ai/cordis";
//#region src/document.d.ts
declare const VISUALIZE_UI_TOOL = "visualize_ui";
type Tone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';
type SurfaceMode = 'inline' | 'wide';
interface FlowNode {
  id: string;
  label: string;
  detail?: string;
  tone?: Tone;
}
interface FlowEdge {
  from: string;
  to: string;
  label?: string;
}
interface FlowDocument {
  kind: 'flow';
  title: string;
  description?: string;
  nodes: FlowNode[];
  edges: FlowEdge[];
}
interface TimelineItem {
  id: string;
  title: string;
  detail?: string;
  status?: 'past' | 'current' | 'future';
  time?: string;
}
interface TimelineDocument {
  kind: 'timeline';
  title: string;
  description?: string;
  items: TimelineItem[];
}
interface ComparisonColumn {
  id: string;
  title: string;
  subtitle?: string;
  recommended?: boolean;
}
interface ComparisonRow {
  label: string;
  values: string[];
  emphasis?: 'normal' | 'strong';
}
interface ComparisonDocument {
  kind: 'comparison';
  title: string;
  description?: string;
  columns: ComparisonColumn[];
  rows: ComparisonRow[];
}
type DeclarativeDocument = FlowDocument | TimelineDocument | ComparisonDocument;
interface DeclarativeMeta {
  kind: 'openloop.declarative';
  version: 1;
  mode: SurfaceMode;
  document: DeclarativeDocument;
}
declare const DOCUMENT_SCHEMA: {
  readonly oneOf: readonly [{
    readonly type: "object";
    readonly additionalProperties: false;
    readonly properties: {
      readonly nodes: {
        readonly type: "array";
        readonly required: true;
        readonly items: {
          readonly type: "object";
          readonly additionalProperties: false;
          readonly properties: {
            readonly id: {
              readonly type: "string";
              readonly required: true;
            };
            readonly label: {
              readonly type: "string";
              readonly required: true;
            };
            readonly detail: {
              readonly type: "string";
            };
            readonly tone: {
              readonly type: "string";
              readonly enum: readonly ["neutral", "info", "success", "warning", "danger"];
            };
          };
        };
      };
      readonly edges: {
        readonly type: "array";
        readonly required: true;
        readonly items: {
          readonly type: "object";
          readonly additionalProperties: false;
          readonly properties: {
            readonly from: {
              readonly type: "string";
              readonly required: true;
            };
            readonly to: {
              readonly type: "string";
              readonly required: true;
            };
            readonly label: {
              readonly type: "string";
            };
          };
        };
      };
      readonly title: {
        readonly type: "string";
        readonly required: true;
        readonly description: "Short user-facing title.";
      };
      readonly description: {
        readonly type: "string";
        readonly description: "One concise sentence explaining what to inspect.";
      };
      readonly kind: {
        readonly type: "string";
        readonly const: "flow";
        readonly required: true;
      };
    };
  }, {
    readonly type: "object";
    readonly additionalProperties: false;
    readonly properties: {
      readonly items: {
        readonly type: "array";
        readonly required: true;
        readonly items: {
          readonly type: "object";
          readonly additionalProperties: false;
          readonly properties: {
            readonly id: {
              readonly type: "string";
              readonly required: true;
            };
            readonly title: {
              readonly type: "string";
              readonly required: true;
            };
            readonly detail: {
              readonly type: "string";
            };
            readonly status: {
              readonly type: "string";
              readonly enum: readonly ["past", "current", "future"];
            };
            readonly time: {
              readonly type: "string";
            };
          };
        };
      };
      readonly title: {
        readonly type: "string";
        readonly required: true;
        readonly description: "Short user-facing title.";
      };
      readonly description: {
        readonly type: "string";
        readonly description: "One concise sentence explaining what to inspect.";
      };
      readonly kind: {
        readonly type: "string";
        readonly const: "timeline";
        readonly required: true;
      };
    };
  }, {
    readonly type: "object";
    readonly additionalProperties: false;
    readonly properties: {
      readonly columns: {
        readonly type: "array";
        readonly required: true;
        readonly items: {
          readonly type: "object";
          readonly additionalProperties: false;
          readonly properties: {
            readonly id: {
              readonly type: "string";
              readonly required: true;
            };
            readonly title: {
              readonly type: "string";
              readonly required: true;
            };
            readonly subtitle: {
              readonly type: "string";
            };
            readonly recommended: {
              readonly type: "boolean";
            };
          };
        };
      };
      readonly rows: {
        readonly type: "array";
        readonly required: true;
        readonly items: {
          readonly type: "object";
          readonly additionalProperties: false;
          readonly properties: {
            readonly label: {
              readonly type: "string";
              readonly required: true;
            };
            readonly values: {
              readonly type: "array";
              readonly required: true;
              readonly items: {
                readonly type: "string";
              };
            };
            readonly emphasis: {
              readonly type: "string";
              readonly enum: readonly ["normal", "strong"];
            };
          };
        };
      };
      readonly title: {
        readonly type: "string";
        readonly required: true;
        readonly description: "Short user-facing title.";
      };
      readonly description: {
        readonly type: "string";
        readonly description: "One concise sentence explaining what to inspect.";
      };
      readonly kind: {
        readonly type: "string";
        readonly const: "comparison";
        readonly required: true;
      };
    };
  }];
  readonly description: "A bounded native visualization document. Pick exactly one kind.";
};
declare const VISUALIZE_PARAMETERS: {
  readonly document: {
    readonly type: "json";
    readonly required: true;
    readonly description: "A Flow, Timeline, or Comparison document. Pass a JSON object. A JSON-encoded string is also accepted for DSH provider compatibility.";
  };
  readonly mode: {
    readonly type: "string";
    readonly enum: readonly ["inline", "wide"];
    readonly description: "Use wide only when side-by-side comparison needs it.";
  };
};
declare const OUTPUT_SCHEMA: {
  readonly type: "object";
  readonly additionalProperties: false;
  readonly properties: {
    readonly version: {
      readonly type: "integer";
      readonly const: 1;
      readonly required: true;
    };
    readonly mode: {
      readonly type: "string";
      readonly enum: readonly ["inline", "wide"];
      readonly required: true;
    };
    readonly document: {
      readonly required: true;
      readonly oneOf: readonly [{
        readonly type: "object";
        readonly additionalProperties: false;
        readonly properties: {
          readonly nodes: {
            readonly type: "array";
            readonly required: true;
            readonly items: {
              readonly type: "object";
              readonly additionalProperties: false;
              readonly properties: {
                readonly id: {
                  readonly type: "string";
                  readonly required: true;
                };
                readonly label: {
                  readonly type: "string";
                  readonly required: true;
                };
                readonly detail: {
                  readonly type: "string";
                };
                readonly tone: {
                  readonly type: "string";
                  readonly enum: readonly ["neutral", "info", "success", "warning", "danger"];
                };
              };
            };
          };
          readonly edges: {
            readonly type: "array";
            readonly required: true;
            readonly items: {
              readonly type: "object";
              readonly additionalProperties: false;
              readonly properties: {
                readonly from: {
                  readonly type: "string";
                  readonly required: true;
                };
                readonly to: {
                  readonly type: "string";
                  readonly required: true;
                };
                readonly label: {
                  readonly type: "string";
                };
              };
            };
          };
          readonly title: {
            readonly type: "string";
            readonly required: true;
            readonly description: "Short user-facing title.";
          };
          readonly description: {
            readonly type: "string";
            readonly description: "One concise sentence explaining what to inspect.";
          };
          readonly kind: {
            readonly type: "string";
            readonly const: "flow";
            readonly required: true;
          };
        };
      }, {
        readonly type: "object";
        readonly additionalProperties: false;
        readonly properties: {
          readonly items: {
            readonly type: "array";
            readonly required: true;
            readonly items: {
              readonly type: "object";
              readonly additionalProperties: false;
              readonly properties: {
                readonly id: {
                  readonly type: "string";
                  readonly required: true;
                };
                readonly title: {
                  readonly type: "string";
                  readonly required: true;
                };
                readonly detail: {
                  readonly type: "string";
                };
                readonly status: {
                  readonly type: "string";
                  readonly enum: readonly ["past", "current", "future"];
                };
                readonly time: {
                  readonly type: "string";
                };
              };
            };
          };
          readonly title: {
            readonly type: "string";
            readonly required: true;
            readonly description: "Short user-facing title.";
          };
          readonly description: {
            readonly type: "string";
            readonly description: "One concise sentence explaining what to inspect.";
          };
          readonly kind: {
            readonly type: "string";
            readonly const: "timeline";
            readonly required: true;
          };
        };
      }, {
        readonly type: "object";
        readonly additionalProperties: false;
        readonly properties: {
          readonly columns: {
            readonly type: "array";
            readonly required: true;
            readonly items: {
              readonly type: "object";
              readonly additionalProperties: false;
              readonly properties: {
                readonly id: {
                  readonly type: "string";
                  readonly required: true;
                };
                readonly title: {
                  readonly type: "string";
                  readonly required: true;
                };
                readonly subtitle: {
                  readonly type: "string";
                };
                readonly recommended: {
                  readonly type: "boolean";
                };
              };
            };
          };
          readonly rows: {
            readonly type: "array";
            readonly required: true;
            readonly items: {
              readonly type: "object";
              readonly additionalProperties: false;
              readonly properties: {
                readonly label: {
                  readonly type: "string";
                  readonly required: true;
                };
                readonly values: {
                  readonly type: "array";
                  readonly required: true;
                  readonly items: {
                    readonly type: "string";
                  };
                };
                readonly emphasis: {
                  readonly type: "string";
                  readonly enum: readonly ["normal", "strong"];
                };
              };
            };
          };
          readonly title: {
            readonly type: "string";
            readonly required: true;
            readonly description: "Short user-facing title.";
          };
          readonly description: {
            readonly type: "string";
            readonly description: "One concise sentence explaining what to inspect.";
          };
          readonly kind: {
            readonly type: "string";
            readonly const: "comparison";
            readonly required: true;
          };
        };
      }];
      readonly description: "A bounded native visualization document. Pick exactly one kind.";
    };
  };
};
declare function validateDocument(document: DeclarativeDocument): void;
declare function declarativeMetaFrom(value: unknown): DeclarativeMeta | undefined;
//#endregion
//#region src/index.d.ts
declare const name = "openloop-visual-declarative";
declare const inject: string[];
declare function apply(ctx: Context): void;
//#endregion
export { ComparisonColumn, ComparisonDocument, ComparisonRow, DOCUMENT_SCHEMA, DeclarativeDocument, DeclarativeMeta, FlowDocument, FlowEdge, FlowNode, OUTPUT_SCHEMA, SurfaceMode, TimelineDocument, TimelineItem, Tone, VISUALIZE_PARAMETERS, VISUALIZE_UI_TOOL, apply, declarativeMetaFrom, inject, name, validateDocument };