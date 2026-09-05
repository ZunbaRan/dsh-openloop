/** 共享基础类型（host/client 两半都引用） */
export type JsonPrimitive = string | number | boolean | null
export type JsonObject = { readonly [key: string]: JsonPrimitive | JsonObject | readonly unknown[] }
