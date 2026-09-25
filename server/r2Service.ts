import { 
  S3Client, 
  PutObjectCommand, 
  GetObjectCommand, 
  HeadBucketCommand, 
  DeleteObjectCommand,
  ListObjectsV2Command,
  DeleteObjectsCommand,
  PutBucketCorsCommand
} from "@aws-sdk/client-s3";
import fs from "fs";
import fsPromises from "fs/promises";
import path from "path";
import { Readable } from "stream";

let s3ClientInstance: S3Client | null = null;

const DEFAULT_R2_ACCOUNT_ID = "024cdf19996bc443a2051518c2bdfb26";
const DEFAULT_R2_ACCESS_KEY_ID = "bc1e0964d5a52ed92c7ece6e2a3910f4";
const DEFAULT_R2_SECRET_ACCESS_KEY = "52a0eac3f4ecb676d9b10e9a4cbda8c45cd064d9a32774f4b87cfb5359a3d454";
const DEFAULT_R2_BUCKET_NAME = "vinyl-archive";
const DEFAULT_R2_PUBLIC_URL = "https://pub-4b9d70f6726b44f081cf11942ab2556d.r2.dev";

export interface R2Credentials {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  publicUrl?: string;
}

export function getR2Config(overrideCreds?: Partial<R2Credentials> | null) {
  const accountId = (overrideCreds?.accountId || process.env.R2_ACCOUNT_ID || DEFAULT_R2_ACCOUNT_ID).trim();
  const accessKeyId = (overrideCreds?.accessKeyId || process.env.R2_ACCESS_KEY_ID || DEFAULT_R2_ACCESS_KEY_ID).trim();
  const secretAccessKey = (overrideCreds?.secretAccessKey || process.env.R2_SECRET_ACCESS_KEY || DEFAULT_R2_SECRET_ACCESS_KEY).trim();
  const bucketName = (overrideCreds?.bucketName || process.env.R2_BUCKET_NAME || DEFAULT_R2_BUCKET_NAME).trim();
  const publicUrl = (overrideCreds?.publicUrl || process.env.R2_PUBLIC_URL || DEFAULT_R2_PUBLIC_URL).trim();

  return {
    accountId,
    accessKeyId,
    secretAccessKey,
    bucketName,
    publicUrl
  };
}

/**
 * Returns true if all required Cloudflare R2 configurations are defined.
 */
export function isR2Configured(overrideCreds?: Partial<R2Credentials> | null): boolean {
  const conf = getR2Config(overrideCreds);
  return Boolean(
    conf.accountId &&
    conf.accessKeyId &&
    conf.secretAccessKey &&
    conf.bucketName
  );
}

/**
 * Lazy-initialized or custom S3 client configured for Cloudflare R2.
 */
export function getR2Client(overrideCreds?: Partial<R2Credentials> | null): S3Client {
  const conf = getR2Config(overrideCreds);
  if (!conf.accountId || !conf.accessKeyId || !conf.secretAccessKey || !conf.bucketName) {
    throw new Error(
      "Cloudflare R2 is not configured. Required: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME"
    );
  }

  // If custom credentials supplied, instantiate a dedicated client
  if (overrideCreds && overrideCreds.accountId && overrideCreds.accessKeyId) {
    return new S3Client({
      region: "auto",
      endpoint: `https://${conf.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: conf.accessKeyId,
        secretAccessKey: conf.secretAccessKey
      }
    });
  }

  if (!s3ClientInstance) {
    s3ClientInstance = new S3Client({
      region: "auto",
      endpoint: `https://${conf.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: conf.accessKeyId,
        secretAccessKey: conf.secretAccessKey
      }
    });
  }

  return s3ClientInstance;
}

/**
 * Resolves the public URL for a key stored in R2.
 * If R2_PUBLIC_URL is configured (custom domain or pub-*.r2.dev), uses that.
 * Otherwise, falls back to the server's streaming endpoint /api/r2-stream.
 */
export function getR2PublicUrl(key: string, overrideCreds?: Partial<R2Credentials> | null): string {
  const cleanKey = key.startsWith("/") ? key.slice(1) : key;
  const conf = getR2Config(overrideCreds);
  const publicBase = conf.publicUrl;
  
  if (publicBase) {
    const baseClean = publicBase.replace(/\/$/, "");
    return `${baseClean}/${encodeURI(cleanKey)}`;
  }
  
  return `/api/r2-stream/${encodeURIComponent(cleanKey)}`;
}

