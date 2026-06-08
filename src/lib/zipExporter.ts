import JSZip from "jszip";
import { saveAs } from "file-saver"; // We can implement saveAs using raw browser triggers if file-saver is not installed, to avoid issues! Let's write a simple saveAs helper using HTML5 download tag.

const triggerDownload = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

interface PhotoItem {
  photo_url: string;
  name: string;
}

interface AlbumExportData {
  title: string;
  pdfBlob: Blob;
  photos: PhotoItem[];
}

/**
 * Baixa um único álbum como ZIP contendo o PDF e as fotos originais
 */
export const downloadAlbumZIP = async (
  albumTitle: string,
  pdfBlob: Blob,
  photos: PhotoItem[]
): Promise<void> => {
  const zip = new JSZip();

  // 1. Adiciona o PDF do relatório
  const formattedTitle = albumTitle.toLowerCase().replace(/[^a-z0-9]/g, "_");
  zip.file(`${formattedTitle}_relatorio.pdf`, pdfBlob);

  // 2. Adiciona as fotos na pasta /fotos/
  const fotosFolder = zip.folder("fotos");
  
  if (fotosFolder && photos && photos.length > 0) {
    const promises = photos.map(async (photo, index) => {
      try {
        const response = await fetch(photo.photo_url);
        const blob = await response.blob();
        
        // Determina a extensão do arquivo
        let extension = "webp";
        const contentType = response.headers.get("content-type");
        if (contentType?.includes("jpeg") || contentType?.includes("jpg")) {
          extension = "jpg";
        } else if (contentType?.includes("png")) {
          extension = "png";
        }
        
        const photoName = `foto_${index + 1}.${extension}`;
        fotosFolder.file(photoName, blob);
      } catch (err) {
        console.error(`Erro ao incluir foto ${index + 1} no ZIP:`, err);
      }
    });
    
    await Promise.all(promises);
  }

  // 3. Gera e baixa o ZIP
  const content = await zip.generateAsync({ type: "blob" });
  triggerDownload(content, `${formattedTitle}_album_evidencias.zip`);
};

/**
 * Exporta álbuns consolidados em um único arquivo ZIP organizado
 */
export const downloadConsolidatedZIP = async (
  zipFilename: string,
  consolidatedPdfBlob: Blob,
  albums: AlbumExportData[]
): Promise<void> => {
  const zip = new JSZip();

  // 1. Adiciona o relatório consolidado
  zip.file("relatorio_consolidado.pdf", consolidatedPdfBlob);

  // 2. Adiciona os álbuns em pastas organizadas
  for (const album of albums) {
    const formattedTitle = album.title.toLowerCase().replace(/[^a-z0-9]/g, "_");
    const albumFolder = zip.folder(formattedTitle);

    if (albumFolder) {
      // PDF Individual do Álbum
      albumFolder.file("relatorio.pdf", album.pdfBlob);

      // Pasta de fotos dentro da pasta do álbum
      const fotosFolder = albumFolder.folder("fotos");
      if (fotosFolder && album.photos && album.photos.length > 0) {
        const promises = album.photos.map(async (photo, index) => {
          try {
            const response = await fetch(photo.photo_url);
            const blob = await response.blob();
            
            let extension = "webp";
            const contentType = response.headers.get("content-type");
            if (contentType?.includes("jpeg") || contentType?.includes("jpg")) {
              extension = "jpg";
            } else if (contentType?.includes("png")) {
              extension = "png";
            }

            const photoName = `foto_${index + 1}.${extension}`;
            fotosFolder.file(photoName, blob);
          } catch (err) {
            console.error(`Erro ao adicionar foto consolidada no ZIP:`, err);
          }
        });
        await Promise.all(promises);
      }
    }
  }

  // 3. Gera e baixa o ZIP
  const content = await zip.generateAsync({ type: "blob" });
  triggerDownload(content, `${zipFilename}.zip`);
};
