import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Platform,
  StatusBar,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { formatDate, calcAge, downloadReport } from '@/utils/reportDownloader';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? '';


// ─── UI-only helpers ─────────────────────────────────────────────────────────

function getImpressionColor(imp: string) {
  const lower = (imp || '').toLowerCase();
  if (lower === 'achieved') return '#1b5e20';
  if (lower === 'delayed')  return '#e65100';
  if (lower.includes('not achieved') || lower.includes('not present')) return '#b71c1c';
  return '#555';
}

// ─── Small reusable pieces ───────────────────────────────────────────────────
const SectionHead = ({ children }: { children: string }) => (
  <Text style={s.sectionHead}>{children}</Text>
);

const Narrative = ({ label, value }: { label?: string; value: string }) => (
  <Text style={s.narrative}>
    {label ? <Text style={s.bold}>{label} </Text> : null}
    {value}
  </Text>
);

const BulletItem = ({ text }: { text: string }) => (
  <View style={s.bulletRow}>
    <Text style={s.bulletArrow}>➤</Text>
    <Text style={s.bulletText}>{text}</Text>
  </View>
);

// ─── Info table row ──────────────────────────────────────────────────────────

const formatKey = (k: string) => {
  return k.replace(/[_-]/g, ' ').trim().replace(/^\w/, (c) => c.toUpperCase());
};

const InfoRow = ({ cells }: { cells: { label: string; value: string; flex?: number }[] }) => (
  <View style={s.infoRow}>
    {cells.map((c, i) => (
      <View key={i} style={[s.infoCell, { flex: c.flex ?? 1 }, i < cells.length - 1 && s.infoCellRight]}>
        <Text style={s.infoCellLabel}>{c.label}: </Text>
        <Text style={s.infoCellValue}>{c.value || '–'}</Text>
      </View>
    ))}
  </View>
);

// ─── Developmental table (main) ──────────────────────────────────────────────

const DevTable = ({ rows }: { rows: any[] }) => (
  <View style={s.table}>
    {/* Header */}
    <View style={[s.tableRow, s.tableHeader]}>
      <Text style={[s.th, { flex: 0.4 }]}>S.No</Text>
      <Text style={[s.th, { flex: 2.2 }]}>Development</Text>
      <Text style={[s.th, { flex: 1.2 }]}>Normal Dev.</Text>
      <Text style={[s.th, { flex: 1.2 }]}>Child Achieved</Text>
      <Text style={[s.th, { flex: 1 }]}>Impression</Text>
    </View>
    {rows.map((r, i) => (
      <View key={i} style={[s.tableRow, i % 2 === 1 && s.tableRowAlt]}>
        <Text style={[s.td, { flex: 0.4 }]}>{i + 1}</Text>
        <Text style={[s.td, { flex: 2.2 }]}>{r.skill}</Text>
        <Text style={[s.td, { flex: 1.2 }, s.tdCenter]}>{r.expected}</Text>
        <Text style={[s.td, { flex: 1.2 }, s.tdCenter]}>{r.achieved}</Text>
        <Text style={[s.td, { flex: 1 }, s.tdCenter, { color: getImpressionColor(r.impression), fontWeight: '700' }]}>
          {r.impression}
        </Text>
      </View>
    ))}
  </View>
);

// ─── Split table (fine motor | social) ───────────────────────────────────────

