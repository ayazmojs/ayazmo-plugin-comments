/**
 * Comment Service
 */


import { BasePluginService } from '@ayazmo/core';
import Comment from '../entities/Comment.js';
import CommentReport from '../entities/CommentReport.js';
import { EntityRepository, IEventEmitter, PluginSettings, AyazmoInstance } from '@ayazmo/types';
import { AyazmoError } from '@ayazmo/utils'

export default class CommentService extends BasePluginService {
  private commentRepository: EntityRepository<Comment>;
  private commentReportRepository: EntityRepository<CommentReport>;
  private eventService: IEventEmitter;

  public static EVENTS = {
    COMMENT_CREATE: 'comment.create',
    COMMENT_UPDATE: 'comment.update',
    COMMENT_DELETE: 'comment.delete',
    COMMENT_REPORT_CREATE: 'comment-report.create',
    COMMENT_REPUBLISH: 'comment.republish'
  }

  constructor(app: AyazmoInstance, pluginSettings: PluginSettings) {
    super(app, pluginSettings);
    this.commentRepository = this.getRepository('Comment');
    this.commentReportRepository = this.getRepository('CommentReport');
    this.eventService = app.diContainer.resolve('eventService');
  }

  /**
   * Add a new comment
   * @param comment
   */
  async addComment(comment: Comment & { parentCommentId?: string }) {
    const { parentCommentId, ...payload } = comment;
    payload.status = this.pluginSettings.defaultStatus ?? 'published';

    if (parentCommentId) {
      payload.parentComment = this.em.getReference(Comment, parentCommentId)
    }
    const newComment = this.commentRepository.create(payload);
    await this.em.flush()
    const { subComments, reports, ...commentToPublish } = newComment;
    this.eventService.publish(CommentService.EVENTS.COMMENT_CREATE, commentToPublish, this.pluginSettings);
    return newComment;
  }

  /**
   * Update own comment
   * @param commentId
   * @param payload
   * @param sessionUserId
   */
  async updateOwnComment(commentId: string, payload: Comment, sessionUserId: string) {
    const comment = await this.commentRepository.findOneOrFail({
      id: commentId
    });
    if (!comment) {
      throw AyazmoError({
        statusCode: 404,
        message: 'Comment not found',
        code: 'COMMENT_NOT_FOUND'
      })
    }

    // check if the user is the author of the comment
    if (comment.authorId !== sessionUserId) {
      throw AyazmoError({
        statusCode: 403,
        message: 'You are not the authorized to update this comment',
        code: 'COMMENT_NOT_AUTHOR'
      })
    }
    comment.content = payload.content;
    await this.em.flush();
    const { subComments, reports, ...commentToPublish } = comment;
    this.eventService.publish(CommentService.EVENTS.COMMENT_UPDATE, commentToPublish, this.pluginSettings);
    return comment;
  }

  /**
   * Delete own comment
   * @param commentId
   * @param sessionUserId
   */
  async deleteOwnComment(commentId: string, sessionUserId: string) {
    const comment = await this.commentRepository.findOneOrFail({
      id: commentId
    });
    if (!comment) {
      throw AyazmoError({
        statusCode: 404,
        message: 'Comment not found',
        code: 'COMMENT_NOT_FOUND'
      })
    }

    // check if the user is the author of the comment
    if (comment.authorId !== sessionUserId) {
      throw AyazmoError({
        statusCode: 403,
        message: 'You are not authorized to delete this comment',
        code: 'COMMENT_NOT_AUTHOR'
      })
    }

    await this.em.remove(comment).flush();
    const { subComments, reports, ...commentToPublish } = comment;
    this.eventService.publish(CommentService.EVENTS.COMMENT_DELETE, commentToPublish, this.pluginSettings);
  }

  /**
   * Get comments + subcomments for a specific entityContextId with pagination
   * @param entityContextId
   * @param first
   * @param cursor
   */
  async findAllCommentsByEntityContextId(args: {
    entityContextId: string,
    first: string,
    cursor: string,
    sort: string
  }) {
    const { entityContextId, first, cursor, sort } = args

    const result = await this.em.findByCursor(Comment, {
      entityContextId: entityContextId.toString(),
      status: { $in: this.pluginSettings.displayStatus ?? ['approved', 'pending'] },
      parentComment: null
    }, {
      first: parseInt(first),
      after: cursor,
      orderBy: {
        createdAt: sort ?? 'desc'
      },
      populate: ['subComments']
    });

    return {
      // @ts-ignore
      endCursor: result.endCursor,
      ...result
    }
  }

