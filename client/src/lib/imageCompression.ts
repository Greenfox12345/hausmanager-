import imageCompression from 'browser-image-compression';

/**
 * Komprimiert ein Bild auf eine maximale Größe und Qualität
 * @param file Die zu komprimierende Bilddatei
 * @param options Optionale Kompressionseinstellungen
 * @returns Die komprimierte Bilddatei
 */
export async function compressImage(
  file: File,
  options?: {
    maxSizeMB?: number;
    maxWidthOrHeight?: number;
    useWebWorker?: boolean;
  }
): Promise<File> {
  // Standardeinstellungen für optimale Balance zwischen Qualität und Dateigröße
  const defaultOptions = {
    maxSizeMB: 1, // Maximale Dateigröße: 1MB
    maxWidthOrHeight: 1920, // Maximale Breite/Höhe: 1920px
    useWebWorker: true, // Verwende Web Worker für bessere Performance
    fileType: file.type, // Behalte Original-Dateityp
  };

  const compressionOptions = {
    ...defaultOptions,
    ...options,
  };

  try {
    const compressedFile = await imageCompression(file, compressionOptions);
    
    // Wenn die komprimierte Datei größer ist als das Original, verwende das Original
    if (compressedFile.size > file.size) {
      return file;
    }
    
    return compressedFile;
  } catch (error) {
    console.error('Image compression error:', error);
    // Bei Fehler: Verwende Original-Datei
    return file;
  }
}

/**
 * Komprimiert mehrere Bilder parallel
 * @param files Array von zu komprimierenden Bilddateien
 * @param options Optionale Kompressionseinstellungen
 * @returns Array von komprimierten Bilddateien
 */
export async function compressImages(
  files: File[],
  options?: {
    maxSizeMB?: number;
    maxWidthOrHeight?: number;
    useWebWorker?: boolean;
  }
): Promise<File[]> {
  return Promise.all(files.map((file) => compressImage(file, options)));
}
