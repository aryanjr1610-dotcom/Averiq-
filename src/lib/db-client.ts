import { getSupabase } from './supabase'

export type Row = Record<string, unknown>
export type DbResult<T> = { data: T | null; error: { message: string; code?: string } | null }

export interface Query extends PromiseLike<DbResult<Row[]>> {
	select(columns?: string, options?: Row): Query
	insert(values: Row | Row[]): Query
	update(values: Row): Query
	upsert(values: Row | Row[], options?: Row): Query
	delete(): Query
	eq(column: string, value: unknown): Query
	neq(column: string, value: unknown): Query
	in(column: string, values: readonly unknown[]): Query
	is(column: string, value: unknown): Query
	gte(column: string, value: unknown): Query
	lte(column: string, value: unknown): Query
	ilike(column: string, pattern: string): Query
	order(column: string, options?: Row): Query
	range(from: number, to: number): Query
	limit(count: number): Query
	single(): PromiseLike<DbResult<Row>>
	maybeSingle(): PromiseLike<DbResult<Row>>
}

export interface StorageBucket {
	upload(path: string, file: File | Blob, options?: Row): PromiseLike<DbResult<Row>>
	remove(paths: string[]): PromiseLike<DbResult<Row[]>>
	getPublicUrl(path: string): { data: { publicUrl: string } }
	list(prefix?: string, options?: Row): PromiseLike<DbResult<Row[]>>
}

export interface DbClient {
	from(table: string): Query
	rpc(fn: string, args?: Row): PromiseLike<DbResult<Row[]>>
	storage: { from(bucket: string): StorageBucket }
	functions: { invoke(name: string, options?: Row): PromiseLike<DbResult<Row>> }
	auth: {
		updateUser(attrs: Row): PromiseLike<DbResult<Row>>
		signOut(): PromiseLike<{ error: { message: string } | null }>
	}
}

export const db = (): DbClient => getSupabase() as unknown as DbClient

export const check = (error: { message: string } | null, action: string): void => {
	if (error) throw new Error(`${action}: ${error.message}`)
}

export const asText = (value: unknown): string => (typeof value === 'string' ? value : '')
export const asNullText = (value: unknown): string | null => (typeof value === 'string' ? value : null)
export const asNumber = (value: unknown): number => (typeof value === 'number' && Number.isFinite(value) ? value : 0)
export const asObject = (value: unknown): Row => (typeof value === 'object' && value !== null ? (value as Row) : {})
