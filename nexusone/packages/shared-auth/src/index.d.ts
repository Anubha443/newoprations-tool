export type Role = 'owner' | 'admin' | 'hr_manager' | 'sales_rep' | 'employee' | 'viewer';
export interface AuthUserPayload {
  sub: string;
  email: string;
  organization_id: string;
  roles: Role[];
  module_access: { comm: boolean; hrm: boolean; crm: boolean };
}
