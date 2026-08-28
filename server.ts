import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { google } from "googleapis";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import multer from "multer";
import fs from "fs";
import admin from "firebase-admin";
import http from "http";
import cors from "cors";
import { GoogleGenAI, Type } from "@google/genai";
import os from "os";

let aiInstance: GoogleGenAI | null = null;
function getGeminiClient() {
  if (!aiInstance) {
    let apiKey = process.env.GEMINI_API_KEY || "";
    
    // Check if key is placeholder or empty, and try loading from .dev.env.json
    if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey.trim() === "") {
      try {
        const devEnvPath = '/app/.dev.env.json';
        if (fs.existsSync(devEnvPath)) {
          const devEnv = JSON.parse(fs.readFileSync(devEnvPath, 'utf-8'));
          if (devEnv.GEMINI_API_KEY) {
            apiKey = devEnv.GEMINI_API_KEY;
          }
        }
      } catch (e) {
        console.error('Error reading /app/.dev.env.json in server.ts:', e);
      }
    }

    if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
      throw new Error("GEMINI_API_KEY environment variable is required");
    }
    aiInstance = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiInstance;
}

async function generateContentWithFallback(ai: GoogleGenAI, modelPreferred: string, params: {
  contents: any;
  config?: any;
}) {
  const preferred = modelPreferred || "gemini-3.7-flash";
  const fallbackModels = ["gemini-3.7-flash", "gemini-3.1-flash-lite"];
  const models = [preferred, ...fallbackModels];
  const uniqueModels = Array.from(new Set(models));
  let lastError: any = null;

  for (let mIdx = 0; mIdx < uniqueModels.length; mIdx++) {
    const model = uniqueModels[mIdx];
    const hasNextModel = mIdx < uniqueModels.length - 1;
    let retries = 1;
    while (retries >= 0) {
      try {
        console.log(`[Gemini Request] Attempting with model: ${model}`);
        const response = await ai.models.generateContent({
          model,
          contents: params.contents,
          config: params.config
        });
        return response;
      } catch (error: any) {
        lastError = error;
        const errorMessage = (error.message || "").toLowerCase();
        console.warn(`[Gemini Request Warning] Model ${model} failed (retries left: ${retries}). Error:`, error.message || error);
        
        if (errorMessage.includes("api key") || errorMessage.includes("key not valid") || errorMessage.includes("not found")) {
          throw error;
        }

        const isHighDemand = errorMessage.includes("503") || 
                             errorMessage.includes("high demand") || 
                             errorMessage.includes("unavailable") || 
                             errorMessage.includes("resource_exhausted") ||
                             errorMessage.includes("quota");

        if (isHighDemand && hasNextModel) {
          console.warn(`[Gemini Request Warning] Model ${model} is experiencing high demand (503). Immediately cascading to fallback model: ${uniqueModels[mIdx + 1]}...`);
          break;
        }

        if (retries > 0) {
          const delay = (2 - retries) * 600;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
        retries--;
      }
    }
    if (hasNextModel) {
      console.warn(`[Gemini Request Warning] Model ${model} exhausted, falling back to next available model: ${uniqueModels[mIdx + 1]}...`);
    }
  }
  throw lastError || new Error("All models failed to generate content");
}

function tryRepairJSON(text: string): any {
  let cleanText = text.trim();
  if (!cleanText) {
    throw new Error("Empty text");
  }

  // Remove markdown code blocks if present
  if (cleanText.includes("```json")) {
    const parts = cleanText.split("```json");
    if (parts.length > 1) {
      const secondPart = parts[1].split("```")[0];
      cleanText = secondPart.trim();
    }
  } else if (cleanText.includes("```")) {
    const parts = cleanText.split("```");
    if (parts.length > 1) {
      const secondPart = parts[1].trim();
      cleanText = secondPart;
    }
  }

  // Remove any leading or trailing junk text outside the first { or [ and the last } or ]
  const firstBrace = cleanText.indexOf('{');
  const firstBracket = cleanText.indexOf('[');
  let startIdx = -1;
  if (firstBrace !== -1 && firstBracket !== -1) {
    startIdx = Math.min(firstBrace, firstBracket);
  } else if (firstBrace !== -1) {
    startIdx = firstBrace;
  } else if (firstBracket !== -1) {
    startIdx = firstBracket;
  }

  const lastBrace = cleanText.lastIndexOf('}');
  const lastBracket = cleanText.lastIndexOf(']');
  let endIdx = -1;
  if (lastBrace !== -1 && lastBracket !== -1) {
    endIdx = Math.max(lastBrace, lastBracket);
  } else if (lastBrace !== -1) {
    endIdx = lastBrace;
  } else if (lastBracket !== -1) {
    endIdx = lastBracket;
  }

  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    cleanText = cleanText.substring(startIdx, endIdx + 1);
  }

  // Helper for cleanup of common JSON structural faults
  const sanitize = (str: string) => {
    let s = str.replace(/,\s*([\]}])/g, '$1');
    let inString = false;
    let result = '';
    for (let i = 0; i < s.length; i++) {
      const char = s[i];
      if (char === '"' && (i === 0 || s[i - 1] !== '\\')) {
        inString = !inString;
        result += char;
      } else if (inString && char === '\n') {
        result += '\\n';
      } else if (inString && char === '\r') {
        result += '\\r';
      } else {
        result += char;
      }
    }
    s = result;
    return s;
  };

  try {
    return JSON.parse(cleanText);
  } catch (_) {
    try {
      return JSON.parse(sanitize(cleanText));
    } catch (_) {}
  }

  // Backtracking repair (same robust scanner as client)
  const maxBacktrack = Math.min(cleanText.length, 2000);
  const startLen = cleanText.length;
  const endLen = Math.max(1, cleanText.length - maxBacktrack);

  for (let len = startLen; len >= endLen; len--) {
    const sub = cleanText.substring(0, len);
    let inString = false;
    let escape = false;
    const stack: ('{' | '[')[] = [];
    let validCharScan = true;
    
    for (let i = 0; i < sub.length; i++) {
      const char = sub[i];
      if (escape) {
        escape = false;
        continue;
      }
      if (char === '\\') {
        escape = true;
        continue;
      }
      if (char === '"') {
        inString = !inString;
        continue;
      }
      if (!inString) {
        if (char === '{') {
          stack.push('{');
        } else if (char === '[') {
          stack.push('[');
        } else if (char === '}') {
          if (stack.length > 0 && stack[stack.length - 1] === '{') {
            stack.pop();
          } else {
            validCharScan = false;
            break;
          }
        } else if (char === ']') {
          if (stack.length > 0 && stack[stack.length - 1] === '[') {
            stack.pop();
          } else {
            validCharScan = false;
            break;
          }
        }
      }
    }
    
    if (!validCharScan) {
      continue;
    }
    
    let candidate = sub;
    if (inString) {
      candidate += '"';
    }
    
    for (let j = stack.length - 1; j >= 0; j--) {
      if (stack[j] === '{') {
        candidate += '}';
      } else {
        candidate += ']';
      }
    }
    
    try {
      return JSON.parse(candidate);
    } catch (_) {
      try {
        return JSON.parse(sanitize(candidate));
      } catch (_) {}
    }
  }

  // Last-ditch effort: try to match any {...} or [...] inside text
  try {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      return JSON.parse(sanitize(match[0]));
    }
  } catch (_) {}

  throw new Error("Failed to parse and repair JSON");
}

