# CarePlus Medical Centre — Product Blueprint

## Vision

CarePlus is a modular hospital operating platform built around a longitudinal patient record.

The system should connect the full patient journey rather than treating appointments, billing, laboratory, prescriptions, communication and feedback as isolated features.

## Product surfaces

1. Management/Admin
2. Doctor
3. Nurse
4. Reception
5. Laboratory
6. Pharmacy
7. Finance/HMO
8. Patient
9. Public website

All surfaces share the same governed clinical/operational data layer.

## Core clinical model

The clinical record is centered on:

Patient
→ Encounter
→ Vitals
→ Clinical Notes
→ Diagnoses
→ Orders
→ Results
→ Prescriptions
→ Medication History
→ Care Plan
→ Follow-up

Appointments are scheduling events; encounters represent actual clinical care.

## Phase 0 — Foundation & hardening

Before exposing more clinical information:

- Establish staff identity mapping: Auth user → staff → doctor/nurse/admin identity.
- Define role-based and record-level access rules.
- Review and harden RLS and SECURITY DEFINER functions.
- Establish patient identity/duplicate detection strategy.
- Strengthen audit trail for clinical records.
- Define document/file storage boundaries.
- Define terminology/enums and status-transition rules.
- Keep event-driven automation as the default for state changes.
- Keep time-based scheduling only where time itself is the trigger.
- Design clinical entities so they can map cleanly to HL7 FHIR concepts later.
- Establish backup/recovery and privacy requirements.

## Phase 1 — Clinical Core

### New entities

- encounters
- encounter_notes
- vitals
- diagnoses
- patient_allergies
- medications
- prescriptions
- prescription_items
- medication_history
- clinical_orders
- care_plans
- follow_ups

### Doctor workflow

Doctor Dashboard
→ Today's queue
→ Patient chart
→ Start encounter
→ History/vitals
→ Assessment
→ Diagnosis
→ Orders
→ Prescription
→ Care plan
→ Follow-up
→ Sign encounter

### Patient chart

- Overview
- Timeline
- Encounters
- Diagnoses
- Allergies
- Medications
- Prescriptions
- Lab results
- Imaging
- Procedures
- Documents
- Referrals
- Billing

## Phase 2 — Nursing & patient flow

- Triage
- Vitals
- Queue management
- Nursing notes
- Care tasks
- Medication administration
- Handover
- Room/queue state

## Phase 3 — Laboratory & Pharmacy

### Laboratory

Orders → specimen → processing → result → verification → critical-result alert → doctor/patient visibility.

### Pharmacy

Prescription → verification → stock check → dispensing → batch/expiry tracking → inventory movement → billing.

## Phase 4 — Patient Portal

- Appointments
- Medical record access
- Prescriptions
- Lab results
- Documents
- Bills/payments
- Messages
- Follow-up
- Feedback
- Consent/privacy controls

## Phase 5 — Finance & HMO

- Service pricing
- Invoices
- Payments
- Insurance/HMO eligibility
- Authorizations
- Claims
- Claim status
- Reconciliation
- Refunds
- Financial reporting

## Phase 6 — Hospital operations

- Admissions
- Wards
- Beds
- Transfers
- Discharge
- Emergency
- Theatre/surgery
- Referrals
- Blood bank
- Infection prevention
- Incident/safety reporting
- Inventory/procurement

## Phase 7 — Intelligence & interoperability

AI should assist, not independently diagnose or prescribe.

Potential capabilities:

- clinical documentation assistance
- patient timeline summaries
- result prioritization
- medication safety assistance
- follow-up identification
- operational forecasting
- communication assistance
- feedback intelligence

Interoperability:

- HL7 FHIR-compatible resource design
- Laboratory integrations
- Pharmacy integrations
- HMO/claims integrations
- Payment integrations
- Other hospital/health-system integrations

## Design principles

1. Patient safety over feature count.
2. One longitudinal patient record.
3. Least-privilege access.
4. Every clinically important mutation is auditable.
5. Doctors should spend less time fighting the system, not more.
6. Alerts should be meaningful and actionable.
7. Automation should be idempotent and event-driven where appropriate.
8. Scheduling should remain time-driven where time is the actual trigger.
9. Public, staff and patient experiences should be separate interfaces over a shared governed backend.
10. Build incrementally; do not implement inpatient, theatre, blood bank and other advanced modules before the clinical core is stable.

## Immediate implementation order

1. Security/role architecture review
2. Doctor ↔ Auth identity mapping
3. Patient identity/duplicate strategy
4. Clinical encounter schema
5. Vitals + diagnoses + allergies
6. Medications + prescriptions
7. Doctor Dashboard
8. Patient chart/timeline
9. Clinical orders
10. Laboratory workflow
11. Pharmacy workflow
12. Nurse workflow
13. Patient portal
14. Finance/HMO expansion
15. Inpatient/emergency/theatre modules
16. Interoperability and advanced AI

## Current CarePlus assets to preserve

The existing appointment system, notification dispatcher, SMS response handling, feedback intelligence, reports, payments foundation, laboratory result foundation, patient history views, audit trail and responsive admin shell remain part of the platform.

They should be extended rather than rewritten unless a specific architectural problem requires change.
