import { Buffer } from "buffer";
import { Logger } from "@aws-lambda-powertools/logger";
import {
  ChecksumAlgorithm,
  DeleteObjectCommand,
  EncryptionTypeMismatch,
  GetObjectCommand,
  GetObjectCommandOutput,
  InvalidObjectState,
  InvalidRequest,
  InvalidWriteOffset,
  NoSuchKey,
  NoSuchUpload,
  S3Client,
  S3ServiceException,
  TooManyParts,
  waitUntilObjectNotExists,
} from "@aws-sdk/client-s3";
import "@aws-sdk/crc64-nvme-crt";
import { Options, Upload } from "@aws-sdk/lib-storage";
import {
  InvalidBucketNamePrefixes,
  InvalidBucketNameSuffixes,
  IS3Service,
  ValidBucketNameMaxLen,
  ValidBucketNameMinLen,
  ValidBucketNameRegex,
  ValidKeyNameMaxLen,
  ValidKeyNameMinLen,
  ValidKeyNameRegex,
  ValidObjectMaxLen,
  ValidObjectMinLen,
} from "./iS3Service.mts";
import { StorageError } from "./storageError.mts";
import { ValidationError } from "./validationError.mts";

const s3Client = new S3Client({});

const deleteObject =
  (logger: Logger) =>
  async (bucketName: string, keyName: string): Promise<void> => {
    logger.info(`deleteObject: bucketName=${bucketName}, keyName=${keyName}`);

    if (
      bucketName.length < ValidBucketNameMinLen ||
      bucketName.length > ValidBucketNameMaxLen ||
      !ValidBucketNameRegex.test(bucketName)
    ) {
      const logMessage = `[ERR] Invalid bucket name: ${bucketName}`;
      logger.error(logMessage);
      throw new ValidationError(logMessage);
    }

    const notStartsWith: boolean = InvalidBucketNamePrefixes.every(
      (prefix) => !bucketName.startsWith(prefix),
    );
    if (!notStartsWith) {
      const logMessage = `[ERR] Bucket name starts with blacklisted prefix: ${bucketName}`;
      logger.error(logMessage);
      throw new ValidationError(logMessage);
    }

    const notEndsWith: boolean = InvalidBucketNameSuffixes.every(
      (prefix) => !bucketName.endsWith(prefix),
    );
    if (!notEndsWith) {
      const logMessage = `[ERR] Bucket name ends with blacklisted suffix: ${bucketName}`;
      logger.error(logMessage);
      throw new ValidationError(logMessage);
    }

    if (
      keyName.length < ValidKeyNameMinLen ||
      keyName.length > ValidKeyNameMaxLen ||
      !ValidKeyNameRegex.test(keyName)
    ) {
      const logMessage = `[ERR] Invalid key name: ${keyName}`;
      logger.error(logMessage);
      throw new ValidationError(logMessage);
    }

    const command = new DeleteObjectCommand({
      Bucket: bucketName,
      Key: keyName,
    });

    try {
      await s3Client.send(command);
      await waitUntilObjectNotExists(
        {
          client: s3Client,
          maxWaitTime: 30,
        },
        { Bucket: bucketName, Key: keyName },
      );
    } catch (err: unknown) {
      if (err instanceof S3ServiceException) {
        const logMessage = `[ERR] name=${err.name}, message=${err.message}, stackTrace=${err.stack ?? "undefined"}`;
        logger.error(logMessage);

        const storageError = new StorageError(
          err.name === "AccessDenied" ? "Access denied" : err.message,
          {
            cause: err,
          },
        );
        storageError.name = err.name;

        throw storageError;
      }

      const logMessage =
        err instanceof Error
          ? `[ERR] name=${err.name}, message=${err.message}, stackTrace=${err.stack ?? "undefined"}`
          : `[ERR] err=${JSON.stringify(err)}`;
      logger.error(logMessage);

      throw err;
    }
  };

