CREATE TABLE `demo_import_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`request_id` text NOT NULL,
	`user_id` text NOT NULL,
	`created_at` text NOT NULL,
	`summary` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `demo_import_runs_request_id_unique` ON `demo_import_runs` (`request_id`);