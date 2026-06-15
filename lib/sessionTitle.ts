import type { Session, SessionMode } from './types';

/** Friendlier fallback titles when a session has no named venue. Used
 *  as the session title across both the list cards and the detail page
 *  so the same identity reads the same on both surfaces. */
export const MODE_DEFAULT_TITLE: Record<SessionMode, string> = {
  'Practice':       'Swing Practice',
  'Range':          'Range Session',
  'Target Range':   'Target Practice',
  'Combine':        'Combine',
  'Closest to Pin': 'Closest to Pin',
  'Course':         'Course Round', // unused — course sessions always have a venue
};

/** Display label for a session mode. Most modes read literally; "Course"
 *  shows as "Course Play" so the on-course round is unambiguous. */
const MODE_LABEL: Partial<Record<SessionMode, string>> = {
  Course: 'Course Play',
};

export function modeLabel(mode: SessionMode): string {
  return MODE_LABEL[mode] ?? mode;
}

export interface SessionTitle {
  /** Primary title — venue name, course name, or mode-friendly default. */
  title: string;
  /** Secondary text shown below the title (e.g. venue city for practice
   *  cards where the venue name is the primary). Null when not used. */
  subtitle: string | null;
  /** City rendered inline next to the title — used by course sessions
   *  where the course name IS the location. Null when the city appears
   *  elsewhere or there's no city. */
  inlineCity: string | null;
}

/** Derive the contextual session title. The list card and detail page
 *  both call this so renaming is consistent. */
export function deriveSessionTitle(session: Session): SessionTitle {
  const isCourse = session.mode === 'Course' && !!session.course;
  if (isCourse && session.course) {
    return {
      title: session.course.name,
      subtitle: null,
      inlineCity: session.venue?.city ?? null,
    };
  }
  if (session.venue) {
    return {
      title: session.venue.name,
      subtitle: session.venue.city,
      inlineCity: null,
    };
  }
  return {
    title: MODE_DEFAULT_TITLE[session.mode],
    subtitle: null,
    inlineCity: null,
  };
}
