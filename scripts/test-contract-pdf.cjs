// Regression checks use synthetic data only. Never commit live contracts or customer photographs.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
function load(relative, mocks = {}) {
  const filename = path.join(root, relative);
  const js = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const exports = {};
  vm.runInNewContext(js, { exports, require: name => {
    if (Object.hasOwn(mocks, name)) return mocks[name];
    throw new Error(`Unexpected dependency: ${name}`);
  }, console, Intl, Date, Uint8Array, AbortController, setTimeout, clearTimeout }, { filename });
  return exports;
}
const template = load('services/contract-pdf-template.ts');
const image = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==';
const contract = {
  id: 'synthetic-id', contractNumber: 'CNT-2026-TEST', organizationId: 'test-org', userId: 'test-user',
  renterInfo: { fullName: '<script>alert(1)</script>', idNumber: null, phoneNumber: '123', address: 'null' },
  rentalPeriod: { pickupDate: new Date('2026-10-12'), pickupTime: '12:00:00', pickupLocation: 'Office', dropoffDate: new Date('2026-11-12'), dropoffTime: '12:00:00', dropoffLocation: 'Office', totalCost: 450 },
  carInfo: { makeModel: 'Test Car', licensePlate: 'TEST123', year: null, mileage: null },
  carCondition: { fuelLevel: null, mileage: null, insuranceType: null, notes: '200 € + 250 € = 450 €\n2.000 km; 0,20 €/km' },
  damagePoints: [], photoUris: [], clientSignature: '', aadeStatus: 'pending', aadeDclId: null,
};
const issuer = { id: 'test-user', name: 'Agent' };
const company = { name: 'Test company', tradingName: 'Test Rentals', vat: 'EL000000000', address: 'Test office' };
const media = { photos: Array.from({ length: 10 }, (_, i) => ({ uri: image, description: `Photo ${i + 1} [source:libfile_private]` })), agentSignature: image, clientSignature: '' };
let html = template.renderContractHTML(contract, issuer, company, media);
assert.ok(html.includes('CNT-2026-TEST'));
assert.equal((html.match(/<figure>/g) || []).length, 0, 'Contract and appendix must be separate');
const appendix = template.renderContractHTML(contract, issuer, company, media, { documentKind: 'appendix' });
assert.equal((appendix.match(/<figure>/g) || []).length, 10, 'All ten attachments are exported in the appendix');
assert.equal((appendix.match(/class="photo-frame"/g) || []).length, 10);
assert.ok(!appendix.includes('class="summary"'));
assert.ok(!appendix.includes('libfile_private'));
assert.ok(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
assert.ok(!html.includes('<script>'));
assert.ok(!html.includes('libfile_private'));
assert.ok(!html.includes('antiparos'));
assert.ok(!html.includes('12:00:00'));
assert.ok(html.includes('ΠΡΟΣΧΕΔΙΟ'));
assert.ok(html.includes('Δεν τεκμηριώνεται υποβολή'));
assert.ok(!html.includes('DCL:'));
assert.ok(!html.includes('Βασική -'));
assert.ok(!html.includes('null'));
assert.ok(html.includes('Δεν έχει καταγραφεί υπογραφή'));
assert.ok(html.includes('<th>Καταγεγραμμένη προκαταβολή</th><td>Δεν έχει καταγραφεί</td>'), 'Unknown payments must not become zero');
html = template.renderContractHTML({ ...contract, aadeStatus: 'submitted', aadeDclId: 42, rentalPeriod: { ...contract.rentalPeriod, totalCost: 200, depositAmount: 50 } }, issuer, company, media, { includePhotos: false }, { version: 'approved-source-1', language: 'el', paragraphs: ['Exact approved wording <test>'] });
assert.ok(!html.includes('ΠΡΟΣΧΕΔΙΟ'));
assert.ok(html.includes('150,00'));
assert.ok(html.includes('DCL: 42'));
assert.ok(html.includes('Exact approved wording &lt;test&gt;'));
assert.ok(!html.includes('<figure>'));
html = template.renderContractHTML(contract, issuer, company, media, { language: 'en', includeDamages: false });
assert.ok(html.includes('RENTAL AGREEMENT'));
assert.ok(html.includes('ORIGINAL TERMS ARE REQUIRED'));
assert.ok(html.includes('No digital damage markers'));
assert.equal(template.isEmbeddedImage('javascript:alert(1)'), false);
assert.equal(template.isEmbeddedImage('https://example.com/p.png'), false);
assert.equal(template.isEmbeddedImage(image), true);
const revised = JSON.parse(fs.readFileSync(path.join(root, 'config/aggelos-rental-terms.json'), 'utf8'));
const termsHTML = template.renderTermsDocumentHTML(revised);
assert.equal(revised.sections.length, 22);
assert.ok(!termsHTML.includes('Green Motion'));
assert.ok(!termsHTML.includes('1,220,000'));
assert.ok(!termsHTML.includes('EUR 0.25'));
assert.ok(termsHTML.includes('EUR 0.20 is the final charge'));
assert.ok(termsHTML.includes('when supplied and accepted'));
assert.ok(termsHTML.includes('one or two years'));
for (const section of revised.sections) assert.ok(termsHTML.includes(template.escapeHTML(section.body)));
assert.ok(termsHTML.includes('column-count: 3'));
assert.throws(() => template.renderContractHTML(contract, issuer, company, { ...media, photos: [] }, { documentKind: 'appendix' }), /Δεν υπάρχουν/);
const withTerms = template.renderContractHTML(contract, issuer, company, media, {}, revised);
assert.equal((withTerms.match(/<article /g) || []).length, 2, 'Contract contains one front and one terms article');
assert.ok(withTerms.includes('not proof of fresh acceptance') || withTerms.includes('δεν αποδεικνύει νέα αποδοχή'));
console.log('Template: attachment completeness, escaping, dates, payment unknowns, AADE, insurance, signatures, terms readiness, English and options passed.');

async function serviceChecks() {
  let calls = []; let photoError = false; let photoURI = image;
  const db = { from(table) {
    const query = { select() { return query; }, eq() { return query; }, order() { return query; }, single: async () => ({ data: table === 'users' ? { name: 'Agent', signature_url: image } : { company_name: 'Test company', vat_number: 'EL000000000', primary_address: 'Test Office' } }), then(resolve, reject) { return Promise.resolve({ data: [{ photo_url: photoURI, description: 'test' }], error: photoError ? { message: 'offline' } : null }).then(resolve, reject); } };
    return query;
  } };
  const { PDFContractProService } = load('services/pdf-contract-pro.service.ts', {
    'expo-print': { printToFileAsync: async options => { calls.push(options); return { uri: 'test.pdf' }; } },
    'expo-sharing': {}, 'expo-file-system/legacy': {}, 'react-native': { Platform: { OS: 'ios' } },
    '../utils/supabase': { supabase: db }, './supabase-contract.service': { SupabaseContractService: { getContractById: async () => contract } },
    '../config/contract-terms': { APPROVED_CONTRACT_TERMS: {} }, './contract-pdf-template': template,
  });
  assert.equal(await PDFContractProService.generateProfessionalContract(contract, issuer), 'test.pdf');
  assert.ok(calls[0].html.includes('DRAFT') || calls[0].html.includes('ΠΡΟΣΧΕΔΙΟ'));
  assert.equal((calls[0].html.match(/<figure>/g) || []).length, 0);
  photoError = true;
  await assert.rejects(() => PDFContractProService.generateProfessionalContract(contract, issuer, { documentKind: 'appendix' }), /Δεν φορτώθηκαν τα συνημμένα/);
  assert.equal(calls.length, 1, 'A failed photo query must not print an incomplete PDF');
  photoError = false; photoURI = 'javascript:alert(1)';
  await assert.rejects(() => PDFContractProService.generateProfessionalContract(contract, issuer, { documentKind: 'appendix' }), /συνημμένο 1/);
  assert.equal(calls.length, 1);
  photoURI = image;
  await PDFContractProService.generateProfessionalContract(contract, issuer, { documentKind: 'appendix' });
  assert.equal((calls[1].html.match(/<figure>/g) || []).length, 1);
  assert.ok(!calls[1].html.includes('class="summary"'));
  await assert.rejects(() => PDFContractProService.generateProfessionalContract(contract, { id: 'wrong-user' }), /δημιουργό/);
  console.log('iOS service: persisted reload, embedded media, missing-media failure and issuer consistency passed.');
}
const { SupabaseContractService: MappingService } = load('services/supabase-contract.service.ts', {
  '../utils/supabase': { supabase: {} }, './photo-storage.service': { PhotoStorageService: {} },
  '../utils/vehicle-availability': {}, './vehicle.service': {},
});
const mapped = MappingService.mapSupabaseToContract({ id: 'test', user_id: 'test-user', contract_number: 'CNT-TEST', organization_id: 'test-org', pickup_date: '2026-10-12', dropoff_date: '2026-11-12', total_cost: '450', deposit_amount: null, insurance_cost: null });
assert.equal(mapped.contractNumber, 'CNT-TEST');
assert.equal(mapped.organizationId, 'test-org');
assert.equal(mapped.rentalPeriod.depositAmount, undefined);
assert.equal(mapped.rentalPeriod.insuranceCost, undefined);
assert.equal(mapped.carCondition.exteriorCondition, '');
console.log('Database mapping: contract identity, organization, unknown payments and unverified condition passed.');
serviceChecks().catch(error => { console.error(error); process.exitCode = 1; });
