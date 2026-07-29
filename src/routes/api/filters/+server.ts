import { getConnection } from '$lib/server/db/index.js';
import { elements, workTypes } from '$lib/server/db/schema.js';
import { createLogger } from '$lib/server/logger.js';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';

const log = createLogger('api:filters');

export interface FilterOptions {
	elements: { name: string }[];
	workTypes: { name: string }[];
}

export const GET: RequestHandler = async () => {
	try {
		const { db } = getConnection();

		const elementRows = await db
			.select({ name: elements.name })
			.from(elements)
			.orderBy(elements.sortOrder)
			.all();

		const workTypeRows = await db
			.select({ name: workTypes.name })
			.from(workTypes)
			.orderBy(workTypes.sortOrder)
			.all();

		log.info('filter options fetched', {
			elements: elementRows.length,
			workTypes: workTypeRows.length
		});

		return json({ elements: elementRows, workTypes: workTypeRows });
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		log.error('failed to fetch filter options', { error: message });
		return json({ elements: [], workTypes: [] }, { status: 503 });
	}
};
