import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { AuditLog, AuditParam, AuditDroit, BudgetEvent, Employee } from '../data/mockData';
import { propositions, campaigns } from '../data/mockData';

const fmtEur = (n: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });

function addTopBar(doc: jsPDF) {
  doc.setFillColor(10, 110, 209);
  doc.rect(0, 0, doc.internal.pageSize.getWidth(), 14, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);
  doc.text('SAP BTP · Gestion des Rémunérations', 10, 9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Groupe A · ${new Date().toLocaleDateString('fr-FR')}`, doc.internal.pageSize.getWidth() - 10, 9, { align: 'right' });
}

function addFooter(doc: jsPDF) {
  const total = doc.getNumberOfPages();
  const w = doc.internal.pageSize.getWidth();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFillColor(245, 246, 247);
    doc.rect(0, 284, w, 13, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(160, 160, 160);
    doc.text('Document confidentiel · Usage interne RH · Conservation 5 ans (RGPD) · Chiffrement AES-256 / TLS 1.3', 10, 291);
    doc.text(`Page ${i} / ${total}`, w - 10, 291, { align: 'right' });
  }
}

function sectionTitle(doc: jsPDF, text: string, y: number) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(26, 26, 26);
  doc.text(text, 10, y);
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(10, y + 2, doc.internal.pageSize.getWidth() - 10, y + 2);
}

function lastY(doc: jsPDF): number {
  return (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
}

// ─── Journal général ─────────────────────────────────────────────────────────

export function exportAuditGeneralPdf(
  logs: AuditLog[],
  filters: { role: string; search: string },
) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  addTopBar(doc);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(10, 110, 209);
  doc.text("Journal d'audit général", 10, 25);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(107, 107, 107);
  doc.text(
    `${logs.length} entrée(s)  ·  Rôle : ${filters.role === 'all' ? 'Tous' : filters.role}  ·  Recherche : "${filters.search || '–'}"`,
    10, 32,
  );

  autoTable(doc, {
    startY: 38,
    head: [['Horodatage', 'Utilisateur', 'Rôle', 'Action', 'Entité', 'Détails']],
    body: logs.map(l => [
      fmtDateTime(l.timestamp),
      l.utilisateur,
      l.role,
      l.action,
      l.entite,
      l.details,
    ]),
    headStyles: { fillColor: [10, 110, 209], textColor: 255, fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { fontSize: 7.5, textColor: [26, 26, 26] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 35 },
      1: { cellWidth: 32 },
      2: { cellWidth: 18 },
      3: { cellWidth: 50 },
      4: { cellWidth: 28 },
      5: { cellWidth: 'auto' },
    },
    margin: { left: 10, right: 10, bottom: 18 },
  });

  addFooter(doc);
  doc.save(`audit-general-${new Date().toISOString().slice(0, 10)}.pdf`);
}

// ─── Paramètres campagne ──────────────────────────────────────────────────────

export function exportAuditParamsPdf(params: AuditParam[], filterCampagne: string) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  addTopBar(doc);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(10, 110, 209);
  doc.text('Audit – Paramètres campagne', 10, 25);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(107, 107, 107);
  doc.text(`${params.length} modification(s)  ·  Campagne : ${filterCampagne === 'all' ? 'Toutes' : filterCampagne}`, 10, 32);

  autoTable(doc, {
    startY: 38,
    head: [['Horodatage', 'Opérateur', 'Campagne', 'Champ modifié', 'Ancienne valeur', 'Nouvelle valeur']],
    body: params.map(p => [
      fmtDateTime(p.timestamp),
      p.utilisateur,
      p.campagne,
      p.champ,
      p.ancienneValeur,
      p.nouvelleValeur,
    ]),
    headStyles: { fillColor: [10, 110, 209], textColor: 255, fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { fontSize: 8, textColor: [26, 26, 26] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      3: { fontStyle: 'bold' },
      4: { textColor: [187, 0, 0] },
      5: { textColor: [27, 126, 57], fontStyle: 'bold' },
    },
    margin: { left: 10, right: 10, bottom: 18 },
  });

  addFooter(doc);
  doc.save(`audit-parametres-${new Date().toISOString().slice(0, 10)}.pdf`);
}

// ─── Droits & rôles ───────────────────────────────────────────────────────────

export function exportAuditDroitsPdf(droits: AuditDroit[]) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  addTopBar(doc);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(10, 110, 209);
  doc.text('Audit – Droits & habilitations', 10, 25);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(107, 107, 107);
  doc.text(`${droits.length} changement(s) d'habilitation`, 10, 32);

  autoTable(doc, {
    startY: 38,
    head: [['Horodatage', 'Opérateur', 'Utilisateur ciblé', 'Ancien rôle', 'Nouveau rôle', 'Ancien périmètre', 'Nouveau périmètre']],
    body: droits.map(d => [
      fmtDateTime(d.timestamp),
      d.operateur,
      d.utilisateurCible,
      d.ancienRole,
      d.nouveauRole,
      d.ancienPerimetre,
      d.nouveauPerimetre,
    ]),
    headStyles: { fillColor: [10, 110, 209], textColor: 255, fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { fontSize: 8, textColor: [26, 26, 26] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      3: { textColor: [187, 0, 0] },
      4: { textColor: [27, 126, 57], fontStyle: 'bold' },
    },
    margin: { left: 10, right: 10, bottom: 18 },
  });

  addFooter(doc);
  doc.save(`audit-droits-${new Date().toISOString().slice(0, 10)}.pdf`);
}

// ─── Suivi enveloppes ─────────────────────────────────────────────────────────

export function exportAuditEnveloppesPdf(events: BudgetEvent[], filterType: string) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  addTopBar(doc);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(10, 110, 209);
  doc.text('Audit – Suivi enveloppes budgétaires', 10, 25);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(107, 107, 107);
  doc.text(`${events.length} événement(s)  ·  Type : ${filterType === 'all' ? 'Tous' : filterType}`, 10, 32);

  autoTable(doc, {
    startY: 38,
    head: [['Horodatage', 'Type', 'Campagne', 'Entité', 'Montant', 'Opérateur', 'Détails']],
    body: events.map(e => [
      fmtDateTime(e.timestamp),
      e.type.charAt(0).toUpperCase() + e.type.slice(1),
      e.campagne,
      e.entite,
      fmtEur(e.montant),
      e.utilisateur,
      e.details,
    ]),
    headStyles: { fillColor: [10, 110, 209], textColor: 255, fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { fontSize: 8, textColor: [26, 26, 26] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      4: { fontStyle: 'bold', halign: 'right' },
    },
    margin: { left: 10, right: 10, bottom: 18 },
  });

  addFooter(doc);
  doc.save(`audit-enveloppes-${new Date().toISOString().slice(0, 10)}.pdf`);
}

// ─── BSI – Bilan Social Individuel ───────────────────────────────────────────

export function exportBsiPdf(employee: Employee) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  // ── Bandeau haut ──────────────────────────────────
  addTopBar(doc);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text('DOCUMENT STRICTEMENT PERSONNEL ET CONFIDENTIEL', 148, 9, { align: 'center' });

  // ── Titre ─────────────────────────────────────────
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(10, 110, 209);
  doc.text('Bilan Social Individuel', 10, 28);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(107, 107, 107);
  doc.text(`Exercice ${new Date().getFullYear()}  ·  Généré le ${new Date().toLocaleDateString('fr-FR')}`, 10, 35);
  doc.setDrawColor(10, 110, 209);
  doc.setLineWidth(0.6);
  doc.line(10, 39, 200, 39);

  // ── Bloc identité ─────────────────────────────────
  // Avatar
  doc.setFillColor(employee.genre === 'F' ? 156 : 10, employee.genre === 'F' ? 33 : 110, employee.genre === 'F' ? 176 : 209);
  doc.circle(23, 54, 10, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text(`${employee.prenom[0]}${employee.nom[0]}`, 23, 57, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(26, 26, 26);
  doc.text(`${employee.prenom} ${employee.nom}`, 38, 51);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(107, 107, 107);
  doc.text(`Matricule : ${employee.matricule}   ·   ${employee.genre === 'F' ? 'Femme' : 'Homme'}`, 38, 57);
  doc.text(`${employee.entite}  ·  ${employee.division}`, 38, 63);

  // ── Grille infos ──────────────────────────────────
  const gY = 72;
  doc.setFillColor(245, 246, 247);
  doc.rect(10, gY, 88, 38, 'F');
  doc.rect(112, gY, 88, 38, 'F');

  function cell(label: string, value: string, x: number, y: number) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(120, 120, 120);
    doc.text(label.toUpperCase(), x + 4, y);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(26, 26, 26);
    doc.text(value, x + 4, y + 5.5);
  }

  cell('Grade', employee.grade, 10, gY + 8);
  cell('Échelon', `${employee.echelon}`, 10, gY + 21);
  cell("Date d'entrée", new Date(employee.dateEntree).toLocaleDateString('fr-FR'), 10, gY + 34 - 1);
  cell('Ancienneté', `${employee.anciennete} ans`, 112, gY + 8);
  cell('Éligibilité', employee.eligible ? 'Éligible ✓' : 'Non éligible', 112, gY + 21);
  cell('Entité', employee.entite, 112, gY + 34 - 1);

  // ── Salaire encadré ───────────────────────────────
  const sY = gY + 44;
  doc.setFillColor(10, 110, 209);
  doc.rect(10, sY, 190, 14, 'F');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(200, 224, 245);
  doc.text('Salaire fixe annuel brut actuel', 14, sY + 5.5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(255, 255, 255);
  doc.text(fmtEur(employee.salaireActuel), 196, sY + 10, { align: 'right' });

  // ── Historique rémunération ───────────────────────
  const hY = sY + 22;
  sectionTitle(doc, 'Historique de rémunération', hY);

  const histRows = [...employee.historiqueRemuneration].reverse();
  autoTable(doc, {
    startY: hY + 5,
    head: [['Année', 'Salaire fixe brut', 'Augmentation', 'Bonus versé', 'Total annuel brut']],
    body: histRows.map(h => [
      h.annee.toString(),
      fmtEur(h.salaire),
      `+${fmtEur(h.augmentation)}`,
      fmtEur(h.bonus),
      fmtEur(h.salaire + h.bonus),
    ]),
    headStyles: { fillColor: [10, 110, 209], textColor: 255, fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { fontSize: 9, textColor: [26, 26, 26] },
    alternateRowStyles: { fillColor: [240, 246, 255] },
    columnStyles: {
      0: { cellWidth: 20 },
      1: { halign: 'right', fontStyle: 'bold', cellWidth: 38 },
      2: { halign: 'right', textColor: [27, 126, 57], cellWidth: 35 },
      3: { halign: 'right', textColor: [10, 110, 209], cellWidth: 30 },
      4: { halign: 'right', fontStyle: 'bold', cellWidth: 40 },
    },
    margin: { left: 10, right: 10 },
  });

  // Évolution résumé
  const hist = employee.historiqueRemuneration;
  const evol = hist[hist.length - 1].salaire - hist[0].salaire;
  const evolPct = ((evol / hist[0].salaire) * 100).toFixed(1);
  const eY = lastY(doc) + 4;

  doc.setFillColor(232, 245, 233);
  doc.rect(10, eY, 190, 9, 'F');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(27, 94, 32);
  doc.text(`Évolution salariale sur ${hist.length} an${hist.length > 1 ? 's' : ''} :`, 14, eY + 6);
  doc.setFont('helvetica', 'bold');
  doc.text(`+${fmtEur(evol)}   (+${evolPct} %)`, 75, eY + 6);

  // ── Propositions ──────────────────────────────────
  const empProps = propositions.filter(p => p.matricule === employee.matricule);
  if (empProps.length > 0) {
    const pY = lastY(doc) + 14;
    sectionTitle(doc, 'Propositions de rémunération', pY);

    autoTable(doc, {
      startY: pY + 5,
      head: [['Campagne', 'Type', 'Montant', '% augm.', 'Statut', 'Commentaire']],
      body: empProps.map(p => {
        const camp = campaigns.find(c => c.id === p.campaignId);
        const statutLabel = p.statut === 'valide' ? 'Validé' : p.statut === 'en_cours' ? 'En cours' : p.statut === 'en_attente' ? 'En attente' : 'Rejeté';
        return [camp?.nom ?? p.campaignId, camp?.type ?? '', fmtEur(p.montant), `+${p.pourcentage.toFixed(1)} %`, statutLabel, p.commentaire ?? ''];
      }),
      headStyles: { fillColor: [10, 110, 209], textColor: 255, fontStyle: 'bold', fontSize: 8 },
      bodyStyles: { fontSize: 8.5, textColor: [26, 26, 26] },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        2: { halign: 'right', fontStyle: 'bold' },
        3: { halign: 'right', textColor: [27, 126, 57] },
      },
      margin: { left: 10, right: 10 },
    });
  }

  // ── Bloc signature ────────────────────────────────
  const sigY = Math.max(lastY(doc) + 14, 248);
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(10, sigY, 80, sigY);
  doc.line(120, sigY, 200, sigY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(160, 160, 160);
  doc.text('Signature du collaborateur', 10, sigY + 5);
  doc.text('Cachet et signature RH / DRH', 120, sigY + 5);

  addFooter(doc);
  doc.save(`BSI_${employee.nom}_${employee.prenom}_${new Date().getFullYear()}.pdf`);
}
