import { firefox } from 'playwright';
import { eq } from 'drizzle-orm';
import { getConnection } from '$lib/server/db/index.js';
import { pals, mountTypes, palMounts } from '$lib/server/db/schema.js';
import { parseMountsPage } from './mounts-parser.js';
import { createLogger } from '../logger.js';
import type { ProgressCallback } from './run-list.js';

const log = createLogger('scraper:mounts');

const MOUNTS_URL = 'https://paldb.cc/en/Mounts';

async function getOrCreateMountType(name: string): Promise<number> {
	const { db } = getConnection();
	const existing = await db.select().from(mountTypes).where(eq(mountTypes.name, name)).get();
	if (existing) {
		log.debug('mount type exists', { name, id: existing.id });
		return existing.id;
	}
	const result = await db
		.insert(mountTypes)
		.values({ name })
		.returning({ id: mountTypes.id })
		.get();
	log.debug('mount type created', { name, id: result.id });
	return result.id;
}

async function findPalByName(name: string): Promise<number | null> {
	const { db } = getConnection();
	const pal = await db.select({ id: pals.id }).from(pals).where(eq(pals.name, name)).get();
	if (!pal) {
		log.warn('pal not found for mount entry', { name });
		return null;
	}
	log.debug('pal found', { name, id: pal.id });
	return pal.id;
}

export async function runMountsScrape(
	onProgress: ProgressCallback,
	pctStart = 10,
	pctEnd = 20
): Promise<void> {
	log.info('starting mounts scrape', { url: MOUNTS_URL });

	log.debug('launching browser');
	const browser = await firefox.launch({ headless: true });
	const page = await browser.newPage();
	log.debug('browser launched');

	try {
		onProgress('Scraping mounts page...', pctStart);
		log.debug('navigating to mounts page');
		await page.goto(MOUNTS_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
		log.debug('page loaded, waiting for mount tables');
		await page.waitForSelector('#GroundMounts', { timeout: 15000 });
		log.debug('mount tables visible, extracting HTML');
		const html = await page.content();
		log.debug('HTML extracted', { length: html.length });

		const { mounts } = parseMountsPage(html);
		onProgress(`Found ${mounts.length} mount entries`, pctStart + 1);
		log.info('mounts parsed', { count: mounts.length });

		const { db } = getConnection();
		let inserted = 0;
		let skipped = 0;

		for (const [i, entry] of mounts.entries()) {
			const palId = await findPalByName(entry.palName);
			if (!palId) {
				skipped++;
				log.debug('skipping mount entry - pal not found', { palName: entry.palName });
				continue;
			}

			const mountTypeId = await getOrCreateMountType(entry.mountType);

			await db
				.insert(palMounts)
				.values({
					palId,
					mountTypeId,
					unlockLevel: entry.unlockLevel ?? 0
				})
				.run();

			inserted++;
			log.debug('mount entry inserted', {
				palName: entry.palName,
				mountType: entry.mountType,
				unlockLevel: entry.unlockLevel
			});

			const pct = pctStart + Math.round(((i + 1) / mounts.length) * (pctEnd - pctStart));
			if ((i + 1) % 20 === 0 || i + 1 === mounts.length) {
				onProgress(`Inserted ${inserted}/${mounts.length} mounts`, pct);
				log.info('mount insert progress', {
					inserted,
					skipped,
					total: mounts.length
				});
			}
		}

		onProgress(`Mounts complete: ${inserted} inserted, ${skipped} skipped`, pctEnd);
		log.info('mounts scrape complete', { inserted, skipped, total: mounts.length });
	} finally {
		log.debug('closing browser');
		await browser.close();
		log.debug('browser closed');
	}
}
