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
            minLength: 1
          },
          status: {
            type: 'string',
            minLength: 1
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
      await commentService.adminSoftDeleteComment(request.params.id.toString() as string);
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
            minLength: 1
          },
          content: {
            type: 'string',
            minLength: 1
          },
          meta: {
            type: ['object', 'null']
          }
        },
        additionalProperties: false,
        anyOf: [
          { required: ['status'] },
          { required: ['content'] },
          { required: ['meta'] }
        ]
      }
    },
    preHandler: app.adminAuthChain,
    handler: async (request: FastifyRequest & { params: { id: string } }, reply) => {
      const commentService = request.diScope.resolve('commentService');
      const comment = await commentService.adminUpdateComment(request.params.id.toString() as string, request.body);
      reply.code(200).send(comment);
    }
  },
  {
    method: 'DELETE',
    url: '/v1/comments/:id/permanent',
    preHandler: app.adminAuthChain,
    handler: async (request: FastifyRequest & { params: { id: string } }, reply) => {
      const commentService = request.diScope.resolve('commentService');
      await commentService.adminHardDeleteComment(request.params.id.toString());
      reply.code(204).send();
    }
  },
  {
    method: 'POST',
    url: '/v1/comments/republish',
    schema: {
      body: {
        type: 'object',
        properties: {
          startDate: { type: 'string', format: 'date-time' },
          endDate: { type: 'string', format: 'date-time' },
          entityContextId: { type: 'string' }
        },
        // Require at least startDate+endDate OR entityContextId
        anyOf: [
          { required: ['startDate', 'endDate'] },
          { required: ['entityContextId'] }
        ]
      }
    },
    preHandler: app.adminAuthChain,
    handler: async (request: FastifyRequest, reply) => {
      const commentService = request.diScope.resolve('commentService');
      const result = await commentService.adminRepublishComments(request.body);
      reply.code(200).send({
        republishedCount: result.count
      });
    }
  }
];

export default routes;
