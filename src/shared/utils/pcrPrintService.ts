import { Alert, Platform, Share } from 'react-native';
import { OPOL_LOGO_BASE64, DRRM_LOGO_BASE64 } from './pcrLogosBase64';
import { BODY_DIAGRAM_BASE64 } from './bodyDiagramBase64';

// Safe dynamic loaders to prevent crashing when ExpoPrint is not compiled in the running APK
export function getExpoPrint(): any {
  try {
    return require('expo-print');
  } catch {
    return null;
  }
}

export function getExpoSharing(): any {
  try {
    return require('expo-sharing');
  } catch {
    return null;
  }
}

export function isNativePrintAvailable(): boolean {
  const Print = getExpoPrint();
  return Boolean(Print && typeof Print.printAsync === 'function');
}

export interface Marker {
  x?: number;
  y?: number;
  label?: string;
  type?: string;
  notes?: string;
  id?: string | number;
}

export interface PcrPrintData {
  formData: any;
  activeDispatch?: any;
  pcrPhotos?: any[];
}

export function generatePcrHtml({ formData, activeDispatch, pcrPhotos = [] }: PcrPrintData): string {
  const dispatch = activeDispatch || {};
  const incident = dispatch.incident || {};
  const gcs = formData.glasgow_coma_scale || {};
  const vitalSigns = Array.isArray(formData.vital_signs) ? formData.vital_signs : [];
  const assessmentMarkers: Marker[] = Array.isArray(formData.assessment_markers) ? formData.assessment_markers : [];
  const assessmentFindings: string[] = Array.isArray(formData.assessment_findings)
    ? formData.assessment_findings
    : (typeof formData.assessment_findings === 'string' && formData.assessment_findings ? [formData.assessment_findings] : []);
  const dispositionList: string[] = Array.isArray(formData.disposition)
    ? formData.disposition
    : (typeof formData.disposition === 'string' && formData.disposition ? [formData.disposition] : []);

  // 1. Date Formatting: mo/day/yr
  const formatMoDayYr = (val?: string | null): string => {
    const targetDate = val ? new Date(val) : new Date();
    if (isNaN(targetDate.getTime())) return new Date().toLocaleDateString('en-US');
    const mm = String(targetDate.getMonth() + 1).padStart(2, '0');
    const dd = String(targetDate.getDate()).padStart(2, '0');
    const yyyy = targetDate.getFullYear();
    return `${mm}/${dd}/${yyyy}`;
  };

  // 2. Time & AM/PM parser
  const parseTimeWithAmPm = (timeVal?: string | null): { time: string; am: boolean; pm: boolean } => {
    if (!timeVal) return { time: '--:--', am: false, pm: false };
    const str = String(timeVal).trim();

    if (/\d{4}-\d{2}-\d{2}/.test(str)) {
      const parsedDate = new Date(str.includes(' ') && !str.includes('T') ? str.replace(' ', 'T') : str);
      if (!isNaN(parsedDate.getTime())) {
        const h24 = parsedDate.getHours();
        const m = String(parsedDate.getMinutes()).padStart(2, '0');
        const isPm = h24 >= 12;
        const h12 = h24 % 12 || 12;
        return {
          time: `${h12}:${m}`,
          am: !isPm,
          pm: isPm,
        };
      }
    }

    const hasPm = /pm/i.test(str);
    const hasAm = /am/i.test(str);
    const cleanDigits = str.replace(/\s*(am|pm)/gi, '').trim();

    if (cleanDigits.includes(':')) {
      const parts = cleanDigits.split(':');
      const h = parseInt(parts[0], 10);
      const mStr = parts[1] || '00';
      if (!isNaN(h)) {
        if (!hasAm && !hasPm) {
          const isPm = h >= 12;
          const h12 = h % 12 || 12;
          return {
            time: `${h12}:${mStr.padStart(2, '0')}`,
            am: !isPm,
            pm: isPm,
          };
        }
        return {
          time: cleanDigits,
          am: hasAm,
          pm: hasPm,
        };
      }
    }
    return { time: cleanDigits || '--:--', am: hasAm, pm: hasPm };
  };

  // Checkbox Helper: [X] vs [ ]
  const box = (checked: boolean) =>
    checked
      ? `<span style="display:inline-block; width:10px; height:10px; border:1.2px solid #000; text-align:center; line-height:9px; font-size:8pt; font-weight:bold; margin-right:3px; vertical-align:middle; background:#000; color:#fff;">&#10003;</span>`
      : `<span style="display:inline-block; width:10px; height:10px; border:1.2px solid #000; margin-right:3px; vertical-align:middle; background:#fff;"></span>`;

  // Exact Pinpoint Calculator for Front/Back Body Diagram
  const calculatePinPosition = (m: Marker): { left: string; top: string; isRightSide: boolean } => {
    const rawX = Number(m.x) || 0;
    const rawY = Number(m.y) || 0;

    let pctX: number;
    let pctY: number;

    if (rawX <= 1 && rawY <= 1 && rawX > 0 && rawY > 0) {
      pctX = rawX * 100;
      pctY = rawY * 100;
    } else if (rawY >= 80 && rawY <= 550) {
      pctX = (rawX / 320) * 100;
      pctY = ((rawY - 115) / 320) * 100;
    } else {
      pctX = (rawX / 320) * 100;
      pctY = (rawY / 320) * 100;
    }

    pctX = Math.max(2, Math.min(98, pctX));
    pctY = Math.max(2, Math.min(98, pctY));

    return {
      left: `${pctX.toFixed(2)}%`,
      top: `${pctY.toFixed(2)}%`,
      isRightSide: pctX > 68,
    };
  };

  // Patient Demographics
  const patientFullName = [formData.first_name, formData.last_name].filter(Boolean).join(' ').trim()
    || (formData.is_unidentified ? 'Unidentified Patient' : '__________________________________________');

  const patientAddress = formData.address || incident.incident_address || incident.location || '__________________________________________';
  const incidentPlace = formData.place_of_incident || incident.place_of_incident || incident.location || '__________________________________________';

  const gender = (formData.gender || '').toLowerCase();
  const isMale = gender === 'male';
  const isFemale = gender === 'female';

  const civilStatus = (formData.civil_status || '').toLowerCase();
  const natureOfCall = (formData.nature_of_call || incident.incident_type?.name || '').toLowerCase();
  const chiefComplaint = formData.chief_complaint || incident.chief_complaint || '';

  // Operational Times
  const tDispatch = parseTimeWithAmPm(formData.dispatch_time || dispatch.assigned_at);
  const tEnRoute = parseTimeWithAmPm(formData.en_route_time || dispatch.en_route_at);
  const tOnScene = parseTimeWithAmPm(formData.on_scene_time || dispatch.arrived_at);
  const tTransport = parseTimeWithAmPm(formData.transport_time || dispatch.transporting_at);
  const tArrivedHF = parseTimeWithAmPm(formData.arrived_hf_time || dispatch.hospital_at);
  const tDepartedHF = parseTimeWithAmPm(formData.departed_hf_time || dispatch.completed_at);

  // Vitals
  const v1 = vitalSigns[0] || {};
  const v2 = vitalSigns[1] || {};
  const v3 = vitalSigns[2] || {};
  const v1Time = parseTimeWithAmPm(v1.time);
  const v2Time = parseTimeWithAmPm(v2.time);
  const v3Time = parseTimeWithAmPm(v3.time);

  // Assessment Items matching 12 official items
  const allAssessments = [
    ...assessmentFindings.map((f: any) => String(f).toLowerCase()),
    ...assessmentMarkers.map((m: any) => String(m.label || m.type || '').toLowerCase())
  ];
  const isAssessed = (name: string) => allAssessments.some(a => a.includes(name.toLowerCase()));

  // Dispositions
  const allDispos = dispositionList.map((d: any) => String(d).toLowerCase());
  const hasDispo = (kw: string) => allDispos.some(d => d.includes(kw.toLowerCase()));
  const isTransported = formData.transported || hasDispo('transport');

  // Responders text - clean names, strip roles/positions, deduplicate
  const cleanResponderName = (raw: string): string => {
    if (!raw) return '';
    const stripped = raw
      .replace(/\s*\([^)]*\)/gi, '')
      .replace(/\s*-\s*(driver|emt|team\s*leader|crew|responder|leader|paramedic)/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (!stripped) return '';
    return stripped
      .toLowerCase()
      .split(' ')
      .filter(Boolean)
      .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  };

  const formatPersonName = (u: any) => {
    if (!u) return '';
    if (typeof u === 'string') return u.trim();
    const first = u.first_name || '';
    const last = u.last_name || '';
    const full = `${first} ${last}`.trim();
    return full || u.name || '';
  };

  const crewMembers = Array.isArray(dispatch.crew)
    ? dispatch.crew.map((c: any) => formatPersonName(c.user || c))
    : [];
  const respondersList = [
    formatPersonName(dispatch.team_leader),
    formatPersonName(dispatch.driver),
    formatPersonName(dispatch.emt),
    ...crewMembers,
    formData.responders,
  ].filter(Boolean);

  const uniqueResponders: string[] = [];
  const seenResponders = new Set<string>();
  respondersList.forEach((item) => {
    String(item)
      .split(',')
      .map((s) => cleanResponderName(s))
      .filter(Boolean)
      .forEach((name) => {
        const norm = name.toLowerCase();
        if (!seenResponders.has(norm)) {
          seenResponders.add(norm);
          uniqueResponders.push(name);
        }
      });
  });
  const respondersText = uniqueResponders.join(', ');

  const gcsEye = Number(gcs.eye) || null;
  const gcsVerbal = Number(gcs.verbal) || null;
  const gcsMotor = Number(gcs.motor) || null;
  const gcsTotal = gcs.total || (gcsEye && gcsVerbal && gcsMotor ? gcsEye + gcsVerbal + gcsMotor : '');

  const pcrCode = dispatch.id ? `PCR-D${dispatch.id}` : `PCR-${Date.now().toString().slice(-6)}`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${pcrCode} - ${patientFullName}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 5mm 8mm 5mm 8mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: Arial, "Helvetica Neue", Helvetica, sans-serif;
      font-size: 8pt;
      color: #000;
      background: #fff;
      margin: 0;
      padding: 0;
      line-height: 1.2;
    }
    .pcr-page {
      width: 100%;
      max-width: 194mm;
      margin: 0 auto;
      background: #fff;
    }
    .header-wrap {
      display: flex;
      align-items: center;
      justify-content: space-between;
      position: relative;
      margin-bottom: 2mm;
    }
    .header-title-box {
      text-align: center;
      flex: 1;
      padding: 0 4px;
    }
    .header-title-top {
      font-size: 9pt;
      font-weight: bold;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      margin: 0;
    }
    .header-title-main {
      font-size: 13pt;
      font-weight: 900;
      letter-spacing: 1.2px;
      text-transform: uppercase;
      margin: 2px 0 0 0;
    }
    .rev-tag {
      position: absolute;
      top: 0;
      right: 0;
      font-size: 7pt;
      color: #444;
      font-weight: bold;
    }
    .section-label-italic {
      font-size: 8.5pt;
      font-style: italic;
      text-decoration: underline;
      font-weight: bold;
      margin-bottom: 1.5mm;
      display: block;
    }
    table.form-grid {
      width: 100%;
      border-collapse: collapse;
      border: 1.5px solid #000;
      margin-bottom: 2mm;
    }
    table.form-grid td, table.form-grid th {
      border: 1px solid #000;
      padding: 2.5px 4px;
      vertical-align: middle;
      font-size: 8pt;
    }
    .field-name {
      font-size: 7.5pt;
      font-weight: bold;
    }
    .field-data {
      font-size: 8.5pt;
      font-weight: 600;
      color: #000;
    }
    .time-cell {
      display: inline-flex;
      align-items: center;
      gap: 3px;
      font-size: 7.5pt;
    }
    .time-digits {
      font-size: 8.5pt;
      font-weight: bold;
      min-width: 40px;
      display: inline-block;
      text-align: center;
    }
    .mid-columns {
      display: flex;
      gap: 2.5mm;
      width: 100%;
      margin-bottom: 2mm;
    }
    .left-col {
      width: 50%;
    }
    .right-col {
      width: 50%;
    }
    .box-title-bar {
      background: #f8fafc;
      border: 1px solid #000;
      border-bottom: none;
      font-size: 8pt;
      font-weight: bold;
      padding: 2px 5px;
      text-transform: uppercase;
    }
    .assessment-box {
      border: 1px solid #000;
      padding: 4px;
    }
    .assess-cols {
      display: flex;
      justify-content: space-between;
      font-size: 7.2pt;
      margin-bottom: 2mm;
    }
    .assess-col {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .body-canvas {
      position: relative;
      width: 190px;
      height: 190px;
      margin: 0 auto;
      text-align: center;
    }
    .body-img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      display: block;
    }
    .pin-marker {
      position: absolute;
      width: 0;
      height: 0;
      z-index: 10;
    }
    .pin-dot {
      position: absolute;
      top: -7px;
      left: -7px;
      width: 15px;
      height: 15px;
      border-radius: 50%;
      background: #dc2626;
      color: #fff;
      font-size: 7pt;
      font-weight: 900;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 1.2px solid #000;
      box-shadow: 0 1px 2px rgba(0,0,0,0.4);
    }
    .pin-text {
      position: absolute;
      top: -8px;
      left: 10px;
      background: #fff;
      border: 1px solid #000;
      padding: 1px 3px;
      font-size: 6.5pt;
      font-weight: bold;
      color: #000;
      white-space: nowrap;
      line-height: 11px;
    }
    .pin-text-left {
      left: auto;
      right: 10px;
    }
    .special-box {
      border: 1px solid #000;
      padding: 3px 5px;
      margin-top: 2mm;
      min-height: 48px;
    }
    .line-rule {
      border-bottom: 1px solid #bbb;
      height: 13px;
      margin-top: 1px;
    }
    table.vitals-grid {
      width: 100%;
      border-collapse: collapse;
      border: 1px solid #000;
      font-size: 7.2pt;
      text-align: center;
      margin-bottom: 2mm;
    }
    table.vitals-grid th, table.vitals-grid td {
      border: 1px solid #000;
      padding: 2.2px 3px;
    }
    table.vitals-grid th {
      font-weight: bold;
      background: #f1f5f9;
    }
    table.gcs-grid {
      width: 100%;
      border-collapse: collapse;
      border: 1px solid #000;
      font-size: 6.7pt;
      line-height: 1.15;
    }
    table.gcs-grid td, table.gcs-grid th {
      border: 1px solid #000;
      padding: 1.5px 3px;
    }
    .gcs-head-col {
      font-weight: bold;
      width: 32%;
      vertical-align: top;
      background: #fafafa;
    }
    .gcs-desc-col {
      width: 58%;
    }
    .gcs-score-col {
      width: 10%;
      text-align: center;
      font-weight: bold;
    }
    .lower-mid {
      display: flex;
      gap: 2.5mm;
      width: 100%;
      margin-bottom: 2mm;
    }
    .dispo-box {
      width: 50%;
      border: 1px solid #000;
      padding: 4px;
    }
    .dispo-cols {
      display: flex;
      justify-content: space-between;
      font-size: 7pt;
    }
    .dispo-col {
      display: flex;
      flex-direction: column;
      gap: 2.5px;
      width: 49%;
    }
    .resp-box {
      width: 50%;
      border: 1px solid #000;
      padding: 4px 6px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      font-size: 7.8pt;
    }
    .resp-line-item {
      margin-bottom: 5px;
    }
    .underline-span {
      border-bottom: 1px solid #000;
      display: inline-block;
      font-weight: bold;
      min-width: 120px;
      padding: 0 4px;
    }
    .waiver-wrapper {
      border: 1.5px solid #000;
      padding: 4px 6px;
      font-size: 7.2pt;
      position: relative;
    }
    .waiver-title {
      text-align: center;
      font-weight: bold;
      font-size: 8.5pt;
      margin-bottom: 2px;
    }
    .waiver-statement {
      line-height: 1.25;
      text-align: justify;
      margin-bottom: 3px;
    }
    .waiver-bottom-cols {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-top: 3px;
    }
    .sig-col {
      width: 48%;
    }
    .sig-holder-img {
      max-height: 26px;
      max-width: 130px;
      object-fit: contain;
      display: block;
      margin-bottom: 2px;
    }
    .photos-page {
      page-break-before: always;
      margin-top: 6mm;
      padding-top: 4mm;
      border-top: 2px dashed #94a3b8;
    }
    .photo-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      justify-content: center;
      margin-top: 8px;
    }
    .photo-card {
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 6px;
      width: 47%;
      background: #f8fafc;
      text-align: center;
    }
    .photo-img {
      width: 100%;
      height: 150px;
      object-fit: cover;
      border-radius: 6px;
    }
    .photo-meta {
      font-size: 7pt;
      color: #334155;
      margin-top: 4px;
      text-align: left;
    }
  </style>