/**
 * Derives content-type from file extension.
 */
function getContentTypeForFile(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  switch (ext) {
    case ".mp3": return "audio/mpeg";
    case ".wav": return "audio/wav";
    case ".flac": return "audio/flac";
    case ".m4a": return "audio/mp4";
    case ".ogg": return "audio/ogg";
    case ".aac": return "audio/aac";
    case ".jpg":
    case ".jpeg": return "image/jpeg";
    case ".png": return "image/png";
    case ".webp": return "image/webp";
    case ".json": return "application/json";
    default: return "application/octet-stream";
  }
}

/**
 * Uploads an in-memory buffer to Cloudflare R2.
 */
export async function uploadBufferToR2(
  key: string,
  buffer: Buffer,
  contentType?: string,
  overrideCreds?: Partial<R2Credentials> | null,
  cacheControl?: string
): Promise<{ key: string; publicUrl: string }> {
  const client = getR2Client(overrideCreds);
  const conf = getR2Config(overrideCreds);
  const bucket = conf.bucketName;
  const cleanKey = key.startsWith("/") ? key.slice(1) : key;
  const mime = contentType || getContentTypeForFile(cleanKey);

  // Default Cache-Control: long for audio, shorter for others
  const isAudio = mime.startsWith("audio/");
  const defaultCache = isAudio 
    ? "public, max-age=31536000, immutable" 
    : "public, max-age=3600";

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: cleanKey,
    Body: buffer,
    ContentType: mime,
    CacheControl: cacheControl || defaultCache
  });

  await client.send(command);
  const publicUrl = getR2PublicUrl(cleanKey, overrideCreds);

  return { key: cleanKey, publicUrl };
}

/**
 * Uploads a local file from disk to Cloudflare R2.
 */
export async function uploadFileToR2(
  key: string,
  filePath: string,
  contentType?: string,
  overrideCreds?: Partial<R2Credentials> | null,
  cacheControl?: string
): Promise<{ key: string; publicUrl: string }> {
  const buffer = await fsPromises.readFile(filePath);
  return uploadBufferToR2(key, buffer, contentType, overrideCreds, cacheControl);
}

/**
 * Deletes an object from Cloudflare R2 bucket.
 */
export async function deleteFromR2(key: string, overrideCreds?: Partial<R2Credentials> | null): Promise<void> {
  if (!isR2Configured(overrideCreds)) return;
  try {
    const client = getR2Client(overrideCreds);
    const conf = getR2Config(overrideCreds);
    const bucket = conf.bucketName;
    const cleanKey = key.startsWith("/") ? key.slice(1) : key;
    await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: cleanKey }));
  } catch (err: any) {
    console.warn(`[R2] Delete warning for ${key}:`, err?.message);
  }
}

/**
 * Deletes all objects in Cloudflare R2 matching a prefix (e.g. when an album folder is deleted).
 */
