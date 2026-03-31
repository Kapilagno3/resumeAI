export interface PdfConversionResult {
  imageUrl: string;
  file: File | null;
  error?: string;
}

import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

let pdfjsLib: any = null;
let isLoading = false;
let loadPromise: Promise<any> | null = null;

async function loadPdfJs(): Promise<any> {
  if (pdfjsLib) return pdfjsLib;
  if (loadPromise) return loadPromise;

  isLoading = true;
  // @ts-expect-error - pdfjs-dist/build/pdf.mjs is not a module
  loadPromise = import("pdfjs-dist/build/pdf.mjs").then((lib) => {
    // Use the package worker asset so versions always match
    lib.GlobalWorkerOptions.workerSrc = workerUrl;
    pdfjsLib = lib;
    isLoading = false;
    return lib;
  });

  return loadPromise;
}

export async function convertPdfToImage(
  file: File
): Promise<PdfConversionResult> {
  try {
    const lib = await loadPdfJs();

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await lib.getDocument({ data: arrayBuffer }).promise;
    const page = await pdf.getPage(1);

    const viewport = page.getViewport({ scale: 4 });
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("Unable to create 2D canvas context");
    }

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";

    await page.render({ canvasContext: context, viewport }).promise;

    const blob = await new Promise<Blob | null>((resolve) => {
      if (canvas.toBlob) {
        canvas.toBlob((blob) => resolve(blob), "image/png", 1.0);
      } else {
        const dataUrl = canvas.toDataURL("image/png", 1.0);
        fetch(dataUrl)
          .then((res) => res.blob())
          .then(resolve)
          .catch(() => resolve(null));
      }
    });

    if (!blob) {
      return {
        imageUrl: "",
        file: null,
        error: "Failed to create image blob",
      };
    }

    const originalName = file.name.replace(/\.pdf$/i, "");
    const imageFile = new File([blob], `${originalName}.png`, {
      type: "image/png",
    });

    return {
      imageUrl: URL.createObjectURL(blob),
      file: imageFile,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      imageUrl: "",
      file: null,
      error: `Failed to convert PDF: ${message}`,
    };
  }
}