dotenv.config();

console.log("Starting server...");


// Initialize Firebase Admin with more safety
try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log("Firebase Admin initialized");
  } else {
    // Check if we have default credentials before trying to initialize
    try {
      admin.initializeApp();
      console.log("Firebase Admin initialized with default credentials");
    } catch (e) {
      console.warn("Firebase Admin failed to initialize, skipping.");
    }
  }
} catch (e) {
  console.error("Error initializing Firebase Admin:", e);
}

// Ensure uploads directory exists
const UPLOADS_DIR = path.join(process.platform === 'win32' ? os.tmpdir() : '/tmp', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR);
  console.log("Created uploads directory");
}

// @ts-ignore
const _filename = typeof __filename !== "undefined" ? __filename : "";
// @ts-ignore
const _dirname = typeof __dirname !== "undefined" ? __dirname : "";


// Local database stored persistently in project directory with fallback to tmp
const PERSISTENT_DATA_FILE = path.join(process.cwd(), '.server_data.json');
const TMP_DATA_FILE = path.join(process.platform === 'win32' ? os.tmpdir() : '/tmp', 'server_data.json');

function getDataFilePath(): string {
  try {
    if (!fs.existsSync(PERSISTENT_DATA_FILE)) {
      if (fs.existsSync(TMP_DATA_FILE)) {
        try {
          const legacy = fs.readFileSync(TMP_DATA_FILE, 'utf8');
          fs.writeFileSync(PERSISTENT_DATA_FILE, legacy, 'utf8');
        } catch (_) {}
      } else {
        const initial = { scheduled_videos: [], youtube_tokens: {}, app_url: "" };
        fs.writeFileSync(PERSISTENT_DATA_FILE, JSON.stringify(initial, null, 2), 'utf8');
      }
    }
    fs.accessSync(PERSISTENT_DATA_FILE, fs.constants.W_OK);
    return PERSISTENT_DATA_FILE;
  } catch (e) {
    return TMP_DATA_FILE;
  }
}

function readDb() {
  const filePath = getDataFilePath();
  if (fs.existsSync(filePath)) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      if (!content.trim()) return { scheduled_videos: [], youtube_tokens: {}, app_url: "" };
      const data = JSON.parse(content);

      // One-way security migration: versions before the server-only OAuth
      // configuration stored client credentials under api_keys. They are no
      // longer read, so erase them from disk as soon as the legacy file is used.
      // Legacy keys check removed to prevent data loss.
      // We migrate them to youtube_oauth instead.
      if (data && typeof data === "object" && "api_keys" in data) {
        if (!data.youtube_oauth) {
          data.youtube_oauth = {
            client_id: data.api_keys.yt_client_id || "",
            client_secret: data.api_keys.yt_client_secret || ""
          };
        }
        delete data.api_keys;
        writeDb(data);
      }

      return data;
    } catch (e) {
      console.error("Error reading/parsing db file, resetting to default:", e);
      const defaultData = { scheduled_videos: [], youtube_tokens: {}, app_url: "" };
      writeDb(defaultData);
      return defaultData;
    }
  }
  return { scheduled_videos: [], youtube_tokens: {}, app_url: "" };
}

function writeDb(data: any) {
  const filePath = getDataFilePath();
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error("Error writing to primary db file, using fallback:", err);
    try {
      fs.writeFileSync(TMP_DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
    } catch (e2) {
      console.error("Fatal error writing fallback db:", e2);
    }
  }
}

function getUserKeyFromProfile(profile: any): string | null {
  if (!profile) return null;
  if (typeof profile === "string") return profile || null;
  if (profile.id) return String(profile.id);
  if (profile.email) return String(profile.email);
  return null;
}

function getUserProfileStorageKey(userKey: string | null | undefined): string {
  return `${userKey || "global"}_user`;
}

function getCurrentUserKey(req?: express.Request): string | null {
  try {
    if (req?.cookies?.youtube_user_id) {
      return String(req.cookies.youtube_user_id);
    }

    const info = req?.cookies?.google_user;
    if (info) {
      const parsed = JSON.parse(info);
      const key = getUserKeyFromProfile(parsed);
      if (key) return key;
    }

    const dbData = readDb();
    if (dbData.active_user) return String(dbData.active_user);
    return "global";
  } catch (e) {
    const dbData = readDb();
    if (dbData.active_user) return String(dbData.active_user);
    return "global";
  }
}