</head>
<body>

<div class="pcr-page">
  <!-- TOP HEADER -->
  <div class="header-wrap">
    <div style="width: 85px; text-align: left;">
      <img src="${OPOL_LOGO_BASE64}" alt="Opol Seal" style="width: 78px; height: 78px; object-fit: contain;" />
    </div>

    <div class="header-title-box">
      <h2 class="header-title-top">LOCAL DISASTER RISK REDUCTION MANAGEMENT OFFICE</h2>
      <h1 class="header-title-main">PATIENT CARE RECORD</h1>
      <div style="font-size: 7.5pt; font-weight: bold; color: #475569; margin-top: 2px;">OPOL, MISAMIS ORIENTAL • EMERGENCY MEDICAL SERVICES</div>
    </div>

    <div style="width: 85px; text-align: right; position: relative;">
      <span class="rev-tag">Rev. 2.0</span>
      <img src="${DRRM_LOGO_BASE64}" alt="MDRRMO Logo" style="width: 70px; height: 70px; object-fit: contain; margin-top: 4px;" />
    </div>
  </div>

  <!-- PATIENT INFORMATION SECTION -->
  <span class="section-label-italic">Patient Information</span>
  <table class="form-grid">
    <tr>
      <td colspan="4" style="width: 65%;">
        <span class="field-name">Name of Patient:</span>
        <span class="field-data" style="margin-left: 6px;">${patientFullName}</span>
      </td>
      <td colspan="2" style="width: 35%;">
        <span class="field-name">Date (mo/day/yr):</span>
        <span class="field-data" style="margin-left: 6px; font-family: monospace;">${formatMoDayYr(formData.record_date)}</span>
      </td>
    </tr>

    <tr>
      <td style="width: 32%;">
        <span class="field-name">Contact #:</span>
        <span class="field-data">${formData.contact_number || '_________________'}</span>
      </td>
      <td style="width: 14%;">
        <span class="field-name">Age:</span>
        <span class="field-data">${formData.age ? formData.age : '___'}</span>
      </td>
      <td style="width: 10%;">
        <span class="field-name">Male</span> ${box(isMale)}
      </td>
      <td style="width: 10%;">
        <span class="field-name">Female</span> ${box(isFemale)}
      </td>
      <td colspan="2">
        <span class="field-name">Caller #:</span>
        <span class="field-data">${incident.caller_phone_number || formData.contact_number || '_________________'}</span>
      </td>
    </tr>

    <tr>
      <td colspan="4">
        <span class="field-name">Civil Status:</span>
        <span style="margin-left: 4px;">
          ${box(civilStatus === 'single')} Single &nbsp;
          ${box(civilStatus === 'married')} Married &nbsp;
          ${box(civilStatus === 'widowed')} Widowed &nbsp;
          ${box(civilStatus === 'child')} Child &nbsp;
          ${box(civilStatus === 'separated')} Separated
        </span>
      </td>
      <td colspan="2">
        <span class="field-name">Dispatch Time:</span>
        <span class="time-cell" style="margin-left: 6px;">
          <span class="time-digits">${tDispatch.time}</span>
          <span>${box(tDispatch.am)} AM</span>
          <span>${box(tDispatch.pm)} PM</span>
        </span>
      </td>
    </tr>

    <tr>
      <td colspan="4">
        <span class="field-name">Address:</span>
        <span class="field-data" style="margin-left: 6px;">${patientAddress}</span>
      </td>
      <td colspan="2">
        <span class="field-name">En Route Time:</span>
        <span class="time-cell" style="margin-left: 6px;">
          <span class="time-digits">${tEnRoute.time}</span>
          <span>${box(tEnRoute.am)} AM</span>
          <span>${box(tEnRoute.pm)} PM</span>
        </span>
      </td>
    </tr>

    <tr>
      <td colspan="4">
        <span class="field-name">Place of Incident:</span>
        <span class="field-data" style="margin-left: 6px;">${incidentPlace}</span>
      </td>
      <td colspan="2">
        <span class="field-name">On Scene Time:</span>
        <span class="time-cell" style="margin-left: 6px;">
          <span class="time-digits">${tOnScene.time}</span>
          <span>${box(tOnScene.am)} AM</span>
          <span>${box(tOnScene.pm)} PM</span>
        </span>
      </td>
    </tr>

    <tr>
      <td colspan="4">
        <span class="field-name">Chief of Complaint:</span>
        <span class="field-data" style="margin-left: 6px; font-weight: bold;">${chiefComplaint || '__________________________________________'}</span>
      </td>
      <td colspan="2">
        <span class="field-name">Transport Time:</span>
        <span class="time-cell" style="margin-left: 6px;">
          <span class="time-digits">${tTransport.time}</span>
          <span>${box(tTransport.am)} AM</span>
          <span>${box(tTransport.pm)} PM</span>
        </span>
      </td>
    </tr>

    <tr>
      <td colspan="4" rowspan="2" style="vertical-align: top;">
        <span class="field-name">Nature of Call:</span>
        <div style="margin-top: 3px; line-height: 1.5;">
          ${box(natureOfCall === 'emergency')} Emergency &nbsp;&nbsp;&nbsp;&nbsp;
          ${box(natureOfCall === 'transport')} Transport &nbsp;&nbsp;&nbsp;&nbsp;
          ${box(natureOfCall === 'standby')} Standby<br>
          ${box(natureOfCall === 'non-emergency')} Non-Emergency &nbsp;&nbsp;&nbsp;&nbsp;
          ${box(natureOfCall === 'medical assistance')} Medical Assistance
        </div>
      </td>
      <td colspan="2">
        <span class="field-name">Arrived HF:</span>
        <span class="time-cell" style="margin-left: 6px;">
          <span class="time-digits">${tArrivedHF.time}</span>
          <span>${box(tArrivedHF.am)} AM</span>
          <span>${box(tArrivedHF.pm)} PM</span>
        </span>
      </td>
    </tr>

    <tr>
      <td colspan="2">
        <span class="field-name">Departed HF:</span>
        <span class="time-cell" style="margin-left: 6px;">
          <span class="time-digits">${tDepartedHF.time}</span>
          <span>${box(tDepartedHF.am)} AM</span>
          <span>${box(tDepartedHF.pm)} PM</span>
        </span>
      </td>
    </tr>
  </table>

  <!-- MIDDLE SECTION: TWO COLUMNS (ASSESSMENT + VITALS/GCS) -->
  <div class="mid-columns">
    <!-- LEFT COLUMN: ASSESSMENT & BODY DIAGRAM -->
    <div class="left-col">
      <div class="box-title-bar">ASSESSMENT</div>
      <div class="assessment-box">
        <div class="assess-cols">
          <div class="assess-col">
            <span>${box(isAssessed('abrasion'))} Abrasion</span>
            <span>${box(isAssessed('amputation'))} Amputation</span>
            <span>${box(isAssessed('avulsion'))} Avulsion</span>
            <span>${box(isAssessed('burn'))} Burns</span>
          </div>
          <div class="assess-col">
            <span>${box(isAssessed('contusion'))} Contusion</span>
            <span>${box(isAssessed('fractur'))} Fractured</span>
            <span>${box(isAssessed('hematoma'))} Hematoma</span>
            <span>${box(isAssessed('incision'))} Incision</span>
          </div>
          <div class="assess-col">
            <span>${box(isAssessed('laceration'))} Laceration</span>
            <span>${box(isAssessed('puncture'))} Punctured</span>
            <span>${box(isAssessed('swelling'))} Swelling</span>
            <span>${box(isAssessed('tenderness'))} Tenderness</span>
          </div>
        </div>

        <div class="body-canvas">
          <img src="${BODY_DIAGRAM_BASE64}" class="body-img" alt="Anatomical Diagram" />
          ${assessmentMarkers.map((m, idx) => {
            const pos = calculatePinPosition(m);
            const labelText = m.label || m.type || '';
            return `
              <div class="pin-marker" style="left: ${pos.left}; top: ${pos.top};" title="${labelText}">
                <div class="pin-dot">${idx + 1}</div>
                ${labelText ? `<div class="pin-text ${pos.isRightSide ? 'pin-text-left' : ''}">${labelText}</div>` : ''}
              </div>
            `;
          }).join('')}
        </div>
        <div style="display: flex; justify-content: space-around; font-size: 7pt; font-weight: bold; margin-top: 1px;">
          <span>FRONT</span>
          <span>BACK</span>
        </div>

        <div class="special-box">
          <span class="field-name">SPECIAL INSTRUCTIONS / NARRATIVE:</span>
          <span class="field-data" style="margin-left: 4px; font-weight: bold;">
            ${formData.special_instructions || formData.narrative || ''}
          </span>
          <div class="line-rule"></div>
          <div class="line-rule"></div>
        </div>
      </div>
    </div>

    <!-- RIGHT COLUMN: VITAL SIGNS & GCS -->
    <div class="right-col">
      <div class="box-title-bar">VITAL SIGNS</div>
      <table class="vitals-grid">
        <tr>
          <th style="width: 25%;"></th>
          <th style="width: 25%;">1ST TAKE</th>
          <th style="width: 25%;">2ND</th>
          <th style="width: 25%;">3RD</th>
        </tr>
        <tr>
          <td style="font-weight: bold;">TIME</td>
          <td>
            <span style="font-weight: bold;">${v1Time.time}</span><br>
            <span>${box(v1Time.am)}AM ${box(v1Time.pm)}PM</span>
          </td>
          <td>
            <span style="font-weight: bold;">${v2Time.time}</span><br>
            <span>${box(v2Time.am)}AM ${box(v2Time.pm)}PM</span>
          </td>
          <td>
            <span style="font-weight: bold;">${v3Time.time}</span><br>
            <span>${box(v3Time.am)}AM ${box(v3Time.pm)}PM</span>
          </td>
        </tr>
        <tr>
          <td style="font-weight: bold;">O2 SAT</td>
          <td style="font-weight: bold;">${v1.spo2 ? v1.spo2 : ''}</td>
          <td style="font-weight: bold;">${v2.spo2 ? v2.spo2 : ''}</td>
          <td style="font-weight: bold;">${v3.spo2 ? v3.spo2 : ''}</td>
        </tr>
        <tr>
          <td style="font-weight: bold;">PR/HR</td>
          <td style="font-weight: bold;">${v1.pr ? v1.pr : ''}</td>
          <td style="font-weight: bold;">${v2.pr ? v2.pr : ''}</td>
          <td style="font-weight: bold;">${v3.pr ? v3.pr : ''}</td>
        </tr>
        <tr>
          <td style="font-weight: bold;">RR</td>
          <td style="font-weight: bold;">${v1.rr ? v1.rr : ''}</td>
          <td style="font-weight: bold;">${v2.rr ? v2.rr : ''}</td>
          <td style="font-weight: bold;">${v3.rr ? v3.rr : ''}</td>
        </tr>
        <tr>
          <td style="font-weight: bold;">BP</td>
          <td style="font-weight: bold;">${v1.bp ? v1.bp : ''}</td>
          <td style="font-weight: bold;">${v2.bp ? v2.bp : ''}</td>
          <td style="font-weight: bold;">${v3.bp ? v3.bp : ''}</td>
        </tr>
        <tr>
          <td style="font-weight: bold;">TEMP</td>
          <td style="font-weight: bold;">${v1.temp ? v1.temp : ''}</td>
          <td style="font-weight: bold;">${v2.temp ? v2.temp : ''}</td>
          <td style="font-weight: bold;">${v3.temp ? v3.temp : ''}</td>
        </tr>
      </table>

      <!-- GLASGOW COMA SCALE -->
      <div class="box-title-bar" style="border-top: 1px solid #000;">GLASGOW COMA SCALE</div>
      <table class="gcs-grid">
        <tr>
          <td class="gcs-head-col" rowspan="4">Best eye response (E)</td>
          <td class="gcs-desc-col">Spontaneous - open with blinking</td>
          <td class="gcs-score-col" style="${gcsEye === 4 ? 'background:#e2e8f0; font-weight:900;' : ''}">4</td>
        </tr>
        <tr>
          <td class="gcs-desc-col">Opens to verbal command / speech</td>
          <td class="gcs-score-col" style="${gcsEye === 3 ? 'background:#e2e8f0; font-weight:900;' : ''}">3</td>
        </tr>
        <tr>
          <td class="gcs-desc-col">Opens to pain stimulus</td>
          <td class="gcs-score-col" style="${gcsEye === 2 ? 'background:#e2e8f0; font-weight:900;' : ''}">2</td>
        </tr>
        <tr>
          <td class="gcs-desc-col">None</td>
          <td class="gcs-score-col" style="${gcsEye === 1 ? 'background:#e2e8f0; font-weight:900;' : ''}">1</td>
        </tr>

        <tr>
          <td class="gcs-head-col" rowspan="5">Best verbal response (V)</td>
          <td class="gcs-desc-col">Oriented</td>
          <td class="gcs-score-col" style="${gcsVerbal === 5 ? 'background:#e2e8f0; font-weight:900;' : ''}">5</td>
        </tr>
        <tr>
          <td class="gcs-desc-col">Confused conversation</td>
          <td class="gcs-score-col" style="${gcsVerbal === 4 ? 'background:#e2e8f0; font-weight:900;' : ''}">4</td>
        </tr>
        <tr>
          <td class="gcs-desc-col">Inappropriate responses</td>
          <td class="gcs-score-col" style="${gcsVerbal === 3 ? 'background:#e2e8f0; font-weight:900;' : ''}">3</td>
        </tr>
        <tr>
          <td class="gcs-desc-col">Incomprehensible speech</td>
          <td class="gcs-score-col" style="${gcsVerbal === 2 ? 'background:#e2e8f0; font-weight:900;' : ''}">2</td>
        </tr>
        <tr>
          <td class="gcs-desc-col">None</td>
          <td class="gcs-score-col" style="${gcsVerbal === 1 ? 'background:#e2e8f0; font-weight:900;' : ''}">1</td>
        </tr>

        <tr>
          <td class="gcs-head-col" rowspan="6">Best motor response (M)</td>
          <td class="gcs-desc-col">Obeys commands for movement</td>
          <td class="gcs-score-col" style="${gcsMotor === 6 ? 'background:#e2e8f0; font-weight:900;' : ''}">6</td>
        </tr>
        <tr>
          <td class="gcs-desc-col">Purposeful movement to pain</td>
          <td class="gcs-score-col" style="${gcsMotor === 5 ? 'background:#e2e8f0; font-weight:900;' : ''}">5</td>
        </tr>
        <tr>
          <td class="gcs-desc-col">Withdraws from pain</td>
          <td class="gcs-score-col" style="${gcsMotor === 4 ? 'background:#e2e8f0; font-weight:900;' : ''}">4</td>
        </tr>
        <tr>
          <td class="gcs-desc-col">Abnormal flexion (decorticate)</td>
          <td class="gcs-score-col" style="${gcsMotor === 3 ? 'background:#e2e8f0; font-weight:900;' : ''}">3</td>
        </tr>
        <tr>
          <td class="gcs-desc-col">Extensor response (decerebrate)</td>
          <td class="gcs-score-col" style="${gcsMotor === 2 ? 'background:#e2e8f0; font-weight:900;' : ''}">2</td>
        </tr>
        <tr>
          <td class="gcs-desc-col">None</td>
          <td class="gcs-score-col" style="${gcsMotor === 1 ? 'background:#e2e8f0; font-weight:900;' : ''}">1</td>
        </tr>

        <tr style="background: #f1f5f9;">
          <td colspan="2" style="font-weight: 900; text-align: center; font-size: 8pt; letter-spacing: 1px;">TOTAL</td>
          <td class="gcs-score-col" style="font-size: 9pt; font-weight: 900;">${gcsTotal || ''}</td>
        </tr>
      </table>
    </div>
  </div>

  <!-- LOWER MIDDLE: DISPOSITION & RESPONDERS -->
  <div class="lower-mid">
    <div class="dispo-box">
      <span class="field-name" style="margin-bottom: 2px; display: block;">INCIDENT/PATIENT DISPOSITION</span>
      <div class="dispo-cols">
        <div class="dispo-col">
          <span>${box(hasDispo('recovered'))} Treated, Recovered</span>
          <span>${box(hasDispo('hospital'))} Treated, Transported to Hospital</span>
          <span>${box(hasDispo('rhu'))} Treated, Transferred Care to RHU</span>
          <span>${box(hasDispo('private veh'))} Treated, Transported by Private Veh.</span>
          <span>${box(hasDispo('refused transport'))} Treated, Refused Transport</span>
          <span>${box(hasDispo('no treatment, transport'))} No Treatment, Transport Required</span>
        </div>
        <div class="dispo-col">
          <span>${box(hasDispo('false call'))} False Call</span>
          <span>${box(hasDispo('cancelled'))} Cancelled</span>
          <span>${box(hasDispo('no patient'))} No Patient Found</span>
          <span>${box(hasDispo('dead'))} Dead at Scene</span>
          <span>${box(hasDispo('refused care') || hasDispo('refused all'))} Patient Refused Care</span>
          <span>${box(hasDispo('no treatment required'))} No Treatment Required</span>
        </div>
      </div>
    </div>

    <div class="resp-box">
      <div class="resp-line-item">
        <span class="field-name">Responders:</span>
        <span class="underline-span" style="width: calc(100% - 85px);">${respondersText || '__________________________________'}</span>
      </div>
      <div class="resp-line-item">
        <span class="field-name">Transported to:</span>
        <span class="underline-span" style="width: calc(100% - 105px);">${formData.transported_to || (isTransported ? 'Opol Community Clinic' : '__________________________________')}</span>
      </div>
      <div class="resp-line-item" style="margin-bottom: 0;">
        <span class="field-name">Received by:</span>
        <span class="underline-span" style="width: calc(100% - 85px);">${formData.received_by || '__________________________________'}</span>
      </div>
    </div>
  </div>

  <!-- BOTTOM: WAIVER & WITNESS INFORMATION -->
  <div class="waiver-wrapper">
    <div class="waiver-title">WAIVER</div>
    <div class="waiver-statement">
      By signing this form, I <b style="text-decoration: underline; padding: 0 4px;">${patientFullName}</b> is releasing OPOL RESCUE TEAM of any liability and/or medical claim resulting from my decision to refuse care against medical advice.
    </div>

    <div class="waiver-bottom-cols">
      <div class="sig-col">
        <div style="min-height: 28px; display: flex; align-items: flex-end;">
          ${(() => {
            const effectivePatientSig = formData.patient_signature || formData.waiver_signature;
            const isPatientUnableToSign = formData.patient_signature === 'UNABLE_TO_SIGN' || formData.waiver_signature === 'UNABLE_TO_SIGN';
            if (!isPatientUnableToSign && effectivePatientSig && String(effectivePatientSig).startsWith('data:image')) {
              return `<img src="${effectivePatientSig}" class="sig-holder-img" alt="Patient Signature" />`;
            }
            if (isPatientUnableToSign) {
              return `<span style="font-size: 7.5pt; font-weight: bold; color: #b91c1c; font-style: italic; margin-bottom: 2px;">[ PATIENT UNABLE TO SIGN / UNCONSCIOUS ]</span>`;
            }
            return '';
          })()}
        </div>
        <div style="margin-bottom: 2px;">
          <span class="field-name">SIGNATURE:</span>
          <span style="border-bottom: 1px solid #000; display: inline-block; width: 140px;"></span>
        </div>
        <div>
          <span class="field-name">DATE:</span>
          <span style="border-bottom: 1px solid #000; display: inline-block; width: 170px; font-weight: bold; padding-left: 4px;">
            ${formatMoDayYr(formData.record_date)}
          </span>
        </div>
      </div>

      <div class="sig-col">
        <span class="field-name" style="display: block; margin-bottom: 2px;">WITNESS INFORMATION</span>
        <div style="margin-bottom: 2px;">
          <span class="field-name">NAME:</span>
          <span style="border-bottom: 1px solid #000; display: inline-block; width: 185px; font-weight: bold; padding-left: 4px;">
            ${formData.witness_name || ''}
          </span>
        </div>
        <div style="min-height: 25px; display: flex; align-items: flex-end;">
          ${formData.witness_signature && String(formData.witness_signature).startsWith('data:image') ? `<img src="${formData.witness_signature}" class="sig-holder-img" alt="Witness Signature" />` : ''}
        </div>
      </div>
    </div>
  </div>
