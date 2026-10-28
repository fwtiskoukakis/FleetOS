import type { Contract, User } from '../models/contract.interface';
import type { ApprovedContractTerms } from '../config/contract-terms';

export interface PDFCompany {
  name?: string; tradingName?: string; vat?: string; registration?: string;
  address?: string; phone?: string; email?: string;
}
export interface PDFOptions {
  language?: 'el' | 'en'; includePhotos?: boolean; includeDamages?: boolean;
  /** Retained for callers. No verification code is printed without a real verification service. */
  includeQRCode?: boolean;
}
export interface PDFMedia { photos: { uri: string; description?: string }[]; clientSignature: string; agentSignature: string }
const missing = 'Δεν έχει καταγραφεί';
export function escapeHTML(value: unknown): string {
  return String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}
function clean(value: unknown): string {
  const v = String(value ?? '').trim();
  return /^(null|undefined|n\/a)$/i.test(v) ? '' : v;
}
function numeric(value: unknown): number | undefined {
  if (value == null || value === '') return undefined;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}
export function isEmbeddedImage(uri: string): boolean {
  return /^data:image\/(?:png|jpe?g|webp|gif|svg\+xml);base64,[a-z0-9+/=\s]+$/i.test(uri);
}
function date(value: unknown): string {
  const d = new Date(value as string);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-GB', { timeZone: 'UTC' });
}
function time(value: string): string {
  const match = /^(\d{2}):(\d{2})(?::\d{2})?$/.exec(value || '');
  return match && Number(match[1]) < 24 && Number(match[2]) < 60 ? `${match[1]}:${match[2]}` : '';
}
/** Attachment captions never expose migration provenance or Library identifiers. */
export function attachmentCaption(value: string | undefined, index: number): string {
  return clean(value).replace(/\[source:[^\]]*\]/gi, '').replace(/^IMG_[\w-]+\.(?:jpe?g|png)\s*[—–-]?\s*/i, '').trim() || `Συνημμένο ${index + 1}`;
}

