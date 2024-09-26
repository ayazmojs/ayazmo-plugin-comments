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
    COMMENT_REPORT_CREATE: 'comment.report.create',
  }

  constructor(app: AyazmoInstance, pluginOptions: PluginSettings) {
    super(app, pluginOptions);
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

    if (parentCommentId) {
      payload.parentComment = this.em.getReference(Comment, parentCommentId)
    }
    const newComment = this.commentRepository.create(payload);
    await this.em.flush()
    this.eventService.publish(CommentService.EVENTS.COMMENT_CREATE, newComment);
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
    this.eventService.publish(CommentService.EVENTS.COMMENT_UPDATE, comment);
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
    this.eventService.publish(CommentService.EVENTS.COMMENT_DELETE, comment);
  }

  /**
   * Get comments + subcomments for a specific entityContextId with pagination
   * @param entityContextId
   * @param first
   * @param cursor
   */
  async findAllCommentsByEntityContextId({
    entityContextId,
    first,
    cursor = '',
    sort
  }) {
    const result = await this.em.findByCursor(Comment, {
      entityContextId: entityContextId.toString(),
      status: 'published',
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
    const result = await this.em.findByCursor(Comment, {
      authorId: userId
    }, {
      first: parseInt(first),
      after: cursor,
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
    const comment = await this.em.findOne(Comment, commentId);
    if (!comment) {
      throw AyazmoError({
        statusCode: 404,
        message: 'Comment not found',
        code: 'COMMENT_NOT_FOUND'
      })
    }
    comment.isReported = true;
    payload.comment = comment;
    const commentReport = this.commentReportRepository.create(payload);
    await this.em.flush();
    this.eventService.publish(CommentService.EVENTS.COMMENT_REPORT_CREATE, commentReport);
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
    this.eventService.publish(CommentService.EVENTS.COMMENT_UPDATE, comment);
    return comment;
  }

  async adminHardDeleteComment(commentId: string) {
    const comment = await this.em.findOne(Comment, commentId);
    if (!comment) {
      return true;
    }
    await this.em.remove(comment).flush();
    this.eventService.publish(CommentService.EVENTS.COMMENT_DELETE, comment);
    return true;
  }

  async adminSoftDeleteComment(commentId: string) {
    const comment = await this.em.findOne(Comment, commentId);
    if (!comment) {
      return true;
    }
    comment.status = 'deleted';
    await this.em.flush();
    this.eventService.publish(CommentService.EVENTS.COMMENT_DELETE, comment);
    return true;
  }
}