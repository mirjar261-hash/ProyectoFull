import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const extractImageUrlsFromHtml = (html: string): Set<string> => {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const imgs = Array.from(doc.querySelectorAll("img"));

  return new Set(
    imgs
      .map((img) => img.getAttribute("src"))
      .filter((src): src is string => !!src && src.startsWith("https"))
  );
};

export const getDeletedImages = (oldHtml: string, newHtml: string): string[] => {
  const oldImages = extractImageUrlsFromHtml(oldHtml);
  const newImages = extractImageUrlsFromHtml(newHtml);

  return [...oldImages].filter((url) => !newImages.has(url));
};