/** Pure renderer: every dynamic text value is escaped and every image is embedded before printing. */
export function renderContractHTML(contract: Contract, user: User, company: PDFCompany, media: PDFMedia,
  options: PDFOptions = {}, terms?: ApprovedContractTerms): string {
  if (media.photos.some(photo => !isEmbeddedImage(photo.uri))) throw new Error('Τα συνημμένα πρέπει να φορτωθούν πριν από την εξαγωγή.');
  const en = options.language === 'en';
  const l = (el: string, english: string) => en ? english : el;
  const unknown = l(missing, 'Not recorded');
  const text = (v: unknown) => escapeHTML(clean(v) || unknown);
  const amount = (v: unknown) => {
    const n = numeric(v);
    return n === undefined ? unknown : escapeHTML(new Intl.NumberFormat(en ? 'en-IE' : 'el-GR', { style: 'currency', currency: 'EUR' }).format(n));
  };
  const number = (v: unknown, suffix = '') => {
    const n = numeric(v);
    return n === undefined ? unknown : `${escapeHTML(n.toLocaleString(en ? 'en-GB' : 'el-GR'))}${suffix}`;
  };
  const row = (label: string, value: string) => `<tr><th>${escapeHTML(label)}</th><td>${value}</td></tr>`;
  const field = (label: string, value: unknown) => row(label, text(value));
  const section = (title: string, body: string) => `<section><h2>${escapeHTML(title)}</h2>${body}</section>`;
  const table = (body: string) => `<table class="details">${body}</table>`;
  const numberLabel = clean(contract.contractNumber) || contract.id;
  const termsReady = !!(terms?.version && terms.paragraphs?.length && terms.paragraphs.every(p => clean(p)));
  const missingIdentity = !clean(company.name) || !clean(company.vat) || !clean(company.address);
  const draft = !termsReady || missingIdentity;
  const status = draft ? l('ΠΡΟΣΧΕΔΙΟ - ΕΚΚΡΕΜΕΙ ΣΥΜΠΛΗΡΩΣΗ', 'DRAFT - INCOMPLETE') : l('ΣΥΜΒΟΛΑΙΟ ΜΙΣΘΩΣΗΣ ΟΧΗΜΑΤΟΣ', 'VEHICLE RENTAL AGREEMENT');
  const header = (title: string) => `<header><div class="brand">${text(company.tradingName || company.name)}</div><div class="document">${escapeHTML(title)}<br><b>${escapeHTML(numberLabel)}</b></div></header>`;
  const footer = `<footer>${escapeHTML(numberLabel)} · FleetOS · ${escapeHTML(l('Αντίγραφο στοιχείων μίσθωσης', 'Rental record copy'))}</footer>`;
  const banner = draft ? `<div class="notice">${escapeHTML(status)}. ${escapeHTML(l('Το έγγραφο δεν περιλαμβάνει ακόμη όλους τους εγκεκριμένους γενικούς όρους του πρωτότυπου συμβολαίου.', 'The approved general terms from the original agreement have not yet been included.'))}${missingIdentity ? ' ' + escapeHTML(l('Ελλιπή στοιχεία εκμισθώτριας εταιρείας.', 'Incomplete lessor details.')) : ''}</div>` : '';
  const r = contract.renterInfo; const p = contract.rentalPeriod; const c = contract.carInfo; const condition = contract.carCondition;
  const insurance = condition?.insuranceType === 'full' ? l('Μικτή - βλ. ειδικές συμφωνίες / απαλλαγή', 'Mixed cover - see specific conditions / excess')
    : condition?.insuranceType === 'basic' ? l('Βασική - σύμφωνα με το ασφαλιστήριο', 'Basic - subject to the insurance policy') : unknown;
  const fuel = numeric(condition?.fuelLevel);
  const mileage = numeric(condition?.mileage) ?? numeric(c.mileage);
  const deposit = numeric(p.depositAmount);
  // deposit_amount is an advance payment in this app, never a refundable security deposit.
  const balance = deposit !== undefined && numeric(p.totalCost) !== undefined ? Math.abs(p.totalCost - deposit) : undefined;
  const credit = deposit !== undefined && numeric(p.totalCost) !== undefined && deposit > p.totalCost;
  const aadeConfirmed = (contract.aadeStatus === 'submitted' || contract.aadeStatus === 'completed') && numeric(contract.aadeDclId) !== undefined && Number(contract.aadeDclId) > 0;
  const aade = aadeConfirmed ? `DCL: ${escapeHTML(contract.aadeDclId)}` : l('Δεν τεκμηριώνεται υποβολή από τα διαθέσιμα στοιχεία του συστήματος.', 'Submission is not evidenced by the available system records.');
  const conditions: Record<string, string> = { good: l('Καλή', 'Good'), fair: l('Μέτρια', 'Fair'), poor: l('Κακή', 'Poor') };
  const conditionText = (v: string) => text(conditions[v] || v);
  let html = `<article class="summary">${header(l('ΣΥΜΒΟΛΑΙΟ ΜΙΣΘΩΣΗΣ', 'RENTAL AGREEMENT'))}${banner}
    <div class="company"><strong>${text(company.name)}</strong><br>${text(company.address)}<br>${escapeHTML(l('ΑΦΜ', 'VAT'))}: ${text(company.vat)} · ${escapeHTML(l('ΓΕΜΗ', 'Registration'))}: ${text(company.registration)}<br>${text(company.phone)} · ${text(company.email)}</div>
    ${section(l('01 / ΜΙΣΘΩΤΗΣ - ΟΔΗΓΟΣ', '01 / RENTER - DRIVER'), table(
      field(l('Ονοματεπώνυμο', 'Full name'), r.fullName) + field(l('Ταυτότητα / Διαβατήριο', 'ID / Passport'), r.idNumber) + field(l('Άδεια οδήγησης', 'Driving licence'), r.driverLicenseNumber) + field(l('ΑΦΜ μισθωτή', 'Renter tax ID'), r.taxId) + field(l('Διεύθυνση', 'Address'), r.address) + field(l('Τηλέφωνο / Email', 'Phone / Email'), [clean(r.phoneNumber || r.phone), clean(r.email)].filter(Boolean).join(' · '))))}
    ${section(l('02 / ΟΧΗΜΑ ΚΑΙ ΠΕΡΙΟΔΟΣ ΜΙΣΘΩΣΗΣ', '02 / VEHICLE AND RENTAL PERIOD'), table(
      field(l('Όχημα / Πινακίδα', 'Vehicle / Registration'), [c.makeModel, c.licensePlate].filter(Boolean).join(' · ')) + field(l('Έτος / Χρώμα', 'Year / Colour'), [numeric(c.year) || '', clean(c.color)].filter(Boolean).join(' · ')) +
      field(l('Παραλαβή', 'Pickup'), [date(p.pickupDate), time(p.pickupTime), p.pickupLocation].filter(Boolean).join(' · ')) +
      field(l('Επιστροφή', 'Return'), [date(p.dropoffDate), time(p.dropoffTime), p.dropoffLocation].filter(Boolean).join(' · '))))}
    ${section(l('03 / ΟΙΚΟΝΟΜΙΚΑ ΣΤΟΙΧΕΙΑ', '03 / FINANCIAL DETAILS'), table(
      row(l('Συνολικό συμφωνημένο τίμημα', 'Total agreed rental price'), `<b class="total">${amount(p.totalCost)}</b>`) + row(l('Καταγεγραμμένη προκαταβολή', 'Recorded advance payment'), amount(p.depositAmount)) + row(credit ? l('Πιστωτικό βάσει προκαταβολής', 'Credit based on advance') : l('Υπόλοιπο βάσει προκαταβολής', 'Balance based on advance'), amount(balance)) + row(l('Καταγεγραμμένη χρέωση ασφάλισης', 'Recorded insurance charge'), amount(p.insuranceCost))))}
    <p class="muted">${escapeHTML(l('Το συμφωνημένο τίμημα δεν αποτελεί απόδειξη πληρωμής. Μη καταγεγραμμένη καταβολή δεν θεωρείται μηδενική. Τυχόν χρέωση ασφάλισης εμφανίζεται ως καταγεγραμμένο στοιχείο και δεν προστίθεται ξανά αυτόματα στο σύνολο.', 'The agreed price is not proof of payment. An unrecorded payment is not treated as zero. The recorded insurance charge is not automatically added again to the total.'))}</p>
    ${section(l('04 / ΚΑΤΑΣΤΑΣΗ ΚΑΤΑ ΤΗΝ ΠΑΡΑΔΟΣΗ', '04 / CONDITION AT HANDOVER'), table(
      row(l('Χιλιομετρητής', 'Odometer'), number(mileage, ' km')) + row(l('Καύσιμο', 'Fuel'), fuel !== undefined && fuel <= 8 ? `${fuel}/8` : unknown) + row(l('Ασφάλιση', 'Insurance'), escapeHTML(insurance)) + row(l('Εξωτερικό / Εσωτερικό / Μηχανικά', 'Exterior / Interior / Mechanical'), [conditionText(condition?.exteriorCondition), conditionText(condition?.interiorCondition), conditionText(condition?.mechanicalCondition)].join(' / '))))}
    <p class="muted">${escapeHTML(l('ΑΑΔΕ - Ψηφιακό Πελατολόγιο', 'AADE - Digital Client Registry'))}: ${aade}</p>${footer}</article>`;
  const specific = [...new Set([clean(condition?.notes), clean(contract.observations)].filter(Boolean))];
  const damageList = options.includeDamages !== false && contract.damagePoints?.length
    ? `<ol>${contract.damagePoints.map(d => `<li>${text(d.view)}: ${text(d.description)} (${text(d.severity)}; x=${number(d.x)}%, y=${number(d.y)}%)</li>`).join('')}</ol>`
    : `<p>${escapeHTML(options.includeDamages === false ? l('Η αναλυτική λίστα δεν συμπεριλήφθηκε σε αυτή την εξαγωγή.', 'The detailed list was excluded from this export.') : l('Δεν υπάρχουν ψηφιακά σημεία ζημιών. Αυτό δεν πιστοποιεί απουσία ζημιών· ελέγξτε και τις φωτογραφίες / το πρωτότυπο δελτίο.', 'No digital damage markers are recorded. This does not certify the absence of damage; also review the photographs / original report.'))}</p>`;
  html += `<article class="new-page">${header(l('ΣΥΜΦΩΝΙΕΣ, ΟΡΟΙ ΚΑΙ ΥΠΟΓΡΑΦΕΣ', 'CONDITIONS, TERMS AND SIGNATURES'))}${section(l('05 / ΕΙΔΙΚΕΣ ΣΥΜΦΩΝΙΕΣ - ΠΑΡΑΤΗΡΗΣΕΙΣ', '05 / SPECIFIC CONDITIONS - NOTES'), specific.length ? specific.map(s => `<p class="pre">${escapeHTML(s)}</p>`).join('') : `<p>${escapeHTML(unknown)}</p>`)}
    ${section(l('06 / ΚΑΤΑΓΕΓΡΑΜΜΕΝΑ ΣΗΜΕΙΑ ΖΗΜΙΩΝ', '06 / RECORDED DAMAGE MARKERS'), damageList)}
    ${section(l('07 / ΣΥΝΗΜΜΕΝΑ', '07 / ATTACHMENTS'), `<p>${escapeHTML(options.includePhotos === false ? l('Τα συνημμένα εξαιρέθηκαν από αυτή την εξαγωγή.', 'Attachments were excluded from this export.') : l(`Ακολουθούν ${media.photos.length} συνημμένα, με την αρχική σειρά καταχώρισης. Περιλαμβάνονται φωτογραφίες και έγγραφα που έχουν συνδεθεί με αυτή τη μίσθωση.`, `${media.photos.length} attachments follow in their recorded order, including photographs and documents linked to this rental.`))}</p>`)}
    ${section(l('08 / ΓΕΝΙΚΟΙ ΟΡΟΙ ΜΙΣΘΩΣΗΣ', '08 / GENERAL RENTAL TERMS'),
    termsReady ? `<p class="muted">${escapeHTML(l('Έκδοση όρων', 'Terms version'))}: ${text(terms!.version)} · ${terms!.language.toUpperCase()}</p>${terms!.paragraphs.map(t => `<p class="term">${escapeHTML(t)}</p>`).join('')}`
    : `<div class="notice"><b>${escapeHTML(l('ΕΚΚΡΕΜΕΙ ΤΟ ΠΡΩΤΟΤΥΠΟ ΚΕΙΜΕΝΟ ΟΡΩΝ', 'ORIGINAL TERMS ARE REQUIRED'))}</b><p>${escapeHTML(l('Η πίσω όψη του κανονικού έντυπου συμβολαίου δεν έχει ακόμη προστεθεί. Δεν έχουν αντικατασταθεί οι όροι της επιχείρησης με γενικούς όρους. Το παρόν παραμένει προσχέδιο έως την πιστή ενσωμάτωσή τους.', 'The reverse of the original paper agreement has not yet been supplied. Generic terms have not been substituted for the business terms. This document remains a draft until those terms are faithfully included.'))}</p></div>`)}
    <div class="signature-section"><h2>${escapeHTML(l('09 / ΥΠΟΓΡΑΦΕΣ', '09 / SIGNATURES'))}</h2>
    <p class="muted">${escapeHTML(l('Οι παρακάτω εικόνες είναι οι υπογραφές που είναι αποθηκευμένες στο σύστημα. Η εξαγωγή PDF δεν αποτελεί νέα υπογραφή ή νέα αποδοχή τροποποιημένων όρων. Δεν αποδίδεται ημερομηνία υπογραφής χωρίς καταγραφή.', 'The images below are signatures stored in the system. PDF export does not constitute a new signature or acceptance of amended terms. No signature date is inferred.'))}</p>
    <table class="signatures"><tr>${[[l('Ο μισθωτής', 'Renter'), r.fullName, media.clientSignature], [l('Για την εκμισθώτρια εταιρεία', 'For the lessor'), user.name, media.agentSignature]].map(([role, name, uri]) => `<td><b>${escapeHTML(role)}</b><div class="signature">${isEmbeddedImage(uri) ? `<img src="${uri}" alt="${escapeHTML(role)}">` : `<span>${escapeHTML(l('Δεν έχει καταγραφεί υπογραφή', 'No signature recorded'))}</span>`}</div><div>${text(name)}</div><p>${escapeHTML(l('Ημερομηνία υπογραφής', 'Signature date'))}: ______________</p></td>`).join('')}</tr></table></div>${footer}</article>`;
  if (options.includePhotos !== false) {
    for (let i = 0; i < media.photos.length; i += 2) {
      html += `<article class="new-page attachments">${header(l(`ΠΑΡΑΡΤΗΜΑ / ΣΥΝΗΜΜΕΝΑ ${i + 1}-${Math.min(i + 2, media.photos.length)} ΑΠΟ ${media.photos.length}`, `APPENDIX / ATTACHMENTS ${i + 1}-${Math.min(i + 2, media.photos.length)} OF ${media.photos.length}`))}${media.photos.slice(i, i + 2).map((photo, j) => `<figure><div class="photo-frame"><img src="${photo.uri}" alt="${escapeHTML(l('Συνημμένο', 'Attachment'))} ${i + j + 1}"></div><figcaption>${i + j + 1}. ${escapeHTML(attachmentCaption(photo.description, i + j))}</figcaption></figure>`).join('')}${footer}</article>`;
    }
  }
  return `<!DOCTYPE html><html lang="${en ? 'en' : 'el'}"><head><meta charset="UTF-8"><title>${escapeHTML(numberLabel)}</title><style>
    @page { size: A4; margin: 12mm; @bottom-right { content: counter(page); font: 8pt Arial, sans-serif; color: #64748b; } }
    * { box-sizing: border-box; } body { margin: 0; font: 9pt Arial, 'DejaVu Sans', sans-serif; color: #172337; line-height: 1.38; }
    header { display: table; width: 100%; border-bottom: 2px solid #04a9bf; padding-bottom: 4mm; margin-bottom: 4mm; }
    .brand { display: table-cell; width: 50%; font-size: 16pt; font-weight: 700; color: #008da4; vertical-align: middle; }
    .document { display: table-cell; font-size: 8pt; text-align: right; vertical-align: middle; } .document b { font-size: 10pt; }
    .company { font-size: 8.5pt; padding: 1mm 0 3mm; line-height: 1.5; } .notice { padding: 3mm; background: #fff7df; border: 1px solid #dfb44c; font-size: 8.5pt; margin-bottom: 3mm; }
    h2 { font-size: 9pt; letter-spacing: .25pt; color: #007c91; margin: 4mm 0 2mm; padding-bottom: 1.5mm; border-bottom: 1px solid #dce7ed; break-after: avoid; page-break-after: avoid; }
    table { border-collapse: collapse; width: 100%; } .details th, .details td { padding: 1.3mm 2mm; border-bottom: 1px solid #e7edf1; text-align: left; vertical-align: top; }
    .details th { width: 37%; font-weight: 400; color: #526173; background: #f6f9fb; } .details td { font-weight: 600; overflow-wrap: anywhere; }
    tr, figure, .signature-section { break-inside: avoid; page-break-inside: avoid; } p, li { orphans: 3; widows: 3; } p { margin: 2mm 0; } .muted { color: #637084; font-size: 7.6pt; }
    .total { font-size: 12pt; color: #007c91; } .pre { white-space: pre-wrap; overflow-wrap: anywhere; } .term { white-space: pre-wrap; }
    .new-page { break-before: page; page-break-before: always; } footer { border-top: 1px solid #dce7ed; color: #637084; font-size: 7pt; margin-top: 4mm; padding-top: 2mm; }
    .signatures { table-layout: fixed; margin-top: 5mm; } .signatures td { width: 50%; padding: 3mm; text-align: center; vertical-align: top; border: 1px solid #dce7ed; }
    .signature { height: 28mm; display: block; margin: 2mm 0; border-bottom: 1px solid #8a96a3; } .signature img { width: 100%; height: 26mm; object-fit: contain; } .signature span { font-size: 7.5pt; color: #637084; line-height: 26mm; }
    figure { margin: 0 0 3mm; } .photo-frame { height: 107mm; width: 100%; padding: 2mm; border: 1px solid #dce7ed; background: #fafcfd; }
    .photo-frame img { display: block; height: 100%; width: 100%; object-fit: contain; image-orientation: from-image; } figcaption { font-size: 7.5pt; padding: 1.5mm 0; overflow-wrap: anywhere; }
    @media screen { body { max-width: 186mm; margin: 20px auto; } article { margin-bottom: 20px; } }
  </style></head><body>${html}</body></html>`;
}
