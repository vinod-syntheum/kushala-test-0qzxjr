/**
 * @fileoverview AWS service module providing secure S3 and KMS operations with comprehensive monitoring
 * @version 1.0.0
 */

import { 
  S3Client, 
  PutObjectCommand, 
  GetObjectCommand, 
  DeleteObjectCommand 
} from '@aws-sdk/client-s3'; // ^3.0.0
import { 
  KMSClient, 
  EncryptCommand, 
  DecryptCommand 
} from '@aws-sdk/client-kms'; // ^3.0.0
import { error, info, warn } from '../utils/logger.utils';
import { validateFileInput } from '../utils/validation.utils';

/**
 * Interface for file upload options
 */
interface UploadOptions {
  encrypt?: boolean;
  metadata?: Record<string, string>;
  expiresIn?: number;
}

/**
 * Interface for file retrieval options
 */
interface GetOptions {
  decrypt?: boolean;
  validateChecksum?: boolean;
}

/**
 * Interface for upload result with security metadata
 */
interface UploadResult {
  key: string;
  eTag: string;
  versionId?: string;
  checksum: string;
  encryptionStatus?: string;
}

/**
 * Interface for file retrieval result
 */
interface GetFileResult {
  data: Buffer;
  metadata: Record<string, string>;
  checksum: string;
  encryptionStatus?: string;
}

/**
 * AWS service class providing secure file operations with comprehensive monitoring
 */
export class AWSService {
  private readonly s3Client: S3Client;
  private readonly kmsClient: KMSClient;
  private readonly bucketName: string;
  private readonly maxFileSize: number = 100 * 1024 * 1024; // 100MB
  private readonly allowedFileTypes: string[] = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/pdf'
  ];
  private readonly retryConfig = {
    maxAttempts: 3,
    backoff: { type: 'exponential', base: 1000 }
  };

  constructor() {
    // Initialize S3 client with secure configuration
    this.s3Client = new S3Client({
      region: process.env.AWS_REGION || 'us-east-1',
      maxAttempts: this.retryConfig.maxAttempts,
      retryMode: 'adaptive',
      requestHandler: {
        abortSignal: { timeoutMs: 30000 } // 30s timeout
      }
    });

    // Initialize KMS client for encryption operations
    this.kmsClient = new KMSClient({
      region: process.env.AWS_REGION || 'us-east-1',
      maxAttempts: this.retryConfig.maxAttempts
    });

    this.bucketName = process.env.AWS_S3_BUCKET || '';
    if (!this.bucketName) {
      throw new Error('AWS S3 bucket name not configured');
    }
  }

  /**
   * Securely uploads a file to S3 with comprehensive validation and monitoring
   */
  async uploadFile(
    fileBuffer: Buffer,
    key: string,
    contentType: string,
    options: UploadOptions = {}
  ): Promise<UploadResult> {
    try {
      // Validate file input
      if (!fileBuffer || !key) {
        throw new Error('Invalid file input');
      }

      // Validate file size
      if (fileBuffer.length > this.maxFileSize) {
        throw new Error('File size exceeds maximum limit');
      }

      // Validate file type
      if (!this.allowedFileTypes.includes(contentType)) {
        throw new Error('File type not allowed');
      }

      // Generate file checksum
      const checksum = await this.generateChecksum(fileBuffer);

      // Encrypt file if requested
      let encryptedBuffer = fileBuffer;
      let encryptionStatus;
      if (options.encrypt) {
        encryptedBuffer = await this.encryptData(fileBuffer);
        encryptionStatus = 'encrypted';
      }

      // Prepare upload command with security headers
      const uploadCommand = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: encryptedBuffer,
        ContentType: contentType,
        Metadata: {
          ...options.metadata,
          checksum,
          encryptionStatus: encryptionStatus || 'none'
        },
        ServerSideEncryption: 'AES256',
        BucketKeyEnabled: true
      });

      // Upload file with monitoring
      info(`Starting file upload: ${key}`);
      const result = await this.s3Client.send(uploadCommand);

      // Log successful upload
      info(`File uploaded successfully: ${key}`, {
        size: fileBuffer.length,
        contentType,
        checksum
      });

      return {
        key,
        eTag: result.ETag || '',
        versionId: result.VersionId,
        checksum,
        encryptionStatus
      };
    } catch (err) {
      error(`File upload failed: ${key}`, err);
      throw err;
    }
  }

  /**
   * Securely retrieves a file from S3 with access validation
   */
  async getFile(key: string, options: GetOptions = {}): Promise<GetFileResult> {
    try {
      // Validate input
      if (!key) {
        throw new Error('Invalid file key');
      }

      // Prepare get command
      const getCommand = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key
      });

      // Retrieve file with monitoring
      info(`Starting file retrieval: ${key}`);
      const result = await this.s3Client.send(getCommand);

      if (!result.Body) {
        throw new Error('File content not found');
      }

      // Convert stream to buffer
      const fileBuffer = await this.streamToBuffer(result.Body as any);

      // Validate checksum if requested
      if (options.validateChecksum && result.Metadata?.checksum) {
        const checksum = await this.generateChecksum(fileBuffer);
        if (checksum !== result.Metadata.checksum) {
          throw new Error('File integrity check failed');
        }
      }

      // Decrypt if necessary
      let finalBuffer = fileBuffer;
      let encryptionStatus = result.Metadata?.encryptionStatus || 'none';
      if (options.decrypt && encryptionStatus === 'encrypted') {
        finalBuffer = await this.decryptData(fileBuffer);
        encryptionStatus = 'decrypted';
      }

      info(`File retrieved successfully: ${key}`);

      return {
        data: finalBuffer,
        metadata: result.Metadata || {},
        checksum: result.Metadata?.checksum || '',
        encryptionStatus
      };
    } catch (err) {
      error(`File retrieval failed: ${key}`, err);
      throw err;
    }
  }

  /**
   * Securely deletes a file from S3 with audit logging
   */
  async deleteFile(key: string): Promise<void> {
    try {
      // Validate input
      if (!key) {
        throw new Error('Invalid file key');
      }

      // Prepare delete command
      const deleteCommand = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key
      });

      // Delete file with monitoring
      info(`Starting file deletion: ${key}`);
      await this.s3Client.send(deleteCommand);

      info(`File deleted successfully: ${key}`);
    } catch (err) {
      error(`File deletion failed: ${key}`, err);
      throw err;
    }
  }

  /**
   * Generates secure checksum for file integrity validation
   */
  private async generateChecksum(data: Buffer): Promise<string> {
    const crypto = await import('crypto');
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Encrypts data using KMS
   */
  private async encryptData(data: Buffer): Promise<Buffer> {
    const command = new EncryptCommand({
      KeyId: process.env.AWS_KMS_KEY_ID,
      Plaintext: data
    });

    const result = await this.kmsClient.send(command);
    return Buffer.from(result.CiphertextBlob as Uint8Array);
  }

  /**
   * Decrypts data using KMS
   */
  private async decryptData(data: Buffer): Promise<Buffer> {
    const command = new DecryptCommand({
      CiphertextBlob: data
    });

    const result = await this.kmsClient.send(command);
    return Buffer.from(result.Plaintext as Uint8Array);
  }

  /**
   * Converts readable stream to buffer
   */
  private async streamToBuffer(stream: any): Promise<Buffer> {
    const chunks: Buffer[] = [];
    return new Promise((resolve, reject) => {
      stream.on('data', (chunk: Buffer) => chunks.push(chunk));
      stream.on('error', reject);
      stream.on('end', () => resolve(Buffer.concat(chunks)));
    });
  }
}