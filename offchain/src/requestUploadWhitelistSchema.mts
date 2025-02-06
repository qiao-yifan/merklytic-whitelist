import * as v from "valibot";
import {
  ValidWhitelistBase64ContentMaxLen,
  ValidWhitelistBase64ContentMinLen,
  ValidWhitelistNameMaxLen,
  ValidWhitelistNameMinLen,
  ValidWhitelistNameRegex,
} from "./iWhitelistApplicationService.mts";

export const RequestUploadWhitelistSchema = v.object({
  whitelistName: v.pipe(
    v.string("Whitelist name must be a string"),
    v.nonEmpty("Please provide whitelist name"),
    v.minLength(
      ValidWhitelistNameMinLen,
      `Whitelist name must be at least ${ValidWhitelistNameMinLen.toString()} characters long`,
    ),
    v.maxLength(
      ValidWhitelistNameMaxLen,
      `Whitelist name must not exceed ${ValidWhitelistNameMaxLen.toString()} characters`,
    ),
    v.regex(ValidWhitelistNameRegex, "Whitelist name is badly formatted"),
  ),
  whitelistBase64Content: v.pipe(
    v.string("Whitelist base64 content must be a string"),
    v.nonEmpty("Please provide whitelist base64 content"),
    v.minLength(
      ValidWhitelistBase64ContentMinLen,
      `Whitelist base64 content must be at least ${ValidWhitelistBase64ContentMinLen.toString()} characters long`,
    ),
    v.maxLength(
      ValidWhitelistBase64ContentMaxLen,
      `Whitelist base64 content must not exceed ${ValidWhitelistBase64ContentMaxLen.toString()} characters`,
    ),
    v.base64("Whitelist base64 content is badly encoded"),
  ),
});

export type RequestUploadWhitelistOutput = v.InferOutput<typeof RequestUploadWhitelistSchema>;
