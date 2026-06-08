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
 * Gera PDF de um álbum individual
 */
export const generateIndividualPDF = async (album: AlbumData): Promise<Blob> => {
  const doc = new jsPDF({
    orientation: "p",
    unit: "mm",
    format: "a4",
  });

  const primaryColor = [26, 54, 93]; // Navy
  const secondaryColor = [74, 85, 104]; // Gray/Slate

  // --- PÁGINA 1: CAPA ---
  // Background Accent Top
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 0, 210, 45, "F");

  // Logo text or title inside header
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text("RELATÓRIO DE EVIDÊNCIA", 15, 25);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`UNINASSAU - Plano de Ação`, 15, 33);

  // Album Title & Metadados
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text(album.title.toUpperCase(), 15, 65, { maxWidth: 180 });

  // Linha divisória
  doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setLineWidth(0.8);
  doc.line(15, 75, 195, 75);

  // Informações Gerais
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(50, 50, 50);

  const metaData = [
    ["Responsável:", album.responsible_name || "N/A"],
    ["Data da Ação:", album.date ? new Date(album.date).toLocaleDateString('pt-BR') : "N/A"],
    ["Unidade / Regional:", `${album.unit_name || "N/A"} / ${album.regional_name || "N/A"}`],
    ["Ação Vinculada:", album.action_name || "Álbum Livre (Sem vínculo)"],
  ];

  let currentY = 85;
  metaData.forEach(([label, value]) => {
    doc.setFont("helvetica", "bold");
    doc.text(label, 15, currentY);
    doc.setFont("helvetica", "normal");
    doc.text(value, 55, currentY);
    currentY += 8;
  });

  // Imagem de Capa (se houver)
  if (album.cover_photo_url) {
    try {
      const base64 = await imageToBase64(album.cover_photo_url);
      // Centraliza a imagem de capa
      // A4 útil: 180mm largura. Queremos ex: 140x90mm
      doc.addImage(base64, "WEBP", 35, 125, 140, 90, undefined, "FAST");
      // Moldura sutil
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.2);
      doc.rect(35, 125, 140, 90);
    } catch (e) {
      console.warn("Cover image failed to load for PDF");
      doc.rect(35, 125, 140, 90);
      doc.text("Erro ao carregar imagem de capa", 75, 170);
    }
  }

  // Footer da Capa
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text(`Emitido em: ${new Date().toLocaleString('pt-BR')}`, 15, 280);
  doc.text(`Página 1`, 190, 280);

  // --- PÁGINA 2: DETALHES E METRICAS ---
  doc.addPage();
  
  // Header
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 0, 210, 15, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("DETALHAMENTO E INDICADORES", 15, 10);

  // Indicadores
  doc.setFontSize(10);
  doc.setTextColor(50, 50, 50);

  // Caixas de Indicadores (Leads e Participantes)
  doc.setFillColor(245, 247, 250);
  doc.rect(15, 25, 85, 25, "F"); // Caixa 1
  doc.rect(110, 25, 85, 25, "F"); // Caixa 2

  // Textos das caixas
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(String(album.leads_captured || 0), 20, 37);
  doc.text(album.participants || "N/A", 115, 37, { maxWidth: 75 });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.text("LEADS CAPTADOS", 20, 44);
  doc.text("PARTICIPANTES", 115, 44);

  // Descrições e Textos Longos
  let textY = 65;
  doc.setTextColor(50, 50, 50);

  if (album.description) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Descrição do Álbum", 15, textY);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    textY += 6;
    const splitDesc = doc.splitTextToSize(album.description, 180);
    doc.text(splitDesc, 15, textY);
    textY += (splitDesc.length * 5) + 8;
  }

  if (album.action_result) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Resultado da Ação", 15, textY);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    textY += 6;
    const splitResult = doc.splitTextToSize(album.action_result, 180);
    doc.text(splitResult, 15, textY);
    textY += (splitResult.length * 5) + 8;
  }

  if (album.observations) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Observações", 15, textY);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    textY += 6;
    const splitObs = doc.splitTextToSize(album.observations, 180);
    doc.text(splitObs, 15, textY);
  }

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text(`Emitido em: ${new Date().toLocaleString('pt-BR')}`, 15, 280);
  doc.text(`Página 2`, 190, 280);

  // --- PÁGINAS SEGUINTES: GALERIA DE FOTOS (2 fotos por página para ficar profissional) ---
  if (album.photos && album.photos.length > 0) {
    const itemsPerPage = 2;
    const photoWidth = 140;
    const photoHeight = 90;

    for (let i = 0; i < album.photos.length; i += itemsPerPage) {
      doc.addPage();

      // Header de Galeria
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.rect(0, 0, 210, 15, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text(`GALERIA DE IMAGENS - FOTOS ${i + 1} A ${Math.min(i + itemsPerPage, album.photos.length)} DE ${album.photos.length}`, 15, 10);

      // Foto 1
      const p1 = album.photos[i];
      if (p1) {
        try {
          const base64 = await imageToBase64(p1.photo_url);
          doc.addImage(base64, "WEBP", 35, 25, photoWidth, photoHeight, undefined, "FAST");
          doc.setDrawColor(200, 200, 200);
          doc.rect(35, 25, photoWidth, photoHeight);
        } catch (err) {
          doc.rect(35, 25, photoWidth, photoHeight);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(100, 100, 100);
          doc.text("Erro ao carregar esta foto", 75, 70);
        }
        // Descrição da Foto 1
        if (p1.description) {
          doc.setFont("helvetica", "italic");
          doc.setFontSize(9);
          doc.setTextColor(60, 60, 60);
          const splitDesc1 = doc.splitTextToSize(`"${p1.description}"`, 170);
          doc.text(splitDesc1, 20, 120);
          if (p1.posted_by_name) {
            doc.setFont("helvetica", "normal");
            doc.setFontSize(8);
            doc.setTextColor(130, 130, 130);
            doc.text(`— ${p1.posted_by_name}`, 20, 120 + splitDesc1.length * 4.5);
          }
        }
      }

      // Foto 2
      const p2 = album.photos[i + 1];
      if (p2) {
        try {
          const base64 = await imageToBase64(p2.photo_url);
          doc.addImage(base64, "WEBP", 35, 140, photoWidth, photoHeight, undefined, "FAST");
          doc.setDrawColor(200, 200, 200);
          doc.rect(35, 140, photoWidth, photoHeight);
        } catch (err) {
          doc.rect(35, 140, photoWidth, photoHeight);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(100, 100, 100);
          doc.text("Erro ao carregar esta foto", 75, 185);
        }
        // Descrição da Foto 2
        if (p2.description) {
          doc.setFont("helvetica", "italic");
          doc.setFontSize(9);
          doc.setTextColor(60, 60, 60);
          const splitDesc2 = doc.splitTextToSize(`"${p2.description}"`, 170);
          doc.text(splitDesc2, 20, 234);
          if (p2.posted_by_name) {
            doc.setFont("helvetica", "normal");
            doc.setFontSize(8);
            doc.setTextColor(130, 130, 130);
            doc.text(`— ${p2.posted_by_name}`, 20, 234 + splitDesc2.length * 4.5);
          }
        }
      }

      // Footer
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(`Emitido em: ${new Date().toLocaleString('pt-BR')}`, 15, 280);
      doc.text(`Página ${Math.floor(i / itemsPerPage) + 3}`, 190, 280);
    }
  }

  return doc.output("blob");
};

