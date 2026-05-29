export interface MenuItem {
  id: string;
  key: string;
  label: string;
  parentKey: string | null;
  icon: string | null;
  sortOrder: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AdminMenuGrant {
  id: string;
  adminUserId: string;
  menuKey: string;
  grantedBy: string;
  grantedAt: string;
}
