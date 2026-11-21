export const TRANSITIONS = {
  APPLIED: ['SHORTLISTED', 'REJECTED'],
  SHORTLISTED: ['INTERVIEW', 'REJECTED'],
  INTERVIEW: ['OFFER', 'REJECTED'],
  OFFER: [],
  REJECTED: [],
  WITHDRAWN: [],
};
export const FINAL = ['OFFER', 'REJECTED', 'WITHDRAWN'];
export const canWithdraw = (s) => ['APPLIED', 'SHORTLISTED', 'INTERVIEW'].includes(s);
export const canTransition = (from, to) => TRANSITIONS[from]?.includes(to) ?? false;
