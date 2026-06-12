/**
 * reportDownloader.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * All report-related download utilities for the Milestones Developmental Center
 * Psychological Report.
 *
 * Exports:
 *  - formatDate(dateStr)          → "DD.MM.YYYY"
 *  - calcAge(dobStr, assessStr)   → "X yrs Y mo"
 *  - buildReportHTML(data)        → full HTML string for PDF
 *  - downloadReport(data, apiUrl) → downloads PDF via backend & opens share sheet
 */

import { Alert, Linking } from 'react-native';


// ─── Date helpers ─────────────────────────────────────────────────────────────

export function formatDate(dateStr: string): string {
  if (!dateStr) return '–';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const dd   = String(d.getDate()).padStart(2, '0');
    const mm   = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}.${mm}.${yyyy}`;
  } catch {
    return dateStr;
  }
}

export function calcAge(dobStr: string, assessmentStr: string): string {
  if (!dobStr || !assessmentStr) return '–';
  try {
    const dob    = new Date(dobStr);
    const assess = new Date(assessmentStr);
    let years  = assess.getFullYear() - dob.getFullYear();
    let months = assess.getMonth()    - dob.getMonth();
    if (months < 0) { years--; months += 12; }
    if (years > 0) return `${years} yr${years !== 1 ? 's' : ''} ${months} mo`;
    return `${months} month${months !== 1 ? 's' : ''}`;
  } catch {
    return '–';
  }
}

// ─── Impression colour ────────────────────────────────────────────────────────

function impColor(imp: string): string {
  const l = (imp || '').toLowerCase();
  if (l === 'achieved') return '#1b5e20';
  if (l === 'delayed')  return '#e65100';
  if (l.includes('not')) return '#b71c1c';
  return '#555';
}

// ─── HTML builder ─────────────────────────────────────────────────────────────

export function buildReportHTML(data: any): string {
  const id        = data.identification_data         || {};
  const demo      = data.demographic_data            || {};
  const history   = data.history_of_present_illness  || {};
  const family    = data.family_history              || {};
  const personal  = data.personal_history            || {};
  const natal     = data.natalandneanatal_history     || {};
  const postnatal = data.postnatal_history           || {};
  const devHist   = data.developmental_history       || {};
  const scholastic= data.scholastic_history          || {};
  const play      = data.play_history                || {};

  const childName  = id.name || '–';
  const informants = [id.informant_a, id.informant_b].filter(Boolean).join(' and ');

  // ── Prenatal text
  const prenatal      = personal.prenatal || {};
  const prenatalParts: string[] = [];
  if (prenatal.prenatal_history === 'No')
    prenatalParts.push('No significant prenatal history.');
  if (prenatal.reaction_towards_pregnancy)
    prenatalParts.push(`Pregnancy was ${prenatal.reaction_towards_pregnancy.toLowerCase()}.`);
  if (prenatal.mother_health_during_pregnancy?.is_any_issue === 'No')
    prenatalParts.push("Mother's health during pregnancy was uneventful.");
  if (prenatal.medications_used_during_pregnancy && prenatal.medications_used_during_pregnancy !== 'None')
    prenatalParts.push(`Medications: ${prenatal.medications_used_during_pregnancy}.`);
  const prenatalText = prenatalParts.join(' ') || 'No significant prenatal history.';

  // ── Natal text
  const natalParts: string[] = [];
  if (natal.term)           natalParts.push(`Born at ${natal.term.toLowerCase()} term.`);
  if (natal.delivery_place) natalParts.push(`Delivery at ${natal.delivery_place}.`);
  if (natal.type_of_delivery) natalParts.push(`${natal.type_of_delivery} delivery.`);
  if (natal.birth_weight)   natalParts.push(`Birth weight: ${natal.birth_weight}.`);
  if (natal.birth_cry)      natalParts.push(`Birth cry: ${natal.birth_cry.toLowerCase()}.`);
  const natalText = natalParts.join(' ') || '–';

  const postnatalText = (postnatal.selected_conditions || []).length > 0
    ? postnatal.selected_conditions.join(', ')
    : postnatal.other_details || 'No significant postnatal complications.';

  // ── Family text
  const consanguinity = family.consanguinity === 'No'
    ? 'The child is born out of non-consanguineous parents.'
    : 'The child is born out of consanguineous parents.';

  const famParts: string[] = [consanguinity];
  const famType = (family.type_of_family || []).join('/');
  if (famType) famParts.push(`The family is a ${famType.toLowerCase()} family.`);
  if (demo.father) famParts.push(`Father: ${demo.father}${demo.father_occupation ? `, ${demo.father_occupation}` : ''}.`);
  if (demo.mother) famParts.push(`Mother: ${demo.mother}${demo.mother_occupation ? `, ${demo.mother_occupation}` : ''}.`);
  const mentalHist = family.mental_medical_history || {};
  if (mentalHist.selected === 'No')
    famParts.push('No significant family history of intellectual disability and mental illness.');
  else if (mentalHist.details)
    famParts.push(`Family history: ${mentalHist.details}.`);
  const familyText = famParts.join(' ');

  // ── School / play / illness
  const schoolText = scholastic.school_status === 'Not yet started school'
    ? 'The child has not yet started school.'
    : scholastic.school_status || '–';

  const playText = [
    play.play_behaviour  && `Play behaviour: ${play.play_behaviour}.`,
    play.play_preferences && play.play_preferences,
    play.group_behaviour  && play.group_behaviour,
    play.screen_time      && `Screen time: ${play.screen_time}.`,
    play.sleep_history    && `Sleep: ${play.sleep_history}.`,
  ].filter(Boolean).join(' ') || '–';

  const illnessText = [
    (history.mode_of_onset    || []).length && `Mode of onset: ${(history.mode_of_onset    || []).join(', ')}.`,
    (history.course_of_illness|| []).length && `Course: ${(history.course_of_illness|| []).join(', ')}.`,
    (history.progress         || []).length && `Progress: ${(history.progress         || []).join(', ')}.`,
  ].filter(Boolean).join(' ') || '–';

  // ── Developmental tables
  const grossMotor  = devHist.gross_motor || [];
  const language    = devHist.language    || [];
  const fineMotor   = devHist.fine_motor  || [];
  const social      = devHist.social      || [];
  const mainDevRows = [...grossMotor, ...language];

  const devRowsHTML = mainDevRows.map((r: any, i: number) =>
    `<tr>
      <td style="text-align:center">${i + 1}</td>
      <td>${r.skill}</td>
      <td style="text-align:center">${r.expected}</td>
      <td style="text-align:center">${r.achieved}</td>
      <td style="text-align:center;color:${impColor(r.impression)};font-weight:bold">${r.impression}</td>
    </tr>`
  ).join('');

  const maxSplit = Math.max(fineMotor.length, social.length);
  const splitRowsHTML = Array.from({ length: maxSplit }).map((_, i) => {
    const fm  = fineMotor[i] || {};
    const soc = social[i]    || {};
    return `<tr>
      <td>${fm.skill  || ''}</td>
      <td style="text-align:center">${fm.expected  || ''}</td>
      <td style="text-align:center;color:${impColor(fm.impression)};font-weight:bold">${fm.impression  || ''}</td>
      <td style="border-left:2px solid #555">${soc.skill || ''}</td>
      <td style="text-align:center">${soc.expected || ''}</td>
      <td style="text-align:center;color:${impColor(soc.impression)};font-weight:bold">${soc.impression || ''}</td>
    </tr>`;
  }).join('');

  const complaintsHTML = (data.presenting_complaints || [])
    .map((c: string) => `<li>${c}</li>`).join('');
  const recHTML = (data.Recommendation || '').split(',')
    .map((r: string) => r.trim()).filter(Boolean)
    .map((r: string) => `<li>${r}</li>`).join('');

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<style>
  body{font-family:'Times New Roman',serif;font-size:12pt;color:#000;padding:20px 28px;max-width:800px;margin:0 auto}
  .clinic-name{color:#2e7d32;font-size:16pt;font-weight:bold;text-align:center;text-transform:uppercase;letter-spacing:1px}
  .clinic-addr{font-size:9pt;text-align:center;color:#333;margin:2px 0}
  .report-title{text-align:center;font-size:14pt;font-weight:bold;text-decoration:underline;text-transform:uppercase;margin:8px 0 12px}
  table{width:100%;border-collapse:collapse;margin:8px 0}
  .info-table td{border:1px solid #555;padding:4px 8px;font-size:11pt}
  .dev-table th,.dev-table td{border:1px solid #555;padding:4px 6px;font-size:10pt}
  .dev-table th{background:#e8f5e9;text-align:center;font-weight:bold}
  .split-table th,.split-table td{border:1px solid #555;padding:4px 6px;font-size:10pt}
  .split-table th{background:#e8f5e9;text-align:center;font-weight:bold}
  .section-head{font-weight:bold;text-decoration:underline;font-size:12pt;margin:10px 0 4px}
  .bold{font-weight:bold}
  ul{margin-left:20px;margin-bottom:8px}
  ul li{margin-bottom:2px}
  p{text-align:justify;margin-bottom:6px;line-height:1.5}
  .summary-box{border:1px solid #aaa;border-radius:6px;padding:10px;background:#f9fbe7;margin:8px 0}
  .footer{display:flex;justify-content:space-between;margin-top:30px;font-size:10.5pt;border-top:1px solid #ccc;padding-top:10px}
  .footer-col{max-width:45%}
</style>
</head>
<body>
  <div class="clinic-name">Milestones Developmental Center</div>
  <div class="clinic-addr">59 / 37, SARADHA COLLEGE ROAD, SALEM – 636007 &nbsp;|&nbsp; Ph: 9047033633</div>
  <div class="report-title">Psychological Report</div>

  <table class="info-table">
    <tr>
      <td><span class="bold">Name:</span> ${childName}</td>
      <td><span class="bold">DOB:</span> ${formatDate(id.dob)}</td>
      <td><span class="bold">Date of Evaluation:</span> ${formatDate(id.date_of_assessment)}</td>
    </tr>
    <tr>
      <td><span class="bold">Father:</span> ${demo.father || '–'}</td>
      <td><span class="bold">Age:</span> ${calcAge(id.dob, id.date_of_assessment)}</td>
      <td><span class="bold">Reg. No.:</span> ${data.registration_number || '–'}</td>
    </tr>
    <tr>
      <td><span class="bold">Mother:</span> ${demo.mother || '–'}</td>
      <td><span class="bold">Mobile:</span> ${demo.mobile_number || '–'}</td>
      <td><span class="bold">Address:</span> ${demo.address_city || '–'}</td>
    </tr>
  </table>

  <p><span class="bold">Informant:</span> ${informants || '–'} &nbsp;&nbsp;
     <span class="bold">Reliability:</span> ${id.information_reliability || '–'} &nbsp;&nbsp;
     <span class="bold">Adequacy:</span> ${id.adequacy || '–'}</p>

  <div class="section-head">Presenting Complaints:</div>
  <ul>${complaintsHTML}</ul>

  <div class="section-head">History of Present Illness:</div>
  <p>${illnessText}</p>

  <div class="section-head">Birth History and Developmental History:</div>
  <p>${consanguinity}</p>
  <p><span class="bold">Pre-natal:</span> ${prenatalText}</p>
  <p><span class="bold">Peri-natal:</span> ${natalText}</p>
  <p><span class="bold">Postnatal:</span> ${postnatalText}</p>

  <div class="section-head">Developmental History:</div>
  <table class="dev-table">
    <thead>
      <tr><th>S.No</th><th>Development (Gross Motor &amp; Language)</th><th>Normal Dev.</th><th>Child Achieved</th><th>Impression</th></tr>
    </thead>
    <tbody>${devRowsHTML}</tbody>
  </table>

  <table class="split-table">
    <thead>
      <tr><th>Fine / Gross Motor</th><th>Expected</th><th>Impression</th><th>Social</th><th>Expected</th><th>Impression</th></tr>
    </thead>
    <tbody>${splitRowsHTML}</tbody>
  </table>

  <p><span class="bold">Family history:</span> ${familyText}</p>
  <p><span class="bold">School history:</span> ${schoolText}</p>
  <p><span class="bold">Play history:</span> ${playText}</p>
  <p><span class="bold">Treatment history:</span> ${data.treatment_history || 'None'}</p>

  <div class="section-head">Summary:</div>
  <div class="summary-box"><p>${data.OverAllSummary || '–'}</p></div>

  <p><span class="bold">Impression:</span> ${data.OverAllImpression || '–'}</p>

  <div class="section-head">Recommendations:</div>
  <ul>${recHTML}</ul>

  <p style="text-align:center;margin-top:20px">Reported by</p>
  <div class="footer">
    <div class="footer-col">
      <strong>Dr. D. Priyadharshni</strong><br/>
      Dch, DNB (pead)<br/>Paediatrician and play therapist<br/>Milestones Developmental Center
    </div>
    <div class="footer-col">
      <strong>Ms. Sivashankari</strong><br/>
      M.sc Clinical Psychology, B.sc PICS<br/>Psychologist<br/>Milestones Developmental Center
    </div>
  </div>
</body>
</html>`;
}

