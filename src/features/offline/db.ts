// Minimal IndexedDB wrapper - no new dependency, no large localStorage blobs.
const DB_NAME = 'averiq-offline'
const DB_VERSION = 1

export const STORES = {
	packages: 'packages',
	content: 'content',
	assets: 'assets',
	queue: 'queue',
} as const

export type StoreName = (typeof STORES)[keyof typeof STORES]

let handle: Promise<IDBDatabase> | null = null

export const offlineAvailable = (): boolean => typeof indexedDB !== 'undefined'

const open = (): Promise<IDBDatabase> => {
	if (handle) return handle
	handle = new Promise((resolve, reject) => {
		const request = indexedDB.open(DB_NAME, DB_VERSION)
		request.onupgradeneeded = () => {
			const database = request.result
			if (!database.objectStoreNames.contains(STORES.packages)) database.createObjectStore(STORES.packages, { keyPath: 'id' })
			if (!database.objectStoreNames.contains(STORES.content)) database.createObjectStore(STORES.content, { keyPath: 'key' })
			if (!database.objectStoreNames.contains(STORES.assets)) database.createObjectStore(STORES.assets, { keyPath: 'url' })
			if (!database.objectStoreNames.contains(STORES.queue)) database.createObjectStore(STORES.queue, { keyPath: 'id', autoIncrement: true })
		}
		request.onsuccess = () => resolve(request.result)
		request.onerror = () => reject(request.error ?? new Error('IndexedDB unavailable'))
	})
	return handle
}

const run = async <T>(store: StoreName, mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest): Promise<T> => {
	const database = await open()
	return new Promise<T>((resolve, reject) => {
		const transaction = database.transaction(store, mode)
		const request = action(transaction.objectStore(store))
		request.onsuccess = () => resolve(request.result as T)
		request.onerror = () => reject(request.error ?? new Error('Offline storage error'))
	})
}

export const offlineDb = {
	get: <T>(store: StoreName, key: IDBValidKey) => run<T | undefined>(store, 'readonly', (s) => s.get(key)),
	all: <T>(store: StoreName) => run<T[]>(store, 'readonly', (s) => s.getAll()),
	put: <T>(store: StoreName, value: T) => run<IDBValidKey>(store, 'readwrite', (s) => s.put(value as unknown as Record<string, unknown>)),
	remove: (store: StoreName, key: IDBValidKey) => run<undefined>(store, 'readwrite', (s) => s.delete(key)),
	clear: (store: StoreName) => run<undefined>(store, 'readwrite', (s) => s.clear()),
}

export type StorageEstimate = { usage: number; quota: number; percent: number }

export const storageEstimate = async (): Promise<StorageEstimate | null> => {
	if (typeof navigator === 'undefined' || !navigator.storage?.estimate) return null
	const estimate = await navigator.storage.estimate()
	const usage = estimate.usage ?? 0
	const quota = estimate.quota ?? 0
	return { usage, quota, percent: quota > 0 ? Math.round((usage / quota) * 100) : 0 }
}

export const isQuotaError = (error: unknown): boolean =>
	error instanceof DOMException && (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED')

export const formatBytes = (bytes: number): string => {
	if (bytes < 1024) return `${bytes} B`
	if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
