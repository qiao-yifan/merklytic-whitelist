import { constants } from "http2";
import { Logger } from "@aws-lambda-powertools/logger";
import type {
  Context,
  APIGatewayProxyResultV2,
  APIGatewayProxyEventV2WithJWTAuthorizer,
} from "aws-lambda";
import { parse, ValiError } from "valibot";
import {
  MerkleProofRecord,
  MerkleRootRecord,
  MerkleRootRecords,
  MerkleTreeRecords,
} from "./iWhitelistApplicationService.mts";
import { IWhitelistCommandService } from "./iWhitelistCommandService.mts";
import { IWhitelistQueryService } from "./iWhitelistQueryService.mts";
import {
  RequestCreateMerkleTreeOutput,
  RequestCreateMerkleTreeSchema,
} from "./requestCreateMerkleTreeSchema.mts";
import {
  RequestDeleteMerkleTreeOutput,
  RequestDeleteMerkleTreeSchema,
} from "./requestDeleteMerkleTreeSchema.mts";
import {
  RequestDeleteWhitelistOutput,
  RequestDeleteWhitelistSchema,
} from "./requestDeleteWhitelistSchema.mts";
import {
  RequestGetMerkleProofOutput,
  RequestGetMerkleProofSchema,
} from "./requestGetMerkleProofSchema.mts";
import { RequestGetMerkleProofsOutput } from "./requestGetMerkleProofsSchema.mts";
import {
  RequestGetMerkleRootOutput,
  RequestGetMerkleRootSchema,
} from "./requestGetMerkleRootSchema.mts";
import {
  RequestGetMerkleRootsOutput,
  RequestGetMerkleRootsSchema,
} from "./requestGetMerkleRootsSchema.mts";
import {
  RequestGetMerkleTreesOutput,
  RequestGetMerkleTreesSchema,
} from "./requestGetMerkleTreesSchema.mts";
import {
  RequestUploadWhitelistOutput,
  RequestUploadWhitelistSchema,
} from "./requestUploadWhitelistSchema.mts";
import { NoSqlError } from "./noSqlError.mts";
import { StorageError } from "./storageError.mts";
import { ValidationError } from "./validationError.mts";
import { createWhitelistCommandService } from "./whitelistCommandService.mts";
import { createWhitelistQueryService } from "./whitelistQueryService.mts";

enum ErrorCode {
  AccessDenied = "AccessDenied",
  ResourceNotFound = "ResourceNotFound",
  UnauthorizedAccess = "UnauthorizedAccess",
  ValidationError = "ValidationError",
}

enum RouteKey {
  CreateMerkleTree = "POST /CreateMerkleTree",
  DeleteMerkleTree = "DELETE /MerkleTree",
  DeleteWhitelist = "DELETE /Whitelist",
  GetMerkleProof = "GET /MerkleProof",
  GetMerkleProofs = "GET /MerkleProofs",
  GetMerkleRoot = "GET /MerkleRoot",
  GetMerkleRoots = "GET /MerkleRoots",
  GetMerkleTrees = "GET /MerkleTrees",
  UploadWhitelist = "POST /UploadWhitelist",
}

const JwtClaimsCognitoGroups = "cognito:groups";

const logger = new Logger({ serviceName: "whitelistService" });

const authorizedGroupsCreateMerkleTree = process.env["AUTHORIZED_GROUPS_CREATE_MERKLE_TREE"] ?? "";
const authorizedGroupsDeleteMerkleTree = process.env["AUTHORIZED_GROUPS_DELETE_MERKLE_TREE"] ?? "";
const authorizedGroupsDeleteWhitelist = process.env["AUTHORIZED_GROUPS_DELETE_WHITELIST"] ?? "";
const authorizedGroupsGetMerkleProofs = process.env["AUTHORIZED_GROUPS_GET_MERKLE_PROOFS"] ?? "";
const authorizedGroupsGetMerkleRoot = process.env["AUTHORIZED_GROUPS_GET_MERKLE_ROOT"] ?? "";
const authorizedGroupsGetMerkleRoots = process.env["AUTHORIZED_GROUPS_GET_MERKLE_ROOTS"] ?? "";
const authorizedGroupsUploadWhitelist = process.env["AUTHORIZED_GROUPS_UPLOAD_WHITELIST"] ?? "";

