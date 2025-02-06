export const InvalidBucketNamePrefixes = [
  "xn--",
  "sthree-",
  "sthree-configurator",
  "amzn-s3-demo-",
];
export const InvalidBucketNameSuffixes = ["-s3alias", "--ol-s3", ".mrap", "--x-s3"];

export const ValidBucketNameMaxLen = 63;
export const ValidBucketNameMinLen = 3;
export const ValidBucketNameRegex = /^[0-9a-z][0-9a-z-]{1,61}[0-9a-z]$/;

export const ValidKeyNameMaxLen = 1024;
export const ValidKeyNameMinLen = 1;
export const ValidKeyNameRegex = /^[0-9A-Za-z!\-_.'()]+$/;

export const ValidObjectMaxLen = 5368709120;
export const ValidObjectMinLen = 1;

export interface IS3Service {
  deleteObject(bucketName: string, keyName: string): Promise<void>;

  getObject(bucketName: string, keyName: string): Promise<string | undefined>;

  multipartUpload(
    bucketName: string,
    keyName: string,
    base64Content: string,
    contentType?: string,
    allowOverwrite?: boolean,
  ): Promise<void>;
}
