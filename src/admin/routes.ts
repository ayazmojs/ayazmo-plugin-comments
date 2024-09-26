import { AyazmoRouteOptions, AyazmoInstance, FastifyRequest } from '@ayazmo/types';

const routes = (app: AyazmoInstance): AyazmoRouteOptions[] => [
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
          status: {
            type: 'string',
            enum: ['published', 'deleted'],
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
    preHandler: app.adminAuthChain,
    handler: async (request: FastifyRequest, reply) => {
      const commentService = request.diScope.resolve('commentService');
      const comments = await commentService.adminFindAllComments(request.query);
      reply.code(200).send(comments);
    }
  },
  {
    method: 'DELETE',
    url: '/v1/comments/:id',
    preHandler: app.adminAuthChain,
    handler: async (request: FastifyRequest & { params: { id: string } }, reply) => {
      const commentService = request.diScope.resolve('commentService');
      await commentService.adminHardDeleteComment(request.params.id.toString() as string);
      reply.code(204).send();
    }
  },
  {
    method: 'PUT',
    url: '/v1/comments/:id',
    schema: {
      body: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            enum: ['deleted', 'published'],
          },
          content: {
            type: 'string',
            minLength: 1
          },
        },
        required: ['content']
      }
    },
    preHandler: app.adminAuthChain,
    handler: async (request: FastifyRequest & { params: { id: string } }, reply) => {
      const commentService = request.diScope.resolve('commentService');
      const comment = await commentService.adminUpdateComment(request.params.id.toString() as string, request.body);
      reply.code(200).send(comment);
    }
  }
];

export default routes;