/**
 * Gera PDF consolidado de múltiplos álbuns
 */
export const generateConsolidatedPDF = async (
  albums: AlbumData[],
  filters: { period?: string; regional?: string; unit?: string }
): Promise<Blob> => {
  const doc = new jsPDF({
    orientation: "p",
    unit: "mm",
    format: "a4",
  });

  const primaryColor = [26, 54, 93]; // Navy
  const secondaryColor = [74, 85, 104]; // Slate

  // --- PÁGINA 1: CAPA DO RELATÓRIO CONSOLIDADO ---
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 0, 210, 60, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  doc.text("RELATÓRIO CONSOLIDADO", 15, 30);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.text("Galeria de Evidências Fotográficas", 15, 42);

  doc.setTextColor(50, 50, 50);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Filtros Aplicados:", 15, 80);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  let filterY = 90;
  const filterList = [
    ["Semestre / Período:", filters.period || "Todos"],
    ["Regional:", filters.regional || "Todas"],
    ["Unidade:", filters.unit || "Todas"],
    ["Total de Álbuns:", String(albums.length)],
    ["Total de Leads Captados:", String(albums.reduce((acc, a) => acc + (a.leads_captured || 0), 0))],
  ];

  filterList.forEach(([label, value]) => {
    doc.setFont("helvetica", "bold");
    doc.text(label, 15, filterY);
    doc.setFont("helvetica", "normal");
    doc.text(value, 60, filterY);
    filterY += 8;
  });

  // Footer da Capa
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 15, 280);
  doc.text(`Página 1`, 190, 280);

  // --- PÁGINA 2: SUMÁRIO AUTOMÁTICO & INDICADORES ---
  doc.addPage();
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 0, 210, 15, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("SUMÁRIO E KPIs CONSOLIDADOS", 15, 10);

  // KPIs
  const totalLeads = albums.reduce((acc, a) => acc + (a.leads_captured || 0), 0);
  const totalPhotos = albums.reduce((acc, a) => acc + (a.photos?.length || 0), 0);

  doc.setFillColor(245, 247, 250);
  doc.rect(15, 25, 55, 25, "F");
  doc.rect(77, 25, 55, 25, "F");
  doc.rect(140, 25, 55, 25, "F");

  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(String(albums.length), 20, 38);
  doc.text(String(totalLeads), 82, 38);
  doc.text(String(totalPhotos), 145, 38);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.text("ÁLBUNS", 20, 44);
  doc.text("LEADS TOTAIS", 82, 44);
  doc.text("FOTOS TOTAIS", 145, 44);

  // Tabela de Sumário de Álbuns
  doc.setTextColor(50, 50, 50);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Lista de Álbuns no Relatório", 15, 65);

  const tableBody = albums.map((album, idx) => [
    idx + 1,
    album.title,
    album.date ? new Date(album.date).toLocaleDateString('pt-BR') : "N/A",
    album.responsible_name,
    album.unit_name || "N/A",
    album.photos?.length || 0,
  ]);

  (doc as any).autoTable({
    startY: 70,
    head: [["#", "Título do Álbum", "Data", "Responsável", "Unidade", "Fotos"]],
    body: tableBody,
    theme: "striped",
    headStyles: { fillColor: primaryColor },
    styles: { fontSize: 8 },
  });

  // Iterar e incluir cada álbum de forma resumida nas próximas páginas (Capa do álbum + mini galeria)
  for (const album of albums) {
    doc.addPage();
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(0, 0, 210, 15, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(`ÁLBUM: ${album.title.toUpperCase()}`, 15, 10);

    doc.setTextColor(50, 50, 50);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    
    // Detalhes do álbum
    doc.setFont("helvetica", "bold");
    doc.text("Responsável:", 15, 28);
    doc.setFont("helvetica", "normal");
    doc.text(album.responsible_name || "N/A", 45, 28);

    doc.setFont("helvetica", "bold");
    doc.text("Data:", 15, 34);
    doc.setFont("helvetica", "normal");
    doc.text(album.date ? new Date(album.date).toLocaleDateString('pt-BR') : "N/A", 45, 34);

    doc.setFont("helvetica", "bold");
    doc.text("Unidade/Regional:", 15, 40);
    doc.setFont("helvetica", "normal");
    doc.text(`${album.unit_name || "N/A"} / ${album.regional_name || "N/A"}`, 45, 40);

    if (album.description) {
      doc.setFont("helvetica", "bold");
      doc.text("Descrição:", 15, 46);
      doc.setFont("helvetica", "normal");
      const splitDesc = doc.splitTextToSize(album.description, 150);
      doc.text(splitDesc, 45, 46);
    }

    // Grid de fotos pequena (4 fotos por página)
    if (album.photos && album.photos.length > 0) {
      const gridPhotos = album.photos.slice(0, 4);
      let photoX = 15;
      let photoY = 75;
      const w = 85;
      const h = 55;

      for (let pIdx = 0; pIdx < gridPhotos.length; pIdx++) {
        const photo = gridPhotos[pIdx];
        if (pIdx === 2) {
          photoX = 15;
          photoY = 140;
        }

        try {
          // Usa a thumbnail para otimizar tamanho do PDF consolidado
          const base64 = await imageToBase64(photo.thumbnail_url || photo.photo_url);
          doc.addImage(base64, "WEBP", photoX, photoY, w, h, undefined, "FAST");
          doc.setDrawColor(200, 200, 200);
          doc.rect(photoX, photoY, w, h);
        } catch (err) {
          doc.rect(photoX, photoY, w, h);
          doc.setFont("helvetica", "normal");
          doc.text("Erro ao carregar imagem", photoX + 20, photoY + 25);
        }
        photoX += 95;
      }
    }
  }

  return doc.output("blob");
};
