"use client";

import { Loader2 } from "lucide-react";
import { api } from "@/app/_trpc/client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { messages } from "@/messages/pt-br";

function Loading() {
  return (
    <Loader2
      className="text-muted-foreground size-5 animate-spin"
      aria-hidden
    />
  );
}

export function SystemTab() {
  const nutrients = api.catalog.system.nutrients.useQuery();
  const units = api.catalog.system.measurementUnits.useQuery();
  const methods = api.catalog.system.calculationMethods.useQuery();
  const measurements = api.catalog.system.measurementTypes.useQuery();

  const nutrientsByGroup = new Map<
    string,
    NonNullable<typeof nutrients.data>
  >();
  for (const nutrient of nutrients.data ?? []) {
    const group = nutrient.nutrientGroup.name;
    nutrientsByGroup.set(group, [
      ...(nutrientsByGroup.get(group) ?? []),
      nutrient,
    ]);
  }

  const methodsByKind = new Map<string, NonNullable<typeof methods.data>>();
  for (const method of methods.data ?? []) {
    methodsByKind.set(method.kind, [
      ...(methodsByKind.get(method.kind) ?? []),
      method,
    ]);
  }

  const measurementsByGroup = new Map<
    string,
    NonNullable<typeof measurements.data>
  >();
  for (const measurement of measurements.data ?? []) {
    measurementsByGroup.set(measurement.group, [
      ...(measurementsByGroup.get(measurement.group) ?? []),
      measurement,
    ]);
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>{messages.config.system.nutrientsTitle}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {nutrients.isPending ? (
            <Loading />
          ) : (
            [...nutrientsByGroup.entries()].map(([group, items]) => (
              <div key={group}>
                <p className="text-muted-foreground mb-1 text-sm font-medium">
                  {group}
                </p>
                <ul className="space-y-0.5 text-sm">
                  {items.map((nutrient) => (
                    <li key={nutrient.id} className="flex items-center gap-2">
                      <span>{nutrient.name}</span>
                      <span className="text-muted-foreground">
                        ({nutrient.unit})
                      </span>
                      {nutrient.isCore ? (
                        <Badge variant="outline">
                          {messages.config.system.coreBadge}
                        </Badge>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>{messages.config.system.unitsTitle}</CardTitle>
          </CardHeader>
          <CardContent>
            {units.isPending ? (
              <Loading />
            ) : (
              <ul className="space-y-0.5 text-sm">
                {(units.data ?? []).map((unit) => (
                  <li key={unit.id}>
                    {unit.name} ({unit.abbreviation})
                    {unit.gramsPerUnit !== null ? (
                      <span className="text-muted-foreground">
                        {" "}
                        — {unit.gramsPerUnit} g/ml
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{messages.config.system.methodsTitle}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {methods.isPending ? (
              <Loading />
            ) : (
              [...methodsByKind.entries()].map(([kind, items]) => (
                <div key={kind}>
                  <p className="text-muted-foreground mb-1 text-sm font-medium">
                    {messages.config.system.kinds[
                      kind as keyof typeof messages.config.system.kinds
                    ] ?? kind}
                  </p>
                  <ul className="space-y-0.5 text-sm">
                    {items.map((method) => (
                      <li key={method.id}>
                        {method.name}
                        {method.description ? (
                          <span className="text-muted-foreground">
                            {" "}
                            — {method.description}
                          </span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{messages.config.system.measurementsTitle}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {measurements.isPending ? (
              <Loading />
            ) : (
              [...measurementsByGroup.entries()].map(([group, items]) => (
                <div key={group}>
                  <p className="text-muted-foreground mb-1 text-sm font-medium">
                    {messages.config.system.groups[
                      group as keyof typeof messages.config.system.groups
                    ] ?? group}
                  </p>
                  <ul className="space-y-0.5 text-sm">
                    {items.map((measurement) => (
                      <li key={measurement.id}>
                        {measurement.name}{" "}
                        <span className="text-muted-foreground">
                          ({measurement.unit})
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