// ─── Main download function ───────────────────────────────────────────────────

/**
 * Downloads the psychological report PDF from the backend and opens
 * the OS share sheet so the user can save or send it.
 *
 * @param data      - History recording sheet data object from the API
 * @param apiUrl    - Base API URL (e.g. process.env.EXPO_PUBLIC_API_URL)
 * @param onStart   - Called when download begins (e.g. set loading state)
 * @param onFinish  - Called when download ends, success or failure
 */
export async function downloadReport(
  data: any,
  apiUrl: string,
  onStart?: () => void,
  onFinish?: () => void,
): Promise<void> {
  onStart?.();
  try {
    // The Django backend generates the PDF via xhtml2pdf.
    // Opening the URL in the device browser lets the user view & save it —
    // no native file-system module needed, works in Expo Go.
    const pdfUrl = `${apiUrl}/history-sheet/pdf/?reg_no=${encodeURIComponent(data.registration_number)}`;

    const canOpen = await Linking.canOpenURL(pdfUrl);
    if (!canOpen) {
      throw new Error('Cannot open the report URL on this device.');
    }
    await Linking.openURL(pdfUrl);
  } catch (err: any) {
    Alert.alert('Download Failed', err.message || 'Could not open the PDF. Please try again.');
  } finally {
    onFinish?.();
  }
}

/**
 * Downloads the combined Assessment Report PDF from the backend and opens it.
 */
export async function downloadAssessmentReport(
  regNo: string,
  apiUrl: string,
  onStart?: () => void,
  onFinish?: () => void,
): Promise<void> {
  onStart?.();
  try {
    const pdfUrl = `${apiUrl}/assessment-report/pdf/?reg_no=${encodeURIComponent(regNo)}`;
    const canOpen = await Linking.canOpenURL(pdfUrl);
    if (!canOpen) {
      throw new Error('Cannot open the report URL on this device.');
    }
    await Linking.openURL(pdfUrl);
  } catch (err: any) {
    Alert.alert('Download Failed', err.message || 'Could not open the PDF. Please try again.');
  } finally {
    onFinish?.();
  }
}
