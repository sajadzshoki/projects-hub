"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ChecklistItem, Project } from "@/lib/types";
import {
  DEFAULT_STATUS,
  DEFAULT_TYPE,
  MAX_TAGS,
  MAX_UPLOAD_MB,
  PROJECT_TYPES,
  STATUSES,
  TAG_SUGGESTIONS,
} from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Button, buttonClasses } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { PlusIcon, Spinner, StarIcon, UploadIcon, XIcon } from "@/components/icons";
import CoverImage from "@/components/projects/CoverImage";
import ProjectChecklist from "@/components/projects/ProjectChecklist";

interface ProjectFormProps {
  mode: "create" | "edit";
  initial?: Project;
}

/** Shared form for creating and editing a project — same structure, same validation. */
export default function ProjectForm({ mode, initial }: ProjectFormProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [coverImage, setCoverImage] = useState(initial?.coverImage ?? "");
  const [projectUrl, setProjectUrl] = useState(initial?.projectUrl ?? "");
  const [githubUrl, setGithubUrl] = useState(initial?.githubUrl ?? "");
  const [adminPanelUrl, setAdminPanelUrl] = useState(initial?.adminPanelUrl ?? "");
  const [status, setStatus] = useState(initial?.status ?? DEFAULT_STATUS);
  const [projectType, setProjectType] = useState(initial?.projectType ?? DEFAULT_TYPE);
  const [tags, setTags] = useState<string[]>(initial?.tags ?? []);
  const [checklist, setChecklist] = useState<ChecklistItem[]>(initial?.checklist ?? []);
  const [tagInput, setTagInput] = useState("");
  const [favorite, setFavorite] = useState(initial?.favorite ?? false);
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [aiDocumentation, setAiDocumentation] = useState(initial?.aiDocumentation ?? "");

  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");

  const suggestions = useMemo(
    () => TAG_SUGGESTIONS.filter((tag) => !tags.includes(tag)).slice(0, 8),
    [tags]
  );
  const sitePreviewUrl = /^https?:\/\/\S+\.\S+/.test(projectUrl.trim()) ? projectUrl.trim() : "";

  const cancelHref = initial ? `/projects/${initial.id}` : "/projects";

  function addTag(raw: string) {
    const tag = raw.trim().replace(/^#/, "").slice(0, 30);
    if (!tag || tags.includes(tag) || tags.length >= MAX_TAGS) return;
    setTags((previous) => [...previous, tag]);
    setTagInput("");
  }

  function removeTag(tag: string) {
    setTags((previous) => previous.filter((item) => item !== tag));
  }

  function setFieldError(field: string, message: string) {
    setErrors((previous) => ({ ...previous, [field]: message }));
  }

  async function handleFile(file: File) {
    setFieldError("coverImage", "");
    if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
      setFieldError("coverImage", `Image must be smaller than ${MAX_UPLOAD_MB} MB.`);
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/upload", { method: "POST", body: formData });
      const data = (await response.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!response.ok || !data.url) {
        throw new Error(data.error || "Upload failed. Please try again.");
      }
      setCoverImage(data.url);
    } catch (error) {
      setFieldError("coverImage", error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setErrors({});
    setFormError("");

    const payload = {
      title: title.trim(),
      description: description.trim(),
      coverImage: coverImage.trim(),
      projectUrl: projectUrl.trim(),
      githubUrl: githubUrl.trim(),
      adminPanelUrl: adminPanelUrl.trim(),
      status,
      projectType,
      tags,
      checklist: checklist
        .map((item) => ({ ...item, text: item.text.trim() }))
        .filter((item) => item.text.length > 0),
      favorite,
      notes: notes.trim(),
      aiDocumentation: aiDocumentation.trim(),
    };

    try {
      const response = await fetch(
        mode === "create" ? "/api/projects" : `/api/projects/${initial!.id}`,
        {
          method: mode === "create" ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      if (response.ok) {
        router.push(mode === "create" ? "/projects" : `/projects/${initial!.id}`);
        router.refresh();
        return;
      }

      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        fields?: Record<string, string>;
      };
      if (data.fields) setErrors(data.fields);
      setFormError(data.error || "Could not save the project. Please try again.");
    } catch {
      setFormError("Network error — could not reach the server.");
    } finally {
      setSaving(false);
    }
  }

  const sectionHeading =
    "font-mono text-[11px] font-medium uppercase tracking-widest text-muted";

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      {/* ── Basics ─────────────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <h2 className={sectionHeading}>Basics</h2>
        <Field label="Title" required error={errors.title}>
          <Input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="e.g. E-commerce Marketplace"
            maxLength={120}
            required
          />
        </Field>
        <Field label="Description" required error={errors.description}>
          <Textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="A short summary of what this project is."
            rows={3}
            maxLength={2000}
            required
          />
        </Field>
      </section>

      {/* ── Cover ──────────────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <h2 className={sectionHeading}>Cover image</h2>
        <Field
          label="Upload or paste a URL"
          hint={`Cover is read from the project website. This is only a fallback. JPG · PNG · WebP · max ${MAX_UPLOAD_MB} MB`}
          error={errors.coverImage}
        >
          <div className="space-y-2.5">
            {(coverImage || sitePreviewUrl) && (
              <div className="w-full max-w-sm overflow-hidden rounded-lg border border-border">
                <CoverImage
                  src={coverImage || null}
                  siteUrl={sitePreviewUrl || null}
                  alt="Cover preview"
                  title={title || "Preview"}
                  className="aspect-video"
                />
              </div>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className={buttonClasses({ variant: "secondary" })}
              >
                {uploading ? <Spinner className="h-3.5 w-3.5" /> : <UploadIcon className="h-3.5 w-3.5" />}
                {uploading ? "Uploading…" : "Upload image"}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void handleFile(file);
                }}
              />
              <Input
                value={coverImage}
                onChange={(event) => setCoverImage(event.target.value)}
                placeholder="https://example.com/cover.jpg"
                className="min-w-0 flex-1"
              />
              {coverImage && (
                <button
                  type="button"
                  onClick={() => setCoverImage("")}
                  title="Remove image"
                  aria-label="Remove image"
                  className={buttonClasses({ variant: "ghost", size: "icon-sm" })}
                >
                  <XIcon className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        </Field>
      </section>

      {/* ── Links ──────────────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <h2 className={sectionHeading}>Links</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Project URL" error={errors.projectUrl} hint="Optional">
            <Input
              value={projectUrl}
              onChange={(event) => setProjectUrl(event.target.value)}
              placeholder="https://example.com"
              inputMode="url"
            />
          </Field>
          <Field label="GitHub URL" error={errors.githubUrl} hint="Optional">
            <Input
              value={githubUrl}
              onChange={(event) => setGithubUrl(event.target.value)}
              placeholder="https://github.com/org/repo"
              inputMode="url"
            />
          </Field>
          <Field
            label="Admin Panel URL"
            error={errors.adminPanelUrl}
            hint="Optional — e.g. https://example.com/admin"
            className="sm:col-span-2"
          >
            <Input
              value={adminPanelUrl}
              onChange={(event) => setAdminPanelUrl(event.target.value)}
              placeholder="https://example.com/admin"
              inputMode="url"
            />
          </Field>
        </div>
      </section>

      {/* ── Classification ─────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <h2 className={sectionHeading}>Details</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Status">
            <Select value={status} onChange={(event) => setStatus(event.target.value as typeof status)}>
              {STATUSES.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Project type">
            <Select
              value={projectType}
              onChange={(event) => setProjectType(event.target.value as typeof projectType)}
            >
              {PROJECT_TYPES.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Field label="Tags" hint={`${tags.length}/${MAX_TAGS}`}>
          <div className="flex min-h-9 flex-wrap items-center gap-1.5 rounded-md border border-border bg-surface-2 px-2 py-1.5 transition-colors focus-within:border-accent hover:border-border-strong">
            {tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 rounded border border-border bg-surface px-1.5 py-0.5 font-mono text-[11px] text-muted"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  aria-label={`Remove tag ${tag}`}
                  className="text-muted/70 transition-colors hover:text-danger"
                >
                  <XIcon className="h-3 w-3" />
                </button>
              </span>
            ))}
            <input
              value={tagInput}
              onChange={(event) => setTagInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === ",") {
                  event.preventDefault();
                  addTag(tagInput);
                } else if (event.key === "Backspace" && !tagInput && tags.length > 0) {
                  setTags((previous) => previous.slice(0, -1));
                }
              }}
              placeholder={tags.length ? "" : "Type a tag and press Enter"}
              className="min-w-24 flex-1 bg-transparent text-sm text-text outline-none placeholder:text-muted/50"
            />
          </div>
          {suggestions.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {suggestions.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => addTag(tag)}
                  className="rounded border border-border bg-surface px-1.5 py-0.5 font-mono text-[10.5px] text-muted transition-colors hover:border-border-strong hover:text-text"
                >
                  + {tag}
                </button>
              ))}
            </div>
          )}
        </Field>

        <label className="flex w-fit cursor-pointer items-center gap-2.5 text-sm text-muted">
          <input
            type="checkbox"
            checked={favorite}
            onChange={(event) => setFavorite(event.target.checked)}
            className="peer sr-only"
          />
          <span
            className={cn(
              "grid h-5 w-5 place-items-center rounded border transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-accent/60",
              favorite ? "border-amber-400/60 bg-amber-400/10" : "border-border bg-surface-2"
            )}
          >
            <StarIcon
              className={cn("h-3.5 w-3.5", favorite ? "fill-amber-400 text-amber-400" : "text-muted")}
            />
          </span>
          Mark as favorite
        </label>
      </section>

      {/* ── Checklist ──────────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <ProjectChecklist
          persist="draft"
          items={checklist}
          onChange={setChecklist}
          error={
            errors.checklist ??
            Object.entries(errors).find(([key]) => key.startsWith("checklist."))?.[1]
          }
        />
      </section>

      {/* ── Notes ──────────────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <h2 className={sectionHeading}>Notes</h2>
        <Field label="Internal notes" hint="Optional" error={errors.notes}>
          <Textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Reminders, deployment details, TODOs…"
            rows={3}
            maxLength={5000}
          />
        </Field>
      </section>

      {/* ── AI Documentation ───────────────────────────────────────────────── */}
      <section className="space-y-4">
        <h2 className={sectionHeading}>AI documentation</h2>
        <Field
          label="Project context for AI agents"
          hint="Optional · Markdown — copied as-is"
          error={errors.aiDocumentation}
        >
          <Textarea
            value={aiDocumentation}
            onChange={(event) => setAiDocumentation(event.target.value)}
            placeholder={
              "# Instructions for AI agents\n\n- Project rules\n- Coding conventions\n- Architecture notes\n- Commands to run\n"
            }
            rows={10}
            className="font-mono text-xs"
          />
        </Field>
      </section>

      {formError && (
        <p className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-sm text-red-300">
          {formError}
        </p>
      )}

      {/* ── Actions ────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-end gap-2 border-t border-border pt-5">
        <Link href={cancelHref} className={buttonClasses({ variant: "ghost" })}>
          Cancel
        </Link>
        <Button type="submit" variant="primary" disabled={saving || uploading}>
          {saving ? <Spinner className="h-3.5 w-3.5" /> : <PlusIcon className="h-3.5 w-3.5" />}
          {saving ? "Saving…" : mode === "create" ? "Add Project" : "Save Changes"}
        </Button>
      </div>
    </form>
  );
}
