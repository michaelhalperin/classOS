import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Drawer from "../ui/Drawer.jsx";
import {
  getLessonNotes,
  createLessonNote,
  deleteLessonNote,
} from "../../api/lessonNotes.js";
import LessonNoteRichEditor from "./LessonNoteRichEditor.jsx";

/**
 * Multiple private notes per lesson (rich text). Query key `['lessonNotes', lessonId]`.
 */
export default function LessonNotesDrawer({
  lessonId,
  open,
  onOpenChange,
  lessonTitle,
}) {
  const qc = useQueryClient();
  const queryKey = ["lessonNotes", lessonId];
  const editorFlushRef = useRef(() => {});

  const bindEditorFlush = useCallback((api) => {
    editorFlushRef.current = api?.flush ?? (() => {});
  }, []);

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () => getLessonNotes(lessonId),
    enabled: Boolean(lessonId),
  });

  const notes = data?.notes ?? [];
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    if (!notes.length) {
      setSelectedId(null);
      return;
    }
    setSelectedId((prev) => {
      if (prev && notes.some((n) => n._id === prev)) return prev;
      return notes[0]._id;
    });
  }, [notes]);

  const createMutation = useMutation({
    mutationFn: () =>
      createLessonNote(lessonId, { title: "New note", content: "" }),
    onSuccess: ({ note }) => {
      qc.setQueryData(queryKey, (old) => ({
        notes: [...(old?.notes ?? []), note],
      }));
      setSelectedId(note._id);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (noteId) => deleteLessonNote(lessonId, noteId),
    onSuccess: (_, noteId) => {
      qc.setQueryData(queryKey, (old) => ({
        notes: (old?.notes ?? []).filter((n) => n._id !== noteId),
      }));
      const remaining = qc.getQueryData(queryKey)?.notes ?? [];
      setSelectedId((prev) => {
        if (!remaining.length) return null;
        if (prev === noteId) return remaining[0]._id;
        return remaining.some((n) => n._id === prev) ? prev : remaining[0]._id;
      });
    },
  });

  const selectNote = (id) => {
    editorFlushRef.current();
    setSelectedId(id);
  };

  const close = () => {
    editorFlushRef.current();
    onOpenChange(false);
  };

  const subtitle = lessonTitle
    ? `Private to you · ${lessonTitle}`
    : "Only you can see these";

  const selected = notes.find((n) => n._id === selectedId);

  return (
    <Drawer
      open={open}
      onClose={close}
      title="My notes"
      subtitle={subtitle}
      tone="default"
      bodyClassName="flex flex-col min-h-0"
    >
      <div className="flex shrink-0 flex-col gap-2 border-b border-gray-100 px-4 py-3">
        <p className="text-xs text-gray-500">
          Add several notes per lesson. Formatting is saved automatically.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex max-h-24 min-w-0 flex-1 flex-wrap gap-1.5 overflow-y-auto">
            {notes.map((n) => (
              <button
                key={n._id}
                type="button"
                onClick={() => selectNote(n._id)}
                className={`max-w-[10rem] truncate rounded-full border px-2.5 py-1 text-left text-xs font-medium transition-colors ${
                  n._id === selectedId
                    ? "border-teal-500 bg-teal-50 text-teal-900"
                    : "border-gray-200 bg-white text-gray-600 hover:border-teal-300 hover:text-teal-900"
                }`}
                title={(n.title || "Untitled").trim() || "Untitled"}
              >
                {(n.title || "Untitled").trim() || "Untitled"}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => {
              editorFlushRef.current();
              createMutation.mutate();
            }}
            disabled={createMutation.isPending || !lessonId}
            className="shrink-0 rounded-full border border-teal-600 bg-teal-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-teal-700 disabled:opacity-50"
          >
            + Add note
          </button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col p-4">
        {isLoading && !data ? (
          <p className="text-sm text-gray-400">Loading…</p>
        ) : !selected ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
            <p className="text-sm text-gray-500">
              No notes yet for this lesson.
            </p>
            <button
              type="button"
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending}
              className="btn-primary text-sm py-2 px-4"
            >
              Create your first note
            </button>
          </div>
        ) : (
          <>
            <div className="mb-3 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  if (
                    window.confirm(
                      "Delete this note permanently? This cannot be undone.",
                    )
                  ) {
                    editorFlushRef.current();
                    deleteMutation.mutate(selected._id);
                  }
                }}
                disabled={deleteMutation.isPending}
                className="text-xs font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
              >
                Delete this note
              </button>
            </div>
            <LessonNoteRichEditor
              key={selected._id}
              ref={bindEditorFlush}
              lessonId={lessonId}
              note={selected}
              queryKey={queryKey}
            />
          </>
        )}
      </div>
    </Drawer>
  );
}
