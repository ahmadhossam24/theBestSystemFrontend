// The one shared org service for the browser (IndexedDB-backed). Screens import getOrgService().
import { createIdbRepo } from "./idbRepo.js";
import { createOrgService } from "./orgService.js";

let svc = null;
export const getOrgService = (opts) => (svc ||= createOrgService(createIdbRepo(), opts));
