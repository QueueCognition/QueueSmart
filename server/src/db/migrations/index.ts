import type { Migration } from "../migrate";
import * as init from "./001-init";

export const migrations: readonly Migration[] = [init];
