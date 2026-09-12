import type { Highlight } from './model'

const CONTEXT = 60

export type SelectionCapture = {
	lessonId: string
	blockId: string
	selectedText: string
	textSnapshot: string
	prefix: string
	suffix: string
}

const closestAttr = (node: Node | null, attribute: string): HTMLElement | null => {
	let current: Node | null = node
	while (current) {
		if (current instanceof HTMLElement && current.hasAttribute(attribute)) return current
		current = current.parentNode
	}
	return null
}

/**
 * Captures the current selection if it sits inside one Averiq content block.
 * Returns null for empty, cross-block or non-content selections.
 */
export const captureSelection = (): SelectionCapture | null => {
	const selection = window.getSelection()
	if (!selection || selection.isCollapsed || selection.rangeCount === 0) return null
	const range = selection.getRangeAt(0)
	const selectedText = selection.toString().replace(/\s+/g, ' ').trim()
	if (selectedText.length < 3) return null

	const block = closestAttr(range.startContainer, 'data-block-id')
	const endBlock = closestAttr(range.endContainer, 'data-block-id')
	if (!block || !endBlock || block !== endBlock) return null
	const lessonHost = closestAttr(block, 'data-lesson-id')
	if (!lessonHost) return null

	const blockText = (block.textContent ?? '').replace(/\s+/g, ' ')
	const index = blockText.indexOf(selectedText)
	return {
		lessonId: lessonHost.getAttribute('data-lesson-id') ?? '',
		blockId: block.getAttribute('data-block-id') ?? '',
		selectedText,
		textSnapshot: blockText.slice(0, 4000),
		prefix: index > 0 ? blockText.slice(Math.max(0, index - CONTEXT), index) : '',
		suffix: index >= 0 ? blockText.slice(index + selectedText.length, index + selectedText.length + CONTEXT) : '',
	}
}

export type PaintResult = { painted: number; unanchored: Highlight[] }

const walkText = (root: HTMLElement): Text[] => {
	const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
	const nodes: Text[] = []
	let node = walker.nextNode()
	while (node) {
		if (node instanceof Text && node.nodeValue && node.nodeValue.trim()) nodes.push(node)
		node = walker.nextNode()
	}
	return nodes
}

const findRange = (block: HTMLElement, needle: string): Range | null => {
	const nodes = walkText(block)
	let offset = 0
	const map: Array<{ node: Text; start: number }> = []
	let flat = ''
	for (const node of nodes) {
		map.push({ node, start: offset })
		flat += node.nodeValue ?? ''
		offset += (node.nodeValue ?? '').length
	}
	const normalized = flat.replace(/\s+/g, ' ')
	const target = needle.replace(/\s+/g, ' ')
	const rough = normalized.indexOf(target)
	if (rough < 0) return null

	// Map the normalized index back to the raw string (whitespace-tolerant).
	let raw = 0
	let seen = 0
	while (raw < flat.length && seen < rough) {
		const isSpace = /\s/.test(flat[raw] ?? '')
		const nextIsSpace = /\s/.test(flat[raw + 1] ?? '')
		if (!(isSpace && nextIsSpace)) seen += 1
		raw += 1
	}

	const locate = (position: number): { node: Text; offset: number } | null => {
		for (let i = map.length - 1; i >= 0; i -= 1) {
			const entry = map[i]
			if (entry && position >= entry.start) return { node: entry.node, offset: position - entry.start }
		}
		return null
	}
	const start = locate(raw)
	const end = locate(Math.min(flat.length, raw + target.length))
	if (!start || !end) return null

	const range = document.createRange()
	try {
		range.setStart(start.node, Math.min(start.offset, start.node.length))
		range.setEnd(end.node, Math.min(end.offset, end.node.length))
	} catch {
		return null
	}
	return range
}

/**
 * Paints saved highlights onto rendered content. If a highlight can no longer
 * be anchored (content was republished), it is returned as `unanchored`
 * instead of being lost or silently dropped.
 */
export const paintHighlights = (root: HTMLElement, highlights: Highlight[]): PaintResult => {
	let painted = 0
	const unanchored: Highlight[] = []
	for (const highlight of highlights) {
		const block = root.querySelector<HTMLElement>(`[data-block-id="${CSS.escape(highlight.blockId)}"]`)
		if (!block) {
			unanchored.push(highlight)
			continue
		}
		if (block.querySelector(`mark[data-highlight-id="${CSS.escape(highlight.id)}"]`)) {
			painted += 1
			continue
		}
		const range = findRange(block, highlight.selectedText)
		if (!range) {
			unanchored.push(highlight)
			continue
		}
		const mark = document.createElement('mark')
		mark.className = `av-mark av-mark--${highlight.color}`
		mark.setAttribute('data-highlight-id', highlight.id)
		try {
			range.surroundContents(mark)
			painted += 1
		} catch {
			// Selection spans element boundaries - keep the text untouched.
			unanchored.push(highlight)
		}
	}
	return { painted, unanchored }
}

export const clearHighlight = (root: HTMLElement, highlightId: string): void => {
	const mark = root.querySelector<HTMLElement>(`mark[data-highlight-id="${CSS.escape(highlightId)}"]`)
	if (!mark || !mark.parentNode) return
	const parent = mark.parentNode
	while (mark.firstChild) parent.insertBefore(mark.firstChild, mark)
	parent.removeChild(mark)
	if (parent instanceof HTMLElement) parent.normalize()
}
