CREATE TABLE `raw_breeding_combos` (
	`parent1_id` integer NOT NULL,
	`parent2_id` integer NOT NULL,
	`child_id` integer NOT NULL,
	PRIMARY KEY(`parent1_id`, `parent2_id`),
	FOREIGN KEY (`parent1_id`) REFERENCES `raw_pals`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`parent2_id`) REFERENCES `raw_pals`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`child_id`) REFERENCES `raw_pals`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `raw_elements` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `raw_elements_name_unique` ON `raw_elements` (`name`);--> statement-breakpoint
CREATE TABLE `meta` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `raw_mount_types` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `raw_mount_types_name_unique` ON `raw_mount_types` (`name`);--> statement-breakpoint
CREATE TABLE `raw_pal_elements` (
	`pal_id` integer NOT NULL,
	`element_id` integer NOT NULL,
	PRIMARY KEY(`pal_id`, `element_id`),
	FOREIGN KEY (`pal_id`) REFERENCES `raw_pals`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`element_id`) REFERENCES `raw_elements`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `raw_pal_mounts` (
	`pal_id` integer NOT NULL,
	`mount_type_id` integer NOT NULL,
	`unlock_level` integer NOT NULL,
	PRIMARY KEY(`pal_id`, `mount_type_id`),
	FOREIGN KEY (`pal_id`) REFERENCES `raw_pals`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`mount_type_id`) REFERENCES `raw_mount_types`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `raw_pal_movement` (
	`pal_id` integer PRIMARY KEY NOT NULL,
	`slow_walk_speed` integer,
	`walk_speed` integer,
	`run_speed` integer,
	`ride_sprint_speed` integer,
	`transport_speed` integer,
	`swim_speed` integer,
	`swim_dash_speed` integer,
	`stamina` integer,
	FOREIGN KEY (`pal_id`) REFERENCES `raw_pals`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `raw_pal_stats` (
	`pal_id` integer PRIMARY KEY NOT NULL,
	`size` text,
	`rarity` integer,
	`health` integer,
	`food` integer,
	`melee_attack` integer,
	`attack` integer,
	`defense` integer,
	`work_speed` integer,
	`support` integer,
	`capture_rate` real,
	`male_probability` integer,
	`combi_rank` integer,
	`price` integer,
	`egg` text,
	`code` text,
	FOREIGN KEY (`pal_id`) REFERENCES `raw_pals`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `raw_pal_work_suitabilities` (
	`pal_id` integer NOT NULL,
	`work_type_id` integer NOT NULL,
	`level` integer NOT NULL,
	PRIMARY KEY(`pal_id`, `work_type_id`),
	FOREIGN KEY (`pal_id`) REFERENCES `raw_pals`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`work_type_id`) REFERENCES `raw_work_types`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `raw_pals` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`number` text NOT NULL,
	`variant` text,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `raw_passive_skills` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`rank` integer DEFAULT 0 NOT NULL,
	`is_implant` integer DEFAULT false NOT NULL,
	`is_world_tree` integer DEFAULT false NOT NULL,
	`is_mutation` integer DEFAULT false NOT NULL,
	`is_pal_surgery_table` integer DEFAULT false NOT NULL,
	`weight` integer DEFAULT 0 NOT NULL,
	`hp` integer DEFAULT 0 NOT NULL,
	`attack` integer DEFAULT 0 NOT NULL,
	`defense` integer DEFAULT 0 NOT NULL,
	`work_speed` integer DEFAULT 0 NOT NULL,
	`movement` integer DEFAULT 0 NOT NULL,
	`san` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `raw_passive_skills_name_unique` ON `raw_passive_skills` (`name`);--> statement-breakpoint
CREATE TABLE `user_pals` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`pal_id` integer NOT NULL,
	`character_id` text NOT NULL,
	`nickname` text,
	`gender` text DEFAULT 'Male' NOT NULL,
	`level` integer DEFAULT 1 NOT NULL,
	`hp_iv` integer DEFAULT 0 NOT NULL,
	`attack_iv` integer DEFAULT 0 NOT NULL,
	`shot_iv` integer DEFAULT 0 NOT NULL,
	`defense_iv` integer DEFAULT 0 NOT NULL,
	`passives` text DEFAULT '[]' NOT NULL,
	FOREIGN KEY (`pal_id`) REFERENCES `raw_pals`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `raw_work_types` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `raw_work_types_name_unique` ON `raw_work_types` (`name`);