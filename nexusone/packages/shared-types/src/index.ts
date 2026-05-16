export interface NexusUser {
  id: string;
  email: string;
  organizationId: string;
  roles: string[];
}

export interface Organization {
  id: string;
  name: string;
}
