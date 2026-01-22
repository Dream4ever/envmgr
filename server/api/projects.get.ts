import { readProjectsFile } from "~/server/utils/storage";

export default defineEventHandler(async () => {
  const data = await readProjectsFile();
  return data;
});
