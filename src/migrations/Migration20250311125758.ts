import { Migration } from '@ayazmo/types';

export class Migration20250311125758 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table "comment" ("id" varchar(26) not null, "created_at" timestamptz not null, "updated_at" timestamptz not null, "meta" jsonb null, "content" text not null, "author_id" varchar(255) not null, "parent_comment_id" varchar(26) null, "organization_id" varchar(255) null, "entity_context_id" varchar(255) not null, "status" varchar(255) not null default 'published', "is_reported" boolean not null default false, "version" int not null default 1, "section_id" varchar(255) null, constraint "comment_pkey" primary key ("id"));`);
    this.addSql(`create index "comment_parent_comment_id_index" on "comment" ("parent_comment_id");`);
    this.addSql(`create index "comment_entity_context_id_index" on "comment" ("entity_context_id");`);

    this.addSql(`create table "comment_report" ("id" varchar(26) not null, "created_at" timestamptz not null, "updated_at" timestamptz not null, "meta" jsonb null, "author_id" varchar(255) not null, "comment_id" varchar(26) not null, "reason" varchar(255) not null, "status" varchar(255) not null default 'new', "category" varchar(255) null, "internal_note" varchar(255) null, constraint "comment_report_pkey" primary key ("id"));`);

    this.addSql(`alter table "comment" add constraint "comment_parent_comment_id_foreign" foreign key ("parent_comment_id") references "comment" ("id") on update cascade on delete set null;`);

    this.addSql(`alter table "comment_report" add constraint "comment_report_comment_id_foreign" foreign key ("comment_id") references "comment" ("id") on update cascade;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "comment" drop constraint "comment_parent_comment_id_foreign";`);

    this.addSql(`alter table "comment_report" drop constraint "comment_report_comment_id_foreign";`);

    this.addSql(`drop table if exists "comment" cascade;`);

    this.addSql(`drop table if exists "comment_report" cascade;`);

  }

}