</div>

${pcrPhotos.length > 0 ? `
<div class="photos-page">
  <div style="text-align: center; margin-bottom: 10px;">
    <h3 style="margin: 0; font-size: 11pt; text-transform: uppercase; letter-spacing: 0.5px;">Attached Incident Scene Photos</h3>
    <div style="font-size: 8pt; color: #64748b;">${pcrCode} • Attached documentation for emergency response archive</div>
  </div>
  <div class="photo-grid">
    ${pcrPhotos.map((p, idx) => `
      <div class="photo-card">
        <img src="${p.uri}" class="photo-img" alt="Photo ${idx + 1}" />
        <div class="photo-meta">
          <div><b>Photo #${idx + 1}:</b> ${p.formattedDateTime || 'Recorded at scene'}</div>
          ${p.locationName ? `<div><b>Loc:</b> ${p.locationName}</div>` : ''}
        </div>
      </div>
    `).join('')}
  </div>
</div>
` : ''}

</body>
</html>`;
}

/**
 * Directly prints the PCR using the device's native print manager / AirPrint / Android Print Spooler.
 * If native ExpoPrint is not compiled in the running APK, returns fallback signal to open the in-app WebView preview.
 */
export async function printPcrDocument(data: PcrPrintData): Promise<{ success: boolean; fallback?: 'webview'; html: string }> {
  const html = generatePcrHtml(data);
  const Print = getExpoPrint();

  if (Print && typeof Print.printAsync === 'function') {
    try {
      await Print.printAsync({ html });
      return { success: true, html };
    } catch (error: any) {
      const msg = String(error?.message || '');
      if (msg.includes('cancelled') || msg.includes('canceled')) {
        return { success: true, html };
      }
      console.warn('Native Print.printAsync encountered error, opening in-app preview:', error);
    }
  }

  // Native ExpoPrint module not available in this APK build — fallback to in-app preview
  return { success: false, fallback: 'webview', html };
}

/**
 * Exports the PCR as a PDF or shares official PCR text details.
 */
export async function sharePcrPdf(data: PcrPrintData): Promise<{ success: boolean; html: string }> {
  const html = generatePcrHtml(data);
  const Print = getExpoPrint();
  const Sharing = getExpoSharing();

  if (Print && typeof Print.printToFileAsync === 'function' && Sharing && typeof Sharing.shareAsync === 'function') {
    try {
      const { uri } = await Print.printToFileAsync({ html });
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Share Patient Care Record (PDF)',
          UTI: 'com.adobe.pdf',
        });
        return { success: true, html };
      }
    } catch (error: any) {
      const msg = String(error?.message || '');
      if (msg.includes('cancelled') || msg.includes('canceled')) {
        return { success: true, html };
      }
      console.warn('Native PDF share failed, falling back to core Share:', error);
    }
  }

  // Core React Native Share fallback (works on 100% of devices without native modules)
  const patient = [data.formData.first_name, data.formData.last_name].filter(Boolean).join(' ') || (data.formData.is_unidentified ? 'Unidentified Patient' : 'Patient');
  const dispatchId = data.activeDispatch?.id ? `#${data.activeDispatch.id}` : '';
  const vitals = data.formData.vital_signs?.[0] || {};
  const gcs = data.formData.glasgow_coma_scale || {};
  const shareText = `MDRRMO OPOL - PATIENT CARE RECORD ${dispatchId}\n` +
    `Patient: ${patient}\n` +
    `Age/Gender: ${data.formData.age || 'N/A'} / ${data.formData.gender || 'N/A'}\n` +
    `Nature of Call: ${data.formData.nature_of_call || 'Emergency'}\n` +
    `Chief Complaint: ${data.formData.chief_complaint || 'N/A'}\n` +
    `Place of Incident: ${data.formData.place_of_incident || data.formData.incident_address || 'Opol'}\n` +
    `Vitals (Take 1): BP ${vitals.bp || '--'} | PR ${vitals.pr || '--'} | SpO2 ${vitals.spo2 || '--'}%\n` +
    `GCS: ${gcs.total || '--'}/15\n` +
    `Disposition: ${(data.formData.disposition || []).join(', ') || 'N/A'}\n` +
    `Transported to: ${data.formData.transported_to || 'N/A'}\n` +
    `Responders: ${data.formData.responders || 'Opol Rescue Team'}\n\n` +
    `MDRRMO Opol Emergency Medical Services`;

  try {
    await Share.share({
      title: `PCR - ${patient}`,
      message: shareText,
    });
    return { success: true, html };
  } catch (e: any) {
    Alert.alert('Share Error', 'Could not open share dialog: ' + (e?.message || 'Unknown error'));
    return { success: false, html };
  }
}

