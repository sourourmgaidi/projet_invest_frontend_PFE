export interface MonthlyRegistrationDTO {
  monthLabel: string;
  month: string;
  count: number;
  previousMonthCount: number;
  percentageChange: number;
}