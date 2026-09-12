import { useState } from 'react'
import { useAuth } from '../auth/useAuth'
import { check, db, type Row } from '../../lib/db-client'
import { parseCsv, validateImport, type ImportKind, type ValidationReport } from './import-validate'
import { adminRepository } from './repository'
import { rolesService, useRoles } from './roles'
import './admin.css'

const KINDS: ImportKind[] = ['curriculum', 'chapters', 'formulas', 'questions', 'revision']

export const ImportPage = () => {
	const { user } = useAuth()
	const { canEdit } = useRoles()
	const [kind, setKind] = useState<ImportKind>('curriculum')
	const [label, setLabel] = useState('')
	const [raw, setRaw] = useState('')
	const [report, setReport] = useState<ValidationReport | null>(null)
	const [message, setMessage] = useState<string | null>(null)
	const [busy, setBusy] = useState(false)

	const readFile = async (file: File | undefined) => {
		if (!file) return
		setRaw(await file.text())
		setLabel(file.name)
		setReport(null)
	}

	const parse = (): Row[] => {
		const trimmed = raw.trim()
		if (!trimmed) return []
		if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
			const parsed = JSON.parse(trimmed) as Row | Row[]
			return Array.isArray(parsed) ? parsed : [parsed]
		}
		return parseCsv(trimmed)
	}

	const dryRun = async () => {
		setMessage(null)
		try {
			const rows = parse()
			if (rows.length === 0) {
				setMessage('No rows found. Paste JSON or CSV with a header row.')
				return
			}
			const existing = await db().from('import_jobs').select('digest').eq('kind', kind).limit(500)
			const known = new Set((existing.data ?? []).map((row) => String(row.digest)))
			const next = validateImport(kind, rows)
			setReport(next)
			if (known.has(next.digest)) setMessage('This exact file was imported before — committing again will be skipped as a duplicate.')
		} catch (error) {
			setMessage(error instanceof Error ? `Could not parse the file: ${error.message}` : 'Could not parse the file.')
		}
	}

	const commit = async () => {
		if (!report || !user?.id) return
		const errors = report.issues.filter((issue) => issue.severity === 'error').length
		if (errors > 0) {
			setMessage('Fix the errors before committing.')
			return
		}
		setBusy(true)
		try {
			// Structural import goes through the server-side RPC so validation,
			// idempotency and RLS all run in the database, not the browser.
			const result = await db().rpc('import_academic_bundle', {
				p_import_key: `${kind}:${report.digest}`,
				p_digest: report.digest,
				p_bundle: { kind, sourceLabel: label, rows: report.rows },
			})
			check(result.error, 'Import failed')
			await adminRepository.recordImport({
				kind,
				sourceLabel: label || 'pasted',
				digest: report.digest,
				status: 'committed',
				stats: { total: report.total, valid: report.valid, duplicates: report.duplicates },
				userId: user.id,
			})
			await rolesService.logAction(user.id, 'import_commit', kind, report.digest, `${report.valid} rows`)
			setMessage(`Committed ${report.valid} rows.`)
		} catch (error) {
			const text = error instanceof Error ? error.message : 'Import failed.'
			await adminRepository
				.recordImport({ kind, sourceLabel: label || 'pasted', digest: report.digest, status: 'failed', stats: { total: report.total }, error: text, userId: user.id })
				.catch(() => undefined)
			setMessage(text)
		} finally {
			setBusy(false)
		}
	}

	const errorCount = report?.issues.filter((issue) => issue.severity === 'error').length ?? 0

	return (
		<div className="adm-page">
			<h1>Bulk import</h1>
			<p className="adm-note">Validated JSON or CSV only. Raw SQL uploads are not accepted, and every commit runs through the server import RPC.</p>

			<div className="adm-row">
				{KINDS.map((item) => (
					<button key={item} type="button" className={`adm-chip${kind === item ? ' adm-chip--on' : ''}`} onClick={() => { setKind(item); setReport(null) }}>
						{item}
					</button>
				))}
				<input type="file" accept=".json,.csv,text/csv,application/json" onChange={(event) => void readFile(event.target.files?.[0])} aria-label="Import file" />
			</div>

			<textarea className="adm-textarea" rows={10} value={raw} onChange={(event) => { setRaw(event.target.value); setReport(null) }} placeholder="Paste JSON array or CSV" aria-label="Import payload" />

			<div className="adm-row">
				<button type="button" className="adm-ghost" onClick={() => void dryRun()}>Validate only (dry run)</button>
				<button type="button" className="adm-primary" disabled={!canEdit || !report || errorCount > 0 || busy} onClick={() => void commit()}>
					{busy ? 'Committing…' : 'Confirm and commit'}
				</button>
			</div>

			{message ? <p className="adm-note adm-note--warn">{message}</p> : null}

			{report ? (
				<>
					<ul className="adm-stats">
						<li><strong>{report.total}</strong><span>rows</span></li>
						<li><strong>{report.valid}</strong><span>valid</span></li>
						<li><strong>{errorCount}</strong><span>errors</span></li>
						<li><strong>{report.duplicates}</strong><span>duplicates</span></li>
					</ul>
					{report.issues.length > 0 ? (
						<table className="adm-table">
							<thead><tr><th>Row</th><th>Field</th><th>Issue</th><th>Severity</th></tr></thead>
							<tbody>
								{report.issues.slice(0, 200).map((issue, index) => (
									<tr key={`${issue.row}-${issue.field}-${index}`}>
										<td>{issue.row}</td><td>{issue.field}</td><td>{issue.message}</td><td>{issue.severity}</td>
									</tr>
								))}
							</tbody>
						</table>
					) : (
						<p className="adm-note">No issues found.</p>
					)}
					<p className="adm-note">Digest {report.digest} — retrying the same file is recognised instead of duplicated.</p>
				</>
			) : null}
		</div>
	)
}

export default ImportPage
