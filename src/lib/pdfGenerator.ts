import { jsPDF } from "jspdf";
import "jspdf-autotable";

// Helper to fetch and convert image URL to base64 data URL
export const imageToBase64 = async (url: string): Promise<string> => {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    console.error("Falha ao converter imagem para PDF:", err);
    throw err;
  }
};

// Helper to load image in browser and get its natural dimensions
export const getImageDimensions = (base64: string): Promise<{ width: number; height: number }> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      resolve({ width: 0, height: 0 });
    };
    img.src = base64;
  });
};

// Helper to draw an image on jsPDF keeping aspect ratio and centering it inside a bounding box
export const addFittedImage = async (
  doc: jsPDF,
  base64: string,
  x: number,
  y: number,
  maxWidth: number,
  maxHeight: number
) => {
  try {
    const { width: origWidth, height: origHeight } = await getImageDimensions(base64);
    if (origWidth === 0 || origHeight === 0) {
      // Fallback if dimensions couldn't be loaded
      doc.addImage(base64, "WEBP", x, y, maxWidth, maxHeight, undefined, "FAST");
      return;
    }
    
    const aspectRatio = origWidth / origHeight;
    const maxRatio = maxWidth / maxHeight;
    
    let width = maxWidth;
    let height = maxHeight;
    let xOffset = 0;
    let yOffset = 0;
    
    if (aspectRatio > maxRatio) {
      // Image is wider than bounding box aspect ratio
      height = maxWidth / aspectRatio;
      yOffset = (maxHeight - height) / 2;
    } else {
      // Image is taller than bounding box aspect ratio
      width = maxHeight * aspectRatio;
      xOffset = (maxWidth - width) / 2;
    }
    
    doc.addImage(base64, "WEBP", x + xOffset, y + yOffset, width, height, undefined, "FAST");
  } catch (err) {
    console.error("Erro ao adicionar imagem com proporção ajustada:", err);
    // Safe fallback
    doc.addImage(base64, "WEBP", x, y, maxWidth, maxHeight, undefined, "FAST");
  }
};

interface AlbumData {
  title: string;
  responsible_name: string;
  date: string;
  description?: string;
  participants?: string;
  leads_captured?: number;
  action_result?: string;
  observations?: string;
  cover_photo_url?: string;
  regional_name?: string;
  unit_name?: string;
  action_name?: string;
  photos: { photo_url: string; thumbnail_url: string; description?: string | null; posted_by_name?: string | null }[];
}

/**
 * Gera PDF de um álbum individual em formato de Paisagem A4 (Slide)
 */
