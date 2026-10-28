/** Only verbatim, owner-approved terms belong here. Never substitute generic legal text.
 * Keys are organization IDs; versions must identify the approved source document.
 * Empty until the reverse of the original rental agreement has been supplied.
 */
export interface ApprovedContractTerms {
  version: string;
  language: 'el' | 'en';
  paragraphs: string[];
}
export const APPROVED_CONTRACT_TERMS: Readonly<Record<string, ApprovedContractTerms>> = {};
