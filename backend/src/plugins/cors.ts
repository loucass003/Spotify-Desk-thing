import fp from 'fastify-plugin'
import cors, { FastifyCorsOptions } from '@fastify/cors'
import { FastifyInstance, FastifyRequest } from 'fastify'

export default fp<FastifyCorsOptions>(async (fastify) => {
    fastify.register(cors, (instance: FastifyInstance) => {
        return (req: FastifyRequest, callback: (error: Error | null, corsOptions?: FastifyCorsOptions) => void) => {
          const corsOptions = {
            // This is NOT recommended for production as it enables reflection exploits
            origin: true
          };
      
          // do not include CORS headers for requests from localhost
          if (req.headers.origin && /^localhost$/m.test(req.headers.origin)) {
            corsOptions.origin = false
          }
      
          // callback expects two parameters: error and options
          callback(null, corsOptions)
        }
      })
      
})