const getObject =
  (logger: Logger) =>
  async (bucketName: string, keyName: string): Promise<string | undefined> => {
    logger.info(`getObject: bucketName=${bucketName}, keyName=${keyName}`);

    if (
      bucketName.length < ValidBucketNameMinLen ||
      bucketName.length > ValidBucketNameMaxLen ||
      !ValidBucketNameRegex.test(bucketName)
    ) {
      const logMessage = `[ERR] Invalid bucket name: ${bucketName}`;
      logger.error(logMessage);
      throw new ValidationError(logMessage);
    }

    const notStartsWith: boolean = InvalidBucketNamePrefixes.every(
      (prefix) => !bucketName.startsWith(prefix),
    );
    if (!notStartsWith) {
      const logMessage = `[ERR] Bucket name starts with blacklisted prefix: ${bucketName}`;
      logger.error(logMessage);
      throw new ValidationError(logMessage);
    }

    const notEndsWith: boolean = InvalidBucketNameSuffixes.every(
      (prefix) => !bucketName.endsWith(prefix),
    );
    if (!notEndsWith) {
      const logMessage = `[ERR] Bucket name ends with blacklisted suffix: ${bucketName}`;
      logger.error(logMessage);
      throw new ValidationError(logMessage);
    }

    if (
      keyName.length < ValidKeyNameMinLen ||
      keyName.length > ValidKeyNameMaxLen ||
      !ValidKeyNameRegex.test(keyName)
    ) {
      const logMessage = `[ERR] Invalid key name: ${keyName}`;
      logger.error(logMessage);
      throw new ValidationError(logMessage);
    }

    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: keyName,
    });

    try {
      const response: GetObjectCommandOutput = await s3Client.send(command);
      const fileContent: string | undefined = response.Body
        ? await response.Body.transformToString()
        : undefined;

      return fileContent;
    } catch (err: unknown) {
      if (err instanceof InvalidObjectState) {
        const logMessage = `[ERR] name=${err.name}, message=${err.message}, stackTrace=${err.stack ?? "undefined"}`;
        logger.error(logMessage);

        const storageError = new StorageError(err.message, {
          cause: err,
        });
        storageError.name = err.name;

        throw storageError;
      }

      if (err instanceof NoSuchKey) {
        const logMessage = `[ERR] name=${err.name}, message=${err.message}, stackTrace=${err.stack ?? "undefined"}`;
        logger.error(logMessage);

        const errMessage = "Resource not found";
        const errName = "ResourceNotFound";
        const storageError = new StorageError(errMessage, {
          cause: err,
        });
        storageError.name = errName;

        throw storageError;
      }

      if (err instanceof S3ServiceException) {
        const logMessage = `[ERR] name=${err.name}, message=${err.message}, stackTrace=${err.stack ?? "undefined"}`;
        logger.error(logMessage);

        const storageError = new StorageError(
          err.name === "AccessDenied" ? "Access denied" : err.message,
          {
            cause: err,
          },
        );
        storageError.name = err.name;

        throw storageError;
      }

      const logMessage =
        err instanceof Error
          ? `[ERR] name=${err.name}, message=${err.message}, stackTrace=${err.stack ?? "undefined"}`
          : `[ERR] err=${JSON.stringify(err)}`;
      logger.error(logMessage);

      throw err;
    }
  };

