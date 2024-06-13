import { Entity, Property, ManyToOne, Rel } from '@ayazmo/types';
import { BaseEntity } from '@ayazmo/core';
import Comment from './Comment.js';

/**
 * Comment Report Entity
 *
 * This is a comment report entity for the Mikro ORM to be used in the Ayazmo framework.
 */

export enum ReportStatus {
  New = 'new',
  InReview = 'in_review',
  Resolved = 'resolved',
}

@Entity()
export default class CommentReport extends BaseEntity {

  @Property({ nullable: false })
  authorId: string;

  @ManyToOne(() => Comment)
  comment!: Rel<Comment>;

  @Property()
  reason!: string;

  @Property({ nullable: false, default: ReportStatus.New })
  status: ReportStatus = ReportStatus.New;

  @Property({ nullable: true })
  category: string;

  @Property({ nullable: true })
  internalNote?: string;
}