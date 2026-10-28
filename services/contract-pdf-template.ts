import type { Contract, User } from '../models/contract.interface';
import type { ApprovedContractTerms } from '../config/contract-terms';

export interface PDFCompany {
  name?: string; tradingName?: string; vat?: string; registration?: string;
  address?: string; phone?: string; email?: string;
}
export interface PDFOptions {
  language?: 'el' | 'en'; includePhotos?: boolean; includeDamages?: boolean;
  documentKind?: 'contract' | 'appendix';
  /** Compatibility only: no QR is printed without an implemented verification service. */
  includeQRCode?: boolean;
}
export interface PDFMedia { photos: { uri: string; description?: string }[]; clientSignature: string; agentSignature: string }
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
  const m = /^(\d{2}):(\d{2})(?::\d{2})?$/.exec(value || '');
  return m && Number(m[1]) < 24 && Number(m[2]) < 60 ? `${m[1]}:${m[2]}` : '';
}
export function attachmentCaption(value: string | undefined, index: number): string {
  return clean(value).replace(/\[source:[^\]]*\]/gi, '').replace(/^IMG_[\w-]+\.(?:jpe?g|png)\s*[—–-]?\s*/i, '').trim() || `Συνημμένο ${index + 1}`;
}
export function hasCompleteTerms(terms?: ApprovedContractTerms): boolean {
  return !!(terms?.version && terms.paragraphs?.length && terms.paragraphs.every(p => clean(p)));
}
const CSS = `
  @page { size: A4; margin: 12mm; @bottom-right { content: counter(page); font: 7pt Arial, sans-serif; color: #64748b; } }
  * { box-sizing: border-box; } body { margin: 0; font: 8.3pt Arial, 'DejaVu Sans', sans-serif; color: #172337; line-height: 1.26; }
  header { display: table; width: 100%; border-bottom: 2px solid #04a9bf; padding-bottom: 2.5mm; margin-bottom: 2.5mm; }
  .brand { display: table-cell; width: 48%; font-size: 15pt; font-weight: 700; color: #008da4; vertical-align: middle; }
  .document { display: table-cell; font-size: 7.5pt; text-align: right; vertical-align: middle; } .document b { font-size: 9pt; }
  .company { font-size: 7.4pt; padding: 0 0 2mm; line-height: 1.35; } .notice { padding: 2mm; background: #fff7df; border: 1px solid #dfb44c; font-size: 7pt; margin: 1.5mm 0; }
  h2 { font-size: 8pt; color: #007c91; margin: 2.5mm 0 1.2mm; padding-bottom: 1mm; border-bottom: 1px solid #dce7ed; break-after: avoid; page-break-after: avoid; }
  .panels { display: table; table-layout: fixed; width: 100%; } .panel { display: table-cell; width: 50%; vertical-align: top; padding-right: 2.5mm; } .panel:last-child { padding-left: 2.5mm; padding-right: 0; }
  table { border-collapse: collapse; width: 100%; table-layout: fixed; } .details th, .details td { padding: 1.2mm; border-bottom: 1px solid #e7edf1; text-align: left; vertical-align: top; overflow-wrap: anywhere; }
  .details th { width: 40%; font-weight: 400; font-size: 7.3pt; color: #526173; background: #f6f9fb; } .details td { font-weight: 600; }
  tr, figure, .signature-section { break-inside: avoid; page-break-inside: avoid; } p, li { orphans: 2; widows: 2; } p { margin: 1.4mm 0; } .muted { color: #637084; font-size: 6.6pt; }
  .total { font-size: 11pt; color: #007c91; } .pre { white-space: pre-wrap; overflow-wrap: anywhere; }
  .new-page { break-before: page; page-break-before: always; } footer { border-top: 1px solid #dce7ed; color: #637084; font-size: 6.5pt; margin-top: 2.5mm; padding-top: 1.5mm; }
  .signatures { margin-top: 2mm; } .signatures td { width: 50%; padding: 2mm; text-align: center; vertical-align: top; border: 1px solid #dce7ed; }
  .signature { height: 19mm; margin: 1mm 0; border-bottom: 1px solid #8a96a3; } .signature img { width: 100%; height: 18mm; object-fit: contain; } .signature span { font-size: 7pt; color: #637084; line-height: 18mm; }
  .terms-intro { font-size: 6.2pt; margin-bottom: 2mm; } .terms-columns { column-count: 3; column-gap: 3.3mm; column-rule: .25pt solid #dce7ed; font-size: 5.4pt; line-height: 1.1; }
  .terms-columns h3 { font-size: 5.6pt; line-height: 1.1; color: #006f81; margin: 1.2mm 0 .6mm; break-after: avoid; page-break-after: avoid; }
  .terms-columns h3:first-child { margin-top: 0; } .terms-columns p { margin: 0 0 1mm; orphans: 2; widows: 2; }
  figure { margin: 0 0 3mm; } .photo-frame { height: 107mm; width: 100%; padding: 2mm; border: 1px solid #dce7ed; background: #fafcfd; }
  .photo-frame img { display: block; height: 100%; width: 100%; object-fit: contain; image-orientation: from-image; } figcaption { font-size: 7.5pt; padding: 1.5mm 0; overflow-wrap: anywhere; }
  @media screen { body { max-width: 186mm; margin: 20px auto; } article { margin-bottom: 20px; } }
`;
function documentHTML(body: string, title: string, language: string): string {
  return `<!DOCTYPE html><html lang="${language}"><head><meta charset="UTF-8"><title>${escapeHTML(title)}</title><style>${CSS}</style></head><body>${body}</body></html>`;
}
export function renderTermsArticle(terms: ApprovedContractTerms, header: string, footer = '', newPage = false): string {
  const content = terms.sections?.length
    ? terms.sections.map(s => `<h3>${escapeHTML(s.title)}</h3><p>${escapeHTML(s.body)}</p>`).join('')
    : terms.paragraphs.map(p => `<p>${escapeHTML(p)}</p>`).join('');
  return `<article class="terms-page${newPage ? ' new-page' : ''}">${header}<p class="terms-intro"><b>${escapeHTML(terms.version)}</b> · ${escapeHTML(terms.language.toUpperCase())}${terms.effectiveFrom ? ` · ${escapeHTML(terms.effectiveFrom)}` : ''}</p><div class="terms-columns">${content}</div>${footer}</article>`;
}
/** Identical terms layout for the standalone owner copy and the contract's reverse. */
export function renderTermsDocumentHTML(terms: ApprovedContractTerms): string {
  const header = `<header><div class="brand">AGGELOS RENTALS</div><div class="document"><b>TERMS AND CONDITIONS</b><br>${escapeHTML(terms.version)}</div></header>`;
  return documentHTML(renderTermsArticle(terms, header), terms.version, terms.language);
}

