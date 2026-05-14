import { generateReactHelpers } from "@uploadthing/react";
import type { OurFileRouter } from "./uploadRouter";

export const { useUploadThing, uploadFiles } =
  generateReactHelpers<OurFileRouter>();
