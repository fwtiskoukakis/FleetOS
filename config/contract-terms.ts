import aggelosTerms from './aggelos-rental-terms.json';

/** Owner-authorised revision of the supplied rental terms. Version changes are prospective;
 * exporting historical records never establishes acceptance of replacement terms. */
export interface ApprovedContractTerms {
  version: string;
  language: 'el' | 'en';
  effectiveFrom?: string;
  paragraphs: string[];
  sections?: { title: string; body: string }[];
}
export const APPROVED_CONTRACT_TERMS: Readonly<Record<string, ApprovedContractTerms>> = {
  '91273b54-5339-4656-846c-5e27babbf1f2': { ...aggelosTerms, language: 'en' },
};
