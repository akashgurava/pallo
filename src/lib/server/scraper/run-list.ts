import { firefox } from 'playwright';
import { eq } from 'drizzle-orm';
import { getConnection } from '$lib/server/db/index.js';
import {
	pals,
	elements,
	palElements,
	workTypes,
	palWorkSuitabilities
} from '$lib/server/db/schema.js';
import { parsePalPage } from './parser.js';
import { createLogger } from '../logger.js';
import type { PalListEntry } from '$lib/types.js';

const log = createLogger('scraper:list');

const PAL_LIST_URL = 'https://paldb.cc/en/Pals';

async function getOrCreateElement(name: string, sortOrder: number): Promise<number> {
	const { db } = getConnection();
	const existing = await db.select().from(elements).where(eq(elements.name, name)).get();
	if (existing) {
		log.debug('element exists', { name, id: existing.id });
		return existing.id;
	}
	const result = await db
		.insert(elements)
		.values({ name, sortOrder })
		.returning({ id: elements.id })
		.get();
	log.debug('element created', { name, id: result.id, sortOrder });
	return result.id;
}

async function getOrCreateWorkType(name: string, sortOrder: number): Promise<number> {
	const { db } = getConnection();
	const existing = await db.select().from(workTypes).where(eq(workTypes.name, name)).get();
	if (existing) {
		log.debug('work type exists', { name, id: existing.id });
		return existing.id;
	}
	const result = await db
		.insert(workTypes)
		.values({ name, sortOrder })
		.returning({ id: workTypes.id })
		.get();
	log.debug('work type created', { name, id: result.id, sortOrder });
	return result.id;
}

async function seedOrderedLookups(
	elementOrder: string[],
	workTypeOrder: string[]
): Promise<void> {
	log.debug('seeding lookup tables', {
		elements: elementOrder.length,
		workTypes: workTypeOrder.length
	});
	for (const [i, name] of elementOrder.entries()) {
		await getOrCreateElement(name, i);
	}
	for (const [i, name] of workTypeOrder.entries()) {
		await getOrCreateWorkType(name, i);
	}
	log.debug('lookup tables seeded');
}

async function insertPal(
	entry: PalListEntry,
	elementOrderMap: Map<string, number>,
	workTypeOrderMap: Map<string, number>
): Promise<void> {
	const { db } = getConnection();

	const pal = await db
		.insert(pals)
		.values({ number: entry.number, variant: entry.variant, name: entry.name })
		.returning({ id: pals.id })
		.get();

	log.debug('pal inserted', { id: pal.id, number: entry.number, name: entry.name });

	for (const elementName of entry.elements) {
		const elementId = await getOrCreateElement(
			elementName,
			elementOrderMap.get(elementName) ?? 99
		);
		await db.insert(palElements).values({ palId: pal.id, elementId }).run();
		log.debug('pal element linked', { palId: pal.id, element: elementName });
	}

	for (const suit of entry.workSuitabilities) {
		const workTypeId = await getOrCreateWorkType(
			suit.workType,
			workTypeOrderMap.get(suit.workType) ?? 99
		);
		await db
			.insert(palWorkSuitabilities)
			.values({ palId: pal.id, workTypeId, level: suit.level })
			.run();
		log.debug('pal work suitability linked', {
			palId: pal.id,
			workType: suit.workType,
			level: suit.level
		});
	}
}

export type ProgressCallback = (message: string, progress: number) => void;

export async function runListScrape(
	onProgress: ProgressCallback,
	pctStart = 2,
	pctEnd = 10
): Promise<void> {
	log.info('starting list scrape', { url: PAL_LIST_URL });

	log.debug('launching browser');
	const browser = await firefox.launch({ headless: true });
	const page = await browser.newPage();
	log.debug('browser launched');

	try {
		onProgress('Scraping pal list...', pctStart);
		log.debug('navigating to pal list page');
		await page.goto(PAL_LIST_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
		log.debug('page loaded, waiting for pal cards');
		await page.waitForSelector('div.col[data-filters]', { timeout: 15000 });
		log.debug('pal cards visible, extracting HTML');
		const html = await page.content();
		log.debug('HTML extracted', { length: html.length });

		const { pals: palList, elementOrder, workTypeOrder } = parsePalPage(html);
		onProgress(`Found ${palList.length} pals`, pctStart + 1);
		log.info('pal list parsed', { count: palList.length });

		await seedOrderedLookups(elementOrder, workTypeOrder);

		const elementOrderMap = new Map(elementOrder.map((name, i) => [name, i]));
		const workTypeOrderMap = new Map(workTypeOrder.map((name, i) => [name, i]));

		for (const [i, entry] of palList.entries()) {
			await insertPal(entry, elementOrderMap, workTypeOrderMap);
			const pct = pctStart + Math.round(((i + 1) / palList.length) * (pctEnd - pctStart));
			if ((i + 1) % 25 === 0 || i + 1 === palList.length) {
				onProgress(`Inserted ${i + 1}/${palList.length} pals`, pct);
				log.info('insert progress', { inserted: i + 1, total: palList.length });
			}
		}

		onProgress(`Inserted ${palList.length} pals`, pctEnd);
		log.info('list scrape complete', { totalPals: palList.length });
	} finally {
		log.debug('closing browser');
		await browser.close();
		log.debug('browser closed');
	}
}
