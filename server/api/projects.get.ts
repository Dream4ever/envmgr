import { readProjectsFile } from "../utils/storage";

export default defineEventHandler(async () => {
  const data = await readProjectsFile();
  return data;
});
