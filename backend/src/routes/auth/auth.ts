import { FastifyPluginAsync, FastifyRequest } from 'fastify'
import { randomUUID } from 'crypto';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient()


const auth: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
  fastify.get('/session-token', async function (request, reply) {
    const session_token = randomUUID();

    await prisma.tokens.deleteMany({ 
      where: { createdAt: {  lte: new Date(Date.now() - (15 * 60 * 1000)) }, refresh_token: null }
    })

    await prisma.tokens.create({
      data: {
        session_token,
      }
    })

    return { session_token }
  })

  fastify.get(
    '/callback', 
    async function (request: FastifyRequest<{ Querystring: { code?: string, state?: string, error?: string } }>, reply) {

        if (request.query.error) {
          reply.redirect('http://localhost:5173/failed');
          return
        }

        const session_token = request.query.state;
        if (!await prisma.tokens.findFirst({ where: { session_token } })) {
          reply.redirect('http://localhost:5173/expired');
          return;
        }

        const res = await fetch(`https://accounts.spotify.com/api/token`, {
          method: 'POST',
          body: new URLSearchParams({
            code: request.query.code!,
            redirect_uri: process.env.SPOTIFY_REDIRECT_URI!,
            grant_type: 'authorization_code'
          }),
          headers: {
            'content-type': 'application/x-www-form-urlencoded',
            'Authorization': 'Basic ' + (Buffer.from(process.env.SPOTIFY_CLIENT_ID! + ':' + process.env.SPOTIFY_CLIENT_SECRET!).toString('base64'))
          }
        })
        .then(res => res.json())
        .catch(() => null) as ({
          access_token: string,
          token_type: string,
          scope: string,
          expires_in: never,
          refresh_token: string,
        });

        await prisma.tokens.update({ where: { session_token }, data: { refresh_token: res.refresh_token } })
        reply.redirect('http://localhost:5173/success')
    })

  fastify.get(
      '/get-access-token', 
      async function (request: FastifyRequest<{ Querystring: { session_token: string } }>, reply) {

          await prisma.tokens.deleteMany({ 
            where: { createdAt: { lte: new Date(Date.now() - (15 * 60 * 1000)) }, refresh_token: null }
          })

          const session_token = request.query.session_token;
          const data = await prisma.tokens.findFirst({ where: { session_token } });
          if (!data) {
            return { error: 'invalid-session-token' };
          }

          if (!data.refresh_token) {
            return { error: 'no-refresh-token' };
          }


          const res = await fetch(`https://accounts.spotify.com/api/token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': 'Basic ' + (Buffer.from(process.env.SPOTIFY_CLIENT_ID! + ':' + process.env.SPOTIFY_CLIENT_SECRET!).toString('base64'))
            },
            body: new URLSearchParams({
                grant_type: 'refresh_token',
                refresh_token: data.refresh_token,
                client_id: process.env.SPOTIFY_CLIENT_ID!
            }),
          }).then(res => res.json()).catch(() => null) as ({
            access_token: string,
            token_type: string,
            scope: string,
            expires_in: never,
            refresh_token: string,
          });
          if (!res)
            return { error: 'auth-failed' }

          return { access_token: res.access_token }
      })
}

export default auth;
