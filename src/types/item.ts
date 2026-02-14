export interface Label {
  id: string;
  name: string;
  color: string;
}

export interface BookmarkContent {
  url: string;
  source_url?: string;
}

export interface PasswordContent {
  location: string;
  account: string;
  password: string;
}

export interface SerialNumberContent {
  serial_number: string;
  owner_name?: string;
  owner_email?: string;
  organization?: string;
}

export interface SoftwareLicenseContent {
  license_key: string;
  license_to?: string;
  email?: string;
  purchase_date?: string;
  notes?: string;
}

export interface Item {
  id: string;
  name: string;
  type: string;
  is_flagged: boolean;
  is_trashed: boolean;
  parent_folder_id?: string | null;
  created_at: string;
  updated_at: string;
  trashed_at?: string | null;
  labels?: Label[];
  note_content?: {
    content: string;
    content_format: string;
  } | null;
  bookmark_content?: BookmarkContent | null;
  password_content?: PasswordContent | null;
  serial_number_content?: SerialNumberContent | null;
  software_license_content?: SoftwareLicenseContent | null;
}
