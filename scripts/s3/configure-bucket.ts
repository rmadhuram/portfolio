// One-time: make `uploads/*` publicly readable and allow browser PUTs from the site origin(s).
// Run after reviewing: node --env-file=.env.local scripts/s3/configure-bucket.ts
import { S3Client, PutPublicAccessBlockCommand, PutBucketPolicyCommand, PutBucketCorsCommand } from "@aws-sdk/client-s3";
const s3 = new S3Client({ region: process.env.S3_REGION, credentials: { accessKeyId: process.env.S3_ACCESS_KEY_ID!, secretAccessKey: process.env.S3_SECRET_ACCESS_KEY! } });
const Bucket = process.env.S3_BUCKET!;
const origins = Array.from(new Set([process.env.SITE_URL, "https://geekraj.com", "https://www.geekraj.com", "http://localhost:3456", "http://localhost:3000"].filter(Boolean))) as string[];

// Public read of uploads/* only (a policy, not ACLs); keep ACL blocking on.
await s3.send(new PutPublicAccessBlockCommand({ Bucket, PublicAccessBlockConfiguration: { BlockPublicAcls: true, IgnorePublicAcls: true, BlockPublicPolicy: false, RestrictPublicBuckets: false } }));
await s3.send(new PutBucketPolicyCommand({ Bucket, Policy: JSON.stringify({
  Version: "2012-10-17",
  Statement: [{ Sid: "PublicReadUploads", Effect: "Allow", Principal: "*", Action: "s3:GetObject", Resource: `arn:aws:s3:::${Bucket}/uploads/*` }],
}) }));
// Presigned PUT from the admin page runs in the browser, so the bucket must answer CORS preflight.
await s3.send(new PutBucketCorsCommand({ Bucket, CORSConfiguration: { CORSRules: [
  { AllowedOrigins: origins, AllowedMethods: ["PUT"], AllowedHeaders: ["content-type"], MaxAgeSeconds: 3600 },
] } }));
console.log("done: public read on uploads/*; CORS PUT allowed from", origins);
