import { Entity, Property, ManyToOne, OneToMany, Collection } from '@ayazmo/types';
import { BaseEntity } from '@ayazmo/core';
import CommentReport from './CommentReport.js';

/**
 * Defining Entity - Comment Entity
 *
 * This is a comment entity for the Mikro ORM to be used in the Ayazmo framework.
 */

@Entity()
export default class Comment extends BaseEntity {

  @Property({ type: 'text' })
  content: string;

  @Property({ nullable: false })
  authorId: string;

  @ManyToOne(() => Comment, { nullable: true, index: true })
  parentComment: Comment;

  @Property({ nullable: true })
  organizationId: string;

  @Property({ index: true })
  entityContextId: string;

  @Property({ default: 'published' })
  status: string;

  @OneToMany(() => Comment, comment => comment.parentComment)
  subComments = new Collection<Comment>(this);

  @OneToMany(() => CommentReport, report => report.comment)
  reports = new Collection<CommentReport>(this);

  @Property({ default: false })
  isReported: boolean = false;

  @Property({ version: true, default: 1 })
  version!: number;

  @Property({ nullable: true })
  sectionId: string;
}