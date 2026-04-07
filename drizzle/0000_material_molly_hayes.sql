CREATE TYPE "public"."device_status" AS ENUM('checked_in', 'checked_out');--> statement-breakpoint
CREATE TYPE "public"."equipment_category" AS ENUM('workstation', 'laptop', 'server', 'other');--> statement-breakpoint
CREATE TYPE "public"."equipment_status" AS ENUM('in_use', 'storage', 'repair', 'broken');--> statement-breakpoint
CREATE TYPE "public"."personnel_status" AS ENUM('active', 'detached', 'hospital', 'leave', 'dismissed');--> statement-breakpoint
CREATE TYPE "public"."storage_item_status" AS ENUM('in_use', 'stock', 'broken', 'lost');--> statement-breakpoint
CREATE TYPE "public"."storage_item_type" AS ENUM('flash_drive', 'electronic_pass');--> statement-breakpoint
CREATE TYPE "public"."transfer_type" AS ENUM('issued', 'returned', 'sent_repair', 'returned_repair', 'written_off');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "equipment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category" "equipment_category" NOT NULL,
	"is_personal" boolean DEFAULT false NOT NULL,
	"display_name" varchar(256) NOT NULL,
	"inventory_number" varchar(64),
	"serial_number" varchar(128),
	"mni_serial_number" varchar(128),
	"manufacturer" varchar(64),
	"model" varchar(128),
	"cpu" varchar(128),
	"ram_gb" smallint,
	"storage_type" varchar(32),
	"storage_gb" integer,
	"os" varchar(128),
	"has_charger" boolean,
	"has_mouse" boolean,
	"has_bag" boolean,
	"is_charger_working" boolean,
	"is_mouse_working" boolean,
	"personnel_id" uuid,
	"location" varchar(256),
	"status" "equipment_status" DEFAULT 'storage' NOT NULL,
	"search_vector" "tsvector",
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text
);
--> statement-breakpoint
CREATE TABLE "equipment_transfers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"equipment_id" uuid NOT NULL,
	"type" "transfer_type" NOT NULL,
	"from_personnel_id" uuid,
	"to_personnel_id" uuid,
	"from_location" varchar(256),
	"to_location" varchar(256),
	"document_ref" varchar(128),
	"notes" text,
	"transferred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text
);
--> statement-breakpoint
CREATE TABLE "personnel" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"last_name" varchar(64) NOT NULL,
	"first_name" varchar(64) NOT NULL,
	"middle_name" varchar(64),
	"personnel_number" varchar(32),
	"rank" varchar(64) NOT NULL,
	"rank_priority" smallint DEFAULT 0 NOT NULL,
	"position" varchar(128),
	"unit" varchar(128),
	"status" "personnel_status" DEFAULT 'active' NOT NULL,
	"notes" text,
	"search_vector" "tsvector",
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	CONSTRAINT "personnel_personnel_number_unique" UNIQUE("personnel_number")
);
--> statement-breakpoint
CREATE TABLE "phones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"personnel_id" uuid NOT NULL,
	"brand" varchar(64),
	"model" varchar(128) NOT NULL,
	"color" varchar(32),
	"imei1" varchar(18),
	"imei2" varchar(18),
	"serial_number" varchar(64),
	"has_camera" boolean DEFAULT false NOT NULL,
	"has_voice_recorder" boolean DEFAULT false NOT NULL,
	"status" "device_status" DEFAULT 'checked_out' NOT NULL,
	"storage_cell" varchar(32),
	"search_vector" "tsvector",
	"checked_in_at" timestamp with time zone,
	"checked_out_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "storage_devices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"equipment_id" uuid NOT NULL,
	"manufacturer" varchar(64),
	"model" varchar(128),
	"inventory_number" varchar(64),
	"serial_number" varchar(128),
	"capacity_gb" integer NOT NULL,
	"interface" varchar(32),
	"type" varchar(16),
	"search_vector" "tsvector",
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "storage_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" "storage_item_type" NOT NULL,
	"inventory_number" varchar(64),
	"serial_number" varchar(128),
	"capacity_gb" smallint,
	"access_level" smallint,
	"status" "storage_item_status" DEFAULT 'stock' NOT NULL,
	"personnel_id" uuid,
	"issued_at" timestamp with time zone,
	"returned_at" timestamp with time zone,
	"notes" text,
	"search_vector" "tsvector",
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"role" varchar(32) DEFAULT 'user' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipment" ADD CONSTRAINT "equipment_personnel_id_personnel_id_fk" FOREIGN KEY ("personnel_id") REFERENCES "public"."personnel"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipment" ADD CONSTRAINT "equipment_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipment_transfers" ADD CONSTRAINT "equipment_transfers_equipment_id_equipment_id_fk" FOREIGN KEY ("equipment_id") REFERENCES "public"."equipment"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipment_transfers" ADD CONSTRAINT "equipment_transfers_from_personnel_id_personnel_id_fk" FOREIGN KEY ("from_personnel_id") REFERENCES "public"."personnel"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipment_transfers" ADD CONSTRAINT "equipment_transfers_to_personnel_id_personnel_id_fk" FOREIGN KEY ("to_personnel_id") REFERENCES "public"."personnel"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipment_transfers" ADD CONSTRAINT "equipment_transfers_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personnel" ADD CONSTRAINT "personnel_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "phones" ADD CONSTRAINT "phones_personnel_id_personnel_id_fk" FOREIGN KEY ("personnel_id") REFERENCES "public"."personnel"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "storage_devices" ADD CONSTRAINT "storage_devices_equipment_id_equipment_id_fk" FOREIGN KEY ("equipment_id") REFERENCES "public"."equipment"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "storage_items" ADD CONSTRAINT "storage_items_personnel_id_personnel_id_fk" FOREIGN KEY ("personnel_id") REFERENCES "public"."personnel"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "equipment_inventory_number_unique_idx" ON "equipment" USING btree ("inventory_number") WHERE "equipment"."inventory_number" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "equipment_status_idx" ON "equipment" USING btree ("status");--> statement-breakpoint
CREATE INDEX "equipment_category_idx" ON "equipment" USING btree ("category");--> statement-breakpoint
CREATE INDEX "equipment_personnel_idx" ON "equipment" USING btree ("personnel_id");--> statement-breakpoint
CREATE INDEX "equipment_search_idx" ON "equipment" USING gin ("search_vector");--> statement-breakpoint
CREATE INDEX "equipment_transfers_equipment_idx" ON "equipment_transfers" USING btree ("equipment_id");--> statement-breakpoint
CREATE INDEX "equipment_transfers_date_idx" ON "equipment_transfers" USING btree ("transferred_at");--> statement-breakpoint
CREATE INDEX "personnel_search_idx" ON "personnel" USING gin ("search_vector");--> statement-breakpoint
CREATE INDEX "personnel_status_idx" ON "personnel" USING btree ("status");--> statement-breakpoint
CREATE INDEX "personnel_name_idx" ON "personnel" USING btree ("last_name","first_name");--> statement-breakpoint
CREATE INDEX "personnel_deleted_at_idx" ON "personnel" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "phones_personnel_idx" ON "phones" USING btree ("personnel_id");--> statement-breakpoint
CREATE INDEX "phones_status_idx" ON "phones" USING btree ("status");--> statement-breakpoint
CREATE INDEX "phones_search_idx" ON "phones" USING gin ("search_vector");--> statement-breakpoint
CREATE INDEX "storage_devices_equipment_idx" ON "storage_devices" USING btree ("equipment_id");--> statement-breakpoint
CREATE INDEX "storage_devices_search_idx" ON "storage_devices" USING gin ("search_vector");--> statement-breakpoint
CREATE INDEX "storage_items_type_idx" ON "storage_items" USING btree ("type");--> statement-breakpoint
CREATE INDEX "storage_items_status_idx" ON "storage_items" USING btree ("status");--> statement-breakpoint
CREATE INDEX "storage_items_personnel_idx" ON "storage_items" USING btree ("personnel_id");--> statement-breakpoint
CREATE INDEX "storage_items_search_idx" ON "storage_items" USING gin ("search_vector");--> statement-breakpoint
CREATE INDEX "user_email_idx" ON "user" USING btree ("email");--> statement-breakpoint
CREATE INDEX "user_role_idx" ON "user" USING btree ("role");