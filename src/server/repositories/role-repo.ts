import "server-only";
import type { Db } from "@/server/db";

export const roleRepo = {
  findByKey(db: Db, key: string) {
    return db.role.findUnique({ where: { key } });
  },
};
