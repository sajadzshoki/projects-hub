import { ObjectId, type Collection, type WithId } from "mongodb";
import {
  CHECKLIST_DEFAULTS_VERSION,
  defaultChecklist,
  mergeDefaultChecklist,
} from "./checklist";
import { getDb } from "./db";
import type { ChecklistItem, Project } from "./types";
import type { ProjectInput } from "./validation";
import type { ProjectStatus, ProjectType } from "./constants";

/** Raw MongoDB document shape. */
export interface ProjectDoc {
  _id: ObjectId;
  title: string;
  description: string;
  coverImage?: string;
  projectUrl?: string;
  githubUrl?: string;
  adminPanelUrl?: string;
  status: ProjectStatus;
  projectType: ProjectType;
  tags: string[];
  checklist?: ChecklistItem[];
  /** Set after the default checklist has been applied. Missing means "not yet". */
  checklistDefaultsVersion?: number;
  favorite: boolean;
  notes?: string;
  aiDocumentation?: string;
  createdAt: Date;
  updatedAt: Date;
}

async function projects(): Promise<Collection<ProjectDoc>> {
  const db = await getDb();
  return db.collection<ProjectDoc>("projects");
}

export function isValidId(id: string): boolean {
  return /^[a-f\d]{24}$/i.test(id);
}

function serialize(doc: WithId<ProjectDoc>): Project {
  return {
    id: doc._id.toHexString(),
    title: doc.title,
    description: doc.description ?? "",
    coverImage: doc.coverImage ?? null,
    projectUrl: doc.projectUrl ?? null,
    githubUrl: doc.githubUrl ?? null,
    adminPanelUrl: doc.adminPanelUrl ?? null,
    status: doc.status,
    projectType: doc.projectType,
    tags: doc.tags ?? [],
    checklist: doc.checklist ?? [],
    favorite: Boolean(doc.favorite),
    notes: doc.notes ?? "",
    aiDocumentation: doc.aiDocumentation ?? "",
    createdAt: (doc.createdAt ?? new Date()).toISOString(),
    updatedAt: (doc.updatedAt ?? new Date()).toISOString(),
  };
}

/** Strip `undefined` values so the Mongo driver never sees them. */
function clean(input: ProjectInput): Omit<ProjectDoc, "_id" | "createdAt" | "updatedAt"> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined) out[key] = value;
  }
  return out as Omit<ProjectDoc, "_id" | "createdAt" | "updatedAt">;
}

/**
 * Adds the default checklist once per project. Later deletes stay deleted,
 * and `updatedAt` is left alone so the dashboard order does not jump.
 */
async function applyDefaultChecklists(docs: WithId<ProjectDoc>[]): Promise<WithId<ProjectDoc>[]> {
  const pending = docs.filter(
    (doc) => (doc.checklistDefaultsVersion ?? 0) < CHECKLIST_DEFAULTS_VERSION
  );
  if (pending.length === 0) return docs;

  const collection = await projects();
  const merged = new Map<string, ChecklistItem[]>();
  await collection.bulkWrite(
    pending.map((doc) => {
      const checklist = mergeDefaultChecklist(doc.checklist);
      merged.set(doc._id.toHexString(), checklist);
      return {
        updateOne: {
          filter: { _id: doc._id },
          update: {
            $set: { checklist, checklistDefaultsVersion: CHECKLIST_DEFAULTS_VERSION },
          },
        },
      };
    })
  );

  return docs.map((doc) => {
    const checklist = merged.get(doc._id.toHexString());
    if (!checklist) return doc;
    return { ...doc, checklist, checklistDefaultsVersion: CHECKLIST_DEFAULTS_VERSION };
  });
}

export async function listProjects(): Promise<Project[]> {
  const docs = await applyDefaultChecklists(
    await (await projects()).find({}).sort({ updatedAt: -1 }).toArray()
  );
  return docs.map(serialize);
}

export async function getProject(id: string): Promise<Project | null> {
  if (!isValidId(id)) return null;
  const doc = await (await projects()).findOne({ _id: new ObjectId(id) });
  if (!doc) return null;
  const [prepared] = await applyDefaultChecklists([doc]);
  return serialize(prepared);
}

export async function createProject(input: ProjectInput): Promise<Project> {
  const now = new Date();
  const checklist = input.checklist.length > 0 ? input.checklist : defaultChecklist();
  const doc: ProjectDoc = {
    ...clean({ ...input, checklist }),
    checklistDefaultsVersion: CHECKLIST_DEFAULTS_VERSION,
    _id: new ObjectId(),
    createdAt: now,
    updatedAt: now,
  };
  await (await projects()).insertOne(doc);
  return serialize(doc);
}

export async function updateProject(id: string, input: ProjectInput): Promise<Project | null> {
  if (!isValidId(id)) return null;
  const collection = await projects();
  const result = await collection.findOneAndUpdate(
    { _id: new ObjectId(id) },
    { $set: { ...clean(input), updatedAt: new Date() } },
    { returnDocument: "after" }
  );
  return result ? serialize(result) : null;
}

export async function deleteProject(id: string): Promise<boolean> {
  if (!isValidId(id)) return false;
  const result = await (await projects()).deleteOne({ _id: new ObjectId(id) });
  return result.deletedCount > 0;
}

/**
 * Replaces a project's checklist without touching `updatedAt`, so ticking items
 * does not reshuffle the "recently updated" sort while you are working the list.
 * Returns the stored list, or null when the project does not exist.
 */
export async function replaceChecklist(
  id: string,
  checklist: ChecklistItem[]
): Promise<ChecklistItem[] | null> {
  if (!isValidId(id)) return null;
  const result = await (
    await projects()
  ).findOneAndUpdate(
    { _id: new ObjectId(id) },
    { $set: { checklist } },
    { returnDocument: "after" }
  );
  return result ? (result.checklist ?? []) : null;
}

/** Toggles favorite, returns the new value (or null when the project does not exist). */
export async function toggleFavorite(id: string): Promise<boolean | null> {
  if (!isValidId(id)) return null;
  const collection = await projects();
  const existing = await collection.findOne({ _id: new ObjectId(id) }, { projection: { favorite: 1 } });
  if (!existing) return null;
  const favorite = !existing.favorite;
  await collection.updateOne({ _id: existing._id }, { $set: { favorite, updatedAt: new Date() } });
  return favorite;
}
