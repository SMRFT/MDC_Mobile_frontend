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
  Image,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { formatDate, calcAge, downloadAssessmentReport } from '@/utils/reportDownloader';
import Config from '@/constants/Config';

const API_URL = Config.API_BASE_URL;

// ─── Small reusable pieces ───────────────────────────────────────────────────
const SectionHead = ({ children }: { children: string }) => (
  <Text style={s.sectionHead}>{children}</Text>
);

const FieldRow = ({ label, value }: { label: string; value: string }) => {
  if (!value || value === '–') return null;
  return (
    <View style={s.fieldRow}>
      <Text style={s.fieldLabel}>{label}:</Text>
      <Text style={s.fieldValue}>{value}</Text>
    </View>
  );
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

const formatKey = (k: string) => {
  return k.replace(/[_-]/g, ' ').trim().replace(/^\w/, (c) => c.toUpperCase());
};

// ─── Physiotherapy Renderer ──────────────────────────────────────────────────
const PhysioSection = ({ doc }: { doc: any }) => {
  if (!doc) return null;

  const obs = doc.on_observation || {};
  const tone = doc.tone || {};
  const motor = doc.motor_system || {};
  const clonus = doc.clonus || {};
  const coord = doc.coordination || {};
  const pat = doc.pattern_and_position || {};
  const limb = doc.limb_length_discrepancy || {};
  const bal = doc.balance || {};
  const sens = doc.sensation || {};
  const used = doc.assessments_used || {};

  const obsText = [
    obs.restingPosture && `Resting Posture: ${obs.restingPosture}`,
    obs.gait && `Gait: ${obs.gait}`,
    obs.deformity && `Deformity: ${obs.deformity}`,
    obs.appliances && `Appliances: ${obs.appliances}`,
  ].filter(Boolean).join(' | ');

  const toneText = [
    tone.upperLimb && `Upper Limb: ${tone.upperLimb} ${tone.upperLimbInput || ''}`,
    tone.lowerLimb && `Lower Limb: ${tone.lowerLimb} ${tone.lowerLimbInput || ''}`,
  ].filter(Boolean).join(' | ');

  const motorText = [
    motor.upperLimb && `Upper Limb: ${motor.upperLimb}`,
    motor.lowerLimb && `Lower Limb: ${motor.lowerLimb}`,
  ].filter(Boolean).join(' | ');

  const clonusText = Object.entries(clonus)
    .filter(([_, v]) => v)
    .map(([k, v]) => `${k.toUpperCase()}: ${v}`)
    .join(', ');

  const coordText = [
    coord.upperLimb && `Upper Limb: ${coord.upperLimb} ${coord.upperLimbInput || ''}`,
    coord.lowerLimb && `Lower Limb: ${coord.lowerLimb} ${coord.lowerLimbInput || ''}`,
  ].filter(Boolean).join(' | ');

  const patText = [
    pat.pattern && `Pattern: ${pat.pattern}`,
    pat.headPosition && `Head Position: ${pat.headPosition}`,
    pat.trunkPosition && `Trunk Position: ${pat.trunkPosition}`,
  ].filter(Boolean).join(' | ');

  const limbText = [
    (limb.handRight || limb.handLeft) && `Hand (R/L): ${limb.handRight || '–'} / ${limb.handLeft || '–'}`,
    (limb.legRight || limb.legLeft) && `Leg (R/L): ${limb.legRight || '–'} / ${limb.legLeft || '–'}`,
  ].filter(Boolean).join(' | ');

  const balText = Object.entries(bal)
    .filter(([_, v]) => v)
    .map(([k, v]) => `${formatKey(k)}: ${v}`)
    .join(', ');

  const sensText = Object.entries(sens)
    .filter(([_, v]) => v)
    .map(([k, v]) => `${formatKey(k)}: ${v}`)
    .join(', ');

  const usedText = Object.values(used).filter(Boolean).join(', ');

  return (
    <View style={s.sectionBlock}>
      <SectionHead>Physiotherapy Assessment</SectionHead>
      <View style={s.detailsList}>
        <FieldRow label="On Observation" value={obsText} />
        <FieldRow label="Tone" value={toneText} />
        <FieldRow label="Motor System" value={motorText} />
        <FieldRow label="Clonus" value={clonusText} />
        <FieldRow label="Coordination" value={coordText} />
        <FieldRow label="Pattern & Position" value={patText} />
        <FieldRow label="Limb Length Discrepancy" value={limbText} />
        <FieldRow label="Balance" value={balText} />
        <FieldRow label="Sensation" value={sensText} />
        <FieldRow label="Assessments Used" value={usedText} />
        <FieldRow label="Clinical Impression" value={doc.impression} />
        <FieldRow label="Notes" value={doc.notes} />
      </View>
    </View>
  );
};

// ─── Assessment Analysis Renderer ──────────────────────────────────────────
const AnalysisSection = ({ doc }: { doc: any }) => {
  if (!doc) return null;

  const lang = doc.preferred_language || {};
  const preferredLang = Object.entries(lang)
    .filter(([_, v]) => v)
    .map(([k]) => k.toUpperCase())
    .join(', ');

  const mapping = doc.mapping_therapy || {};
  const mappingText = Object.entries(mapping)
    .map(([k, v]: [string, any]) => {
      const therapies = Object.entries(v)
        .filter(([_, val]) => val)
        .map(([th]) => th)
        .join(', ');
      return therapies ? `${k}: ${therapies}` : '';
    })
    .filter(Boolean)
    .join(' | ');

  const sessions = doc.session_numbers || {};
  const sessionsText = Object.entries(sessions)
    .filter(([_, v]) => v)
    .map(([k, v]) => `${k}: ${v}`)
    .join(', ');

  const methods = doc.therapy_methods || {};
  const methodsText = Object.entries(methods)
    .filter(([_, v]) => v)
    .map(([k]) => k.replace(/_/g, ' ').toUpperCase())
    .join(', ');

  return (
    <View style={s.sectionBlock}>
      <SectionHead>Assessment Analysis</SectionHead>
      <View style={s.detailsList}>
        <FieldRow label="Provisional Diagnosis" value={doc.provisional_diagnosis} />
        <FieldRow label="Preferred Language" value={preferredLang} />
        <FieldRow label="Home Modifications" value={doc.home_modification} />
        <FieldRow label="Parenting Modifications" value={doc.parenting_modifications} />
        <FieldRow label="Therapy Mapping" value={mappingText} />
        <FieldRow label="Sessions Prescribed" value={sessionsText} />
        <FieldRow label="Therapy Methods" value={methodsText} />
      </View>
    </View>
  );
};

// ─── Clinical Psychology Renderer ───────────────────────────────────────────
const PsychologySection = ({ doc }: { doc: any }) => {
  if (!doc) return null;

  const probs = Array.isArray(doc.behaviour_problems)
    ? doc.behaviour_problems.join(', ')
    : doc.behaviour_problems;

  const temp = doc.general_temperament || {};
  const tempText = Object.entries(temp)
    .filter(([_, v]) => v)
    .map(([k, v]) => `${k.toUpperCase()}: ${v}`)
    .join(' | ');

  const obs = doc.behavioral_observation || {};
  const obsText = Object.entries(obs)
    .filter(([_, v]) => v)
    .map(([k, v]) => `${k.toUpperCase()}: ${v}`)
    .join(' | ');

  const used = doc.assessments_used || {};
  const usedText = Object.entries(used)
    .map(([k, v]: [string, any]) => {
      if (k.toLowerCase() === 'otherassessments' || k.toLowerCase() === 'other_assessments') {
        if (Array.isArray(v)) {
          const sub = v
            .map((item: any) => {
              if (item && typeof item === 'object') {
                return `${item.key || '–'}: ${item.value || '–'}`;
              }
              return String(item);
            })
            .filter(Boolean)
            .join(', ');
          return sub ? `${k.toUpperCase()}: ${sub}` : '';
        }
      }
      if (typeof v === 'object' && v !== null) {
        const sub = Object.entries(v)
          .filter(([_, val]) => val)
          .map(([subKey, subVal]) => `${subKey.toUpperCase()}: ${subVal}`)
          .join(', ');
        return sub ? `${k.toUpperCase()} (${sub})` : '';
      }
      return v ? `${k.toUpperCase()}: ${v}` : '';
    })
    .filter(Boolean)
    .join(' | ');

  return (
    <View style={s.sectionBlock}>
      <SectionHead>Clinical Psychology Assessment</SectionHead>
      <View style={s.detailsList}>
        <FieldRow label="Behaviour Problems" value={probs} />
        <FieldRow label="General Temperament" value={tempText} />
        <FieldRow label="Behavioral Observation" value={obsText} />
        <FieldRow label="Assessments & Tests Used" value={usedText} />
        <FieldRow label="Clinical Impression" value={doc.impression} />
        <FieldRow label="Notes" value={doc.notes} />
      </View>
    </View>
  );
};

// ─── Pediatric Renderer ─────────────────────────────────────────────────────
const PediatricSection = ({ doc }: { doc: any }) => {
  if (!doc) return null;

  const exclude = ['_id', 'created_by', 'created_date', 'lastmodified_by', 'lastmodified_date', 'registrationNumber', 'registration_number', 'patientName', 'patient_name', 'assessment_date', 'date'];
  const fields = Object.entries(doc)
    .filter(([k, v]) => !exclude.includes(k) && v)
    .map(([k, v]) => {
      let valStr = '';
      if (typeof v === 'object' && v !== null) {
        valStr = Object.entries(v)
          .filter(([_, subVal]) => subVal)
          .map(([subK, subV]) => `${formatKey(subK)}: ${subV}`)
          .join(', ');
      } else {
        valStr = String(v);
      }
      return { label: formatKey(k), value: valStr };
    })
    .filter(f => f.value);

  if (fields.length === 0) return null;

  return (
    <View style={s.sectionBlock}>
      <SectionHead>Pediatric Assessment</SectionHead>
      <View style={s.detailsList}>
        {fields.map((f, i) => (
          <FieldRow key={i} label={f.label} value={f.value} />
        ))}
      </View>
    </View>
  );
};

// ─── Child Language Renderer ────────────────────────────────────────────────
const LanguageSection = ({ doc }: { doc: any }) => {
  if (!doc) return null;

  const exclude = ['_id', 'created_by', 'created_date', 'lastmodified_by', 'lastmodified_date', 'registrationNumber', 'registration_number', 'patientName', 'patient_name', 'assessment_date', 'date'];
  const fields = Object.entries(doc)
    .filter(([k, v]) => !exclude.includes(k) && v)
    .map(([k, v]) => {
      let valStr = '';
      if (typeof v === 'object' && v !== null) {
        valStr = Object.entries(v)
          .filter(([_, subVal]) => subVal)
          .map(([subK, subV]) => `${formatKey(subK)}: ${subV}`)
          .join(', ');
      } else {
        valStr = String(v);
      }
      return { label: formatKey(k), value: valStr };
    })
    .filter(f => f.value);

  if (fields.length === 0) return null;

  return (
    <View style={s.sectionBlock}>
      <SectionHead>Child Language Assessment</SectionHead>
      <View style={s.detailsList}>
        {fields.map((f, i) => (
          <FieldRow key={i} label={f.label} value={f.value} />
        ))}
      </View>
    </View>
  );
};

// ─── Report Body ─────────────────────────────────────────────────────────────
const ReportBody = ({ data }: { data: any }) => {
  const reg = data.registration || {};
  const physio = data.physio;
  const pediatric = data.pediatric;
  const analysis = data.analysis;
  const language = data.language;
  const psychology = data.psychology;
  const creatorProfile = data.creator_profile;

  const childName = reg.name_of_child || '–';
  const father = reg.father_name || '–';
  const mother = reg.mother_name || '–';
  const sex = reg.sex || '–';
  const phone = reg.father_phone_number || reg.mother_phone_number || '–';

  // Find evaluation/assessment date
  const dates: string[] = [];
  [physio, pediatric, analysis, language, psychology].forEach((doc) => {
    if (doc) {
      const d = doc.assessment_date || doc.date || doc.created_date;
      if (d) dates.push(d);
    }
  });
  const assessDate = dates.length ? dates.sort().reverse()[0] : '';

  return (
    <View style={s.reportBody}>
      {/* Clinic Header */}
      <View style={s.clinicHeader}>
        <Image
          source={require('../assets/images/icon.png')}
          style={s.clinicLogo}
          resizeMode="contain"
        />
        <Text style={s.clinicName}>MILESTONES DEVELOPMENTAL CENTER</Text>
        <Text style={s.clinicAddress}>59 / 37, SARADHA COLLEGE ROAD, SALEM – 636007  |  Ph: 9047033633</Text>
        <Text style={s.reportTitle}>ASSESSMENT REPORT</Text>
      </View>

      {/* Patient Info Table */}
      <View style={s.infoTable}>
        <InfoRow cells={[
          { label: 'Name', value: childName, flex: 2 },
          { label: 'DOB', value: formatDate(reg.dob) },
          { label: 'Date of Evaluation', value: formatDate(assessDate) },
        ]} />
        <InfoRow cells={[
          { label: 'Father', value: father, flex: 2 },
          { label: 'Age', value: calcAge(reg.dob, assessDate) },
          { label: 'Reg. No.', value: reg.registration_number },
        ]} />
        <InfoRow cells={[
          { label: 'Mother', value: mother, flex: 2 },
          { label: 'Sex', value: sex },
          { label: 'Phone', value: phone },
        ]} />
      </View>

      {/* Sections */}
      <PhysioSection doc={physio} />
      <PediatricSection doc={pediatric} />
      <AnalysisSection doc={analysis} />
      <LanguageSection doc={language} />
      <PsychologySection doc={psychology} />

      <Text style={s.reportedBy}>Reported by</Text>
      <View style={s.footer}>
        <View style={s.footerCol}>
          <Text style={s.footerName}>Dr. D. Priyadharshni</Text>
          <Text style={s.footerLine}>Dch, DNB (pead)</Text>
          <Text style={s.footerLine}>Paediatrician and play therapist</Text>
          <Text style={s.footerLine}>Milestones Developmental Center</Text>
        </View>
        <View style={[s.footerCol, { alignItems: 'flex-end' }]}>
          {creatorProfile ? (
            <>
              <Text style={[s.footerName, { textAlign: 'right' }]}>{creatorProfile.name}</Text>
              {creatorProfile.qualifications ? <Text style={[s.footerLine, { textAlign: 'right' }]}>{creatorProfile.qualifications}</Text> : null}
              {creatorProfile.position ? <Text style={[s.footerLine, { textAlign: 'right' }]}>{creatorProfile.position}</Text> : null}
              <Text style={[s.footerLine, { textAlign: 'right' }]}>Milestones Developmental Center</Text>
            </>
          ) : (
            <>
              <Text style={[s.footerName, { textAlign: 'right' }]}>Ms. Sivashankari</Text>
              <Text style={[s.footerLine, { textAlign: 'right' }]}>M.sc Clinical Psychology, B.sc PICS</Text>
              <Text style={[s.footerLine, { textAlign: 'right' }]}>Psychologist</Text>
              <Text style={[s.footerLine, { textAlign: 'right' }]}>Milestones Developmental Center</Text>
            </>
          )}
        </View>
      </View>
    </View>
  );
};

// ─── Main Screen ─────────────────────────────────────────────────────────────
export default function AssessmentReportScreen() {
  const { regNo } = useLocalSearchParams<{ regNo: string }>();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  const handleDownload = () => {
    if (!regNo) return;
    downloadAssessmentReport(
      regNo,
      API_URL,
      () => setDownloading(true),
      () => setDownloading(false)
    );
  };

  useEffect(() => {
    if (!regNo) {
      setError('No registration number provided.');
      setLoading(false);
      return;
    }

    fetch(`${API_URL}/assessment-report/?reg_no=${encodeURIComponent(regNo)}`)
      .then((res) => {
        if (!res.ok) {
            if (res.status === 404) throw new Error("No data found");
            throw new Error(`Server returned ${res.status}`);
        }
        return res.json();
      })
      .then((json) => {
        if (json.error) throw new Error(json.error);
        setData(json);
      })
      .catch((err) => setError(err.message))
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
        <Text style={s.toolbarTitle}>Assessment Report</Text>
        <TouchableOpacity
          style={[s.toolbarBtn, downloading && { opacity: 0.5 }]}
          onPress={handleDownload}
          disabled={downloading || !data}
        >
          {downloading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="download-outline" size={22} color="#fff" />
          )}
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

  clinicHeader: { alignItems: 'center', marginBottom: 10, borderBottomWidth: 1.5, borderBottomColor: '#333', paddingBottom: 8 },
  clinicLogo: { width: 50, height: 50, marginBottom: 6 },
  clinicName: { fontSize: 14, fontWeight: '900', color: '#2e7d32', textTransform: 'uppercase', letterSpacing: 0.8, textAlign: 'center' },
  clinicAddress: { fontSize: 9, color: '#333', marginTop: 2, textAlign: 'center' },
  reportTitle: { fontSize: 13, fontWeight: '900', textDecorationLine: 'underline', marginTop: 6, textTransform: 'uppercase', letterSpacing: 1 },

  infoTable: { borderWidth: 1.5, borderColor: BORDER, marginBottom: 8, borderRadius: 3 },
  infoRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: BORDER },
  infoCell: { flexDirection: 'row', padding: 5, flexWrap: 'wrap', borderRightWidth: 1, borderRightColor: BORDER },
  infoCellRight: {},
  infoCellLabel: { fontSize: 10, fontWeight: '700', color: '#000' },
  infoCellValue: { fontSize: 10, color: '#000', flexShrink: 1 },

  sectionHead: { fontSize: 12, fontWeight: '900', textDecorationLine: 'underline', marginTop: 14, marginBottom: 6, color: '#1b5e20', textTransform: 'uppercase' },
  sectionBlock: { marginBottom: 12 },
  detailsList: { paddingLeft: 4 },
  fieldRow: { flexDirection: 'row', marginBottom: 4, flexWrap: 'wrap' },
  fieldLabel: { fontSize: 11, fontWeight: '700', color: '#333', marginRight: 6 },
  fieldValue: { fontSize: 11, color: '#000', flex: 1 },

  reportedBy: { textAlign: 'center', marginTop: 20, marginBottom: 10, fontSize: 11, color: '#333' },
  footer: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 10, borderTopWidth: 1, borderTopColor: '#bbb' },
  footerCol: { flex: 1 },
  footerName: { fontSize: 10.5, fontWeight: '900', color: '#000', marginBottom: 2 },
  footerLine: { fontSize: 10, color: '#333', marginBottom: 1 },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30 },
  loadingText: { marginTop: 14, color: '#555', fontSize: 15 },
  errorText: { marginTop: 14, color: '#b71c1c', fontSize: 15, textAlign: 'center', marginBottom: 20 },
  backBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#2e7d32', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 10, gap: 8 },
  backBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
