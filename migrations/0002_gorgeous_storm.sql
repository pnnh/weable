ALTER TABLE `users` ADD `calieo_sub` text;--> statement-breakpoint
CREATE UNIQUE INDEX `users_calieo_sub_unique` ON `users` (`calieo_sub`);