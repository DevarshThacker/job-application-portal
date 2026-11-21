import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

// Credentials come from the default provider chain (EC2 instance role) - never hardcoded.
export class S3Storage {
  constructor(config) {
    this.bucket = config.S3_BUCKET;
    this.prefix = config.S3_KEY_PREFIX || '';
    this.client = new S3Client({ region: config.AWS_REGION });
  }
  async put(key, buffer, contentType) {
    await this.client.send(new PutObjectCommand({
      Bucket: this.bucket, Key: this.prefix + key, Body: buffer, ContentType: contentType, ServerSideEncryption: 'AES256',
    }));
  }
  async get(key) {
    const out = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: this.prefix + key }));
    return Buffer.from(await out.Body.transformToByteArray());
  }
  async delete(key) {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: this.prefix + key }));
  }
}
