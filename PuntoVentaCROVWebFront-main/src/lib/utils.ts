import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const extractFileUrlsFromHtml = (html: string): Set<string> => {
  if (!html) return new Set();
  
  const doc = new DOMParser().parseFromString(html, "text/html");
  
  // Obtener los src de las imágenes
  const imgUrls = Array.from(doc.querySelectorAll("img"))
    .map((img) => img.getAttribute("src"));

  // Obtener los href de los enlaces (archivos adjuntos)
  const fileUrls = Array.from(doc.querySelectorAll("a"))
    .map((a) => a.getAttribute("href"));

  const allUrls = [...imgUrls, ...fileUrls];

  return new Set(
    allUrls.filter((url): url is string => !!url && url.startsWith("https"))
  );
};

export const getDeletedFiles = (oldHtml: string, newHtml: string): string[] => {
  const oldImages = extractFileUrlsFromHtml(oldHtml);
  const newImages = extractFileUrlsFromHtml(newHtml);

  return [...oldImages].filter((url) => !newImages.has(url));
};
