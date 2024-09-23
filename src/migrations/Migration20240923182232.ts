import { Migration } from '@ayazmo/types';

export class Migration20240923182232 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table "comment" add column "version" serial;`);
    this.addSql(`alter table "comment" alter column "content" type text using ("content"::text);`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "comment" drop column "version";`);

    this.addSql(`alter table "comment" alter column "content" type varchar(255) using ("content"::varchar(255));`);
  }

}