const SplitTable = ({ left, right }: { left: any[]; right: any[] }) => {
  const maxRows = Math.max(left.length, right.length);
  return (
    <View style={s.table}>
      {/* Header */}
      <View style={[s.tableRow, s.tableHeader]}>
        <Text style={[s.th, { flex: 1.6 }]}>Fine / Gross Motor</Text>
        <Text style={[s.th, { flex: 0.9 }]}>Expected</Text>
        <Text style={[s.th, { flex: 0.9 }]}>Impression</Text>
        <View style={s.splitDivider} />
        <Text style={[s.th, { flex: 1.6 }]}>Social</Text>
        <Text style={[s.th, { flex: 0.9 }]}>Expected</Text>
        <Text style={[s.th, { flex: 0.9 }]}>Impression</Text>
      </View>
      {Array.from({ length: maxRows }).map((_, i) => {
        const fm = left[i] || {};
        const soc = right[i] || {};
        return (
          <View key={i} style={[s.tableRow, i % 2 === 1 && s.tableRowAlt]}>
            <Text style={[s.td, { flex: 1.6 }]}>{fm.skill || ''}</Text>
            <Text style={[s.td, { flex: 0.9 }, s.tdCenter]}>{fm.expected || ''}</Text>
            <Text style={[s.td, { flex: 0.9 }, s.tdCenter, { color: getImpressionColor(fm.impression), fontWeight: '700' }]}>
              {fm.impression || ''}
            </Text>
            <View style={s.splitDivider} />
            <Text style={[s.td, { flex: 1.6 }]}>{soc.skill || ''}</Text>
            <Text style={[s.td, { flex: 0.9 }, s.tdCenter]}>{soc.expected || ''}</Text>
            <Text style={[s.td, { flex: 0.9 }, s.tdCenter, { color: getImpressionColor(soc.impression), fontWeight: '700' }]}>
              {soc.impression || ''}
            </Text>
          </View>
        );
      })}
    </View>
  );
};

// ─── Report body ─────────────────────────────────────────────────────────────

