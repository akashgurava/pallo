import { appendFileSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const LOG_DIR = resolve('logs');
const LOG_FILE = join(LOG_DIR, 'pallo.log');

const LEVELS = ['DEBUG', 'INFO', 'WARN', 'ERROR'] as const;
type Level = (typeof LEVELS)[number];

const MIN_LEVEL: Level = (process.env['LOG_LEVEL']?.toUpperCase() as Level) ?? 'DEBUG';
const MIN_INDEX = LEVELS.indexOf(MIN_LEVEL);

let initialized = false;

function ensureDir(): void {
	if (!initialized) {
		mkdirSync(LOG_DIR, { recursive: true });
		initialized = true;
	}
}

function format(
	level: Level,
	module: string,
	message: string,
	data?: Record<string, unknown>
): string {
	const ts = new Date().toISOString();
	const base = `${ts} [${level}] ${module}: ${message}`;
	if (data) {
		return `${base} ${JSON.stringify(data)}\n`;
	}
	return `${base}\n`;
}

function write(
	level: Level,
	module: string,
	message: string,
	data?: Record<string, unknown>
): void {
	if (LEVELS.indexOf(level) < MIN_INDEX) return;
	ensureDir();
	const line = format(level, module, message, data);
	appendFileSync(LOG_FILE, line);
}

export interface Logger {
	debug(message: string, data?: Record<string, unknown>): void;
	info(message: string, data?: Record<string, unknown>): void;
	warn(message: string, data?: Record<string, unknown>): void;
	error(message: string, data?: Record<string, unknown>): void;
}

/** Create a named logger that writes to logs/pallo.log. */
export function createLogger(module: string): Logger {
	return {
		debug(message, data) {
			write('DEBUG', module, message, data);
		},
		info(message, data) {
			write('INFO', module, message, data);
		},
		warn(message, data) {
			write('WARN', module, message, data);
		},
		error(message, data) {
			write('ERROR', module, message, data);
		}
	};
}
