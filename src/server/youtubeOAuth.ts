import crypto from 'crypto';
import { google } from 'googleapis';

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '732408976087-q0p1bn26qiivf3tmmjvc0b74qfiau1kg.apps.googleusercontent.com';
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const APP_URL = process.env.APP_URL || 'https://ais-dev-3fh3t6gs7vencydted2wud-234305520805.europe-west1.run.app';
export const REDIRECT_URI = `${APP_URL.replace(/\/$/, '')}/auth/callback`;
export const YOUTUBE_SCOPES = ['https://www.googleapis.com/auth/youtube.upload','https://www.googleapis.com/auth/youtube.readonly','https://www.googleapis.com/auth/userinfo.profile','https://www.googleapis.com/auth/userinfo.email','openid'];

type StoredToken = { access_token: string; refresh_token?: string; expiry_date?: number; scope?: string; token_type?: string };
const oauthStates = new Map<string,{createdAt:number;uid:string}>();
const tokensByUid = new Map<string,StoredToken>();
const STATE_TTL_MS = 10*60*1000;
function cleanupStates(){const now=Date.now();for(const [s,v] of oauthStates)if(now-v.createdAt>STATE_TTL_MS)oauthStates.delete(s)}
export function createOAuthClient(){if(!CLIENT_SECRET)throw new Error('GOOGLE_CLIENT_SECRET is not configured');return new google.auth.OAuth2(CLIENT_ID,CLIENT_SECRET,REDIRECT_URI)}
export function createAuthorizationUrl(uid:string){cleanupStates();const state=crypto.randomBytes(32).toString('hex');oauthStates.set(state,{createdAt:Date.now(),uid});return createOAuthClient().generateAuthUrl({access_type:'offline',prompt:'consent',scope:YOUTUBE_SCOPES,state,include_granted_scopes:true})}
export function consumeOAuthState(state:string){cleanupStates();const r=oauthStates.get(state);if(!r)return null;oauthStates.delete(state);return r.uid}
export async function exchangeCode(code:string){const {tokens}=await createOAuthClient().getToken(code);if(!tokens.access_token)throw new Error('Google did not return an access token');return tokens as StoredToken}
export function saveUserTokens(uid:string,tokens:StoredToken){const prev=tokensByUid.get(uid);tokensByUid.set(uid,{...prev,...tokens,refresh_token:tokens.refresh_token||prev?.refresh_token})}
export function getUserTokens(uid:string){return tokensByUid.get(uid)||null}
export async function getAuthenticatedOAuthClient(uid:string){const stored=getUserTokens(uid);if(!stored)throw new Error('YouTube account is not connected');const client=createOAuthClient();client.setCredentials(stored);if(stored.expiry_date&&stored.expiry_date<=Date.now()+60000&&stored.refresh_token){const {credentials}=await client.refreshAccessToken();saveUserTokens(uid,credentials as StoredToken);client.setCredentials(credentials)}return client}
export async function getAuthenticatedYouTubeClient(uid:string){return google.youtube({version:'v3',auth:await getAuthenticatedOAuthClient(uid)})}
export async function getConnectedChannel(uid:string){const youtube=await getAuthenticatedYouTubeClient(uid);const r=await youtube.channels.list({part:['snippet','statistics','contentDetails'],mine:true});return r.data.items?.[0]||null}
export function disconnectUser(uid:string){const stored=tokensByUid.get(uid);tokensByUid.delete(uid);if(stored?.access_token)createOAuthClient().revokeToken(stored.access_token).catch(()=>undefined)}