const multipartUpload =
  (logger: Logger) =>
  async (
    bucketName: string,
    keyName: string,
    base64Content: string,
    contentType?: string,
    allowOverwrite = false,
  ): Promise<void> => {
    logger.info(
      `multipartUpload: bucketName=${bucketName}, keyName=${keyName}, base64Content.length=${base64Content.length.toString()}, contentType=${contentType ?? "undefined"}, allowOverwrite=${allowOverwrite.toString()}`,
    );

    if (
      bucketName.length < ValidBucketNameMinLen ||
      bucketName.length > ValidBucketNameMaxLen ||
      !ValidBucketNameRegex.test(bucketName)
    ) {
      const logMessage = `[ERR] Invalid bucket name: ${bucketName}`;
      logger.error(logMessage);
      throw new ValidationError(logMessage);
    }

    const notStartsWith: boolean = InvalidBucketNamePrefixes.every(
      (prefix) => !bucketName.startsWith(prefix),
    );
    if (!notStartsWith) {
      const logMessage = `[ERR] Bucket name starts with blacklisted prefix: ${bucketName}`;
      logger.error(logMessage);
      throw new ValidationError(logMessage);
    }

    const notEndsWith: boolean = InvalidBucketNameSuffixes.every(
      (prefix) => !bucketName.endsWith(prefix),
    );
    if (!notEndsWith) {
      const logMessage = `[ERR] Bucket name ends with blacklisted suffix: ${bucketName}`;
      logger.error(logMessage);
      throw new ValidationError(logMessage);
    }

    if (
      keyName.length < ValidKeyNameMinLen ||
      keyName.length > ValidKeyNameMaxLen ||
      !ValidKeyNameRegex.test(keyName)
    ) {
      const logMessage = `[ERR] Invalid key name: ${keyName}`;
      logger.error(logMessage);
      throw new ValidationError(logMessage);
    }

    if (base64Content.length < ValidObjectMinLen || base64Content.length > ValidObjectMaxLen) {
      const logMessage = `[ERR] Invalid whitelist content: ${base64Content.length.toString()}`;
      logger.error(logMessage);
      throw new ValidationError(logMessage);
    }

    const options: Options = {
      client: s3Client,
      params: {
        Bucket: bucketName,
        Key: keyName,
        Body: Buffer.from(base64Content, "base64"),
        ContentType: contentType ?? undefined,
        ChecksumAlgorithm: ChecksumAlgorithm.CRC64NVME,
        IfNoneMatch: allowOverwrite ? undefined : "*",
      },
    };

    try {
      const upload = new Upload(options);
      await upload.done();
    } catch (err: unknown) {
      if (err instanceof EncryptionTypeMismatch) {
        const logMessage = `[ERR] name=${err.name}, message=${err.message}, stackTrace=${err.stack ?? "undefined"}`;
        logger.error(logMessage);

        const storageError = new StorageError(err.message, {
          cause: err,
        });
        storageError.name = err.name;

        throw storageError;
      }

      if (err instanceof InvalidRequest) {
        const logMessage = `[ERR] name=${err.name}, message=${err.message}, stackTrace=${err.stack ?? "undefined"}`;
        logger.error(logMessage);

        const storageError = new StorageError(err.message, {
          cause: err,
        });
        storageError.name = err.name;

        throw storageError;
      }

      if (err instanceof InvalidWriteOffset) {
        const logMessage = `[ERR] name=${err.name}, message=${err.message}, stackTrace=${err.stack ?? "undefined"}`;
        logger.error(logMessage);

        const storageError = new StorageError(err.message, {
          cause: err,
        });
        storageError.name = err.name;

        throw storageError;
      }

      if (err instanceof TooManyParts) {
        const logMessage = `[ERR] name=${err.name}, message=${err.message}, stackTrace=${err.stack ?? "undefined"}`;
        logger.error(logMessage);

        const storageError = new StorageError(err.message, {
          cause: err,
        });
        storageError.name = err.name;

        throw storageError;
      }

      if (err instanceof NoSuchUpload) {
        const logMessage = `[ERR] name=${err.name}, message=${err.message}, stackTrace=${err.stack ?? "undefined"}`;
        logger.error(logMessage);

        const storageError = new StorageError(err.message, {
          cause: err,
        });
        storageError.name = err.name;

        throw storageError;
      }

      if (err instanceof S3ServiceException) {
        const logMessage = `[ERR] name=${err.name}, message=${err.message}, stackTrace=${err.stack ?? "undefined"}`;
        logger.error(logMessage);

        const storageError = new StorageError(
          err.name === "AccessDenied"
            ? "Access denied"
            : err.name === "PreconditionFailed"
              ? "Exists"
              : err.message,
          {
            cause: err,
          },
        );
        storageError.name = err.name;

        throw storageError;
      }

      const logMessage =
        err instanceof Error
          ? `[ERR] name=${err.name}, message=${err.message}, stackTrace=${err.stack ?? "undefined"}`
          : `[ERR] err=${JSON.stringify(err)}`;
      logger.error(logMessage);

      throw err;
    }
  };

export const createS3Service = (logger: Logger): IS3Service => {
  return {
    getObject: getObject(logger),
    deleteObject: deleteObject(logger),
    multipartUpload: multipartUpload(logger),
  };
};
