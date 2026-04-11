/**
 * deduceUnits.ts
 *
 * Given a student's degree level, current year of study, semester, and
 * specialization/major, returns the set of unit codes they have most likely
 * completed based on the standard QUT full-time Feb-entry sequence.
 *
 * The deduction is conservative — only units in the prescribed sequence
 * up to the end of the previous semester are included.  The student can
 * review and adjust the result in the progress tracker.
 */

export type DegreeLevel = 'Master' | 'Bachelor'

// ── Master of IT (MIT) majors ─────────────────────────────────────────────────

export type MITMajor =
  | 'Computer Science'
  | 'Data Science'
  | 'Human-Centred Design'
  | 'Internet of Things'
  | 'IT Management'
  | 'Process Analytics & Automation'
  | 'Software Development'

export const MIT_MAJORS: MITMajor[] = [
  'Computer Science',
  'Data Science',
  'Human-Centred Design',
  'Internet of Things',
  'IT Management',
  'Process Analytics & Automation',
  'Software Development',
]

// ── Bachelor of IT specializations ───────────────────────────────────────────

export type BachelorSpecialization =
  | 'Artificial Intelligence'
  | 'Business Analysis and IT Management'
  | 'Computer Science'
  | 'Cyber Security'
  | 'Enterprise Computing'
  | 'Process Analytics and Automation'
  | 'Software Development'

export const BACHELOR_SPECIALIZATIONS: BachelorSpecialization[] = [
  'Artificial Intelligence',
  'Business Analysis and IT Management',
  'Computer Science',
  'Cyber Security',
  'Enterprise Computing',
  'Process Analytics and Automation',
  'Software Development',
]

// Specializations whose full sequences have been loaded from PDF
export const BACHELOR_SEQUENCE_AVAILABLE = new Set<BachelorSpecialization>([
  'Artificial Intelligence',
  'Business Analysis and IT Management',
])

// MIT = 2 years full-time, Bachelor = 3 years full-time
export const DEGREE_YEARS: Record<DegreeLevel, number[]> = {
  Master: [1, 2],
  Bachelor: [1, 2, 3],
}

// ── MIT semester sequences (Feb full-time entry) ─────────────────────────────
// Each array is one semester in order: Y1S1, Y1S2, Y2S1, Y2S2

const MIT_COMMON_Y1S1 = ['IFN581', 'IFN582', 'IFN583', 'IFN585']

const MIT_SEMESTERS: Record<MITMajor, string[][]> = {
  'Computer Science': [
    MIT_COMMON_Y1S1,
    ['IFN580', 'IFN635', 'IFN637', 'IFN636', 'IFN584'], // Y1S2
    ['INN700', 'IFN735', 'IFN664'],                      // Y2S1
    ['IFN736'],                                           // Y2S2
  ],
  'Data Science': [
    MIT_COMMON_Y1S1,
    ['IFN580', 'IFN635', 'IFN636', 'IFN584', 'IFN509'], // Y1S2
    ['INN700', 'IFN735', 'IFN637'],                      // Y2S1
    ['IFN638', 'IFN645'],                                 // Y2S2
  ],
  'Human-Centred Design': [
    MIT_COMMON_Y1S1,
    ['IFN580', 'IFN635', 'IFN637', 'IFN623'],            // Y1S2
    ['INN700', 'IFN735', 'IFN664'],                      // Y2S1
    ['IFN636', 'IFN736', 'IFN692'],                      // Y2S2
  ],
  'Internet of Things': [
    MIT_COMMON_Y1S1,
    ['IFN580', 'IFN635', 'IFN636', 'IFN658'],            // Y1S2
    ['INN700', 'IFN735', 'IFN667'],                      // Y2S1
    ['IFN736', 'IFN637', 'IFN649'],                      // Y2S2
  ],
  'IT Management': [
    MIT_COMMON_Y1S1,
    ['IFN580', 'IFN635', 'IFN636', 'IFN562'],            // Y1S2
    ['INN700', 'IFN735', 'IFN631', 'IFN561'],            // Y2S1
    ['IFN736', 'IFN637'],                                 // Y2S2
  ],
  'Process Analytics & Automation': [
    MIT_COMMON_Y1S1,
    ['IFN580', 'IFN635', 'IFN636', 'IFN515'],            // Y1S2
    ['INN700', 'IFN735', 'IFN650'],                      // Y2S1
    ['IFN736', 'IFN637', 'IFN653'],                      // Y2S2
  ],
  'Software Development': [
    MIT_COMMON_Y1S1,
    ['IFN635', 'IFN636', 'IFN637', 'IFN584'],            // Y1S2
    ['INN700', 'IFN664', 'IFN735'],                      // Y2S1
    ['IFN580', 'IFN663', 'IFN736'],                      // Y2S2
  ],
}