export const generateIndividualPDF = async (album: AlbumData): Promise<Blob> => {
  const doc = new jsPDF({
    orientation: "l",
    unit: "mm",
    format: "a4",
  });

  const primaryColor = [26, 54, 93]; // Navy
  const secondaryColor = [74, 85, 104]; // Gray/Slate

  // --- SLIDE 1: CAPA ---
  // Left Column Layout: Blue accent side header
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 0, 8, 210, "F");

  // Title & Metadata area on the Left (x = 18, width = 130)
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("RELATÓRIO DE EVIDÊNCIA", 18, 25);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.text("UNINASSAU - Plano de Ação", 18, 30);

  // Album Title
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  const splitTitle = doc.splitTextToSize(album.title.toUpperCase(), 125);
  doc.text(splitTitle, 18, 48);

  // Line separator
  const lineY = 48 + (splitTitle.length * 8) + 2;
  doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setLineWidth(0.8);
  doc.line(18, lineY, 140, lineY);

  // General Info
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(50, 50, 50);

  const metaData = [
    ["Responsável:", album.responsible_name || "N/A"],
    ["Data da Ação:", album.date ? new Date(album.date).toLocaleDateString('pt-BR') : "N/A"],
    ["Unidade / Regional:", `${album.unit_name || "N/A"} / ${album.regional_name || "N/A"}`],
    ["Ação Vinculada:", album.action_name || "Álbum Livre (Sem vínculo)"],
  ];

  let currentY = lineY + 10;
  metaData.forEach(([label, value]) => {
    doc.setFont("helvetica", "bold");
    doc.text(label, 18, currentY);
    doc.setFont("helvetica", "normal");
    const valText = doc.splitTextToSize(value, 90);
    doc.text(valText, 55, currentY);
    currentY += (valText.length * 5) + 3;
  });

  // Cover Photo on the Right (x = 150, width = 132, height = 150)
  if (album.cover_photo_url) {
    try {
      const base64 = await imageToBase64(album.cover_photo_url);
      doc.setDrawColor(230, 230, 230);
      doc.setLineWidth(0.2);
      // Fundo sutil para a moldura da foto
      doc.setFillColor(248, 249, 250);
      doc.rect(150, 25, 132, 150, "FD");
      // Desenha imagem preservando proporção
      await addFittedImage(doc, base64, 152, 27, 128, 146);
    } catch (e) {
      console.warn("Cover image failed to load for PDF:", e);
      doc.setDrawColor(200, 200, 200);
      doc.rect(150, 25, 132, 150);
      doc.text("Erro ao carregar imagem de capa", 190, 100);
    }
  } else {
    // Moldura vazia se não houver capa
    doc.setDrawColor(230, 230, 230);
    doc.setFillColor(248, 249, 250);
    doc.rect(150, 25, 132, 150, "FD");
    doc.setTextColor(150, 150, 150);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(10);
    doc.text("Sem foto de capa cadastrada", 195, 100);
  }

  // Cover Slide Footer
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text(`Emitido em: ${new Date().toLocaleString('pt-BR')}`, 18, 200);
  doc.text("Página 1", 282, 200, { align: "right" });


  // --- SLIDES SEGUINTES: GALERIA DE FOTOS (2 fotos lado a lado por página, sem esticar) ---
  if (album.photos && album.photos.length > 0) {
    const itemsPerPage = 2;
    const photoWidth = 125;
    const photoHeight = 110;

    for (let i = 0; i < album.photos.length; i += itemsPerPage) {
      doc.addPage();

      // Header Banner
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.rect(0, 0, 297, 22, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text(`GALERIA DE IMAGENS - FOTOS ${i + 1} A ${Math.min(i + itemsPerPage, album.photos.length)} DE ${album.photos.length}`, 18, 14);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(album.title.toUpperCase(), 282, 14, { align: "right" });

      // Column 1 (Left Photo)
      const p1 = album.photos[i];
      if (p1) {
        // Moldura sutil cinza ao redor da área de encaixe
        doc.setDrawColor(225, 228, 232);
        doc.setFillColor(250, 251, 252);
        doc.rect(18, 35, photoWidth, photoHeight, "FD");

        try {
          const base64 = await imageToBase64(p1.photo_url);
          // Adiciona imagem preservando proporções e centralizando dentro de (18, 35, 125, 110)
          await addFittedImage(doc, base64, 18, 35, photoWidth, photoHeight);
        } catch (err) {
          console.error("Erro ao carregar foto 1 da galeria:", err);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(150, 150, 150);
          doc.text("Erro ao carregar imagem", 55, 90);
        }

        // Legenda / Descrição 1
        if (p1.description) {
          doc.setFont("helvetica", "italic");
          doc.setFontSize(9);
          doc.setTextColor(60, 60, 60);
          const splitDesc1 = doc.splitTextToSize(`"${p1.description}"`, photoWidth);
          doc.text(splitDesc1, 18, 155);
          if (p1.posted_by_name) {
            doc.setFont("helvetica", "normal");
            doc.setFontSize(8);
            doc.setTextColor(130, 130, 130);
            doc.text(`— ${p1.posted_by_name}`, 18, 155 + (splitDesc1.length * 4.5) + 1);
          }
        }
      }

      // Column 2 (Right Photo)
      const p2 = album.photos[i + 1];
      if (p2) {
        // Moldura sutil cinza ao redor da área de encaixe
        doc.setDrawColor(225, 228, 232);
        doc.setFillColor(250, 251, 252);
        doc.rect(154, 35, photoWidth, photoHeight, "FD");

        try {
          const base64 = await imageToBase64(p2.photo_url);
          // Adiciona imagem preservando proporções e centralizando dentro de (154, 35, 125, 110)
          await addFittedImage(doc, base64, 154, 35, photoWidth, photoHeight);
        } catch (err) {
          console.error("Erro ao carregar foto 2 da galeria:", err);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(150, 150, 150);
          doc.text("Erro ao carregar imagem", 190, 90);
        }

        // Legenda / Descrição 2
        if (p2.description) {
          doc.setFont("helvetica", "italic");
          doc.setFontSize(9);
          doc.setTextColor(60, 60, 60);
          const splitDesc2 = doc.splitTextToSize(`"${p2.description}"`, photoWidth);
          doc.text(splitDesc2, 154, 155);
          if (p2.posted_by_name) {
            doc.setFont("helvetica", "normal");
            doc.setFontSize(8);
            doc.setTextColor(130, 130, 130);
            doc.text(`— ${p2.posted_by_name}`, 154, 155 + (splitDesc2.length * 4.5) + 1);
          }
        }
      }

      // Slide Footer
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(`Emitido em: ${new Date().toLocaleString('pt-BR')}`, 18, 200);
      doc.text(`Página ${Math.floor(i / itemsPerPage) + 2}`, 282, 200, { align: "right" });
    }
  }

  return doc.output("blob");
};