function ReportBody({ data }: { data: any }) {
  const id = data.identification_data || {};
  const demo = data.demographic_data || {};
  const history = data.history_of_present_illness || {};
  const family = data.family_history || {};
  const personal = data.personal_history || {};
  const natal = data.natalandneanatal_history || {};
  const postnatal = data.postnatal_history || {};
  const devHist = data.developmental_history || {};
  const scholastic = data.scholastic_history || {};
  const play = data.play_history || {};

  const childName = id.name || '–';
  const informants = [id.informant_a, id.informant_b].filter(Boolean).join(' and ');

  const grossMotor = devHist.gross_motor || [];
  const language = devHist.language || [];
  const mainDevRows = [...grossMotor, ...language];

  // Prenatal narrative
  const prenatal = personal.prenatal || {};
  const prenatalParts: string[] = [];
  if (prenatal.prenatal_history === 'No') prenatalParts.push('No significant prenatal history.');
  if (prenatal.reaction_towards_pregnancy) prenatalParts.push(`Pregnancy was ${prenatal.reaction_towards_pregnancy.toLowerCase()}.`);
  if (prenatal.mother_health_during_pregnancy?.is_any_issue === 'No') prenatalParts.push("Mother's health during pregnancy was uneventful.");
  if (prenatal.medications_used_during_pregnancy && prenatal.medications_used_during_pregnancy !== 'None')
    prenatalParts.push(`Medications: ${prenatal.medications_used_during_pregnancy}.`);
  
  const processedPrenatalKeys = new Set([
    'prenatal_history', 'conceptual_age_of_mother', 'reaction_towards_pregnancy',
    'abortion_attempt', 'mother_health_during_pregnancy', 'medications_used_during_pregnancy',
    'other_complaints'
  ]);
  Object.entries(prenatal).forEach(([k, val]) => {
    if (!processedPrenatalKeys.has(k) && typeof val === 'string' && val.trim()) {
      prenatalParts.push(`${formatKey(k)}: ${val.trim()}.`);
    }
  });
  const prenatalText = prenatalParts.join(' ') || 'No significant prenatal history.';

  // Natal narrative
  const natalParts: string[] = [];
  if (natal.term) natalParts.push(`Born at ${natal.term.toLowerCase()} term.`);
  if (natal.delivery_place) natalParts.push(`Delivery at ${natal.delivery_place}.`);
  if (natal.type_of_delivery) natalParts.push(`${natal.type_of_delivery} delivery.`);
  if (natal.birth_weight) natalParts.push(`Birth weight: ${natal.birth_weight}.`);
  if (natal.birth_cry) natalParts.push(`Birth cry: ${natal.birth_cry.toLowerCase()}.`);
  
  const processedNatalKeys = new Set(['term', 'delivery_place', 'type_of_delivery', 'birth_weight', 'birth_cry', 'caesarean_reason']);
  Object.entries(natal).forEach(([k, val]) => {
    if (!processedNatalKeys.has(k) && typeof val === 'string' && val.trim()) {
      natalParts.push(`${formatKey(k)}: ${val.trim()}.`);
    }
  });
  const natalText = natalParts.join(' ') || '–';

  // Postnatal narrative
  const postnatalParts: string[] = [];
  if ((postnatal.selected_conditions || []).length > 0) {
    postnatalParts.push(postnatal.selected_conditions.join(', '));
  } else if (postnatal.other_details) {
    postnatalParts.push(postnatal.other_details);
  }
  
  const processedPostnatalKeys = new Set(['selected_conditions', 'other_details']);
  Object.entries(postnatal).forEach(([k, val]) => {
    if (!processedPostnatalKeys.has(k) && typeof val === 'string' && val.trim()) {
      postnatalParts.push(`${formatKey(k)}: ${val.trim()}.`);
    }
  });
  const postnatalText = postnatalParts.join(' ') || 'No significant postnatal complications.';

  const consanguinity = family.consanguinity === 'No'
    ? 'The child is born out of non-consanguineous parents.'
    : 'The child is born out of consanguineous parents.';

  // Family narrative
  const famParts: string[] = [consanguinity];
  const famType = (family.type_of_family || []).join('/');
  if (famType) famParts.push(`The family is a ${famType.toLowerCase()} family.`);
  if (demo.father) famParts.push(`Father: ${demo.father}${demo.father_occupation ? `, ${demo.father_occupation}` : ''}.`);
  if (demo.mother) famParts.push(`Mother: ${demo.mother}${demo.mother_occupation ? `, ${demo.mother_occupation}` : ''}.`);
  const mentalHist = family.mental_medical_history || {};
  if (mentalHist.selected === 'No') famParts.push('No significant family history of intellectual disability and mental illness.');
  else if (mentalHist.details) famParts.push(`Family history: ${mentalHist.details}.`);
  
  const processedFamilyKeys = new Set(['consanguinity', 'type_of_family', 'family_genogram', 'mental_medical_history']);
  Object.entries(family).forEach(([k, val]) => {
    if (!processedFamilyKeys.has(k) && typeof val === 'string' && val.trim()) {
      famParts.push(`${formatKey(k)}: ${val.trim()}.`);
    }
  });
  const familyText = famParts.join(' ');

  // School
  const schoolParts: string[] = [];
  if (scholastic.school_status === 'Not yet started school') {
    schoolParts.push('The child has not yet started school.');
  } else {
    const mainSch = [scholastic.type_of_school, scholastic.present_class, scholastic.scholastic_performance].filter(Boolean).join(', ');
    if (mainSch) {
      schoolParts.push(mainSch);
    } else if (scholastic.school_status) {
      schoolParts.push(scholastic.school_status);
    }
  }
  const processedSchoolKeys = new Set([
    'school_status', 'type_of_school', 'age_of_entry', 'present_class', 'medium_of_instruction',
    'scholastic_performance', 'disciplinary_problems', 'regularity', 'peer_group_adjustment',
    'relation_with_authorities', 'other_info'
  ]);
  Object.entries(scholastic).forEach(([k, val]) => {
    if (!processedSchoolKeys.has(k) && typeof val === 'string' && val.trim()) {
      schoolParts.push(`${formatKey(k)}: ${val.trim()}.`);
    }
  });
  const schoolText = schoolParts.join(' ') || '–';

  // Play
  const playParts = [
    play.play_behaviour && `Play behaviour: ${play.play_behaviour}.`,
    play.play_preferences && play.play_preferences,
    play.group_behaviour && play.group_behaviour,
    play.screen_time && `Screen time: ${play.screen_time}.`,
    play.sleep_history && `Sleep: ${play.sleep_history}.`,
  ].filter(Boolean);
  const processedPlayKeys = new Set([
    'play_behaviour', 'play_preferences', 'rule_knowledge', 'group_behaviour', 'leisure_time',
    'likes', 'dislikes', 'medical_history', 'sleep_history', 'allergy_history', 'screen_time'
  ]);
  Object.entries(play).forEach(([k, val]) => {
    if (!processedPlayKeys.has(k) && typeof val === 'string' && val.trim()) {
      playParts.push(`${formatKey(k)}: ${val.trim()}.`);
    }
  });
  const playText = playParts.join(' ') || '–';

  // Illness
  const illnessParts = [
    (history.mode_of_onset || []).length && `Mode of onset: ${(history.mode_of_onset || []).join(', ')}.`,
    (history.course_of_illness || []).length && `Course: ${(history.course_of_illness || []).join(', ')}.`,
    (history.progress || []).length && `Progress: ${(history.progress || []).join(', ')}.`,
  ].filter(Boolean);
  const processedHistKeys = new Set(['mode_of_onset', 'course_of_illness', 'progress']);
  Object.entries(history).forEach(([k, val]) => {
    if (!processedHistKeys.has(k) && typeof val === 'string' && val.trim()) {
      illnessParts.push(`${formatKey(k)}: ${val.trim()}.`);
    }
  });
  const illnessText = illnessParts.join(' ') || '–';

  const recommendations = (data.Recommendation || '').split(',').map((r: string) => r.trim()).filter(Boolean);

  return (
    <View style={s.reportBody}>
      {/* ── CLINIC HEADER ── */}
      <View style={s.clinicHeader}>
        <Text style={s.clinicName}>MILESTONES DEVELOPMENTAL CENTER</Text>
        <Text style={s.clinicAddress}>59 / 37, SARADHA COLLEGE ROAD, SALEM – 636007  |  Ph: 9047033633</Text>
        <Text style={s.reportTitle}>PSYCHOLOGICAL REPORT</Text>
      </View>

      {/* ── PATIENT INFO TABLE ── */}
      <View style={s.infoTable}>
        <InfoRow cells={[
          { label: 'Name', value: childName, flex: 2 },
          { label: 'DOB', value: formatDate(id.dob) },
          { label: 'Date of Evaluation', value: formatDate(id.date_of_assessment) },
        ]} />
        <InfoRow cells={[
          { label: 'Father', value: demo.father, flex: 2 },
          { label: 'Age', value: calcAge(id.dob, id.date_of_assessment) },
          { label: 'Reg. No.', value: data.registration_number },
        ]} />
        <InfoRow cells={[
          { label: 'Mother', value: demo.mother, flex: 2 },
          { label: 'Mobile', value: demo.mobile_number },
          { label: 'Address', value: demo.address_city },
        ]} />
      </View>

      {/* Informant */}
      <Text style={s.narrative}>
        <Text style={s.bold}>Informant: </Text>{informants || '–'}
        {'   '}
        <Text style={s.bold}>Reliability: </Text>{id.information_reliability || '–'}
        {'   '}
        <Text style={s.bold}>Adequacy: </Text>{id.adequacy || '–'}
      </Text>

      {/* ── PRESENTING COMPLAINTS ── */}
      <SectionHead>Presenting Complaints:</SectionHead>
      {(data.presenting_complaints || []).map((c: string, i: number) => (
        <BulletItem key={i} text={c} />
      ))}

      {/* ── HISTORY OF PRESENT ILLNESS ── */}
      <SectionHead>History of Present Illness:</SectionHead>
      <Narrative value={illnessText} />

      {/* ── BIRTH & DEVELOPMENTAL HISTORY ── */}
      <SectionHead>Birth History and Developmental History:</SectionHead>
      <Narrative value={consanguinity} />
      <Narrative label="Pre-natal:" value={prenatalText} />
      <Narrative label="Peri-natal:" value={natalText} />
      <Narrative label="Postnatal:" value={postnatalText} />

      {/* ── DEVELOPMENTAL HISTORY TABLE ── */}
      <SectionHead>Developmental History:</SectionHead>
      <Text style={s.tableCaption}>Gross Motor &amp; Language Milestones</Text>
      <DevTable rows={mainDevRows} />

      <Text style={[s.tableCaption, { marginTop: 8 }]}>Fine Motor &amp; Social Milestones</Text>
      <SplitTable left={devHist.fine_motor || []} right={devHist.social || []} />

      {/* ── FAMILY HISTORY ── */}
      <Narrative label="Family history:" value={familyText} />

      {/* ── SCHOOL HISTORY ── */}
      <Narrative label="School history:" value={schoolText} />

      {/* ── PLAY HISTORY ── */}
      <Narrative label="Play history:" value={playText} />

      {/* ── TREATMENT HISTORY ── */}
      <Narrative label="Treatment history:" value={data.treatment_history || 'None'} />

      {/* ── SUMMARY ── */}
      <SectionHead>Summary:</SectionHead>
      <View style={s.summaryBox}>
        <Text style={s.summaryText}>{data.OverAllSummary || '–'}</Text>
      </View>

      {/* ── IMPRESSION ── */}
      <Text style={s.impressionLine}>
        <Text style={s.bold}>Impression: </Text>
        {data.OverAllImpression || '–'}
      </Text>

      {/* ── RECOMMENDATIONS ── */}
      <SectionHead>Recommendations:</SectionHead>
      {recommendations.map((r: string, i: number) => (
        <BulletItem key={i} text={r} />
      ))}

      <Text style={s.reportedBy}>Reported by</Text>

      {/* ── FOOTER SIGNATURES ── */}
      <View style={s.footer}>
        <View style={s.footerCol}>
          <Text style={s.footerName}>Dr. D. Priyadharshni</Text>
          <Text style={s.footerLine}>Dch, DNB (pead)</Text>
          <Text style={s.footerLine}>Paediatrician and play therapist</Text>
          <Text style={s.footerLine}>Milestones Developmental Center</Text>
        </View>
        <View style={s.footerCol}>
          {data.creator_profile ? (
            <>
              <Text style={s.footerName}>{data.creator_profile.name}</Text>
              {data.creator_profile.qualifications ? (
                <Text style={s.footerLine}>{data.creator_profile.qualifications}</Text>
              ) : null}
              {data.creator_profile.position ? (
                <Text style={s.footerLine}>{data.creator_profile.position}</Text>
              ) : null}
              <Text style={s.footerLine}>{data.creator_profile.clinic || 'Milestones Developmental Center'}</Text>
            </>
          ) : (
            <>
              <Text style={s.footerName}>Ms. K. Devika,</Text>
              <Text style={s.footerLine}>Clinical Psychologist,</Text>
              <Text style={s.footerLine}>Special Educator for Autism Child</Text>
              <Text style={s.footerLine}>MDC</Text>
            </>
          )}
        </View>
      </View>
    </View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function ReportScreen() {
  const { regNo } = useLocalSearchParams<{ regNo: string }>();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  const handleDownload = () =>
    downloadReport(data, API_URL,
      () => setDownloading(true),
      () => setDownloading(false),
    );

  useEffect(() => {
    if (!regNo) { setError('No registration number provided.'); setLoading(false); return; }

    fetch(`${API_URL}/history-sheet/?reg_no=${encodeURIComponent(regNo)}`)
      .then(res => {
        if (!res.ok) throw new Error(`Server returned ${res.status}`);
        return res.json();
      })
      .then(json => {
        if (json.error) throw new Error(json.error);
        setData(json);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [regNo]);

  return (
    <View style={s.screen}>
      <StatusBar backgroundColor="#1b5e20" barStyle="light-content" />

      {/* Toolbar */}
      <View style={s.toolbar}>
        <TouchableOpacity style={s.toolbarBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={s.toolbarTitle}>Psychological Report</Text>
        <TouchableOpacity
          style={[s.toolbarBtn, downloading && { opacity: 0.5 }]}
          onPress={handleDownload}
          disabled={downloading || !data}
        >
          {downloading
            ? <ActivityIndicator size="small" color="#fff" />
            : <Ionicons name="download-outline" size={22} color="#fff" />}
        </TouchableOpacity>
      </View>

      {loading && (
        <View style={s.center}>
          <ActivityIndicator size="large" color="#2e7d32" />
          <Text style={s.loadingText}>Loading report…</Text>
        </View>
      )}

      {error && (
        <View style={s.center}>
          <Ionicons name="alert-circle-outline" size={52} color="#b71c1c" />
          <Text style={s.errorText}>{error}</Text>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={18} color="#fff" />
            <Text style={s.backBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      )}

      {data && (
        <ScrollView
          style={s.scroll}
          contentContainerStyle={s.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <ReportBody data={data} />
        </ScrollView>
      )}
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const BORDER = '#888';
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f5f5f0' },

  toolbar: {
    backgroundColor: '#1b5e20',
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) + 10 : 50,
    paddingBottom: 14,
    paddingHorizontal: 16,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  toolbarBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  toolbarTitle: { flex: 1, textAlign: 'center', color: '#fff', fontSize: 17, fontWeight: '700', letterSpacing: 0.4 },

  scroll: { flex: 1 },
  scrollContent: { padding: 10, paddingBottom: 40 },

  reportBody: {
    backgroundColor: '#fff',
    borderRadius: 6,
    padding: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },

  // ── Clinic header
  clinicHeader: { alignItems: 'center', marginBottom: 10, borderBottomWidth: 1.5, borderBottomColor: '#333', paddingBottom: 8 },
  clinicName: { fontSize: 14, fontWeight: '900', color: '#2e7d32', textTransform: 'uppercase', letterSpacing: 0.8, textAlign: 'center' },
  clinicAddress: { fontSize: 9, color: '#333', marginTop: 2, textAlign: 'center' },
  reportTitle: { fontSize: 13, fontWeight: '900', textDecorationLine: 'underline', marginTop: 6, textTransform: 'uppercase', letterSpacing: 1 },

  // ── Info table
  infoTable: { borderWidth: 1.5, borderColor: BORDER, marginBottom: 8, borderRadius: 3 },
  infoRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: BORDER },
  infoCell: { flexDirection: 'row', padding: 5, flexWrap: 'wrap', borderRightWidth: 1, borderRightColor: BORDER },
  infoCellRight: {},
  infoCellLabel: { fontSize: 10, fontWeight: '700', color: '#000' },
  infoCellValue: { fontSize: 10, color: '#000', flexShrink: 1 },

  // ── Section
  sectionHead: { fontSize: 12, fontWeight: '900', textDecorationLine: 'underline', marginTop: 10, marginBottom: 3, color: '#000' },
  bold: { fontWeight: '900', color: '#000' },

  // ── Narrative
  narrative: { fontSize: 11, color: '#111', lineHeight: 18, textAlign: 'justify', marginBottom: 5 },

  // ── Bullets
  bulletRow: { flexDirection: 'row', marginBottom: 2, paddingLeft: 4 },
  bulletArrow: { fontSize: 10, color: '#2e7d32', marginRight: 6, marginTop: 1, fontWeight: '900' },
  bulletText: { fontSize: 11, color: '#111', flex: 1, lineHeight: 18 },

  // ── Table caption
  tableCaption: { fontSize: 10, fontStyle: 'italic', color: '#555', marginBottom: 3 },

  // ── Tables
  table: { borderWidth: 1, borderColor: BORDER, borderRadius: 3, marginBottom: 8, overflow: 'hidden' },
  tableHeader: { backgroundColor: '#e8f5e9' },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: BORDER },
  tableRowAlt: { backgroundColor: '#f9fbe7' },
  th: { fontSize: 9.5, fontWeight: '900', color: '#000', padding: 4, textAlign: 'center', borderRightWidth: 1, borderRightColor: BORDER },
  td: { fontSize: 9.5, color: '#000', padding: 4, borderRightWidth: 1, borderRightColor: BORDER },
  tdCenter: { textAlign: 'center' },

  // Split table divider
  splitDivider: { width: 2, backgroundColor: '#555' },

  // ── Summary
  summaryBox: { borderWidth: 1, borderColor: '#aaa', borderRadius: 6, padding: 10, backgroundColor: '#f9fbe7', marginBottom: 8 },
  summaryText: { fontSize: 11, color: '#111', lineHeight: 18, textAlign: 'justify' },

  // ── Impression
  impressionLine: { fontSize: 12, color: '#000', marginVertical: 6 },

  // ── Footer
  reportedBy: { textAlign: 'center', marginTop: 20, marginBottom: 10, fontSize: 11, color: '#333' },
  footer: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 10, borderTopWidth: 1, borderTopColor: '#bbb' },
  footerCol: { flex: 1 },
  footerName: { fontSize: 10.5, fontWeight: '900', color: '#000', marginBottom: 2 },
  footerLine: { fontSize: 10, color: '#333', marginBottom: 1 },

  // ── Loading / Error states
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30 },
  loadingText: { marginTop: 14, color: '#555', fontSize: 15 },
  errorText: { marginTop: 14, color: '#b71c1c', fontSize: 15, textAlign: 'center', marginBottom: 20 },
  backBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#2e7d32', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 10, gap: 8 },
  backBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