function saveActiveAuthUser(dbData: any, userProfile: any, tokens: any) {
  const userKey = getUserKeyFromProfile(userProfile) || "global";
  dbData.youtube_tokens = dbData.youtube_tokens || {};
  dbData.youtube_tokens[userKey] = tokens;
  dbData.active_user = userKey;
  dbData.youtube_tokens[getUserProfileStorageKey(userKey)] = userProfile;
}

function getCookieOptions() {
  const isProduction = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" as const : "lax" as const,
    maxAge: 30 * 24 * 60 * 60 * 1000
  };
}

function getOAuth2Client(req?: express.Request) {
  const dbData = readDb();
  const dbOAuth = dbData.youtube_oauth || {};
  const clientId = process.env.GOOGLE_CLIENT_ID || process.env.OAUTH_CLIENT_ID || dbOAuth.client_id;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || process.env.OAUTH_CLIENT_SECRET || dbOAuth.client_secret;
  let appUrl = (process.env.APP_URL || process.env.VITE_APP_URL || dbOAuth.app_url || "").trim();

  if (!appUrl) {
    throw new Error("APP_URL is not configured. Set APP_URL in the server environment.");
  }

  appUrl = appUrl.replace(/\/+$/, "");

  if (!clientId || !clientSecret) {
    throw new Error("Missing required YouTube OAuth credentials in the server environment.");
  }

  return new google.auth.OAuth2(
    clientId,
    clientSecret,
    `${appUrl}/auth/callback`
  );
}

async function getYouTubeClient(req: express.Request, res: express.Response) {
  const dbData = readDb();
  const activeUserKey = getCurrentUserKey(req) || "global";

  let tokensStr = req.cookies.youtube_tokens;
  if (!tokensStr && dbData.youtube_tokens?.[activeUserKey]) {
    tokensStr = JSON.stringify(dbData.youtube_tokens[activeUserKey]);
  }
  if (!tokensStr && dbData.youtube_tokens?.["global"]) {
    tokensStr = JSON.stringify(dbData.youtube_tokens["global"]);
  }

  if (!tokensStr) {
    throw new Error("Not authenticated");
  }

  const tokens = JSON.parse(tokensStr);
  const oauth2Client = getOAuth2Client(req);
  oauth2Client.setCredentials(tokens);

  oauth2Client.on('tokens', (newTokens) => {
    const combinedTokens = { ...tokens, ...newTokens };
    const currentDb = readDb();
    currentDb.youtube_tokens = currentDb.youtube_tokens || {};
    currentDb.youtube_tokens[activeUserKey] = combinedTokens;
    currentDb.active_user = activeUserKey;
    writeDb(currentDb);

    res.cookie("youtube_tokens", JSON.stringify(combinedTokens), getCookieOptions());
  });

  return google.youtube({ version: "v3", auth: oauth2Client });
}

// Multer setup for video uploads
const upload = multer({ dest: UPLOADS_DIR });

// Background worker to process scheduled uploads
setInterval(async () => {
  const now = new Date();
  
  try {
    const dbData = readDb();
    const pendingVideos = dbData.scheduled_videos.filter((v: any) => v.status === "pending");
    
    if (pendingVideos.length > 0) {
      console.log(`Found ${pendingVideos.length} pending tasks.`);
    }

    let hasChanges = false;

    for (const task of pendingVideos) {
      const publishAt = new Date(task.publishAt);

      if (publishAt <= now) {
        try {
          console.log(`Processing scheduled upload: ${task.title}`);
          
          const userTokens = dbData.youtube_tokens[task.uid];
          
          if (!userTokens) {
            console.error(`No tokens found for user ${task.uid}`);
            task.status = "failed";
            hasChanges = true;
            continue;
          }
          
          const { tokens } = userTokens;
          const oauth2Client = getOAuth2Client();
          oauth2Client.setCredentials(tokens);
          const youtube = google.youtube({ version: "v3", auth: oauth2Client });

          await youtube.videos.insert({
            part: ["snippet", "status"],
            requestBody: {
              snippet: {
                title: task.title,
                description: task.description,
                tags: task.tags,
                categoryId: "22" // People & Blogs
              },
              status: {
                privacyStatus: "public",
                publishAt: publishAt.toISOString()
              }
            },
            media: {
              body: fs.createReadStream(task.videoPath)
            }
          });

          task.status = "published";
          hasChanges = true;
          console.log(`Successfully published: ${task.title}`);
          
          // Clean up file
          if (fs.existsSync(task.videoPath)) {
            fs.unlinkSync(task.videoPath);
          }
        } catch (error) {
          console.error(`Failed to publish ${task.title}:`, error);
          task.status = "failed";
          hasChanges = true;
        }
      }
    }

    if (hasChanges) {
      writeDb(dbData);
    }
  } catch (error) {
    console.error("Error in background worker:", error);
  }
}, 60000); // Check every minute