logger.info(`authorizedGroupsCreateMerkleTree: ${authorizedGroupsCreateMerkleTree}`);
logger.info(`authorizedGroupsDeleteMerkleTree: ${authorizedGroupsDeleteMerkleTree}`);
logger.info(`authorizedGroupsDeleteWhitelist: ${authorizedGroupsDeleteWhitelist}`);
logger.info(`authorizedGroupsGetMerkleProofs: ${authorizedGroupsGetMerkleProofs}`);
logger.info(`authorizedGroupsGetMerkleRoot: ${authorizedGroupsGetMerkleRoot}`);
logger.info(`authorizedGroupsGetMerkleRoots: ${authorizedGroupsGetMerkleRoots}`);
logger.info(`authorizedGroupsUploadWhitelist: ${authorizedGroupsUploadWhitelist}`);

const createMerkleTreeAuthorizedGroups: string[] =
  authorizedGroupsCreateMerkleTree.length > 0
    ? authorizedGroupsCreateMerkleTree.split(",").map((element) => element.trim())
    : [];
const noEmptyCreateMerkleTreeAuthorizedGroupName: boolean = createMerkleTreeAuthorizedGroups.every(
  (group, index) => {
    logger.info(`createMerkleTreeAuthorizedGroups[${index.toString()}]: ${group}`);

    return group.length > 0;
  },
);
if (!noEmptyCreateMerkleTreeAuthorizedGroupName) {
  const logMessage = "[ERR] Empty CreateMerkleTree authorized group name";
  logger.error(logMessage);
  throw new ValidationError(logMessage);
}

const deleteMerkleTreeAuthorizedGroups: string[] =
  authorizedGroupsDeleteMerkleTree.length > 0
    ? authorizedGroupsDeleteMerkleTree.split(",").map((element) => element.trim())
    : [];
const noEmptyDeleteMerkleTreeAuthorizedGroupName: boolean = deleteMerkleTreeAuthorizedGroups.every(
  (group, index) => {
    logger.info(`deleteMerkleTreeAuthorizedGroups[${index.toString()}]: ${group}`);

    return group.length > 0;
  },
);
if (!noEmptyDeleteMerkleTreeAuthorizedGroupName) {
  const logMessage = "[ERR] Empty DeleteMerkleTree authorized group name";
  logger.error(logMessage);
  throw new ValidationError(logMessage);
}

const deleteWhitelistAuthorizedGroups: string[] =
  authorizedGroupsDeleteWhitelist.length > 0
    ? authorizedGroupsDeleteWhitelist.split(",").map((element) => element.trim())
    : [];
const noEmptyDeleteWhitelistAuthorizedGroupName: boolean = deleteWhitelistAuthorizedGroups.every(
  (group, index) => {
    logger.info(`deleteWhitelistAuthorizedGroups[${index.toString()}]: ${group}`);

    return group.length > 0;
  },
);
if (!noEmptyDeleteWhitelistAuthorizedGroupName) {
  const logMessage = "[ERR] Empty DeleteWhitelist authorized group name";
  logger.error(logMessage);
  throw new ValidationError(logMessage);
}

const getMerkleProofsAuthorizedGroups: string[] =
  authorizedGroupsGetMerkleProofs.length > 0
    ? authorizedGroupsGetMerkleProofs.split(",").map((element) => element.trim())
    : [];
const noEmptyGetMerkleProofsAuthorizedGroupName: boolean = getMerkleProofsAuthorizedGroups.every(
  (group, index) => {
    logger.info(`getMerkleProofsAuthorizedGroups[${index.toString()}]: ${group}`);

    return group.length > 0;
  },
);
if (!noEmptyGetMerkleProofsAuthorizedGroupName) {
  const logMessage = "[ERR] Empty GetMerkleProofs authorized group name";
  logger.error(logMessage);
  throw new ValidationError(logMessage);
}

