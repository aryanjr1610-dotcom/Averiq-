export type NoteType = 'personal' | 'lesson' | 'formula' | 'question' | 'visual'
export type HighlightColor = 'default' | 'important' | 'question'
export type BookmarkEntity =
	| 'lesson'
	| 'chapter'
	| 'formula'
	| 'derivation'
	| 'question'
	| 'revision'
	| 'visualization'
	| 'anatomy'

export type Note = {
	id: string
	title: string | null
	content: string
	type: NoteType
	subjectId: string | null
	chapterId: string | null
	lessonId: string | null
	blockId: string | null
	formulaId: string | null
	questionId: string | null
	visualizationId: string | null
	pinned: boolean
	tags: string[]
	createdAt: string
	updatedAt: string
}

export type Highlight = {
	id: string
	lessonId: string
	blockId: string
	contentVersionId: string | null
	selectedText: string
	textSnapshot: string
	prefix: string | null
	suffix: string | null
	color: HighlightColor
	noteId: string | null
	createdAt: string
}

export type Bookmark = {
	id: string
	entityType: BookmarkEntity
	entityId: string
	title: string | null
	route: string | null
	createdAt: string
}

export const HIGHLIGHT_COLORS: HighlightColor[] = ['default', 'important', 'question']

export const HIGHLIGHT_LABEL: Record<HighlightColor, string> = {
	default: 'Highlight',
	important: 'Important',
	question: 'Doubt',
}

export const noteHeading = (note: Note): string => {
	if (note.title && note.title.trim()) return note.title.trim()
	const firstLine = note.content.split('\n').find((line) => line.trim().length > 0)
	return firstLine ? firstLine.slice(0, 80) : 'Untitled note'
}

export const bookmarkRoute = (bookmark: Bookmark): string => {
	if (bookmark.route) return bookmark.route
	switch (bookmark.entityType) {
		case 'lesson':
			return `/app/learn/lessons/${bookmark.entityId}`
		case 'chapter':
			return `/app/learn/chapters/${bookmark.entityId}`
		case 'formula':
			return `/app/formulas`
		case 'revision':
			return `/app/revision`
		case 'question':
			return `/app/practice`
		case 'visualization':
			return `/app/visual-lab/${bookmark.entityId}`
		case 'anatomy':
			return `/app/anatomy`
		default:
			return '/app/dashboard'
	}
}

export const sortNotes = (notes: Note[]): Note[] =>
	[...notes].sort((a, b) => {
		if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
		return a.updatedAt < b.updatedAt ? 1 : -1
	})

export const filterNotes = (notes: Note[], query: string, tag: string | null): Note[] => {
	const q = query.trim().toLowerCase()
	return notes.filter((note) => {
		if (tag && !note.tags.includes(tag)) return false
		if (!q) return true
		return `${note.title ?? ''} ${note.content}`.toLowerCase().includes(q)
	})
}
