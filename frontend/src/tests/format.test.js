import { NEXT_STATUSES, canWithdraw, fmtSize, roleHome, timeAgo } from '../utils/format';

describe('format utils', () => {
  it('mirrors the backend status workflow', () => {
    expect(NEXT_STATUSES.APPLIED).toEqual(['SHORTLISTED', 'REJECTED']);
    expect(NEXT_STATUSES.SHORTLISTED).toEqual(['INTERVIEW', 'REJECTED']);
    expect(NEXT_STATUSES.INTERVIEW).toEqual(['OFFER', 'REJECTED']);
    expect(NEXT_STATUSES.OFFER).toEqual([]);
    expect(NEXT_STATUSES.REJECTED).toEqual([]);
  });
  it('canWithdraw only before final stages', () => {
    expect(['APPLIED', 'SHORTLISTED', 'INTERVIEW'].every(canWithdraw)).toBe(true);
    expect(['OFFER', 'REJECTED', 'WITHDRAWN'].some(canWithdraw)).toBe(false);
  });
  it('formats sizes and role homes', () => {
    expect(fmtSize(2048)).toBe('2 KB');
    expect(fmtSize(3 * 1024 * 1024)).toBe('3.0 MB');
    expect(roleHome('ADMIN')).toBe('/admin');
    expect(roleHome('CANDIDATE')).toBe('/candidate');
  });
  it('timeAgo handles recent dates', () => {
    expect(timeAgo(new Date())).toBe('just now');
  });
});
