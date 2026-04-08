export interface SessionDetail {
  sessionId: number;
  loginTime: string;
  logoutTime: string;
  durationSeconds: number;
  formattedDuration: string;
}

export interface DailySession {
  date: string;
  dayLabel: string;
  totalSeconds: number;
  formattedTime: string;
  sessions: SessionDetail[];
}

export interface WeeklyStat {
  weekNumber: number;
  year: number;
  totalSeconds: number;
  formattedTime: string;
  weekLabel: string;
}

export interface UserStats {
  userEmail: string;
  userFullName: string;
  userRole: string;
  profilePhoto: string;
  totalSecondsThisWeek: number;
  totalSecondsLastWeek: number;
  formattedThisWeek: string;
  formattedLastWeek: string;
  // ✅ AJOUTER CES 3 CHAMPS
  formattedThisWeekHours: string;
  formattedLastWeekHours: string;
  formattedDifferenceHours: string;
  differenceSeconds: number;
  formattedDifference: string;
  notificationMessage: string;
  dailySeconds: { [key: string]: number };
  dailySessions: DailySession[];
  weeklyStats: WeeklyStat[];
}

export interface UserStatsList {
  userEmail: string;
  userFullName: string;
  userRole: string;
  totalSecondsThisWeek: number;
  formattedTime: string;
  profilePhoto?: string;
  dailySeconds: { [key: string]: number }; 
}