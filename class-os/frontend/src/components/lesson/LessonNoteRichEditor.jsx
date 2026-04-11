import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { updateLessonNote } from "../../api/lessonNotes.js";

function MenuBar({ editor }) {
  if (!editor) {
    return <div className="h-9 border-b border-gray-200 bg-gray-50 sm:h-10" />;
  }

  /** Keep selection: prevent toolbar from taking focus on mousedown; run command on click (mouse + keyboard). */
  const btn = (label, active, run, title) => (
    <button
      key={label}
      type="button"
      title={title}
      onMouseDown={(e) => e.preventDefault()}
      onClick={(e) => {
        e.preventDefault();
        run();
      }}
      className={`rounded-md px-2 py-1 text-xs font-medium transition-colors ${
        active ? "bg-gray-200 text-gray-900" : "text-gray-600 hover:bg-gray-100"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div
      className="flex flex-wrap items-center gap-0.5 border-b border-gray-200 bg-gray-50 px-2 py-1.5"
      role="toolbar"
      aria-label="Formatting"
    >
      {btn(
        "Bold",
        editor.isActive("bold"),
        () => {
          editor.chain().focus().toggleBold().run();
        },
        "Bold",
      )}
      {btn(
        "Italic",
        editor.isActive("italic"),
        () => {
          editor.chain().focus().toggleItalic().run();
        },
        "Italic",
      )}
      {btn(
        "Strike",
        editor.isActive("strike"),
        () => {
          editor.chain().focus().toggleStrike().run();
        },
        "Strikethrough",
      )}
      {btn(
        "H2",
        editor.isActive("heading", { level: 2 }),
        () => {
          editor.chain().focus().toggleHeading({ level: 2 }).run();
        },
        "Heading 2",
      )}
      {btn(
        "H3",
        editor.isActive("heading", { level: 3 }),
        () => {
          editor.chain().focus().toggleHeading({ level: 3 }).run();
        },
        "Heading 3",
      )}
      {btn(
        "\u2022 List",
        editor.isActive("bulletList"),
        () => {
          editor.chain().focus().toggleBulletList().run();
        },
        "Bullet list",
      )}
      {btn(
        "1. List",
        editor.isActive("orderedList"),
        () => {
          editor.chain().focus().toggleOrderedList().run();
        },
        "Numbered list",
      )}
      {btn(
        "Quote",
        editor.isActive("blockquote"),
        () => {
          editor.chain().focus().toggleBlockquote().run();
        },
        "Quote",
      )}
      {btn(
        "Undo",
        false,
        () => {
          editor.chain().focus().undo().run();
        },
        "Undo",
      )}
      {btn(
        "Redo",
        false,
        () => {
          editor.chain().focus().redo().run();
        },
        "Redo",
      )}
    </div>
  );
}

const LessonNoteRichEditor = forwardRef(function LessonNoteRichEditor(
  { lessonId, note, queryKey },
  ref,
) {
  const qc = useQueryClient();
  const [title, setTitle] = useState(note.title || "");
  const titleRef = useRef(note.title || "");
  const lastSaved = useRef({
    title: note.title || "",
    html: note.content || "",
  });
  const scheduleRef = useRef(null);
  const editorRefInternal = useRef(null);

  useEffect(() => {
    const t = note.title || "";
    const h = note.content || "";
    titleRef.current = t;
    setTitle(t);
    lastSaved.current = { title: t, html: h };
  }, [note._id, note.title, note.content]);

  const saveMutation = useMutation({
    mutationFn: (payload) => updateLessonNote(lessonId, note._id, payload),
    onSuccess: ({ note: n }) => {
      lastSaved.current = {
        title: n.title || "",
        html: n.content || "",
      };
      qc.setQueryData(queryKey, (old) => ({
        notes: (old?.notes ?? []).map((x) => (x._id === n._id ? n : x)),
      }));
    },
  });

  const runSave = useCallback(
    (nextTitle, html) => {
      const t = nextTitle.slice(0, 200);
      if (t === lastSaved.current.title && html === lastSaved.current.html)
        return;
      saveMutation.mutate({ title: t, content: html });
    },
    [saveMutation],
  );

  const scheduleSave = useCallback(
    (nextTitle, html) => {
      clearTimeout(scheduleRef.current);
      scheduleRef.current = setTimeout(() => runSave(nextTitle, html), 650);
    },
    [runSave],
  );

  const flush = useCallback(() => {
    clearTimeout(scheduleRef.current);
    if (!editorRefInternal.current) return;
    runSave(titleRef.current, editorRefInternal.current.getHTML());
  }, [runSave]);

  const editor = useEditor(
    {
      extensions: [
        StarterKit.configure({
          heading: { levels: [2, 3] },
          link: false,
        }),
        Placeholder.configure({
          placeholder:
            "Type your note… Use the toolbar for bold, headings, and lists.",
        }),
      ],
      content: note.content || "",
      shouldRerenderOnTransaction: true,
      editable: true,
      autofocus: "end",
      editorProps: {
        attributes: {
          class:
            "tiptap prose prose-sm max-w-none min-h-[200px] px-2 py-2 text-gray-800 focus:outline-none",
        },
      },
      onUpdate: ({ editor: ed }) => {
        scheduleSave(titleRef.current, ed.getHTML());
      },
    },
    [note._id],
  );

  useEffect(() => {
    editorRefInternal.current = editor;
  }, [editor]);

  useImperativeHandle(ref, () => ({ flush }), [flush]);

  useEffect(() => {
    return () => clearTimeout(scheduleRef.current);
  }, []);

  return (
    <div className="flex min-h-0 flex-1 flex-col rounded-lg border border-gray-200 bg-white overflow-hidden">
      <label htmlFor={`note-title-${note._id}`} className="sr-only">
        Note title
      </label>
      <input
        id={`note-title-${note._id}`}
        type="text"
        value={title}
        placeholder="Note title"
        maxLength={200}
        className="shrink-0 border-b border-gray-100 px-3 py-2 text-sm font-semibold text-gray-900 placeholder:text-gray-400 focus:border-brand-200 focus:outline-none focus:ring-2 focus:ring-brand-100"
        onChange={(e) => {
          const v = e.target.value;
          setTitle(v);
          titleRef.current = v;
          if (editor) scheduleSave(v, editor.getHTML());
        }}
        onBlur={flush}
      />
      <MenuBar editor={editor} />
      <div className="lesson-note-editor min-h-0 flex-1 overflow-y-auto bg-white">
        <EditorContent editor={editor} className="min-h-[220px]" />
      </div>
      <div className="flex items-center justify-between border-t border-gray-100 px-3 py-1.5 text-[11px] text-gray-400">
        <span>
          {saveMutation.isPending
            ? "Saving…"
            : saveMutation.isError
              ? "Save failed — check connection"
              : "Saved automatically"}
        </span>
        {(saveMutation.data?.note?.updatedAt || note.updatedAt) && (
          <span>
            {new Date(
              saveMutation.data?.note?.updatedAt || note.updatedAt,
            ).toLocaleString(undefined, {
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}
          </span>
        )}
      </div>
    </div>
  );
});

export default LessonNoteRichEditor;
