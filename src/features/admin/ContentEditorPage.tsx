import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { asObject, type Row } from '../../lib/db-client'
import { adminRepository } from './repository'
import { rolesService, useRoles } from './roles'
import './admin.css'

const BLOCK_TYPES = [
	'heading', 'paragraph', 'definition', 'formula', 'derivation', 'example',
	'diagram', 'visualization', 'callout', 'examNote', 'summary',
] as const
type BlockType = (typeof BLOCK_TYPES)[number]

const FIELDS: Record<BlockType, string[]> = {
	heading: ['text', 'level'],
	paragraph: ['text'],
	definition: ['term', 'text'],
	formula: ['name', 'latex', 'meaning', 'variables', 'units', 'conditions'],
	derivation: ['title', 'start', 'steps', 'result', 'conditions'],
	example: ['title', 'problem', 'solution'],
	diagram: ['assetId', 'caption', 'altText'],
	visualization: ['visualizationId', 'caption'],
	callout: ['tone', 'text'],
	examNote: ['text'],
	summary: ['text'],
}

type Block = { id: string; type: BlockType } & Row

const newBlock = (type: BlockType): Block => ({
	id: `b-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
	type,
})

const text = (block: Block, field: string): string => (typeof block[field] === 'string' ? (block[field] as string) : '')

/** Rough prose-volume signal so editors can see whether a chapter reaches textbook depth. */
const depthOf = (blocks: Block[]): { words: number; pages: number } => {
	const words = blocks.reduce((sum, block) => {
		const fields = FIELDS[block.type] ?? ['text']
		return sum + fields.reduce((inner, field) => inner + text(block, field).split(/\s+/).filter(Boolean).length, 0)
	}, 0)
	return { words, pages: Math.round(words / 450) }
}

export const ContentEditorPage = () => {
	const { lessonId } = useParams()
	const { user } = useAuth()
	const { canEdit } = useRoles()
	const [versionId, setVersionId] = useState<string | null>(null)
	const [blocks, setBlocks] = useState<Block[]>([])
	const [status, setStatus] = useState('')
	const [preview, setPreview] = useState<'desktop' | 'tablet' | 'mobile'>('desktop')
	const [message, setMessage] = useState<string | null>(null)

	const load = useCallback(async () => {
		if (!lessonId) return
		try {
			const versions = await adminRepository.loadLessonDraft(lessonId)
			const draft = versions.find((version) => version.status === 'draft') ?? versions[0]
			if (!draft) {
				setMessage('No versions exist for this lesson yet. Create a draft through import or the curriculum tools.')
				return
			}
			setVersionId(draft.id)
			setStatus(draft.status)
			const document = asObject(draft.document)
			setBlocks(Array.isArray(document.blocks) ? (document.blocks as Block[]) : [])
			setMessage(null)
		} catch (error) {
			setMessage(error instanceof Error ? error.message : 'Could not load the lesson draft.')
		}
	}, [lessonId])

	useEffect(() => {
		void load()
	}, [load])

	const save = async () => {
		if (!versionId || !user?.id) return
		try {
			await adminRepository.saveLessonDraft(versionId, { schemaVersion: 2, blocks })
			await rolesService.logAction(user.id, 'save_draft', 'lesson', lessonId ?? null, `${blocks.length} blocks`)
			setMessage('Draft saved.')
		} catch (error) {
			setMessage(error instanceof Error ? error.message : 'Could not save. Published versions are read-only.')
		}
	}

	const submitForReview = async () => {
		if (!versionId || !user?.id) return
		try {
			await adminRepository.setVersionStatus(versionId, 'review')
			await rolesService.logAction(user.id, 'submit_review', 'lesson', lessonId ?? null)
			setStatus('review')
			setMessage('Sent for academic review. It stays unpublished until a reviewer approves it.')
		} catch (error) {
			setMessage(error instanceof Error ? error.message : 'Could not submit for review.')
		}
	}

	const move = (index: number, delta: number) => {
		const target = index + delta
		if (target < 0 || target >= blocks.length) return
		const next = [...blocks]
		const currentBlock = next[index]
		const targetBlock = next[target]
		if (!currentBlock || !targetBlock) return
		next[index] = targetBlock
		next[target] = currentBlock
		setBlocks(next)
	}

	const width = useMemo(() => (preview === 'mobile' ? 390 : preview === 'tablet' ? 768 : 860), [preview])
	const depth = useMemo(() => depthOf(blocks), [blocks])

	if (!lessonId) return <section className="adm-page"><h1>Content editor</h1><p className="adm-note">Choose a lesson from the curriculum manager to edit its content.</p><Link className="button button--primary" to="/admin/curriculum">Open curriculum</Link></section>

	return (
		<div className="adm-page">
			<h1>Content editor</h1>
			<p className="adm-note">
				Version status: {status || 'unknown'} · approx. {depth.words} words (~{depth.pages} textbook pages). Learn content must read as one
				continuous chapter, not a card collection.
			</p>
			{message ? <p className="adm-note adm-note--warn">{message}</p> : null}

			<div className="adm-row">
				{BLOCK_TYPES.map((type) => (
					<button key={type} type="button" className="adm-ghost" disabled={!canEdit} onClick={() => setBlocks((prev) => [...prev, newBlock(type)])}>
						+ {type}
					</button>
				))}
			</div>
			<div className="adm-row">
				<button type="button" className="adm-primary" disabled={!canEdit || !versionId} onClick={() => void save()}>Save draft</button>
				<button type="button" className="adm-ghost" disabled={!canEdit || !versionId} onClick={() => void submitForReview()}>Send for review</button>
				{(['desktop', 'tablet', 'mobile'] as const).map((mode) => (
					<button key={mode} type="button" className={`adm-chip${preview === mode ? ' adm-chip--on' : ''}`} onClick={() => setPreview(mode)}>
						{mode}
					</button>
				))}
			</div>

			<div className="adm-cols adm-cols--editor">
				<section>
					<h2>Blocks ({blocks.length})</h2>
					<ul className="adm-blocks">
						{blocks.map((block, index) => (
							<li key={block.id}>
								<div className="adm-row adm-row--tight">
									<strong>{block.type}</strong>
									<button type="button" className="adm-ghost" onClick={() => move(index, -1)} aria-label={`Move ${block.type} up`}>↑</button>
									<button type="button" className="adm-ghost" onClick={() => move(index, 1)} aria-label={`Move ${block.type} down`}>↓</button>
									<button type="button" className="adm-ghost" onClick={() => setBlocks((prev) => prev.filter((item) => item.id !== block.id))}>Remove</button>
								</div>
								{(FIELDS[block.type] ?? ['text']).map((field) => (
									<label key={field} className="adm-field">
										<span className="adm-meta">{field}</span>
										<textarea
											rows={['text', 'solution', 'steps', 'problem'].includes(field) ? 4 : 2}
											value={text(block, field)}
											disabled={!canEdit}
											onChange={(event) =>
												setBlocks((prev) => prev.map((item) => (item.id === block.id ? { ...item, [field]: event.target.value } : item)))
											}
										/>
									</label>
								))}
							</li>
						))}
					</ul>
					{blocks.length === 0 ? <p className="adm-note">Add blocks to start the chapter.</p> : null}
				</section>

				<section>
					<h2>Preview</h2>
					<p className="adm-note">
						This is a structural preview. Open the lesson at <code>/dev/content/{lessonId}</code> to render it with the real student reader —
						there is no second rendering engine.
					</p>
					<div className="adm-preview" style={{ maxWidth: width }}>
						<article className="adm-book">
							{blocks.map((block) => {
								if (block.type === 'heading') return <h3 key={block.id}>{text(block, 'text')}</h3>
								if (block.type === 'formula') return <p key={block.id} className="adm-book__formula">{text(block, 'latex') || text(block, 'name')}</p>
								if (block.type === 'derivation')
									return (
										<div key={block.id} className="adm-book__derivation">
											<strong>{text(block, 'title')}</strong>
											<p>{text(block, 'steps')}</p>
										</div>
									)
								if (block.type === 'callout' || block.type === 'examNote')
									return <aside key={block.id} className="adm-book__note">{text(block, 'text')}</aside>
								if (block.type === 'definition')
									return (
										<p key={block.id}>
											<strong>{text(block, 'term')} — </strong>
											{text(block, 'text')}
										</p>
									)
								return <p key={block.id}>{text(block, 'text') || text(block, 'caption') || text(block, 'problem')}</p>
							})}
						</article>
					</div>
				</section>
			</div>
		</div>
	)
}

export default ContentEditorPage
