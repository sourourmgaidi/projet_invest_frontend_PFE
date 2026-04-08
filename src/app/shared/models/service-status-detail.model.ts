
export interface ServiceStatusDetail {
  id: number;
  name: string;
  type: 'INVESTMENT' | 'COLLABORATION' | 'TOURIST';
  status: 'APPROVED' | 'RESERVED' | 'TAKEN';
  owner: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
  };
  reservedBy?: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
  };
  takenBy?: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
  };
  regionId: number;
  regionName: string;
  createdAt: string;
  updatedAt: string;
}