/**
 * Gera PDF consolidado de múltiplos álbuns em formato Paisagem A4 (Slide)
 */
export const generateConsolidatedPDF = async (
  albums: AlbumData[],
  filters: { period?: string; regional?: string; unit?: string }
): Promise<Blob> => {
  const doc = new jsPDF({
    orientation: "l",
    unit: "mm",
    format: "a4",
  });

  const primaryColor = [26, 54, 93]; // Navy
  const secondaryColor = [74, 85, 104]; // Slate

  // --- SLIDE 1: CAPA CONSOLIDADA ---
  // Accent stripe on the left
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 0, 8, 210, "F");

  // Title on the Left (x = 18, width = 120)
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("RELATÓRIO CONSOLIDADO", 18, 25);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  const mainTitleText = doc.splitTextToSize("GALERIA DE EVIDÊNCIAS FOTOGRÁFICAS", 115);
  doc.text(mainTitleText, 18, 48);

  const consLineY = 48 + (mainTitleText.length * 8) + 2;
  doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setLineWidth(0.8);
  doc.line(18, consLineY, 130, consLineY);

  // Filters info
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Filtros Aplicados:", 18, consLineY + 12);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  let filterY = consLineY + 22;
  const filterList = [
    ["Semestre / Período:", filters.period || "Todos"],
    ["Regional:", filters.regional || "Todas"],
    ["Unidade:", filters.unit || "Todas"],
  ];

  filterList.forEach(([label, value]) => {
    doc.setFont("helvetica", "bold");
    doc.text(label, 18, filterY);
    doc.setFont("helvetica", "normal");
    doc.text(value, 60, filterY);
    filterY += 8;
  });

  // Right Column (x = 150, width = 132): Consolidation Metrics Card
  doc.setFillColor(245, 247, 250);
  doc.rect(150, 25, 132, 150, "F");
  doc.setDrawColor(230, 232, 235);
  doc.rect(150, 25, 132, 150);

  const totalLeads = albums.reduce((acc, a) => acc + (a.leads_captured || 0), 0);
  const totalPhotos = albums.reduce((acc, a) => acc + (a.photos?.length || 0), 0);

  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("METRICAS CONSOLIDADAS", 165, 45);
  
  doc.setLineWidth(0.3);
  doc.setDrawColor(210, 215, 220);
  doc.line(165, 49, 267, 49);

  // Row 1: Albums
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text(String(albums.length), 165, 70);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.text("ÁLBUNS CONSOLIDADOS", 165, 76);

  // Row 2: Leads
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text(String(totalLeads), 165, 105);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.text("LEADS TOTAIS CAPTADOS", 165, 111);

  // Row 3: Photos
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text(String(totalPhotos), 165, 140);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.text("FOTOS TOTAIS REGISTRADAS", 165, 146);

  // Cover footer
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 18, 200);
  doc.text("Página 1", 282, 200, { align: "right" });


  // --- SLIDE 2: TABELA DE SUMARIO ---
  doc.addPage();
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 0, 297, 22, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("SUMÁRIO E DETALHES DE ÁLBUNS", 18, 14);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Total de Álbuns: ${albums.length}`, 282, 14, { align: "right" });

  const tableBody = albums.map((album, idx) => [
    idx + 1,
    album.title,
    album.date ? new Date(album.date).toLocaleDateString('pt-BR') : "N/A",
    album.responsible_name,
    album.unit_name || "N/A",
    album.photos?.length || 0,
  ]);

  (doc as any).autoTable({
    startY: 32,
    head: [["#", "Título do Álbum", "Data da Ação", "Responsável", "Unidade", "Qtd. Fotos"]],
    body: tableBody,
    theme: "striped",
    headStyles: { fillColor: primaryColor, fontSize: 9 },
    styles: { fontSize: 8.5, cellPadding: 2 },
    margin: { left: 18, right: 18 },
  });

  // Slide 2 footer
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 18, 200);
  doc.text("Página 2", 282, 200, { align: "right" });


  // --- SLIDES SEGUINTES: CADA ÁLBUM DETALHADO (Informações + Grid 2x2 com proporção mantida) ---
  let pageIdx = 3;
  for (const album of albums) {
    doc.addPage();

    // Banner Superior
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(0, 0, 297, 22, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(`ÁLBUM: ${album.title.toUpperCase()}`, 18, 14);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`Relatório Consolidado`, 282, 14, { align: "right" });

    doc.setTextColor(50, 50, 50);
    doc.setFontSize(9.5);

    // Left Column (x = 18, width = 120): metadata & description
    doc.setFont("helvetica", "bold");
    doc.text("Responsável:", 18, 32);
    doc.setFont("helvetica", "normal");
    doc.text(album.responsible_name || "N/A", 50, 32);

    doc.setFont("helvetica", "bold");
    doc.text("Data da Ação:", 18, 38);
    doc.setFont("helvetica", "normal");
    doc.text(album.date ? new Date(album.date).toLocaleDateString('pt-BR') : "N/A", 50, 38);

    doc.setFont("helvetica", "bold");
    doc.text("Unidade / Regional:", 18, 44);
    doc.setFont("helvetica", "normal");
    doc.text(`${album.unit_name || "N/A"} / ${album.regional_name || "N/A"}`, 50, 44);

    doc.setFont("helvetica", "bold");
    doc.text("Leads Captados:", 18, 50);
    doc.setFont("helvetica", "normal");
    doc.text(String(album.leads_captured || 0), 50, 50);

    let descY = 58;
    if (album.description) {
      doc.setFont("helvetica", "bold");
      doc.text("Descrição:", 18, descY);
      doc.setFont("helvetica", "normal");
      descY += 5;
      const splitDesc = doc.splitTextToSize(album.description, 120);
      doc.text(splitDesc, 18, descY);
      descY += (splitDesc.length * 4.5) + 6;
    }

    if (album.action_result) {
      doc.setFont("helvetica", "bold");
      doc.text("Resultados:", 18, descY);
      doc.setFont("helvetica", "normal");
      descY += 5;
      const splitRes = doc.splitTextToSize(album.action_result, 120);
      doc.text(splitRes, 18, descY);
    }

    // Right Column (x = 148, width = 131): Grid of 4 photos 2x2
    if (album.photos && album.photos.length > 0) {
      const gridPhotos = album.photos.slice(0, 4);
      const cellWidth = 63;
      const cellHeight = 46;
      let gridX = 148;
      let gridY = 32;

      for (let pIdx = 0; pIdx < gridPhotos.length; pIdx++) {
        const photo = gridPhotos[pIdx];
        if (pIdx === 2) {
          gridX = 148;
          gridY = 85;
        }

        // Draw light background / frame for each grid cell
        doc.setDrawColor(230, 232, 235);
        doc.setFillColor(250, 251, 252);
        doc.rect(gridX, gridY, cellWidth, cellHeight, "FD");

        try {
          const base64 = await imageToBase64(photo.thumbnail_url || photo.photo_url);
          // Fit image inside the cell coordinates
          await addFittedImage(doc, base64, gridX, gridY, cellWidth, cellHeight);
        } catch (err) {
          console.error("Erro no grid consolidado:", err);
          doc.setFont("helvetica", "normal");
          doc.setFontSize(8);
          doc.setTextColor(150, 150, 150);
          doc.text("Erro ao carregar imagem", gridX + 15, gridY + 23);
        }
        gridX += 68; // x gap
      }

      // Legend for first photo if description exists
      const p1 = gridPhotos[0];
      if (p1 && p1.description) {
        doc.setFont("helvetica", "italic");
        doc.setFontSize(8.5);
        doc.setTextColor(70, 70, 70);
        const splitCap = doc.splitTextToSize(`Legenda Foto 1: "${p1.description}"`, 130);
        doc.text(splitCap, 148, 142);
      }
    } else {
      // Empty grid card
      doc.setFillColor(245, 247, 250);
      doc.rect(148, 32, 131, 99, "F");
      doc.setDrawColor(220, 222, 225);
      doc.rect(148, 32, 131, 99);
      doc.setTextColor(150, 150, 150);
      doc.setFont("helvetica", "italic");
      doc.setFontSize(10);
      doc.text("Nenhuma foto neste álbum", 192, 85);
    }

    // Album Slide Footer
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 18, 200);
    doc.text(`Página ${pageIdx}`, 282, 200, { align: "right" });
    pageIdx++;
  }

  return doc.output("blob");
};