export async function deleteR2ObjectsByPrefix(
  prefix: string,
  overrideCreds?: Partial<R2Credentials> | null
): Promise<void> {
  const conf = getR2Config(overrideCreds);
  if (!conf.accountId || !conf.accessKeyId || !conf.secretAccessKey) {
    console.warn(`[R2Service] Skipping deleteR2ObjectsByPrefix for "${prefix}": R2 credentials not configured.`);
    return;
  }
  try {
    const client = getR2Client(overrideCreds);
    const bucket = conf.bucketName;
    const cleanPrefix = prefix.replace(/^\/+/, "").trim();
    
    const rawTerms = cleanPrefix
      .replace(/^Vinyl Collection\//i, "")
      .replace(/[^a-zA-Z0-9]+/g, " ")
      .toLowerCase()
      .split(" ")
      .filter(t => t.length > 1);

    console.log(`[R2Service] Listing all objects in R2 bucket "${bucket}" to match prefix "${cleanPrefix}" and terms:`, rawTerms);

    let continuationToken: string | undefined = undefined;
    let allKeys: string[] = [];

    do {
      const listRes = await client.send(new ListObjectsV2Command({
        Bucket: bucket,
        ContinuationToken: continuationToken
      }));
      if (listRes.Contents) {
        for (const obj of listRes.Contents) {
          if (obj.Key) allKeys.push(obj.Key);
        }
      }
      continuationToken = listRes.IsTruncated ? listRes.NextContinuationToken : undefined;
    } while (continuationToken);

    if (allKeys.length > 0) {
      const keysToDelete = allKeys
        .filter(k => {
          const kLower = k.toLowerCase();
          if (kLower.includes(cleanPrefix.toLowerCase())) return true;
          if (rawTerms.length > 0 && rawTerms.every(term => kLower.includes(term))) return true;
          if (rawTerms.some(term => term.length > 3 && kLower.includes(term))) return true;
          return false;
        });

      if (keysToDelete.length > 0) {
        console.log(`[R2Service] Found ${keysToDelete.length} matching objects to delete in R2:`, keysToDelete);
        
        for (const key of keysToDelete) {
          await client.send(new DeleteObjectCommand({
            Bucket: bucket,
            Key: key
          }));
          console.log(`[R2Service] Successfully deleted from R2: ${key}`);
        }
        
        console.log(`[R2Service] Finished R2 deletion process.`);
      } else {
        console.log(`[R2Service] No R2 objects found matching prefix "${cleanPrefix}". All R2 keys:`, allKeys);
      }
    } else {
      console.log(`[R2Service] R2 bucket "${bucket}" is empty.`);
    }
  } catch (err: any) {
    console.error(`[R2Service] Error deleting prefix "${prefix}" from R2:`, err?.message || err);
    throw err;
  }
}

/**
 * Tests connection to the Cloudflare R2 bucket.
 */
export async function testR2Connection(overrideCreds?: Partial<R2Credentials> | null): Promise<{ success: boolean; bucket?: string; message?: string }> {
  if (!isR2Configured(overrideCreds)) {
    return { 
      success: false, 
      message: "R2 environment variables are not set in .env" 
    };
  }
  try {
    const client = getR2Client(overrideCreds);
    const conf = getR2Config(overrideCreds);
    const bucket = conf.bucketName;
    await client.send(new HeadBucketCommand({ Bucket: bucket }));
    return { success: true, bucket };
  } catch (err: any) {
    return { success: false, message: err?.message || String(err) };
  }
}

/**
 * Fetches an object stream from R2 with optional HTTP Range support.
 */
export async function getR2ObjectStream(
  key: string,
  rangeHeader?: string
): Promise<{
  stream: Readable;
  contentType: string;
  contentLength?: number;
  contentRange?: string;
  statusCode: number;
}> {
  const client = getR2Client();
  const conf = getR2Config();
  const bucket = conf.bucketName;
  const cleanKey = key.startsWith("/") ? key.slice(1) : key;

  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: cleanKey,
    Range: rangeHeader
  });

  const response = await client.send(command);
  const stream = response.Body as Readable;
  const contentType = response.ContentType || getContentTypeForFile(cleanKey);
  const contentLength = response.ContentLength;
  const contentRange = response.ContentRange;
  const statusCode = rangeHeader && contentRange ? 206 : 200;

  return {
    stream,
    contentType,
    contentLength,
    contentRange,
    statusCode
  };
}

/**
 * Ensures the Cloudflare R2 bucket has CORS enabled for web browser streaming & direct uploads.
 */
export async function ensureR2Cors(): Promise<void> {
  try {
    const client = getR2Client();
    const conf = getR2Config();
    await client.send(
      new PutBucketCorsCommand({
        Bucket: conf.bucketName,
        CORSConfiguration: {
          CORSRules: [
            {
              AllowedHeaders: ["*"],
              AllowedMethods: ["GET", "HEAD", "PUT", "POST", "DELETE"],
              AllowedOrigins: ["*"],
              ExposeHeaders: ["ETag", "Content-Range", "Accept-Ranges", "Content-Length", "Content-Type"],
              MaxAgeSeconds: 3600
            }
          ]
        }
      })
    );
    console.log(`[R2 CORS] Successfully verified and applied open CORS policy to R2 bucket "${conf.bucketName}".`);
  } catch (err: any) {
    console.warn(`[R2 CORS] Notice verifying CORS on bucket:`, err?.message);
  }
}
