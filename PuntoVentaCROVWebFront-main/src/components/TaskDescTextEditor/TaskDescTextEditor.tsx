"use client";

import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import "./TaskDescTextEditor.css";
import { useRef, useEffect } from "react";

type TaskDescTextEditorProps = {
  value?: string;
  onChange?: (html: string) => void;
  onImagesChange: (images: Map<string, File>) => void;
};

const TaskDescTextEditor = ({
  value,
  onChange,
  onImagesChange,
}: TaskDescTextEditorProps) => {

  const imageFilesRef = useRef<Map<string, File>>(new Map());

  useEffect(() => {
    return () => {
      imageFilesRef.current.forEach((_, url) => {
        URL.revokeObjectURL(url);
      });
    };
  }, []);

  const createPreviewImage = (file: File, view: any) => {
    const objectUrl = URL.createObjectURL(file);


    // guardamos el File en memoria
    imageFilesRef.current.set(objectUrl, file);

    onImagesChange?.(imageFilesRef.current);

    const { schema, tr } = view.state;

    const imageNode = schema.nodes.image.create({
      src: objectUrl,
    });

    view.dispatch(tr.replaceSelectionWith(imageNode));
  };

  const cleanupRemovedImages = (currentHtml: string) => {
    const currentImageSrcs = extractImageSrcsFromHtml(currentHtml);

    imageFilesRef.current.forEach((_, blobUrl) => {
      if (!currentImageSrcs.has(blobUrl)) {
        // liberar memoria
        URL.revokeObjectURL(blobUrl);

        // eliminar del Map
        imageFilesRef.current.delete(blobUrl);
      }
    });

    onImagesChange?.(imageFilesRef.current);
  };

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        bold: false,
        italic: false,
        strike: false,
        code: false,
        heading: false,
        bulletList: false,
        orderedList: false,
        blockquote: false,
        codeBlock: false,
        horizontalRule: false,
      }),
      Image.configure({
        inline: true,
        allowBase64: false,
      }),
    ],
    editorProps: {
      handlePaste: (view, event) => {
        const items = event.clipboardData?.items;
        if (!items) return false;

        for (const item of items) {
          if (!item.type.startsWith("image/")) continue;

          const file = item.getAsFile();
          if (!file) continue;

          createPreviewImage(file, view);
          return true;
        }

        return false;
      },

      handleDrop: (view, event) => {
        const files = Array.from(event.dataTransfer?.files || []);
        const images = files.filter((f) => f.type.startsWith("image/"));

        if (!images.length) return false;
        event.preventDefault();

        images.forEach((file) => createPreviewImage(file, view));
        return true;
      },
    },
    content: value || "",
    onUpdate({ editor }) {
      const html = editor.getHTML();
      cleanupRemovedImages(html);
      onChange?.(html);
    },
  });

  useEffect(() => {
    if (!editor) return;

    // Solo actualizar si el contenido es diferente
    const currentContent = editor.getHTML();
    const newContent = value || "";

    if (currentContent !== newContent) {
      editor.commands.setContent(newContent, {emitUpdate: false});
      
      // Limpiar las imágenes pendientes cuando se resetea
      if (newContent === "" || newContent === "<p></p>") {
        imageFilesRef.current.forEach((_, url) => {
          URL.revokeObjectURL(url);
        });
        imageFilesRef.current.clear();
        onImagesChange?.(imageFilesRef.current);
      }
    }
  }, [editor, value, onImagesChange]);

  if (!editor) {
    return null;
  }


  const extractImageSrcsFromHtml = (html: string): Set<string> => {
    const doc = new DOMParser().parseFromString(html, "text/html");
    const imgs = Array.from(doc.querySelectorAll("img"));
    return new Set(imgs.map((img) => img.getAttribute("src") || ""));
  };

  return (
    <div className="border border-black pl-4 py-2 text-sm">
      <EditorContent editor={editor} />
    </div>
  );
};

export default TaskDescTextEditor;
