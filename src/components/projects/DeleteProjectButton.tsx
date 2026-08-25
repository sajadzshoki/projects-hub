"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Project } from "@/lib/types";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { IconButton } from "@/components/ui/Button";
import { TrashIcon } from "@/components/icons";

/** Delete action with a confirmation dialog. Used on the project detail page. */
export default function DeleteProjectButton({ project }: { project: Project }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function onConfirm() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/projects/${project.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error();
      setOpen(false);
      router.push("/projects");
      router.refresh();
    } catch {
      setError("Could not delete the project. Please try again.");
      setBusy(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <IconButton title="Delete project" onClick={() => setOpen(true)} className="hover:bg-red-500/10 hover:text-danger">
        <TrashIcon />
      </IconButton>
      <ConfirmDialog
        open={open}
        title="Delete this project?"
        message={error || `“${project.title}” will be permanently removed.`}
        busy={busy}
        onConfirm={onConfirm}
        onCancel={() => setOpen(false)}
      />
    </>
  );
}