// ── Bachelor semester sequences (Feb full-time, Common first year option) ────
// Each array is one semester: Y1S1, Y1S2, Y2S1, Y2S2, Y3S1, Y3S2

// All Bachelor specializations share the same Year 1
const BACH_COMMON_Y1S1 = ['IFB102', 'IFB103', 'IFB104', 'IFB105']
const BACH_COMMON_Y1S2 = ['IFB201', 'IFB220', 'IFB240']

const BACHELOR_SEMESTERS: Record<BachelorSpecialization, string[][]> = {
  'Artificial Intelligence': [
    BACH_COMMON_Y1S1,
    BACH_COMMON_Y1S2,
    ['CAB201', 'IFB320'],                                // Y2S1
    ['IAB353', 'CAB330', 'DSB102'],                      // Y2S2
    ['IFB398', 'CAB420'],                                // Y3S1
    ['IFB399'],                                          // Y3S2
  ],
  'Business Analysis and IT Management': [
    BACH_COMMON_Y1S1,
    BACH_COMMON_Y1S2,
    ['IAB203', 'IAB204'],                                // Y2S1
    ['IAB305', 'IAB353'],                                // Y2S2
    ['IFB398', 'IAB402'],                                // Y3S1
    ['IFB399', 'IAB401'],                                // Y3S2
  ],
  // Remaining specializations: common Year 1 only until PDFs are added
  'Computer Science': [
    BACH_COMMON_Y1S1,
    BACH_COMMON_Y1S2,
  ],
  'Cyber Security': [
    BACH_COMMON_Y1S1,
    BACH_COMMON_Y1S2,
  ],
  'Enterprise Computing': [
    BACH_COMMON_Y1S1,
    BACH_COMMON_Y1S2,
  ],
  'Process Analytics and Automation': [
    BACH_COMMON_Y1S1,
    BACH_COMMON_Y1S2,
  ],
  'Software Development': [
    BACH_COMMON_Y1S1,
    BACH_COMMON_Y1S2,
  ],
}

/**
 * Return the set of unit codes deduced as completed.
 *
 * Logic: a student in Year Y, Semester S has finished all semesters
 * strictly before their current one:
 *   completed semesters = (Y - 1) * 2 + (S - 1)
 *
 * e.g. Year 1 Sem 1 → 0 semesters done (nothing pre-filled)
 *      Year 1 Sem 2 → 1 semester done  (Y1S1 units)
 *      Year 2 Sem 1 → 2 semesters done (Y1S1 + Y1S2 units)
 *      Year 2 Sem 2 → 3 semesters done (Y1S1 + Y1S2 + Y2S1 units)
 */
export function deduceCompletedUnits(
  degree: DegreeLevel,
  yearOfStudy: number,
  semester: 1 | 2,
  major: MITMajor | BachelorSpecialization | '',
): Set<string> {
  if (!major) return new Set()

  let semesters: string[][]
  if (degree === 'Master') {
    semesters = MIT_SEMESTERS[major as MITMajor] ?? []
  } else {
    semesters = BACHELOR_SEMESTERS[major as BachelorSpecialization] ?? []
  }

  const semCount = Math.min((yearOfStudy - 1) * 2 + (semester - 1), semesters.length)
  if (semCount === 0) return new Set()
  const codes = semesters.slice(0, semCount).flat()
  return new Set(codes)
}
