"use client";

import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import { Node, mergeAttributes } from "@tiptap/core";
import { Paperclip } from "lucide-react";
import "./TaskDescTextEditor.css";
import { useRef, useEffect } from "react";
import { toast } from "sonner";

const ICONS = ["📎", "📕", "🎬", "📘", "📗", "📙", "🎵", "📦"];

const CustomLink = Link.extend({
  parseHTML() {
    return [
      {
        tag: 'a:not([data-type="file-attachment"])',
        getAttrs: (dom) => {
          if (!(dom instanceof HTMLElement)) return false;
          const text = dom.textContent || "";
          // Si el texto tiene un emoji de archivo, SE IGNORA y se lo dejamos a FileAttachment
          const hasIcon = ICONS.some((icon) => text.includes(icon));
          if (hasIcon) return false; 
          return null; // Si es un enlace normal, lo permitimos
        },
      },
    ];
  },
});

const FileAttachment = Node.create({
  name: "fileAttachment",
  group: "inline",
  inline: true,
  selectable: true,
  atom: true, 
  priority: 1000, 

  addAttributes() {
    return {
      href: { default: null },
      fileName: { default: "Archivo" },
      icon: { default: "📎" },
      target: { default: "_blank" },
    };
  },

  parseHTML() {
    return [
      {
        tag: "a",
        getAttrs: (dom) => {
          if (!(dom instanceof HTMLElement)) return false;
          const isAttachment = dom.getAttribute("data-type") === "file-attachment";
          const text = dom.textContent || "";
          const hasIcon = ICONS.some((i) => text.includes(i));

          if (isAttachment || hasIcon) {
            const icon = dom.getAttribute("data-icon") || text.substring(0, 2).trim() || "📎";
            let fileName = dom.getAttribute("data-filename");
            if (!fileName) {
              fileName = text.replace(icon, "").trim(); // Respaldo para tareas viejas
            }
            
            return {
              href: dom.getAttribute("href"),
              fileName,
              icon,
            };
          }
          return false;
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "a",
      mergeAttributes(HTMLAttributes, { 
        "data-type": "file-attachment", 
        "contenteditable": "false", // Evita que el cursor entre al bloque
        "data-filename": HTMLAttributes.fileName,
        "data-icon": HTMLAttributes.icon,
        "class": "file-attachment-link"
      }),
      `${HTMLAttributes.icon} ${HTMLAttributes.fileName}`,
    ];
  },
});

type TaskDescTextEditorProps = {
  value?: string;
  onChange?: (html: string) => void;
  onImagesChange: (images: Map<string, File>) => void;
};

const getFileIcon = (fileName: string, mimeType: string) => {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  if (mimeType.startsWith('video/') || ['mp4', 'mov', 'avi', 'mkv'].includes(ext)) return '🎬';
  if (mimeType === 'application/pdf' || ext === 'pdf') return '📕';
  if (mimeType.includes('word') || ['doc', 'docx'].includes(ext)) return '📘';
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet') || ['xls', 'xlsx', 'csv'].includes(ext)) return '📗';
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint') || ['ppt', 'pptx'].includes(ext)) return '📙';
  if (mimeType.startsWith('audio/')) return '🎵';
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return '📦';
  return '📎';
};

const TaskDescTextEditor = ({
  value,
  onChange,
  onImagesChange,
}: TaskDescTextEditorProps) => {

  const fileRefs = useRef<Map<string, File>>(new Map());
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      fileRefs.current.forEach((_, url) => URL.revokeObjectURL(url));
    };
  }, []);

  const createPreviewFile = (file: File, view: any) => {

    const MAX_SIZE_MB = 100;
    const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

    if (file.size > MAX_SIZE_BYTES) {
      toast.error(`El archivo "${file.name}" es muy pesado. El límite es de ${MAX_SIZE_MB}MB.`);
      return; 
    }

    const objectUrl = URL.createObjectURL(file);
    fileRefs.current.set(objectUrl, file);
    onImagesChange?.(fileRefs.current);

    const { schema, tr } = view.state;

    if (file.type.startsWith("image/")) {
      const imageNode = schema.nodes.image.create({ src: objectUrl });
      view.dispatch(tr.replaceSelectionWith(imageNode));
    } else {
      const icon = getFileIcon(file.name, file.type);
      const fileNode = schema.nodes.fileAttachment.create({
        href: objectUrl,
        fileName: file.name,
        icon: icon,
      });
      view.dispatch(tr.replaceSelectionWith(fileNode));
    }
  };

  const extractFileUrlsFromHtml = (html: string): Set<string> => {
    const doc = new DOMParser().parseFromString(html, "text/html");
    const urls = new Set<string>();
    Array.from(doc.querySelectorAll("img")).forEach((img) => urls.add(img.getAttribute("src") || ""));
    Array.from(doc.querySelectorAll("a")).forEach((a) => urls.add(a.getAttribute("href") || ""));
    return urls;
  };

  const cleanupRemovedFiles = (currentHtml: string) => {
    const currentUrls = extractFileUrlsFromHtml(currentHtml);
    fileRefs.current.forEach((_, blobUrl) => {
      if (!currentUrls.has(blobUrl)) {
        URL.revokeObjectURL(blobUrl);
        fileRefs.current.delete(blobUrl);
      }
    });
    onImagesChange?.(fileRefs.current);
  };

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        bold: false, italic: false, strike: false, code: false, heading: false,
        bulletList: false, orderedList: false, blockquote: false, codeBlock: false, horizontalRule: false,
      }),
      Image.configure({ inline: true, allowBase64: false }),
      CustomLink.configure({
        openOnClick: false, autolink: false,
        protocols: ['http', 'https', 'ftp', 'mailto', 'blob'] as any,
      }),
      FileAttachment, 
    ],
    editorProps: {
      attributes: {
            class: 'prose-mirror-content',
        },
      handlePaste: (view, event) => {
        const items = event.clipboardData?.items;
        if (!items) return false;
        for (const item of items) {
          if (item.kind === "file") {
            const file = item.getAsFile();
            if (!file) continue;
            createPreviewFile(file, view);
            return true;
          }
        }
        return false;
      },
      handleDrop: (view, event) => {
        const files = Array.from(event.dataTransfer?.files || []);
        if (!files.length) return false;
        event.preventDefault();
        files.forEach((file) => createPreviewFile(file, view));
        return true;
      },
    },
    content: value || "",
    onUpdate({ editor }) {
      const html = editor.getHTML();
      cleanupRemovedFiles(html);
      onChange?.(html);
    },
  });

  useEffect(() => {
    if (!editor) return;
    const currentContent = editor.getHTML();
    const newContent = value || "";
    if (currentContent !== newContent) {
      editor.commands.setContent(newContent, {emitUpdate: false});
      if (newContent === "" || newContent === "<p></p>") {
        fileRefs.current.forEach((_, url) => URL.revokeObjectURL(url));
        fileRefs.current.clear();
        onImagesChange?.(fileRefs.current);
      }
    }
  }, [editor, value, onImagesChange]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (!files.length || !editor) return;
    files.forEach((file) => createPreviewFile(file, editor.view));
    event.target.value = "";
    editor.commands.focus();
  };

  if (!editor) return null;

  return (
    <div className="border border-gray-300 rounded-md bg-white flex flex-col min-h-[120px] overflow-hidden focus-within:ring-2 focus-within:ring-orange-500 focus-within:border-transparent transition-all">
      <div className="flex items-center gap-2 border-b border-gray-200 bg-gray-50 px-3 py-2">
        <button
          type="button" 
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1.5 rounded-md p-1.5 text-xs font-medium text-gray-600 hover:bg-gray-200 hover:text-gray-900 transition-colors"
          title="Adjuntar archivo"
        >
          <Paperclip className="h-4 w-4" /> Adjuntar
        </button>
        <input type="file" multiple ref={fileInputRef} onChange={handleFileSelect} className="hidden" />

        <span className="ml-auto text-xs text-gray-400 ">
          Máx. 100 MB por archivo
        </span>
      </div>
      <div className="flex-1 p-3 text-sm cursor-text" onClick={() => editor.commands.focus()}>
        <EditorContent editor={editor} />
      </div>
    </div>
  );
};

export default TaskDescTextEditor;