"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  Check,
  CloudUpload,
  Loader2,
  MoreHorizontal,
  Plus,
} from "lucide-react";
import { api } from "@/app/_trpc/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { messages } from "@/messages/pt-br";
import { useBuilder } from "./store";
import { DayBar } from "./day-bar";
import { MealCard } from "./meal-card";
import { TargetsPanel } from "./targets-panel";

const AUTOSAVE_DEBOUNCE_MS = 800;

export function PlanBuilder({ planId }: { planId: string }) {
  const router = useRouter();
  const utils = api.useUtils();
  const planQuery = api.plan.get.useQuery(
    { id: planId },
    { refetchOnWindowFocus: false, staleTime: Infinity },
  );
  const mealTypes = api.catalog.mealTypes.list.useQuery();

  const loaded = useBuilder((state) => state.loaded && state.planId === planId);
  const plan = useBuilder((state) => state.plan);
  const saveState = useBuilder((state) => state.saveState);
  const queueLength = useBuilder((state) => state.queue.length);
  const selectedDayId = useBuilder((state) => state.selectedDayId);
  const mealIds = useBuilder(
    (state) => state.mealOrderByDay[state.selectedDayId ?? ""] ?? [],
  );
  const load = useBuilder((state) => state.load);
  const addMeal = useBuilder((state) => state.addMeal);
  const updatePlanMeta = useBuilder((state) => state.updatePlanMeta);

  // Carrega o grafo no store (uma vez por plano)
  useEffect(() => {
    if (planQuery.data && (!loaded || planQuery.data.plan.id !== planId)) {
      load(planQuery.data);
    }
  }, [planQuery.data, loaded, planId, load]);

  const applyChanges = api.plan.applyChanges.useMutation();
  const flushing = useRef(false);
  const flushRef = useRef<() => Promise<void>>(async () => {});

  // A função de flush lê deps frescas via ref (identidades de mutation/utils
  // mudam a cada render — memoizá-las quebraria o React Compiler).
  useEffect(() => {
    flushRef.current = async () => {
      const state = useBuilder.getState();
      if (flushing.current || state.queue.length === 0 || !state.planId) return;
      flushing.current = true;
      const changes = state.takeQueue();
      state.markSaving();
      try {
        const result = await applyChanges.mutateAsync({
          planId: state.planId,
          version: state.version,
          changes,
        });
        useBuilder.getState().markSaved(result.version);
      } catch (error) {
        const code = (error as { data?: { code?: string } }).data?.code;
        if (code === "CONFLICT") {
          // Lock otimista (§7.2): recarrega a versão autoritativa
          toast.error(messages.plans.conflict);
          const fresh = await utils.plan.get.fetch({ id: planId });
          useBuilder.getState().load(fresh);
          toast.info(messages.plans.builder.conflictReloaded);
        } else {
          useBuilder.getState().restoreQueue(changes);
          toast.error((error as Error).message || messages.errors.internal);
        }
      } finally {
        flushing.current = false;
        if (useBuilder.getState().queue.length > 0) {
          setTimeout(() => void flushRef.current(), AUTOSAVE_DEBOUNCE_MS);
        }
      }
    };
  });

  const flush = () => flushRef.current();

  // Autosave: debounce da fila (outbox)
  useEffect(() => {
    if (queueLength === 0) return;
    const timer = setTimeout(
      () => void flushRef.current(),
      AUTOSAVE_DEBOUNCE_MS,
    );
    return () => clearTimeout(timer);
  }, [queueLength]);

  // Alerta ao sair com alterações pendentes
  useEffect(() => {
    function onBeforeUnload(event: BeforeUnloadEvent) {
      if (useBuilder.getState().queue.length > 0) event.preventDefault();
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  const invalidateAndGo = (path: string) => {
    void utils.plan.invalidate();
    router.push(path);
  };
  const backPath = plan?.patientId ? `/pacientes/${plan.patientId}` : "/planos";

  const activate = api.plan.activate.useMutation({
    onSuccess: (result) => {
      useBuilder.getState().markSaved(result.version);
      void planQuery.refetch().then((fresh) => fresh.data && load(fresh.data));
      toast.success(messages.plans.activated);
    },
    onError: (error) => toast.error(error.message),
  });
  const archive = api.plan.archive.useMutation({
    onSuccess: () => {
      toast.success(messages.plans.archivedMsg);
      invalidateAndGo(backPath);
    },
    onError: (error) => toast.error(error.message),
  });
  const removeDraft = api.plan.removeDraft.useMutation({
    onSuccess: () => {
      toast.success(messages.plans.removed);
      invalidateAndGo(backPath);
    },
    onError: (error) => toast.error(error.message),
  });
  const saveAsTemplate = api.plan.saveAsTemplate.useMutation({
    onSuccess: () => {
      toast.success(messages.plans.savedAsTemplate);
      setTemplateDialog(false);
    },
    onError: (error) => toast.error(error.message),
  });

  const [nameDraft, setNameDraft] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<
    "activate" | "archive" | "delete" | null
  >(null);
  const [templateDialog, setTemplateDialog] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [mealTypeToAdd, setMealTypeToAdd] = useState("");

  if (planQuery.isPending || !loaded || !plan) {
    return (
      <div className="flex justify-center py-16">
        <Loader2
          className="text-muted-foreground size-6 animate-spin"
          aria-hidden
        />
      </div>
    );
  }

  const readOnly = plan.status === "archived";
  const statusLabel = messages.plans.status[plan.status];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Button variant="ghost" size="icon" asChild>
            <Link
              href={backPath}
              aria-label={messages.plans.builder.backToPatient}
            >
              <ArrowLeft className="size-4" aria-hidden />
            </Link>
          </Button>
          <Input
            className="h-9 max-w-md text-base font-semibold"
            value={nameDraft ?? plan.name}
            onChange={(event) => setNameDraft(event.target.value)}
            onBlur={() => {
              if (
                nameDraft &&
                nameDraft.trim().length >= 2 &&
                nameDraft !== plan.name
              ) {
                updatePlanMeta({ name: nameDraft.trim() });
              }
              setNameDraft(null);
            }}
            disabled={readOnly}
            aria-label={messages.plans.nameLabel}
          />
          <Badge variant={plan.status === "active" ? "default" : "secondary"}>
            {plan.isTemplate ? messages.plans.templateBadge : statusLabel}
          </Badge>
          {plan.patientName ? (
            <span className="text-muted-foreground truncate text-sm">
              {plan.patientName}
            </span>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-muted-foreground flex items-center gap-1 text-xs">
            {saveState === "saving" ? (
              <>
                <CloudUpload className="size-3.5 animate-pulse" aria-hidden />
                {messages.plans.builder.saving}
              </>
            ) : saveState === "saved" ? (
              <>
                <Check className="size-3.5" aria-hidden />
                {messages.plans.builder.saved}
              </>
            ) : (
              messages.plans.builder.unsaved
            )}
          </span>
          {!readOnly && !plan.isTemplate && plan.status !== "active" ? (
            <Button size="sm" onClick={() => setConfirm("activate")}>
              {messages.plans.builder.activateButton}
            </Button>
          ) : null}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" aria-label="ações">
                <MoreHorizontal className="size-4" aria-hidden />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <a
                  href={`/imprimir/plano/${planId}`}
                  target="_blank"
                  rel="noopener"
                >
                  {messages.planPrint.printButton}
                </a>
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => {
                  setTemplateName(plan.name);
                  setTemplateDialog(true);
                }}
              >
                {messages.plans.builder.saveAsTemplateButton}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {!readOnly ? (
                <DropdownMenuItem onSelect={() => setConfirm("archive")}>
                  {messages.plans.builder.archiveButton}
                </DropdownMenuItem>
              ) : null}
              {plan.status === "draft" ? (
                <DropdownMenuItem
                  className="text-destructive"
                  onSelect={() => setConfirm("delete")}
                >
                  {messages.plans.builder.deleteDraftButton}
                </DropdownMenuItem>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {readOnly ? (
        <p className="text-muted-foreground rounded-md border border-dashed px-3 py-2 text-sm">
          {messages.plans.archivedReadOnly}
        </p>
      ) : null}

      <DayBar readOnly={readOnly} />

      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          {mealIds.map((mealId) => (
            <MealCard key={mealId} mealId={mealId} readOnly={readOnly} />
          ))}

          {!readOnly && selectedDayId ? (
            <div className="flex items-center gap-2">
              <Select value={mealTypeToAdd} onValueChange={setMealTypeToAdd}>
                <SelectTrigger className="w-56">
                  <SelectValue placeholder={messages.plans.builder.addMeal} />
                </SelectTrigger>
                <SelectContent>
                  {(mealTypes.data ?? []).map((mealType) => (
                    <SelectItem key={mealType.id} value={mealType.id}>
                      {mealType.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                disabled={mealTypeToAdd === ""}
                onClick={() => {
                  const mealType = mealTypes.data?.find(
                    (candidate) => candidate.id === mealTypeToAdd,
                  );
                  if (mealType) {
                    addMeal({
                      id: mealType.id,
                      name: mealType.name,
                      defaultTime: mealType.defaultTime,
                    });
                    setMealTypeToAdd("");
                  }
                }}
              >
                <Plus className="size-4" aria-hidden />
                {messages.plans.builder.addMeal}
              </Button>
            </div>
          ) : null}
        </div>

        <TargetsPanel readOnly={readOnly} />
      </div>

      <AlertDialog
        open={confirm !== null}
        onOpenChange={(open) => !open && setConfirm(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm === "activate"
                ? messages.plans.builder.activateConfirmTitle
                : confirm === "archive"
                  ? messages.plans.builder.archiveConfirmTitle
                  : messages.plans.builder.deleteDraftConfirmTitle}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm === "activate"
                ? messages.plans.builder.activateConfirmBody
                : confirm === "archive"
                  ? messages.plans.builder.archiveConfirmBody
                  : messages.plans.builder.deleteDraftConfirmBody}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{messages.config.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                await flush();
                if (confirm === "activate") activate.mutate({ id: planId });
                if (confirm === "archive") archive.mutate({ id: planId });
                if (confirm === "delete") removeDraft.mutate({ id: planId });
                setConfirm(null);
              }}
            >
              {confirm === "activate"
                ? messages.plans.builder.activateButton
                : confirm === "archive"
                  ? messages.plans.builder.archiveButton
                  : messages.plans.builder.deleteDraftButton}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={templateDialog} onOpenChange={setTemplateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {messages.plans.builder.saveAsTemplateButton}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="template-name">
                {messages.plans.templateNameLabel}
              </Label>
              <Input
                id="template-name"
                value={templateName}
                onChange={(event) => setTemplateName(event.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setTemplateDialog(false)}
              >
                {messages.config.cancel}
              </Button>
              <Button
                disabled={
                  templateName.trim().length < 2 || saveAsTemplate.isPending
                }
                onClick={async () => {
                  await flush();
                  saveAsTemplate.mutate({ planId, name: templateName.trim() });
                }}
              >
                {messages.config.save}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
