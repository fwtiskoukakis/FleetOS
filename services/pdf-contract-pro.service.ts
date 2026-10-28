import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import type { Contract, User } from '../models/contract.interface';
import { supabase } from '../utils/supabase';
import { SupabaseContractService } from './supabase-contract.service';
import { APPROVED_CONTRACT_TERMS } from '../config/contract-terms';
import { renderContractHTML, isEmbeddedImage, PDFOptions, PDFCompany, PDFMedia } from './contract-pdf-template';

const BASE64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
function encodeBase64(bytes: Uint8Array): string {
  const chunks: string[] = [];
  for (let start = 0; start < bytes.length; start += 12288) {
    let chunk = '';
    const end = Math.min(start + 12288, bytes.length);
    for (let i = start; i < end; i += 3) {
      const a = bytes[i], b = bytes[i + 1], c = bytes[i + 2];
      chunk += BASE64[a >> 2] + BASE64[((a & 3) << 4) | ((b || 0) >> 4)]
        + (i + 1 < bytes.length ? BASE64[((b & 15) << 2) | ((c || 0) >> 6)] : '=')
        + (i + 2 < bytes.length ? BASE64[c & 63] : '=');
    }
    chunks.push(chunk);
  }
  return chunks.join('');
}

/** iOS print HTML cannot resolve local images: all media must be embedded first. */
async function embedImage(uri: string): Promise<string> {
  if (isEmbeddedImage(uri)) return uri.replace(/\s/g, '');
  if (/^file:\/\/|^content:\/\//i.test(uri)) {
    const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
    const ext = uri.split('?')[0].split('.').pop()?.toLowerCase();
    const mime = ext === 'png' ? 'image/png' : ext === 'svg' ? 'image/svg+xml' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
    return `data:${mime};base64,${base64}`;
  }
  if (!/^https:\/\//i.test(uri)) throw new Error('Μη υποστηριζόμενη μορφή εικόνας ή υπογραφής.');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  try {
    const response = await fetch(uri, { signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const mime = response.headers.get('content-type')?.split(';')[0].trim().toLowerCase();
    if (!mime || !/^image\/(png|jpe?g|webp|gif|svg\+xml)$/.test(mime)) throw new Error('Η διεύθυνση δεν επέστρεψε εικόνα.');
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (!bytes.length) throw new Error('Κενή εικόνα.');
    return `data:${mime};base64,${encodeBase64(bytes)}`;
  } finally { clearTimeout(timeout); }
}

export class PDFContractProService {
  static async generateProfessionalContract(contract: Contract, user: User, options: PDFOptions = {}): Promise<string> {
    // Open synchronously from the click so asynchronous image loading does not trigger popup blocking.
    const printWindow = Platform.OS === 'web' ? window.open('', '_blank') : null;
    if (Platform.OS === 'web' && !printWindow) throw new Error('Επιτρέψτε τα αναδυόμενα παράθυρα για να ανοίξει η εκτύπωση.');
    try {
      // Reload persisted data: dashboard presentation/demo status must never become a fiscal statement.
      const current = await SupabaseContractService.getContractById(contract.id, false);
      if (!current) throw new Error('Το συμβόλαιο δεν βρέθηκε. Ανανεώστε την καρτέλα.');
      if (current.userId !== user.id) throw new Error('Τα στοιχεία εκδότη δεν αντιστοιχούν στον δημιουργό του συμβολαίου.');
      const { data: profile, error: profileError } = await supabase.from('users')
        .select('id,name,email,phone,address,signature_url,company_name,company_vat_number,company_address')
        .eq('id', current.userId).single();
      if (profileError || !profile) throw new Error('Δεν φορτώθηκαν τα στοιχεία του εκδότη. Δοκιμάστε ξανά.');
      const issuer: User = { ...user, name: profile.name, signature: '', signatureUrl: profile.signature_url || '' };
      let company: PDFCompany = {
        name: profile.company_name, vat: profile.company_vat_number, address: profile.company_address || profile.address,
        phone: profile.phone, email: profile.email,
      };
      if (current.organizationId) {
        const { data: org, error } = await supabase.from('organizations')
          .select('company_name,trading_name,vat_number,registration_number,primary_address,city,postal_code,phone_primary,email_primary')
          .eq('id', current.organizationId).single();
        if (error || !org) throw new Error('Δεν φορτώθηκαν τα στοιχεία της εταιρείας του συμβολαίου. Δοκιμάστε ξανά.');
        company = {
          name: org.company_name, tradingName: org.trading_name, vat: org.vat_number, registration: org.registration_number,
          address: [org.primary_address, org.city, org.postal_code].filter(Boolean).join(', '),
          phone: org.phone_primary, email: org.email_primary,
        };
      }
      const media: PDFMedia = { photos: [], clientSignature: '', agentSignature: '' };
      if (options.includePhotos !== false) {
        // A failed query must stop export, not silently produce a contract missing evidence.
        const { data: photos, error } = await supabase.from('contract_photos').select('id,photo_url,description,created_at')
          .eq('contract_id', current.id).order('created_at', { ascending: true }).order('id', { ascending: true });
        if (error) throw new Error('Δεν φορτώθηκαν τα συνημμένα. Το PDF δεν δημιουργήθηκε χωρίς αυτά.');
        for (const [i, photo] of (photos || []).entries()) {
          try { media.photos.push({ uri: await embedImage(photo.photo_url), description: photo.description }); }
          catch { throw new Error(`Δεν φορτώθηκε το συνημμένο ${i + 1}. Ελέγξτε τη σύνδεση και δοκιμάστε ξανά.`); }
        }
      }
      for (const [key, uri] of [['clientSignature', current.clientSignature], ['agentSignature', issuer.signatureUrl]] as const) {
        if (uri) {
          try { media[key] = await embedImage(uri); }
          catch { throw new Error('Δεν φορτώθηκε μία από τις καταγεγραμμένες υπογραφές. Δοκιμάστε ξανά.'); }
        }
      }
      const terms = current.organizationId ? APPROVED_CONTRACT_TERMS[current.organizationId] : undefined;
      const rendered = renderContractHTML(current, issuer, company, media, options, terms);
      // iOS uses native page margins; Android/web use CSS @page margins. Avoid double margins.
      const html = Platform.OS === 'ios' ? rendered.replace('@page { size: A4; margin: 12mm;', '@page { size: A4; margin: 0;') : rendered;
      if (printWindow) {
        printWindow.document.open();
        printWindow.document.write(html);
        printWindow.document.close();
        await Promise.all(Array.from(printWindow.document.images).map(img => img.complete
          ? (img.naturalWidth > 0 ? Promise.resolve() : Promise.reject(new Error('Δεν εμφανίστηκε μία εικόνα στην εκτύπωση.')))
          : new Promise<void>((resolve, reject) => { img.onload = () => resolve(); img.onerror = () => reject(new Error('Δεν εμφανίστηκε μία εικόνα στην εκτύπωση.')); })));
        printWindow.focus();
        printWindow.print();
        return 'web-print-initiated';
      }
      const { uri } = await Print.printToFileAsync({ html, base64: false, width: 595, height: 842,
        margins: { left: 34, right: 34, top: 34, bottom: 34 } });
      return uri;
    } catch (error) {
      printWindow?.close();
      throw error;
    }
  }

  static async sharePDF(uri: string, contractId: string): Promise<void> {
    if (!await Sharing.isAvailableAsync()) throw new Error('Η κοινοποίηση δεν είναι διαθέσιμη σε αυτή τη συσκευή.');
    await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: `Συμβόλαιο ${contractId}`, UTI: 'com.adobe.pdf' });
  }
}
