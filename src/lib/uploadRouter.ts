import { createUploadthing, type FileRouter } from "uploadthing/express";

const f = createUploadthing();

export const uploadRouter = {
  imageUploader: f({ image: { maxFileSize: "4MB" } })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("Upload complete:", file.url);
    }),
  fileUploader: f({ 
    "blob": { maxFileSize: "16MB" }, 
    "pdf": { maxFileSize: "8MB" }, 
    "image": { maxFileSize: "8MB" } 
  }).onUploadComplete(async ({ metadata, file }) => {
      console.log("Upload complete:", file.url);
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof uploadRouter;
