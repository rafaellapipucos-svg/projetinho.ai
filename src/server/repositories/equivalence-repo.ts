import "server-only";
import type { Db } from "@/server/db";

export interface EquivalenceItemData {
  foodId: string;
  quantity: number;
  measurementUnitId: string | null;
  foodMeasureId: string | null;
  resolvedGrams: number;
  sortOrder: number;
}

export const equivalenceRepo = {
  list(db: Db, organizationId: string) {
    return db.equivalenceGroup.findMany({
      where: { isActive: true, organizationId },
      orderBy: { name: "asc" },
      include: {
        items: {
          orderBy: { sortOrder: "asc" },
          include: {
            food: { select: { name: true } },
            measurementUnit: { select: { abbreviation: true } },
          },
        },
      },
    });
  },

  findForOrg(db: Db, organizationId: string, id: string) {
    return db.equivalenceGroup.findFirst({ where: { id, organizationId } });
  },

  create(
    db: Db,
    organizationId: string,
    name: string,
    items: EquivalenceItemData[],
  ) {
    return db.equivalenceGroup.create({
      data: { organizationId, name, items: { create: items } },
    });
  },

  async replace(
    db: Db,
    id: string,
    name: string,
    items: EquivalenceItemData[],
  ) {
    await db.equivalenceItem.deleteMany({ where: { equivalenceGroupId: id } });
    return db.equivalenceGroup.update({
      where: { id },
      data: { name, items: { create: items } },
    });
  },

  deactivate(db: Db, organizationId: string, id: string) {
    return db.equivalenceGroup.updateMany({
      where: { id, organizationId },
      data: { isActive: false },
    });
  },
};
