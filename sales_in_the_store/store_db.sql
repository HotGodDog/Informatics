CREATE TABLE IF NOT EXISTS `categories` (
	`id_category` integer primary key NOT NULL UNIQUE,
	`name_category` TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS `products` (
	`id_product` integer primary key NOT NULL UNIQUE,
	`name_of_product` TEXT NOT NULL,
	`price` REAL NOT NULL,
	`id_category` INTEGER NOT NULL,
	`quantity_at_storage` REAL NOT NULL,
FOREIGN KEY(`id_category`) REFERENCES `categories`(`id_category`)
);
CREATE TABLE IF NOT EXISTS `jobs_titles` (
	`id_job` integer primary key NOT NULL UNIQUE,
	`name_job` TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS `employees` (
	`id_employee` integer primary key NOT NULL UNIQUE,
	`name` TEXT NOT NULL,
	`surname` TEXT NOT NULL,
	`id_job` INTEGER NOT NULL,
FOREIGN KEY(``) REFERENCES `jobs_titles`(`id_job`)
);
CREATE TABLE IF NOT EXISTS `receipts` (
	`id_check` integer primary key NOT NULL UNIQUE,
	`created_at` REAL NOT NULL,
	`id_employee` INTEGER NOT NULL,
FOREIGN KEY(`id_employee`) REFERENCES `employees`(`id_employee`)
);
CREATE TABLE IF NOT EXISTS `sale_items` (
	`id_sale` integer primary key NOT NULL UNIQUE,
	`id_check` INTEGER NOT NULL,
	`id_product` INTEGER NOT NULL,
FOREIGN KEY(`id_check`) REFERENCES `receipts`(`id_check`),
FOREIGN KEY(`id_product`) REFERENCES `products`(`id_product`)
);