import { AyazmoRouteOptions, AyazmoInstance, FastifyRequest } from '@ayazmo/types';
import Comment from './entities/Comment.js';
import CommentReport from './entities/CommentReport.js';

type PaginatedRequest = FastifyRequest & { query: { first: number, cursor: string, sort: string } };

const routes = (app: AyazmoInstance): AyazmoRouteOptions[] => [
  {
    method: 'POST',
    url: '/v1/comment',
    schema: {
      body: {
        type: 'object',
        properties: {
          content: {
            type: 'string',
          },
          parentCommentId: {
            type: 'string',
          },
          organizationId: {
            type: 'string',
          },
          entityContextId: {
            type: 'string',
          }
        },
        required: ['content', 'entityContextId']
      }
    },
    preHandler: app.userAuthChain,
    handler: async (request, reply) => {
      let payload = request.body as Comment;
      payload.authorId = request.user.id;
      const commentService = request.diScope.resolve('commentService');
      const comment = await commentService.addComment(payload);
      reply.code(200).send(comment);
    }
  },
  {
    method: 'POST',
    url: '/v1/comment/:commentId/report',
    schema: {
      body: {
        type: 'object',
        properties: {
          reason: {
            type: 'string',
            minLength: 1
          },
        },
        required: ['reason']
      }
    },
    preHandler: app.userAuthChain,
    handler: async (request: FastifyRequest & { params: { commentId: string } }, reply) => {
      const { commentId } = request.params;
      let payload = request.body as CommentReport;
      payload.authorId = request.user.id;
      const commentService = request.diScope.resolve('commentService');
      const commentReport = await commentService.reportComment(commentId, payload);
      reply.code(200).send(commentReport);
    }
  },
  {
    method: 'PUT',
    url: '/v1/comment/:commentId',
    schema: {
      body: {
        type: 'object',
        properties: {
          content: {
            type: 'string',
          },
        },
        required: ['content']
      }
    },
    preHandler: app.userAuthChain,
    handler: async (request: FastifyRequest & { params: { commentId: string } }, reply) => {
      const { commentId } = request.params;
      let payload = request.body as Comment;
      const commentService = request.diScope.resolve('commentService');
      const comment = await commentService.updateOwnComment(commentId, payload, request.user.id);
      reply.code(200).send(comment);

    }
  },
  {
    method: 'GET',
    url: '/v1/comments',
    schema: {
      querystring: {
        type: 'object',
        properties: {
          entityContextId: {
            type: 'string',
          },
          first: {
            type: 'number',
            default: 10
          },
          cursor: {
            type: 'string',
            default: null,
          },
          sort: {
            type: 'string',
            enum: ['asc', 'desc'],
            default: 'desc',
          },
        },
        required: ['entityContextId']
      }
    },
    // @ts-ignore
    preHandler: app.userAuthChain,
    handler: async (request, reply) => {
      const commentService = request.diScope.resolve('commentService');
      const comments = await commentService.findAllCommentsByEntityContextId(request.query);
      return reply.code(200).send(comments);
    }
  },
  {
    method: 'GET',
    url: '/v1/comments/my',
    schema: {
      querystring: {
        type: 'object',
        properties: {
          first: {
            type: 'number',
            default: 10
          },
          cursor: {
            type: 'string',
            default: null,
          },
          sort: {
            type: 'string',
            enum: ['asc', 'desc'],
            default: 'desc',
          },
        },
        required: []
      }
    },
    preHandler: app.userAuthChain,
    handler: async (request: PaginatedRequest, reply) => {
      const commentService = request.diScope.resolve('commentService');
      const comments = await commentService.findAllMyComments({
        userId: request.user.id,
        first: request.query.first,
        cursor: request.query.cursor,
        sort: request.query.sort
      });
      return reply.code(200).send(comments);
    }
  }
];

export default routes;