export function renderContractHTML(contract: Contract, user: User, company: PDFCompany, media: PDFMedia,
  options: PDFOptions = {}, terms?: ApprovedContractTerms): string {
  if (media.photos.some(p => !isEmbeddedImage(p.uri))) throw new Error('Τα συνημμένα πρέπει να φορτωθούν πριν από την εξαγωγή.');
  const en = options.language === 'en';
  const l = (el: string, english: string) => en ? english : el;
  const unknown = l('Δεν έχει καταγραφεί', 'Not recorded');
  const text = (v: unknown) => escapeHTML(clean(v) || unknown);
  const amount = (v: unknown) => numeric(v) === undefined ? unknown : escapeHTML(new Intl.NumberFormat(en ? 'en-IE' : 'el-GR', { style: 'currency', currency: 'EUR' }).format(Number(v)));
  const number = (v: unknown, suffix = '') => numeric(v) === undefined ? unknown : `${escapeHTML(Number(v).toLocaleString(en ? 'en-GB' : 'el-GR'))}${suffix}`;
  const row = (label: string, value: string) => `<tr><th>${escapeHTML(label)}</th><td>${value}</td></tr>`;
  const field = (label: string, value: unknown) => row(label, text(value));
  const table = (body: string) => `<table class="details">${body}</table>`;
  const section = (title: string, body: string) => `<section><h2>${escapeHTML(title)}</h2>${body}</section>`;
  const pair = (a: string, b: string) => `<div class="panels"><div class="panel">${a}</div><div class="panel">${b}</div></div>`;
  const numberLabel = clean(contract.contractNumber) || contract.id;
  const header = (title: string) => `<header><div class="brand">${text(company.tradingName || company.name)}</div><div class="document">${escapeHTML(title)}<br><b>${escapeHTML(numberLabel)}</b></div></header>`;
  const footer = `<footer>${escapeHTML(numberLabel)} · FleetOS${terms ? ` · ${escapeHTML(terms.version)}` : ''}</footer>`;
  const r = contract.renterInfo, p = contract.rentalPeriod, c = contract.carInfo, condition = contract.carCondition;
  const fuel = numeric(condition?.fuelLevel), mileage = numeric(condition?.mileage) ?? numeric(c.mileage), deposit = numeric(p.depositAmount);
  const balance = deposit !== undefined && numeric(p.totalCost) !== undefined ? Math.abs(p.totalCost - deposit) : undefined;
  const credit = deposit !== undefined && numeric(p.totalCost) !== undefined && deposit > p.totalCost;
  const insurance = condition?.insuranceType === 'full' ? l('Μικτή - βλ. απαλλαγή στις ειδικές συμφωνίες', 'Mixed cover - see agreed excess') : condition?.insuranceType === 'basic' ? l('Βασική - βάσει ασφαλιστηρίου', 'Basic - subject to policy') : unknown;
  const aadeConfirmed = (contract.aadeStatus === 'submitted' || contract.aadeStatus === 'completed') && Number(contract.aadeDclId) > 0;
  const aade = aadeConfirmed ? `DCL: ${escapeHTML(contract.aadeDclId)}` : l('Δεν τεκμηριώνεται υποβολή από τα διαθέσιμα στοιχεία του συστήματος.', 'Submission is not evidenced by the available system records.');
  const specific = [...new Set([clean(condition?.notes), clean(contract.observations)].filter(Boolean))];
  const conditionLabels: Record<string, string> = { good: l('Καλή', 'Good'), fair: l('Μέτρια', 'Fair'), poor: l('Κακή', 'Poor') };
  const conditionDescriptions = [[l('Εξωτερικό', 'Exterior'), condition?.exteriorCondition], [l('Εσωτερικό', 'Interior'), condition?.interiorCondition], [l('Μηχανικά', 'Mechanical'), condition?.mechanicalCondition]].filter(([, v]) => clean(v)).map(([label, v]) => `${label}: ${conditionLabels[v] || v}`).join(' · ');
  const damages = contract.damagePoints || [];
  const damageSummary = damages.length ? l(`${damages.length} καταγεγραμμένα σημεία· η αναλυτική καταγραφή εξάγεται στο ξεχωριστό παράρτημα.`, `${damages.length} recorded markers; the detailed record is exported in the separate appendix.`) : l('Δεν υπάρχουν ψηφιακά σημεία ζημιών. Αυτό δεν πιστοποιεί απουσία ζημιών· βλ. φωτογραφίες / πρωτότυπο δελτίο.', 'No digital damage markers are recorded. This does not certify the absence of damage; review photographs / original report.');
  const appendix = options.documentKind === 'appendix';
  let html = '';
  if (!appendix) {
    const draft = !hasCompleteTerms(terms) || !clean(company.name) || !clean(company.vat) || !clean(company.address);
    const banner = draft ? `<div class="notice">${escapeHTML(l('ΠΡΟΣΧΕΔΙΟ - Εκκρεμεί συμπλήρωση εταιρικών στοιχείων ή πλήρων όρων.', 'DRAFT - Company details or complete terms are missing.'))}</div>` : '';
    html = `<article class="summary">${header(l('ΣΥΜΒΟΛΑΙΟ ΜΙΣΘΩΣΗΣ', 'RENTAL AGREEMENT'))}${banner}<div class="company"><b>${text(company.name)}</b><br>${text(company.address)} · ${escapeHTML(l('ΑΦΜ', 'VAT'))}: ${text(company.vat)} · ${escapeHTML(l('ΓΕΜΗ', 'Reg.'))}: ${text(company.registration)}<br>${text(company.phone)} · ${text(company.email)}</div>
      ${pair(section(l('01 / ΜΙΣΘΩΤΗΣ - ΟΔΗΓΟΣ', '01 / RENTER - DRIVER'), table(field(l('Ονοματεπώνυμο', 'Full name'), r.fullName) + field(l('Ταυτότητα / Διαβατήριο', 'ID / Passport'), r.idNumber) + field(l('Άδεια οδήγησης', 'Driving licence'), r.driverLicenseNumber) + field(l('ΑΦΜ', 'Tax ID'), r.taxId) + field(l('Διεύθυνση', 'Address'), r.address) + field(l('Τηλέφωνο', 'Phone'), r.phoneNumber || r.phone) + field('Email', r.email))),
        section(l('02 / ΟΧΗΜΑ - ΠΕΡΙΟΔΟΣ', '02 / VEHICLE - PERIOD'), table(field(l('Όχημα / Πινακίδα', 'Vehicle / Plate'), [c.makeModel, c.licensePlate].filter(Boolean).join(' · ')) + field(l('Έτος / Χρώμα', 'Year / Colour'), [numeric(c.year) || '', clean(c.color)].filter(Boolean).join(' · ')) + field(l('Παραλαβή', 'Pickup'), [date(p.pickupDate), time(p.pickupTime)].filter(Boolean).join(' · ')) + field(l('Σημείο παραλαβής', 'Pickup location'), p.pickupLocation) + field(l('Επιστροφή', 'Return'), [date(p.dropoffDate), time(p.dropoffTime)].filter(Boolean).join(' · ')) + field(l('Σημείο επιστροφής', 'Return location'), p.dropoffLocation))))}
      ${pair(section(l('03 / ΟΙΚΟΝΟΜΙΚΑ', '03 / FINANCIAL DETAILS'), table(row(l('Συνολικό τίμημα', 'Total agreed price'), `<b class="total">${amount(p.totalCost)}</b>`) + row(l('Καταγεγραμμένη προκαταβολή', 'Recorded advance payment'), amount(p.depositAmount)) + row(credit ? l('Πιστωτικό', 'Credit') : l('Υπόλοιπο βάσει προκαταβολής', 'Balance based on advance'), amount(balance)) + row(l('Χρέωση ασφάλισης', 'Insurance charge'), amount(p.insuranceCost)))),
        section(l('04 / ΚΑΤΑΣΤΑΣΗ ΠΑΡΑΔΟΣΗΣ', '04 / HANDOVER CONDITION'), table(row(l('Χιλιομετρητής', 'Odometer'), number(mileage, ' km')) + row(l('Καύσιμο', 'Fuel'), fuel !== undefined && fuel <= 8 ? `${fuel}/8` : unknown) + row(l('Ασφάλιση', 'Insurance'), escapeHTML(insurance)) + row(l('Σημεία ζημιών', 'Damage markers'), String(damages.length)))))}
      <p class="muted">${escapeHTML(l('Το τίμημα δεν αποδεικνύει πληρωμή. Η άγνωστη καταβολή δεν θεωρείται μηδενική. Η χρέωση ασφάλισης δεν προστίθεται ξανά αυτόματα στο σύνολο.', 'The price is not proof of payment. An unrecorded payment is not zero. Insurance is not automatically added to the total a second time.'))}</p>
      ${section(l('05 / ΕΙΔΙΚΕΣ ΣΥΜΦΩΝΙΕΣ - ΠΑΡΑΤΗΡΗΣΕΙΣ', '05 / SPECIFIC CONDITIONS - NOTES'), specific.length ? specific.map(s => `<p class="pre">${escapeHTML(s)}</p>`).join('') : `<p>${escapeHTML(unknown)}</p>`)}
      ${conditionDescriptions ? `<p class="muted">${escapeHTML(conditionDescriptions)}</p>` : ''}<p class="muted">${escapeHTML(damageSummary)}</p><p class="muted">${escapeHTML(l('ΑΑΔΕ', 'AADE'))}: ${aade}</p>
      <div class="signature-section"><h2>${escapeHTML(l('06 / ΟΡΟΙ ΚΑΙ ΥΠΟΓΡΑΦΕΣ', '06 / TERMS AND SIGNATURES'))}</h2>
      <p class="muted">${escapeHTML(l('Οι πλήρεις όροι ακολουθούν στη δεύτερη σελίδα. Οι φωτογραφίες και η αναλυτική καταγραφή ζημιών εξάγονται χωριστά. Αποθηκευμένη υπογραφή ή επανεκτύπωση δεν αποδεικνύει νέα αποδοχή τροποποιημένων όρων· απαιτείται επιβεβαίωση της ισχύουσας έκδοσης.', 'Complete terms follow on page two. Photographs and the detailed damage record are exported separately. A stored signature or reprint is not proof of fresh acceptance of amended terms; acceptance of the applicable version must be established.'))}</p>
      <table class="signatures"><tr>${[[l('Ο μισθωτής', 'Renter'), r.fullName, media.clientSignature], [l('Για την εκμισθώτρια', 'For the lessor'), user.name, media.agentSignature]].map(([role, name, uri]) => `<td><b>${escapeHTML(role)}</b><div class="signature">${isEmbeddedImage(uri) ? `<img src="${uri}" alt="${escapeHTML(role)}">` : `<span>${escapeHTML(l('Δεν έχει καταγραφεί υπογραφή', 'No signature recorded'))}</span>`}</div><div>${text(name)}</div><p>${escapeHTML(l('Ημερομηνία υπογραφής', 'Signature date'))}: ______________</p></td>`).join('')}</tr></table></div>${footer}</article>`;
    html += hasCompleteTerms(terms) ? renderTermsArticle(terms!, header(l('ΓΕΝΙΚΟΙ ΟΡΟΙ ΜΙΣΘΩΣΗΣ', 'GENERAL RENTAL TERMS')), '', true)
      : `<article class="new-page">${header(l('ΓΕΝΙΚΟΙ ΟΡΟΙ ΜΙΣΘΩΣΗΣ', 'GENERAL RENTAL TERMS'))}<div class="notice">${escapeHTML(l('ΕΚΚΡΕΜΕΙ ΤΟ ΠΡΩΤΟΤΥΠΟ ΚΕΙΜΕΝΟ ΟΡΩΝ', 'ORIGINAL TERMS ARE REQUIRED'))}</div></article>`;
  } else {
    if (options.includeDamages !== false && damages.length) {
      const views: Record<string, string> = { front: l('Εμπρός', 'Front'), rear: l('Πίσω', 'Rear'), left: l('Αριστερά', 'Left'), right: l('Δεξιά', 'Right') };
      html += `<article>${header(l('ΠΑΡΑΡΤΗΜΑ / ΚΑΤΑΓΡΑΦΗ ΖΗΜΙΩΝ', 'APPENDIX / DAMAGE RECORD'))}<p>${text(r.fullName)} · ${text(c.licensePlate)}</p><ol>${damages.map(d => `<li>${text(views[d.view] || d.view)}: ${text(d.description)} (${text(d.severity)}; x=${number(d.x)}%, y=${number(d.y)}%)</li>`).join('')}</ol>${footer}</article>`;
    }
    for (let i = 0; i < media.photos.length; i += 2) {
      html += `<article class="attachments${html ? ' new-page' : ''}">${header(l(`ΠΑΡΑΡΤΗΜΑ / ΣΥΝΗΜΜΕΝΑ ${i + 1}-${Math.min(i + 2, media.photos.length)} ΑΠΟ ${media.photos.length}`, `APPENDIX / ATTACHMENTS ${i + 1}-${Math.min(i + 2, media.photos.length)} OF ${media.photos.length}`))}${media.photos.slice(i, i + 2).map((photo, j) => `<figure><div class="photo-frame"><img src="${photo.uri}" alt="${escapeHTML(l('Συνημμένο', 'Attachment'))} ${i + j + 1}"></div><figcaption>${i + j + 1}. ${escapeHTML(attachmentCaption(photo.description, i + j))}</figcaption></figure>`).join('')}${footer}</article>`;
    }
    if (!html) throw new Error('Δεν υπάρχουν φωτογραφίες ή καταγεγραμμένες ζημιές για παράρτημα.');
  }
  return documentHTML(html, numberLabel, en ? 'en' : 'el');
}
