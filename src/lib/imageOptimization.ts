/**
 * Utilitários cliente para otimização e compressão de imagens
 */

interface OptimizeOptions {
  maxWidth: number;
  maxHeight: number;
  quality: number;
}

/**
 * Converte e otimiza um arquivo de imagem para o formato WebP
 */
export const optimizeImage = (
  file: File,
  options: OptimizeOptions = { maxWidth: 3840, maxHeight: 2160, quality: 0.95 }
): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    // Se o navegador não suportar Canvas ou FileReader, retorna o original
    if (!window.FileReader || !window.HTMLCanvasElement) {
      return resolve(file);
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        // Mantém a proporção da imagem ao redimensionar
        if (width > height) {
          if (width > options.maxWidth) {
            height = Math.round((height * options.maxWidth) / width);
            width = options.maxWidth;
          }
        } else {
          if (height > options.maxHeight) {
            width = Math.round((width * options.maxHeight) / height);
            height = options.maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          return resolve(file); // Fallback para arquivo original caso não consiga contexto
        }

        // Ativa renderização de alta qualidade para evitar artefatos
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";

        // Desenha a imagem no canvas redimensionado
        ctx.drawImage(img, 0, 0, width, height);

        // Exporta como blob WebP com a qualidade definida
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              resolve(file); // Fallback
            }
          },
          "image/webp",
          options.quality
        );
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

/**
 * Gera uma miniatura (thumbnail) rápida a partir de um arquivo de imagem
 * Mantém qualidade alta para garantir boa aparência na grade de fotos
 */
export const generateThumbnail = (
  file: File,
  options: OptimizeOptions = { maxWidth: 800, maxHeight: 800, quality: 0.88 }
): Promise<Blob> => {
  return optimizeImage(file, options);
};