  async findAllMyComments({
    userId,
    first,
    cursor = '',
    sort
  }) {
    // Handle null or invalid cursor values
    const validCursor = cursor === 'null' || !cursor ? undefined : cursor;
    
    const result = await this.em.findByCursor(Comment, {
      authorId: userId
    }, {
      first: parseInt(first),
      after: validCursor,
      orderBy: {
        createdAt: sort ?? 'desc'
      }
    });

    return {
      // @ts-ignore
      endCursor: result.endCursor,
      ...result
    }
  }

  /**
   * Report a comment
   * @param commentId
   * @param payload
   */
  async reportComment(commentId: string, payload: CommentReport) {
    const commentToReport = await this.em.findOne(Comment, commentId);
    if (!commentToReport) {
      throw AyazmoError({
        statusCode: 404,
        message: 'Comment not found',
        code: 'COMMENT_NOT_FOUND'
      })
    }
    commentToReport.isReported = true;
    payload.comment = commentToReport;
    const commentReport = this.commentReportRepository.create(payload);
    await this.em.flush();
    const { comment, ...commentReportToPublish } = commentReport;
    this.eventService.publish(
      CommentService.EVENTS.COMMENT_REPORT_CREATE,
      {...commentReportToPublish, commentId: commentToReport.id},
      this.pluginSettings
    );
    return commentReport;
  }

  /**
   * ADMIN SECTION
   */

  /**
   * Get all comments
   */
  async adminFindAllComments({
    entityContextId,
    status,
    first,
    cursor = '',
    sort
  }) {

    // build query from the parameters if they have a value
    const query = { parentComment: null }
    if (entityContextId) {
      // @ts-ignore
      query.entityContextId = entityContextId
    }
    if (status) {
      // @ts-ignore
      query.status = status
    }

    const result = await this.em.findByCursor(Comment, {
      ...query
    }, {
      first: parseInt(first),
      after: cursor,
      orderBy: {
        createdAt: sort ?? 'desc'
      },
      populate: ['subComments']
    });

    return {
      // @ts-ignore
      endCursor: result.endCursor,
      ...result
    }
  }

  /**
   * Update a comment
   * @param commentId
   * @param payload
   */
  async adminUpdateComment(commentId: string, payload: Comment) {
    const comment = await this.em.findOne(Comment, commentId);
    if (!comment) {
      throw AyazmoError({
        statusCode: 404,
        message: 'Comment not found',
        code: 'COMMENT_NOT_FOUND'
      })
    }

    for (const [key, value] of Object.entries(payload)) {
      if (value) {
        (comment[key as keyof Comment] as any) = value;
      }
    }
    await this.em.flush();
    const { subComments, reports, ...commentToPublish } = comment;
    this.eventService.publish(CommentService.EVENTS.COMMENT_UPDATE, commentToPublish, this.pluginSettings);
    return comment;
  }

  async adminHardDeleteComment(commentId: string) {
    const comment = await this.em.findOne(Comment, commentId);
    if (!comment) {
      return true;
    }
    await this.em.remove(comment).flush();
    const { subComments, reports, ...commentToPublish } = comment;
    this.eventService.publish(CommentService.EVENTS.COMMENT_DELETE, commentToPublish, this.pluginSettings);
    return true;
  }

  async adminSoftDeleteComment(commentId: string) {
    const comment = await this.em.findOne(Comment, commentId);
    if (!comment) {
      return true;
    }
    comment.status = 'deleted';
    await this.em.flush();
    const { subComments, reports, ...commentToPublish } = comment;
    this.eventService.publish(CommentService.EVENTS.COMMENT_DELETE, commentToPublish, this.pluginSettings);
    return true;
  }

  /**
   * Re-publish comments based on time range and/or entityContextId
   * @param filters Object containing startDate, endDate, and/or entityContextId
   */
  async adminRepublishComments(filters: {
    startDate?: string,
    endDate?: string,
    entityContextId?: string
  }) {
    const query: any = {};
    
    // Build query based on provided filters
    if (filters.startDate && filters.endDate) {
      query.createdAt = {
        $gte: new Date(filters.startDate),
        $lte: new Date(filters.endDate)
      };
    }
    
    if (filters.entityContextId) {
      query.entityContextId = filters.entityContextId;
    }

    // Find all matching comments
    const comments = await this.commentRepository.find(query);
    
    // Publish each comment using 'comment.<status>' as the event name
    for (const comment of comments) {
      const { subComments, reports, ...commentToPublish } = comment;
      this.eventService.publish(CommentService.EVENTS.COMMENT_REPUBLISH, commentToPublish, this.pluginSettings);
    }

    return {
      count: comments.length
    };
  }
}