// Vite middleware for development
async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  // Middleware
  app.use(cors());
  app.use(express.json({ limit: "15mb" }));
  app.use(express.urlencoded({ limit: "15mb", extended: true }));
  app.use(cookieParser());

  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
  });

  // API Routes
  app.get("/api/settings/youtube", (req, res) => {
    const dbData = readDb();
    const dbOAuth = dbData.youtube_oauth || {};
    const clientId = process.env.GOOGLE_CLIENT_ID || process.env.OAUTH_CLIENT_ID || dbOAuth.client_id || "";
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET || process.env.OAUTH_CLIENT_SECRET || dbOAuth.client_secret || "";
    const appUrl = process.env.APP_URL || process.env.VITE_APP_URL || dbOAuth.app_url || "";
    res.json({ 
      configured: Boolean(clientId && clientSecret && appUrl), 
      appUrl,
      // We don't send the secret back, just a boolean indicator if it's stored in DB
      hasDbSecret: Boolean(dbOAuth.client_secret),
      clientId: clientId
    });
  });

  app.post("/api/settings/youtube", (req, res) => {
    try {
      const { client_id, client_secret, app_url } = req.body;
      const dbData = readDb();
      dbData.youtube_oauth = dbData.youtube_oauth || {};
      
      if (client_id !== undefined) dbData.youtube_oauth.client_id = client_id;
      if (client_secret !== undefined && client_secret !== "") dbData.youtube_oauth.client_secret = client_secret;
      if (app_url !== undefined) dbData.youtube_oauth.app_url = app_url;
      
      writeDb(dbData);
      res.json({ success: true });
    } catch (error) {
      console.error("Error saving YouTube settings:", error);
      res.status(500).json({ error: "Failed to save settings" });
    }
  });

  // Pexels B-Roll Video Search Proxy with automatic Russian-to-English stock keyword translation
  app.get("/api/pexels/search", async (req, res) => {
    try {
      const rawQuery = ((req.query.query as string) || "cinematic").trim();
      const orientation = (req.query.orientation as string) || "all";
      const perPage = Math.min(parseInt((req.query.per_page as string) || "12", 10), 30);
      const page = parseInt((req.query.page as string) || "1", 10);
      const customKey = req.headers["x-pexels-key"] as string;

      // Primary Pexels API key or fallback working stock key
      let apiKey = customKey || process.env.PEXELS_API_KEY || "563492ad6f9170000100000185e495a898b14a60b943d0774a88f72a";

      let cleanQuery = rawQuery;

      // Translate Cyrillic queries using Gemini AI or keyword extraction
      if (/[^\x00-\x7F]/.test(cleanQuery)) {
        try {
          const ai = getGeminiClient();
          const aiRes = await ai.models.generateContent({
            model: "gemini-3.7-flash",
            contents: `Translate and convert this video prompt/keywords into 2-4 English stock video search keywords (for Pexels API). Output ONLY English space-separated keywords without punctuation or quotes.
Input: "${cleanQuery}"`
          });
          const translated = (aiRes.text || "").trim().replace(/[^a-zA-Z0-9\s]/g, "");
          if (translated) {
            cleanQuery = translated;
          }
        } catch (err) {
          console.warn("[Pexels Proxy] Gemini translation error, using raw query:", err);
        }
      }

      let pexelsUrl = `https://api.pexels.com/videos/search?query=${encodeURIComponent(cleanQuery)}&per_page=${perPage}&page=${page}`;
      if (orientation && orientation !== "all") {
        pexelsUrl += `&orientation=${orientation}`;
      }

      const pexelsRes = await fetch(pexelsUrl, {
        headers: {
          Authorization: apiKey
        }
      });

      if (pexelsRes.ok) {
        const data = await pexelsRes.json();
        return res.json({
          ...data,
          queryUsed: cleanQuery,
          rawQuery
        });
      } else {
        console.warn(`[Pexels Proxy] API returned status ${pexelsRes.status}`);
        return res.status(pexelsRes.status).json({
          error: `Pexels API error ${pexelsRes.status}`,
          queryUsed: cleanQuery,
          rawQuery
        });
      }
    } catch (err: any) {
      console.error("[Pexels Proxy Error]:", err);
      return res.status(500).json({ error: err.message || "Failed to search Pexels" });
    }
  });

  app.get("/api/auth/url", (req, res) => {
    try {
      const oauth2Client = getOAuth2Client(req);
      const scopes = [
        "openid",
        "https://www.googleapis.com/auth/userinfo.email",
        "https://www.googleapis.com/auth/userinfo.profile",
        "https://www.googleapis.com/auth/youtube.readonly",
        "https://www.googleapis.com/auth/yt-analytics.readonly",
        "https://www.googleapis.com/auth/youtube.upload"
      ];

      const url = oauth2Client.generateAuthUrl({
        access_type: "offline",
        scope: scopes,
        prompt: "consent select_account" // Force consent screen to ensure refresh_token is provided
      });

      res.json({ url });
    } catch (error: any) {
      if (!error.message.includes("Missing required credentials")) {
        console.error("Auth URL error:", error);
      }
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/auth/me", async (req, res) => {
    let tokensStr = req.cookies.youtube_tokens;
    let userStr = req.cookies.google_user;
    const dbData = readDb();
    const activeUserKey = getCurrentUserKey(req) || "global";

    if (!tokensStr && dbData.youtube_tokens?.[activeUserKey]) {
      tokensStr = JSON.stringify(dbData.youtube_tokens[activeUserKey]);
      res.cookie("youtube_tokens", tokensStr, getCookieOptions());
    }

    const userProfileKey = getUserProfileStorageKey(activeUserKey);
    if (!userStr && dbData.youtube_tokens?.[userProfileKey]) {
      userStr = JSON.stringify(dbData.youtube_tokens[userProfileKey]);
      res.cookie("google_user", userStr, getCookieOptions());
    }

    if (!tokensStr) {
      return res.json({ user: null });
    }

    try {
      if (userStr) {
        const parsedUser = JSON.parse(userStr);
        return res.json({ user: parsedUser });
      }

      const tokens = JSON.parse(tokensStr);
      const oauth2Client = getOAuth2Client(req);
      oauth2Client.setCredentials(tokens);

      const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
      const userInfoRes = await oauth2.userinfo.get();
      const userInfo = userInfoRes.data;
      const userKey = getUserKeyFromProfile(userInfo) || activeUserKey || "global";

      res.cookie("google_user", JSON.stringify(userInfo), getCookieOptions());
      res.cookie("youtube_user_id", userKey, getCookieOptions());

      try {
        dbData.youtube_tokens = dbData.youtube_tokens || {};
        dbData.youtube_tokens[userKey] = tokens;
        dbData.active_user = userKey;
        dbData.youtube_tokens[getUserProfileStorageKey(userKey)] = userInfo;
        writeDb(dbData);
      } catch (err) {
        console.error("Error writing user auth to db:", err);
      }

      return res.json({ user: userInfo });
    } catch (e: any) {
      return res.json({ user: null });
    }
  });

  app.get("/auth/callback", async (req, res) => {
    const { code } = req.query;

    try {
      const oauth2Client = getOAuth2Client(req);
      const { tokens } = await oauth2Client.getToken(code as string);

      oauth2Client.setCredentials(tokens);
      const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
      const userInfoRes = await oauth2.userinfo.get();
      const userInfo = userInfoRes.data;
      const userKey = getUserKeyFromProfile(userInfo) || "global";

      res.cookie("youtube_tokens", JSON.stringify(tokens), getCookieOptions());
      res.cookie("google_user", JSON.stringify(userInfo), getCookieOptions());
      res.cookie("youtube_user_id", userKey, getCookieOptions());

      const dbData = readDb();
      saveActiveAuthUser(dbData, userInfo, tokens);
      writeDb(dbData);

      res.send(`
        <html>
          <body>
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS' }, '*');
                window.close();
              } else {
                window.location.href = '/';
              }
            </script>
            <p>Authentication successful. This window should close automatically.</p>
          </body>
        </html>
      `);
    } catch (error: any) {
      if (!error.message?.includes("Missing required credentials")) {
        console.error("Error exchanging code for tokens:", error);
      }
      res.status(500).send("Authentication failed");
    }
  });

  app.get("/api/youtube/stats", async (req, res) => {
    try {
      const youtube = await getYouTubeClient(req, res);
      const response = await youtube.channels.list({
        part: ["snippet", "statistics"],
        mine: true
      });

      const channel = response.data.items?.[0];
      if (!channel) {
        return res.status(404).json({ error: "Channel not found" });
      }

      res.json({
        title: channel.snippet?.title,
        subscribers: channel.statistics?.subscriberCount,
        views: channel.statistics?.viewCount,
        videos: channel.statistics?.videoCount,
        thumbnail: channel.snippet?.thumbnails?.default?.url,
        isDemo: false
      });
    } catch (error: any) {
      if (error.message === "Not authenticated") {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const errMsg = error.message || "";
      if (errMsg.includes("has not been used") || errMsg.includes("disabled") || errMsg.includes("Missing required credentials")) {
        return res.json({
          title: "Демо-канал (YouTube API не активен)",
          subscribers: "12500",
          views: "450000",
          videos: "84",
          thumbnail: "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=120&auto=format&fit=crop&q=60",
          isDemo: true,
          apiDisabled: true,
          apiDisabledLink: "https://console.developers.google.com/apis/api/youtube.googleapis.com/overview",
          error: "YouTube Data API v3 has not been enabled in your Google Cloud Console yet. Please visit the link to enable the API."
        });
      }
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  app.get("/api/youtube/performance", async (req, res) => {
    try {
      const youtube = await getYouTubeClient(req, res);
      const analytics = google.youtubeAnalytics({ version: "v2", auth: (youtube as any).context._options.auth });
      const endDate = new Date();
      const startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - 28);
      const formatDate = (date: Date) => date.toISOString().slice(0, 10);

      const report = await analytics.reports.query({
        ids: "channel==MINE",
        startDate: formatDate(startDate),
        endDate: formatDate(endDate),
        metrics: "views,averageViewDuration,averageViewPercentage,impressions,impressionsCtr,likes",
        dimensions: "video",
        sort: "-views",
        maxResults: 10
      });

      const headers = report.data.columnHeaders?.map((header: any) => header.name) || [];
      const rows = (report.data.rows || []).map((row: any[]) => Object.fromEntries(headers.map((header: string, index: number) => [header, row[index]])));
      const videoIds = rows.map((row: any) => row.video).filter(Boolean);
      const videoDetails = videoIds.length
        ? await youtube.videos.list({ part: ["snippet"], id: videoIds })
        : { data: { items: [] } };
      const titles = new Map((videoDetails.data.items || []).map((video: any) => [video.id, video.snippet?.title || "Untitled video"]));
      const videos = rows.map((row: any) => ({
        id: row.video,
        title: titles.get(row.video) || "Untitled video",
        views: Number(row.views || 0),
        averageViewDuration: Number(row.averageViewDuration || 0),
        retention: Number(row.averageViewPercentage || 0),
        impressions: Number(row.impressions || 0),
        ctr: Number(row.impressionsCtr || 0),
        likes: Number(row.likes || 0)
      }));
      const totals = videos.reduce((acc: any, video: any) => ({
        views: acc.views + video.views,
        impressions: acc.impressions + video.impressions,
        weightedCtr: acc.weightedCtr + video.ctr * video.impressions,
        weightedRetention: acc.weightedRetention + video.retention * video.views
      }), { views: 0, impressions: 0, weightedCtr: 0, weightedRetention: 0 });

      res.json({
        period: { startDate: formatDate(startDate), endDate: formatDate(endDate) },
        videos,
        summary: {
          ctr: totals.impressions ? totals.weightedCtr / totals.impressions : 0,
          retention: totals.views ? totals.weightedRetention / totals.views : 0,
          views: totals.views
        }
      });
    } catch (error: any) {
      const message = error.message || "Failed to fetch YouTube Analytics";
      if (message.includes("insufficient authentication scopes") || message.includes("forbidden")) {
        return res.status(403).json({ error: "Reconnect YouTube to grant Analytics access", requiresReconnect: true });
      }
      res.status(500).json({ error: message });
    }
  });

  app.post("/api/youtube/my-videos", async (req, res) => {
    const { ideas } = req.body;
    try {
      const youtube = await getYouTubeClient(req, res);
      const response = await youtube.channels.list({
        part: ["contentDetails"],
        mine: true
      });

      const uploadsPlaylistId = response.data.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
      if (!uploadsPlaylistId) {
        return res.status(404).json({ error: "Uploads playlist not found" });
      }

      const playlistItemsRes = await youtube.playlistItems.list({
        part: ["snippet", "status"],
        playlistId: uploadsPlaylistId,
        maxResults: 50
      });

      const videoIds = playlistItemsRes.data.items?.map((item: any) => item.snippet?.resourceId?.videoId).filter(Boolean) || [];
      
      let videos: any[] = [];
      if (videoIds.length > 0) {
        const videosRes = await youtube.videos.list({
          part: ["snippet", "status", "statistics"],
          id: videoIds
        });
        videos = videosRes.data.items?.map((v: any) => ({
          id: v.id,
          title: v.snippet?.title,
          description: v.snippet?.description,
          publishedAt: v.snippet?.publishedAt,
          thumbnail: v.snippet?.thumbnails?.medium?.url || v.snippet?.thumbnails?.default?.url,
          privacyStatus: v.status?.privacyStatus, // public, private, unlisted
          viewCount: v.statistics?.viewCount || 0,
          likeCount: v.statistics?.likeCount || 0,
        })) || [];
      }

      res.json({ videos, isDemo: false });
    } catch (error: any) {
      // Return beautiful demo videos matching the ideas
      const demoIdeas = Array.isArray(ideas) ? ideas : [];
      const mockVideos = demoIdeas.map((idea: any, idx: number) => {
        const title = typeof idea === "string" ? idea : (idea.title || idea.topic || `Идея ${idx + 1}`);
        const isPublished = idx % 2 === 0;
        return {
          id: `demo-vid-${idx}`,
          title: title,
          description: `Описание для видео по теме: ${title}. Оптимизировано под YouTube SEO.`,
          publishedAt: new Date(Date.now() - idx * 24 * 60 * 60 * 1000).toISOString(),
          thumbnail: `https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=320&auto=format&fit=crop&q=60`,
          privacyStatus: isPublished ? "public" : "private",
          viewCount: isPublished ? Math.floor(Math.random() * 5000) + 1200 : 0,
          likeCount: isPublished ? Math.floor(Math.random() * 300) + 45 : 0,
        };
      });

      res.json({
        videos: mockVideos,
        isDemo: true,
        error: error.message || "Using demo data"
      });
    }
  });

  app.post("/api/youtube/create-playlist", async (req, res) => {
    const { title, description } = req.body;
    try {
      const youtube = await getYouTubeClient(req, res);
      const response = await youtube.playlists.insert({
        part: ["snippet", "status"],
        requestBody: {
          snippet: {
            title: title || "Новый плейлист",
            description: description || "Создано с помощью AI Studio"
          },
          status: {
            privacyStatus: "public"
          }
        }
      });
      res.json({ playlist: response.data, isDemo: false });
    } catch (error: any) {
      // Demo mock fallback if no credentials/tokens are provided, or if user is offline
      const mockPlaylist = {
        id: `demo-playlist-${Date.now()}`,
        snippet: {
          title: title || "Новый плейлист (Демо)",
          description: description || "Описание создано автоматически.",
          publishedAt: new Date().toISOString(),
        }
      };
      res.json({
        playlist: mockPlaylist,
        isDemo: true,
        error: error.message || "Using demo mode"
      });
    }
  });

  app.post("/api/youtube/publish", upload.single("video"), async (req, res) => {
    const dbData = readDb();
    const activeUserKey = getCurrentUserKey(req) || req.body?.uid || "global";
    let tokensStr = req.cookies.youtube_tokens;

    if (!tokensStr && dbData.youtube_tokens?.[activeUserKey]) {
      tokensStr = JSON.stringify(dbData.youtube_tokens[activeUserKey]);
    }

    if (!tokensStr && dbData.youtube_tokens?.["global"]) {
      tokensStr = JSON.stringify(dbData.youtube_tokens["global"]);
    }

    if (!tokensStr) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { title, description, tags, publishAt, uid } = req.body;
    const videoFile = req.file;

    if (!videoFile) {
      return res.status(400).json({ error: "No video file uploaded" });
    }

    if (!uid) {
      return res.status(400).json({ error: "User UID is required" });
    }

    // Publishing and scheduling are never available in demo mode. Verify the
    // authenticated channel immediately before creating a persistent task.
    try {
      const youtube = await getYouTubeClient(req, res);
      const channel = await youtube.channels.list({ part: ["id"], mine: true });
      if (!channel.data.items?.[0]?.id) throw new Error("Live YouTube channel is unavailable");
    } catch (error) {
      if (videoFile.path && fs.existsSync(videoFile.path)) fs.unlinkSync(videoFile.path);
      return res.status(409).json({
        error: "Publishing is unavailable while YouTube is in demo mode. Connect a live channel first.",
        isDemo: true
      });
    }

    const tokens = JSON.parse(tokensStr);
    const scheduledTime = new Date(publishAt);

    const taskId = Math.random().toString(36).substr(2, 9);
    
    try {
      const dbData = readDb();

      dbData.youtube_tokens[uid] = {
        uid,
        tokens,
        updatedAt: new Date().toISOString()
      };

      dbData.scheduled_videos.push({
        id: taskId,
        videoPath: videoFile.path,
        title,
        description,
        tags: JSON.parse(tags || "[]"),
        publishAt: scheduledTime.toISOString(),
        status: "pending",
        uid
      });

      writeDb(dbData);
      res.json({ success: true, taskId });
    } catch (error) {
      console.error("Error scheduling video:", error);
      res.status(500).json({ error: "Failed to schedule video" });
    }
  });

  app.get("/api/youtube/tasks", async (req, res) => {
    const { uid } = req.query;
    if (!uid) {
      return res.status(400).json({ error: "User UID is required" });
    }

    try {
      const dbData = readDb();
      const videos = dbData.scheduled_videos.filter((v: any) => v.uid === uid);
      res.json(videos);
    } catch (error) {
      console.error("Error fetching scheduled videos:", error);
      res.status(500).json({ error: "Failed to fetch scheduled videos" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    const activeUserKey = getCurrentUserKey(req);
    res.clearCookie("youtube_tokens");
    res.clearCookie("google_user");
    res.clearCookie("youtube_user_id");

    try {
      const dbData = readDb();
      if (dbData.youtube_tokens) {
        if (activeUserKey) {
          delete dbData.youtube_tokens[activeUserKey];
          delete dbData.youtube_tokens[getUserProfileStorageKey(activeUserKey)];
        }
        delete dbData.youtube_tokens["global"];
        delete dbData.youtube_tokens["global_user"];
      }
      delete dbData.active_user;
      writeDb(dbData);
    } catch (e) {
      console.error("Error clearing active YouTube credentials from db:", e);
    }
    res.json({ success: true });
  });

  app.get("/api/debug/collections", async (req, res) => {
    res.json({ status: "Using local JSON database to bypass IAM restrictions." });
  });






  app.get("/api/youtube/competitor-analysis", async (req: express.Request, res: express.Response) => {
    const query = req.query.query as string;
    const currentTitle = req.query.currentTitle as string;
    const currentTags = req.query.currentTags as string;

    if (!query) {
      return res.status(400).json({ error: "Query is required" });
    }

    try {
      const youtube = await getYouTubeClient(req, res);
      
      // 1. Search for top competitor videos
      const searchRes = await youtube.search.list({
        part: ["snippet"],
        q: query,
        type: ["video"],
        order: "viewCount",
        maxResults: 8
      });

      const competitors = searchRes.data.items?.map(item => ({
        title: item.snippet?.title,
        channelTitle: item.snippet?.channelTitle,
        videoId: item.id?.videoId,
        publishedAt: item.snippet?.publishedAt
      })) || [];

      // 2. Analyze with Gemini
      const ai = getGeminiClient();

      const prompt = `
        Ты — экспертный SEO-стратег для YouTube. Проанализируй данные топовых конкурентов в нише и предложи конкретные улучшения для моего видео.
        
        МОЁ ТЕКУЩЕЕ ВИДЕО:
        Заголовок: ${currentTitle || "Без заголовка"}
        Теги: ${currentTags || "Нет тегов"}
        
        ТОП-8 КОНКУРЕНТОВ (по просмотрам):
        ${competitors.map((c, i) => `${i+1}. "${c.title}" (Канал: ${c.channelTitle})`).join('\n')}
        
        ЗАДАНИЕ:
        1. Сформулируй 3 варианта высококонверсионных (CTR) заголовков, которые используют триггеры внимания и ключевые слова конкурентов, но звучат уникально.
        2. Предложи оптимальный список из 15-20 SEO-тегов для максимального охвата в поиске и рекомендациях.
        3. Объясни стратегию: почему эти изменения сработают и какие "боли" или "интересы" зрителей конкурентов мы перехватываем.
        
        ОТВЕТЬ СТРОГО В ФОРМАТЕ JSON:
        {
          "suggestedTitles": ["...", "...", "..."],
          "suggestedTags": ["...", "...", "..."],
          "strategy": "..."
        }
        
        Используй букву "ё" везде, где она должна быть. Ответ должен быть на русском языке.
      `;

      const response = await generateContentWithFallback(ai, "gemini-3.7-flash", {
        contents: prompt,
        config: {
          responseMimeType: "application/json"
        }
      });
      
      let text = response.text || "";
      
      // Simple JSON extraction if needed, but responseMimeType should handle it
      if (text.includes("```json")) {
        text = text.replace(/```json/g, "").replace(/```/g, "").trim();
      }
      
      const suggestions = tryRepairJSON(text);

      res.json({
        competitors,
        suggestions
      });

    } catch (error: any) {
      console.error("Competitor analysis error:", error);
      res.status(500).json({ error: error.message || "Failed to analyze competitors" });
    }
  });

  app.post("/api/seo/analyze", async (req: express.Request, res: express.Response) => {
    const { title, description, tags } = req.body;

    if (!title) {
      return res.status(400).json({ error: "Title is required for SEO analysis" });
    }

    try {
      const ai = getGeminiClient();
      
      const prompt = `
        Ты — ведущий эксперт по YouTube SEO и алгоритмам ранжирования Google. 
        Проведи глубокий аудит следующих метаданных видео и предложи конкретные улучшения для повышения CTR и поисковой оптимизации.

        ДАННЫЕ ВИДЕО:
        Заголовок: ${title}
        Описание: ${description || "Нет описания"}
        Текущие теги: ${tags || "Нет тегов"}

        ЗАДАНИЕ:
        1. Рассчитай "SEO Score" (0-100) на основе заполненности и оптимизации.
        2. Проанализируй заголовок: предложи 3 варианта правок для повышения кликабельности (CTR).
        3. Проанализируй описание: укажи на ошибки и предложи структуру первых 2-х строк (snippet).
        4. Сгенерируй 10 ВЫСОКОЧАСТОТНЫХ (широких) ключевых слов для охвата.
        5. Сгенерируй 10 НИЗКОЧАСТОТНЫХ (целевых/long-tail) ключевых слов для попадания в узкие запросы.
        6. Дай 3 конкретных совета по оптимизации контента под Google Search.

        ОТВЕТЬ СТРОГО В ФОРМАТЕ JSON:
        {
          "score": number,
          "titleAnalysis": {
            "current": "...",
            "suggestions": ["...", "...", "..."],
            "critique": "..."
          },
          "descriptionAnalysis": {
            "critique": "...",
            "optimizedSnippet": "..."
          },
          "keywords": {
            "highFrequency": ["...", "... x10"],
            "lowFrequency": ["...", "... x10"]
          },
          "googleSearchTips": ["...", "...", "..."]
        }

        Язык ответа: Русский. Используй букву "ё".
      `;

      const response = await generateContentWithFallback(ai, "gemini-3.7-flash", {
        contents: prompt,
        config: {
          responseMimeType: "application/json"
        }
      });
      
      const text = response.text || "{}";
      const analysis = tryRepairJSON(text);

      res.json(analysis);
    } catch (error: any) {
      console.error("SEO analysis error:", error);
      res.status(500).json({ error: error.message || "Failed to perform SEO analysis" });
    }
  });

  app.post("/api/seo/shorts-ctr", async (req: express.Request, res: express.Response) => {
    const { title, description } = req.body;

    if (!title) {
      return res.status(400).json({ error: "Title is required for CTR analysis" });
    }

    try {
      const ai = getGeminiClient();

      const prompt = `
        Ты — ведущий эксперт по YouTube алгоритмам, специалист по повышению CTR (кликабельности) коротких видео YouTube Shorts.
        Проведи глубокий аудит заголовка и первой строки описания для Shorts.
        
        МОИ ТЕКУЩИЕ ДАННЫЕ:
        Заголовок: ${title}
        Описание: ${description || "Нет описания"}

        Твоя задача — проанализировать эти данные и выдать структурированные рекомендации для максимизации CTR и удержания внимания с первых секунд.

        ОТВЕТЬ СТРОГО В ФОРМАТЕ JSON (без лишнего текста, только валидный JSON):
        {
          "ctrScore": number, 
          "hookStrength": "высокая" | "средняя" | "низкая", 
          "emotion": "Эмоциональный триггер (шок, любопытство, страх упущенной выгоды...)",
          "competitiveness": "Оценка конкурентности ниши/темы",
          "retentionPrediction": "Прогноз удержания зрителей в первые 3 секунды...",
          "critique": "Критический анализ: почему текущий заголовок работает или не работает, ошибки...",
          "suggestedTitles": [
            { "title": "Улучшенный заголовок вариант 1", "type": "Интрига / Кликбейт", "ctrIncrease": "+25%" },
            { "title": "Улучшенный заголовок вариант 2", "type": "Проблема / Вопрос", "ctrIncrease": "+18%" },
            { "title": "Улучшенный заголовок вариант 3", "type": "Цифры и Факты", "ctrIncrease": "+15%" }
          ],
          "firstLineSuggestion": "Идеально оптимизированная первая строка описания (до 100 символов, которая видна в поиске и фиде)...",
          "ctrTriggers": ["Увеличьте контраст в превью", "Используйте капс на ключевом слове", "Добавьте смайл интриги", "Создайте эффект незаконченного действия"],
          "stopWordsDetected": ["Слова или клише, которые снижают CTR..."]
        }

        Используй букву "ё" везде, где она должна быть. Ответ должен быть на русском языке.
      `;

      const response = await generateContentWithFallback(ai, "gemini-3.7-flash", {
        contents: prompt,
        config: {
          responseMimeType: "application/json"
        }
      });

      const text = response.text || "{}";
      const analysis = tryRepairJSON(text);

      res.json(analysis);
    } catch (error: any) {
      console.error("Shorts CTR analysis error:", error);
      res.status(500).json({ error: error.message || "Failed to perform CTR analysis" });
    }
  });

  app.post("/api/youtube/analyze-reference-style", async (req: express.Request, res: express.Response) => {
    const { base64Data, mimeType } = req.body;

    if (!base64Data) {
      return res.status(400).json({ error: "Base64 data is required" });
    }

    try {
      const ai = getGeminiClient();

      let cleanBase64 = base64Data;
      if (base64Data.includes(";base64,")) {
        cleanBase64 = base64Data.split(";base64,").pop() || "";
      }

      const prompt = `Ты — эксперт по дизайну YouTube обложек (превью). Проанализируй загруженное изображение-референс и опиши его визуальный стиль. Твое описание будет использовано для генерации новой обложки с похожей эстетикой. Укажи ключевые особенности: цветовую палитру (например, темный фон с неоновым синим и фиолетовым свечением, яркий оранжевый акцент), тип освещения (контрастный свет, свечение сзади), стиль текста (если есть), общую композицию (правило третей, фокус на персонаже слева) и настроение (динамичное, игровое, премиальное, научно-популярное). Будь лаконичен, напиши описание на русском языке длиной не более 3-4 предложений.`;

      const response = await generateContentWithFallback(ai, "gemini-3.7-flash", {
        contents: [
          {
            inlineData: {
              data: cleanBase64,
              mimeType: mimeType || "image/png"
            }
          },
          prompt
        ]
      });

      const styleDescription = response.text || "Контрастные цвета, современный динамичный дизайн YouTube, яркое освещение";
      res.json({ styleDescription: styleDescription.trim() });
    } catch (error: any) {
      console.error("Reference style analysis error:", error);
      res.status(500).json({ error: error.message || "Failed to analyze reference style" });
    }
  });

  app.get("/api/proxy-download", async (req, res) => {
    try {
      const targetUrl = req.query.url as string;
      const filename = (req.query.filename as string) || "downloaded-file";

      if (!targetUrl) {
        return res.status(400).json({ error: "Missing url parameter" });
      }

      if (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://")) {
        return res.status(400).json({ error: "Invalid url protocol" });
      }

      const response = await fetch(targetUrl);
      if (!response.ok) {
        return res.status(response.status).json({ error: `Failed to fetch target URL: ${response.statusText}` });
      }

      const contentType = response.headers.get("content-type") || "application/octet-stream";
      res.setHeader("Content-Type", contentType);
      res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(filename)}"`);
      
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      res.send(buffer);
    } catch (err: any) {
      console.error("[Proxy Download Error]:", err);
      res.status(500).json({ error: err.message || "Failed to download file" });
    }
  });

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR === "true" ? false : undefined,
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  const httpServer = http.createServer(app);
  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
