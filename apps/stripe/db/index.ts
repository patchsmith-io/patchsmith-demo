import { defineDatabase, defineRelations } from "patchsmith/db";
import { createFunctions } from "patchsmith/server";
import { customers } from "./schema";

export const database = defineDatabase({ relations: defineRelations({ customers }) });
export const fn = createFunctions({ database });
