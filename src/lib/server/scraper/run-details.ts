import { firefox } from 'playwright';
import { getConnection } from '$lib/server/db/index.js';
import { pals, palStats, palMovement } from '$lib/server/db/schema.js';
import { parseDetailPage } from './detail-parser.js';
import { createLogger } from '../logger.js';
import type { ProgressCallback } from './run-list.js';

const log = createLogger('scraper:details');

const BASE_URL = 'https://paldb.cc/en';

export type FailCallback = (message: string) => void;

export async function runDetailScrape(
	onProgress: ProgressCallback,
	onFail: FailCallback,
	pctStart = 20,
	pctEnd = 98
): Promise<void> {
	log.info('starting detail scrape');

	log.debug('launching browser');
	const browser = await firefox.launch({ headless: true });
	const page = await browser.newPage();
	log.debug('browser launched');

	try {
		const { db } = getConnection();
		const allPals = await db.select({ id: pals.id, name: pals.name }).from(pals).all();
		log.info('pals to scrape', { count: allPals.length });

		for (const [i, pal] of allPals.entries()) {
			const slug = pal.name.replace(/ /g, '_');
			const url = `${BASE_URL}/${slug}`;
			log.debug('scraping pal detail', { name: pal.name, slug, url });

			try {
				await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
				log.debug('page loaded, waiting for cards', { name: pal.name });
				await page.waitForSelector('.card', { timeout: 10000 });
				const html = await page.content();
				log.debug('HTML extracted', { name: pal.name, length: html.length });

				const data = parseDetailPage(html);

				await db
					.insert(palStats)
					.values({ palId: pal.id, code: data.code, egg: data.egg, ...data.stats })
					.onConflictDoNothing()
					.run();
				log.debug('stats inserted', { name: pal.name, code: data.code, size: data.stats.size });

				await db
					.insert(palMovement)
					.values({ palId: pal.id, ...data.movement })
					.onConflictDoNothing()
					.run();
				log.debug('movement inserted', { name: pal.name, runSpeed: data.movement.runSpeed });
			} catch (err) {
				const message = err instanceof Error ? err.message : String(err);
				log.error('failed to scrape pal detail', { name: pal.name, error: message });
				onFail(`${pal.name}: ${message}`);
			}

			const pct = pctStart + Math.round(((i + 1) / allPals.length) * (pctEnd - pctStart));
			onProgress(`${i + 1}/${allPals.length} — ${pal.name}`, pct);
		}

		log.info('detail scrape complete', { total: allPals.length });
	} finally {
		log.debug('closing browser');
		await browser.close();
		log.debug('browser closed');
	}
}

export async function runRetryFailed(
	onProgress: ProgressCallback,
	onFail: FailCallback
): Promise<void> {
	const { db } = getConnection();
	const allPals = await db.select({ id: pals.id, name: pals.name }).from(pals).all();
	const statsIds = new Set(
		(await db.select({ palId: palStats.palId }).from(palStats).all()).map((r) => r.palId)
	);
	const failed = allPals.filter((p) => !statsIds.has(p.id));

	if (failed.length === 0) {
		log.info('no failed pals to retry');
		onProgress('No failed pals to retry', 100);
		return;
	}

	log.info('retrying failed pals', { count: failed.length });

	const browser = await firefox.launch({ headless: true });
	const page = await browser.newPage();

	try {
		for (const [i, pal] of failed.entries()) {
			const slug = pal.name.replace(/ /g, '_');
			const url = `${BASE_URL}/${slug}`;
			log.debug('retrying pal detail', { name: pal.name, url });

			try {
				await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
				await page.waitForSelector('.card', { timeout: 10000 });
				const html = await page.content();
				const data = parseDetailPage(html);

				await db
					.insert(palStats)
					.values({ palId: pal.id, code: data.code, egg: data.egg, ...data.stats })
					.onConflictDoNothing()
					.run();
				await db
					.insert(palMovement)
					.values({ palId: pal.id, ...data.movement })
					.onConflictDoNothing()
					.run();

				log.debug('retry success', { name: pal.name });
			} catch (err) {
				const message = err instanceof Error ? err.message : String(err);
				log.error('retry failed', { name: pal.name, error: message });
				onFail(`${pal.name}: ${message}`);
			}

			const pct = Math.round(((i + 1) / failed.length) * 100);
			onProgress(`Retry ${i + 1}/${failed.length} — ${pal.name}`, pct);
		}

		log.info('retry complete', { total: failed.length });
	} finally {
		await browser.close();
	}
}
