import { AyazmoRouteOptions, AyazmoInstance, FastifyRequest } from '@ayazmo/types';
// import Comment from '../entities/Comment.js';
// import CommentReport from '../entities/CommentReport.js';

const routes = (app: AyazmoInstance): AyazmoRouteOptions[] => [
  {
    method: 'GET',
    url: '/v1/admin/comments',
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
        }
      }
    },
    // @ts-ignore
    preHandler: app.adminAuthChain,
    handler: async (request: FastifyRequest, reply) => {
      const commentService = request.diScope.resolve('commentService');
      const comments = await commentService.adminFindAllComments(request.query);
      reply.code(200).send(comments);
    }
  },
];

export default routes;
