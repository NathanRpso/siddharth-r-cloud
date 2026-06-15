import type { Club, ClubId } from './types';

// Distinct hues across the bag for chart legibility.
export const CLUBS: Record<ClubId, Club> = {
  Dr: { id: 'Dr', label: 'Driver',         category: 'driver', color: '#1BE377' },
  '3W': { id: '3W', label: '3 Wood',       category: 'wood',   color: '#10B981' },
  '5W': { id: '5W', label: '5 Wood',       category: 'wood',   color: '#0EA5A4' },
  '4i': { id: '4i', label: '4 Iron',       category: 'iron',   color: '#2B73DF' },
  '5i': { id: '5i', label: '5 Iron',       category: 'iron',   color: '#6366F1' },
  '6i': { id: '6i', label: '6 Iron',       category: 'iron',   color: '#8B5CF6' },
  '7i': { id: '7i', label: '7 Iron',       category: 'iron',   color: '#A855F7' },
  '8i': { id: '8i', label: '8 Iron',       category: 'iron',   color: '#D946EF' },
  '9i': { id: '9i', label: '9 Iron',       category: 'iron',   color: '#EC4899' },
  PW: { id: 'PW', label: 'Pitching Wedge', category: 'wedge',  color: '#F59E0B' },
  GW: { id: 'GW', label: 'Gap Wedge',      category: 'wedge',  color: '#EF4444' },
  SW: { id: 'SW', label: 'Sand Wedge',     category: 'wedge',  color: '#DC2626' },
  LW: { id: 'LW', label: 'Lob Wedge',      category: 'wedge',  color: '#991B1B' },
};

export const CLUB_ORDER: ClubId[] = [
  'Dr', '3W', '5W',
  '4i', '5i', '6i', '7i', '8i', '9i',
  'PW', 'GW', 'SW', 'LW',
];

// Avg targets per club for a ~20 handicap, 88 mph driver swing.
// Drives the mock data generator + serves as a reference "tour avg" overlay.
export const CLUB_AVERAGES: Record<ClubId, {
  carry: number; ballSpeed: number; clubSpeed: number;
  launch: number; spin: number; smash: number;
  apex: number; descent: number;
}> = {
  Dr:  { carry: 215, ballSpeed: 130, clubSpeed: 88, launch: 12.5, spin: 3100, smash: 1.43, apex: 90, descent: 36 },
  '3W': { carry: 195, ballSpeed: 122, clubSpeed: 84, launch: 12.0, spin: 3400, smash: 1.41, apex: 80, descent: 38 },
  '5W': { carry: 180, ballSpeed: 116, clubSpeed: 80, launch: 13.0, spin: 3800, smash: 1.40, apex: 75, descent: 40 },
  '4i': { carry: 165, ballSpeed: 108, clubSpeed: 76, launch: 13.5, spin: 4500, smash: 1.38, apex: 68, descent: 42 },
  '5i': { carry: 155, ballSpeed: 104, clubSpeed: 73, launch: 14.5, spin: 4900, smash: 1.37, apex: 65, descent: 44 },
  '6i': { carry: 145, ballSpeed: 100, clubSpeed: 70, launch: 16.0, spin: 5300, smash: 1.36, apex: 62, descent: 46 },
  '7i': { carry: 135, ballSpeed: 96,  clubSpeed: 67, launch: 18.0, spin: 5700, smash: 1.34, apex: 60, descent: 47 },
  '8i': { carry: 125, ballSpeed: 92,  clubSpeed: 64, launch: 20.0, spin: 6100, smash: 1.32, apex: 58, descent: 48 },
  '9i': { carry: 115, ballSpeed: 88,  clubSpeed: 61, launch: 22.0, spin: 6800, smash: 1.30, apex: 55, descent: 49 },
  PW:  { carry: 105, ballSpeed: 84, clubSpeed: 58, launch: 24.0, spin: 7500, smash: 1.28, apex: 52, descent: 50 },
  GW:  { carry: 90,  ballSpeed: 78, clubSpeed: 55, launch: 26.0, spin: 8200, smash: 1.25, apex: 48, descent: 51 },
  SW:  { carry: 78,  ballSpeed: 73, clubSpeed: 52, launch: 28.0, spin: 9000, smash: 1.22, apex: 44, descent: 52 },
  LW:  { carry: 60,  ballSpeed: 65, clubSpeed: 48, launch: 30.0, spin: 9500, smash: 1.18, apex: 38, descent: 54 },
};