const getMerkleRootAuthorizedGroups: string[] =
  authorizedGroupsGetMerkleRoot.length > 0
    ? authorizedGroupsGetMerkleRoot.split(",").map((element) => element.trim())
    : [];
const noEmptyGetMerkleRootAuthorizedGroupName: boolean = getMerkleRootAuthorizedGroups.every(
  (group, index) => {
    logger.info(`getMerkleRootAuthorizedGroups[${index.toString()}]: ${group}`);

    return group.length > 0;
  },
);
if (!noEmptyGetMerkleRootAuthorizedGroupName) {
  const logMessage = "[ERR] Empty GetMerkleRoot authorized group name";
  logger.error(logMessage);
  throw new ValidationError(logMessage);
}

const getMerkleRootsAuthorizedGroups: string[] =
  authorizedGroupsGetMerkleRoots.length > 0
    ? authorizedGroupsGetMerkleRoots.split(",").map((element) => element.trim())
    : [];
const noEmptyGetMerkleRootsAuthorizedGroupName: boolean = getMerkleRootsAuthorizedGroups.every(
  (group, index) => {
    logger.info(`getMerkleRootsAuthorizedGroups[${index.toString()}]: ${group}`);

    return group.length > 0;
  },
);
if (!noEmptyGetMerkleRootsAuthorizedGroupName) {
  const logMessage = "[ERR] Empty GetMerkleRoots authorized group name";
  logger.error(logMessage);
  throw new ValidationError(logMessage);
}

const uploadWhitelistAuthorizedGroups: string[] =
  authorizedGroupsUploadWhitelist.length > 0
    ? authorizedGroupsUploadWhitelist.split(",").map((element) => element.trim())
    : [];
const noEmptyUploadWhitelistAuthorizedGroupName: boolean = uploadWhitelistAuthorizedGroups.every(
  (group, index) => {
    logger.info(`uploadWhitelistAuthorizedGroups[${index.toString()}]: ${group}`);

    return group.length > 0;
  },
);
if (!noEmptyUploadWhitelistAuthorizedGroupName) {
  const logMessage = "[ERR] Empty UploadWhitelist authorized group name";
  logger.error(logMessage);
  throw new ValidationError(logMessage);
}

const AuthorizedGroups = {
  [RouteKey.CreateMerkleTree]: createMerkleTreeAuthorizedGroups,
  [RouteKey.DeleteMerkleTree]: deleteMerkleTreeAuthorizedGroups,
  [RouteKey.DeleteWhitelist]: deleteWhitelistAuthorizedGroups,
  [RouteKey.GetMerkleProof]: [],
  [RouteKey.GetMerkleProofs]: getMerkleProofsAuthorizedGroups,
  [RouteKey.GetMerkleRoot]: getMerkleRootAuthorizedGroups,
  [RouteKey.GetMerkleRoots]: getMerkleRootsAuthorizedGroups,
  [RouteKey.GetMerkleTrees]: [],
  [RouteKey.UploadWhitelist]: uploadWhitelistAuthorizedGroups,
};

logger.info(`AuthorizedGroups: ${JSON.stringify(AuthorizedGroups)}`);

function isUserAuthorized(authorizedGroups: string[], groupMemberships: string[]) {
  if (authorizedGroups.length === 0) {
    return true;
  }

  if (groupMemberships.length === 0) {
    return false;
  }

  const isAuthorized: boolean = authorizedGroups.some((element) =>
    groupMemberships.includes(element),
  );
  return isAuthorized;
}

function responseError(statusCode: number, errorCode: string, errorMessage: string) {
  return {
    statusCode: statusCode,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      success: false,
      errorCode: errorCode,
      errorMessage: errorMessage,
    }),
  };
}

function responseOk(data?: unknown) {
  return {
    statusCode: constants.HTTP_STATUS_OK,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      success: true,
      data: data,
    }),
  };
}

