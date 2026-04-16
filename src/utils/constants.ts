
export const SECRET_KEY = "intra_syntax_secret_2026";
export const ATTEMPT_LIMIT_PER_MINUTE = 5;
export const PENALTY_DURATION_MINUTES = 45;
export const FLAGS_UNTIL_PENALTY = 3;

// Hunt Timing (UTC)
export const HUNT_START_ISO = '2026-04-14T12:30:00Z'; // 14th April 2026, 6:00 PM IST
export const HUNT_DURATION_HOURS = 48;

export const getHuntDates = () => {
  const start = new Date(HUNT_START_ISO);
  const end = new Date(start.getTime() + HUNT_DURATION_HOURS * 60 * 60 * 1000);
  return { start, end };
};
