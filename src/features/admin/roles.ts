import { useEffect, useState } from 'react'
import { asText, check, db } from '../../lib/db-client'
import { useAuth } from '../auth/useAuth'

export type Role = 'student' | 'content_editor' | 'reviewer' | 'admin'

export const rolesService = {
	async mine(userId: string): Promise<Role[]> {
		const result = await db().from('user_roles').select('role').eq('user_id', userId).limit(10)
		check(result.error, 'Could not load your roles')
		return (result.data ?? []).map((row) => asText(row.role) as Role)
	},
	async logAction(actor: string, action: string, entityType: string, entityId: string | null, summary?: string): Promise<void> {
		await db().from('content_audit_log').insert({ actor, action, entity_type: entityType, entity_id: entityId, summary: summary ?? null })
	},
}

/** Authorization is enforced by RLS. This hook only decides what to render. */
export const useRoles = () => {
	const { user } = useAuth()
	const userId = user?.id ?? null
	const [roles, setRoles] = useState<Role[] | null>(null)

	useEffect(() => {
		if (!userId) {
			setRoles([])
			return
		}
		rolesService
			.mine(userId)
			.then(setRoles)
			.catch(() => setRoles([]))
	}, [userId])

	const has = (role: Role): boolean => (roles ?? []).includes(role)
	return {
		roles,
		loading: roles === null,
		isAdmin: has('admin'),
		canEdit: has('content_editor') || has('admin'),
		canReview: has('reviewer') || has('admin'),
	}
}
