/**
 * Passport already handles “browser redirect” flow,
 * but sometimes you’ll need server-side verification
 * (e.g. mobile apps exchanging Google ID tokens).
 * This helper shows how you could verify a raw ID-token
 * using Google’s public JWKS endpoint.
 */
import { OAuth2Client } from 'google-auth-library';
import userService      from './userService.js';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export const verifyGoogleToken = async idToken => {
  const ticket = await client.verifyIdToken({
    idToken,
    audience: process.env.GOOGLE_CLIENT_ID
  });
  const payload = ticket.getPayload();                // name, email, sub …
  const user = await userService.upsertGoogle(payload.sub, payload.email);
  return user;
};
