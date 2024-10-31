import { Migration } from '@ayazmo/types';

export class Migration20241031150727 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table "comment" add column "section_id" varchar(255) null;`);
    this.addSql(`alter table "comment" alter column "version" type int using ("version"::int);`);
    this.addSql(`alter table "comment" alter column "version" set default 1;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "comment" drop column "section_id";`);

    this.addSql(`alter table "comment" alter column "version" drop default;`);
    this.addSql(`alter table "comment" alter column "version" type int4 using ("version"::int4);`);
    this.addSql(`create sequence if not exists "comment_version_seq";`);
    this.addSql(`select setval('comment_version_seq', (select max("version") from "comment"));`);
    this.addSql(`alter table "comment" alter column "version" set default nextval('comment_version_seq');`);
  }

}