export const lambdaHandler = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer,
  context: Context,
): Promise<APIGatewayProxyResultV2> => {
  logger.info("Event", JSON.stringify(event, null, 2));
  logger.info("Context", JSON.stringify(context, null, 2));

  const routeKey: RouteKey = event.routeKey as RouteKey;
  switch (routeKey) {
    case RouteKey.CreateMerkleTree:
    case RouteKey.DeleteMerkleTree:
    case RouteKey.DeleteWhitelist:
    case RouteKey.GetMerkleProof:
    case RouteKey.GetMerkleProofs:
    case RouteKey.GetMerkleRoot:
    case RouteKey.GetMerkleRoots:
    case RouteKey.GetMerkleTrees:
    case RouteKey.UploadWhitelist:
      break;
    default: {
      const logMessage = `[ERR] Invalid route key: ${event.routeKey}`;
      logger.error(logMessage);

      return responseError(constants.HTTP_STATUS_OK, ErrorCode.ValidationError, logMessage);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  const cognitoGroups: string[] = event.requestContext.authorizer
    ? (event.requestContext.authorizer.jwt.claims[JwtClaimsCognitoGroups] as string[])
    : [];
  const isAuthorized: boolean = isUserAuthorized(AuthorizedGroups[routeKey], cognitoGroups);
  if (!isAuthorized) {
    const logMessage = `[ERR] Unauthorized access of ${routeKey}: ${cognitoGroups.join(", ")}`;
    logger.error(logMessage);

    return responseError(constants.HTTP_STATUS_FORBIDDEN, ErrorCode.UnauthorizedAccess, logMessage);
  }

  const eventQueryStringParameters: unknown = event.queryStringParameters ?? {};
  const eventBody: unknown = JSON.parse(event.body ?? "{}");

  switch (routeKey) {
    case RouteKey.CreateMerkleTree: {
      try {
        const inputDto: RequestCreateMerkleTreeOutput = parse(
          RequestCreateMerkleTreeSchema,
          eventBody,
        );

        const whitelistCommandService: IWhitelistCommandService =
          createWhitelistCommandService(logger);
        await whitelistCommandService.createMerkleTree(inputDto.whitelistName);

        return responseOk();
      } catch (err: unknown) {
        if (err instanceof ValiError) {
          return responseError(constants.HTTP_STATUS_OK, ErrorCode.ValidationError, err.message);
        }

        if (err instanceof ValidationError) {
          return responseError(constants.HTTP_STATUS_OK, ErrorCode.ValidationError, err.message);
        }

        if (err instanceof StorageError) {
          return responseError(constants.HTTP_STATUS_OK, err.name, err.message);
        }

        if (err instanceof NoSqlError) {
          return responseError(constants.HTTP_STATUS_OK, err.name, err.message);
        }

        throw err;
      }
    }
    case RouteKey.DeleteMerkleTree: {
      try {
        const inputDto: RequestDeleteMerkleTreeOutput = parse(
          RequestDeleteMerkleTreeSchema,
          eventBody,
        );

        const whitelistCommandService: IWhitelistCommandService =
          createWhitelistCommandService(logger);
        await whitelistCommandService.deleteMerkleTree(inputDto.whitelistName);

        return responseOk();
      } catch (err: unknown) {
        if (err instanceof ValiError) {
          return responseError(constants.HTTP_STATUS_OK, ErrorCode.ValidationError, err.message);
        }

        if (err instanceof ValidationError) {
          return responseError(constants.HTTP_STATUS_OK, ErrorCode.ValidationError, err.message);
        }

        if (err instanceof StorageError) {
          return responseError(constants.HTTP_STATUS_OK, err.name, err.message);
        }

        if (err instanceof NoSqlError) {
          return responseError(constants.HTTP_STATUS_OK, err.name, err.message);
        }

        throw err;
      }
    }
    case RouteKey.DeleteWhitelist: {
      try {
        const inputDto: RequestDeleteWhitelistOutput = parse(
          RequestDeleteWhitelistSchema,
          eventBody,
        );

        const whitelistCommandService: IWhitelistCommandService =
          createWhitelistCommandService(logger);
        await whitelistCommandService.deleteWhitelist(inputDto.whitelistName);

        return responseOk();
      } catch (err: unknown) {
        if (err instanceof ValiError) {
          return responseError(constants.HTTP_STATUS_OK, ErrorCode.ValidationError, err.message);
        }

        if (err instanceof ValidationError) {
          return responseError(constants.HTTP_STATUS_OK, ErrorCode.ValidationError, err.message);
        }

        if (err instanceof StorageError) {
          return responseError(constants.HTTP_STATUS_OK, err.name, err.message);
        }

        throw err;
      }
    }
    case RouteKey.GetMerkleProof: {
      try {
        const inputDto: RequestGetMerkleProofOutput = parse(
          RequestGetMerkleProofSchema,
          eventQueryStringParameters,
        );

        const whitelistQueryService: IWhitelistQueryService = createWhitelistQueryService(logger);
        const merkleProofRecord: MerkleProofRecord | undefined =
          await whitelistQueryService.getMerkleProof(
            inputDto.whitelistName,
            inputDto.whitelistAddress,
          );

        const logMessage = `[ERR] Merkle proof not found for address ${inputDto.whitelistAddress} in whitelist ${inputDto.whitelistName}`;
        if (!merkleProofRecord) {
          logger.info(logMessage);
        }

        return merkleProofRecord
          ? responseOk(merkleProofRecord)
          : responseError(constants.HTTP_STATUS_OK, ErrorCode.ResourceNotFound, logMessage);
      } catch (err: unknown) {
        if (err instanceof ValiError) {
          return responseError(constants.HTTP_STATUS_OK, ErrorCode.ValidationError, err.message);
        }

        if (err instanceof ValidationError) {
          return responseError(constants.HTTP_STATUS_OK, ErrorCode.ValidationError, err.message);
        }

        if (err instanceof StorageError) {
          return responseError(constants.HTTP_STATUS_OK, err.name, err.message);
        }

        if (err instanceof NoSqlError) {
          return responseError(constants.HTTP_STATUS_OK, err.name, err.message);
        }

        throw err;
      }
    }
    case RouteKey.GetMerkleProofs: {
      try {
        const inputDto: RequestGetMerkleProofsOutput = parse(
          RequestGetMerkleRootSchema,
          eventQueryStringParameters,
        );

        const whitelistQueryService: IWhitelistQueryService = createWhitelistQueryService(logger);
        const merkleProofRecords: MerkleProofRecord[] = await whitelistQueryService.getMerkleProofs(
          inputDto.whitelistName,
        );

        return responseOk(merkleProofRecords);
      } catch (err: unknown) {
        if (err instanceof ValiError) {
          return responseError(constants.HTTP_STATUS_OK, ErrorCode.ValidationError, err.message);
        }

        if (err instanceof ValidationError) {
          return responseError(constants.HTTP_STATUS_OK, ErrorCode.ValidationError, err.message);
        }

        if (err instanceof StorageError) {
          return responseError(constants.HTTP_STATUS_OK, err.name, err.message);
        }

        if (err instanceof NoSqlError) {
          return responseError(constants.HTTP_STATUS_OK, err.name, err.message);
        }

        throw err;
      }
    }
    case RouteKey.GetMerkleRoot: {
      try {
        const inputDto: RequestGetMerkleRootOutput = parse(
          RequestGetMerkleRootSchema,
          eventQueryStringParameters,
        );

        const whitelistQueryService: IWhitelistQueryService = createWhitelistQueryService(logger);
        const merkleRootRecord: MerkleRootRecord | undefined =
          await whitelistQueryService.getMerkleRoot(inputDto.whitelistName);

        const logMessage = `[ERR] Merkle root not found for whitelist ${inputDto.whitelistName}`;
        if (!merkleRootRecord) {
          logger.info(logMessage);
        }

        return merkleRootRecord
          ? responseOk(merkleRootRecord)
          : responseError(constants.HTTP_STATUS_OK, ErrorCode.ResourceNotFound, logMessage);
      } catch (err: unknown) {
        if (err instanceof ValiError) {
          return responseError(constants.HTTP_STATUS_OK, ErrorCode.ValidationError, err.message);
        }

        if (err instanceof ValidationError) {
          return responseError(constants.HTTP_STATUS_OK, ErrorCode.ValidationError, err.message);
        }

        if (err instanceof StorageError) {
          return responseError(constants.HTTP_STATUS_OK, err.name, err.message);
        }

        if (err instanceof NoSqlError) {
          return responseError(constants.HTTP_STATUS_OK, err.name, err.message);
        }

        throw err;
      }
    }
    case RouteKey.GetMerkleRoots: {
      try {
        const inputDto: RequestGetMerkleRootsOutput = parse(
          RequestGetMerkleRootsSchema,
          eventQueryStringParameters,
        );

        const whitelistQueryService: IWhitelistQueryService = createWhitelistQueryService(logger);
        const merkleRootRecords: MerkleRootRecords = await whitelistQueryService.getMerkleRoots(
          inputDto.pageSize,
          inputDto.startingToken,
        );

        return responseOk(merkleRootRecords);
      } catch (err: unknown) {
        if (err instanceof ValiError) {
          return responseError(constants.HTTP_STATUS_OK, ErrorCode.ValidationError, err.message);
        }

        if (err instanceof ValidationError) {
          return responseError(constants.HTTP_STATUS_OK, ErrorCode.ValidationError, err.message);
        }

        if (err instanceof StorageError) {
          return responseError(constants.HTTP_STATUS_OK, err.name, err.message);
        }

        if (err instanceof NoSqlError) {
          return responseError(constants.HTTP_STATUS_OK, err.name, err.message);
        }

        throw err;
      }
    }
    case RouteKey.GetMerkleTrees: {
      try {
        const inputDto: RequestGetMerkleTreesOutput = parse(
          RequestGetMerkleTreesSchema,
          eventQueryStringParameters,
        );

        const whitelistQueryService: IWhitelistQueryService = createWhitelistQueryService(logger);
        const merkleTreeRecords: MerkleTreeRecords = await whitelistQueryService.getMerkleTrees(
          inputDto.pageSize,
          inputDto.startingToken,
        );

        return responseOk(merkleTreeRecords);
      } catch (err: unknown) {
        if (err instanceof ValiError) {
          return responseError(constants.HTTP_STATUS_OK, ErrorCode.ValidationError, err.message);
        }

        if (err instanceof ValidationError) {
          return responseError(constants.HTTP_STATUS_OK, ErrorCode.ValidationError, err.message);
        }

        if (err instanceof StorageError) {
          return responseError(constants.HTTP_STATUS_OK, err.name, err.message);
        }

        if (err instanceof NoSqlError) {
          return responseError(constants.HTTP_STATUS_OK, err.name, err.message);
        }

        throw err;
      }
    }
    case RouteKey.UploadWhitelist: {
      try {
        const inputDto: RequestUploadWhitelistOutput = parse(
          RequestUploadWhitelistSchema,
          eventBody,
        );

        const whitelistCommandService: IWhitelistCommandService =
          createWhitelistCommandService(logger);
        await whitelistCommandService.uploadWhitelist(
          inputDto.whitelistName,
          inputDto.whitelistBase64Content,
        );

        return responseOk();
      } catch (err: unknown) {
        if (err instanceof ValiError) {
          return responseError(constants.HTTP_STATUS_OK, ErrorCode.ValidationError, err.message);
        }

        if (err instanceof ValidationError) {
          return responseError(constants.HTTP_STATUS_OK, ErrorCode.ValidationError, err.message);
        }

        if (err instanceof StorageError) {
          return responseError(constants.HTTP_STATUS_OK, err.name, err.message);
        }

        throw err;
      }
    }
    default: {
      const logMessage = `[ERR] Invalid route key: ${event.routeKey}`;
      logger.error(logMessage);

      return responseError(constants.HTTP_STATUS_OK, ErrorCode.ValidationError, logMessage);
    }
  }
};
