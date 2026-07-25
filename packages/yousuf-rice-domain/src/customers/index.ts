import { Query, ID } from "node-appwrite";
import { getTablesDB, getConfig } from "../appwrite/client";
import { ValidationError } from "../errors";

export interface CustomerRecord {
  $id: string;
  user_id: string;
  full_name: string;
  phone: string;
  email?: string;
  $createdAt: string;
}

export interface CustomerResult {
  id: string;
  name: string;
  phoneNumber: string;
  email: string | null;
}

export function formatPhoneNumber(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("0") && digits.length === 11) {
    return `+92${digits.substring(1)}`;
  }
  if (digits.startsWith("92")) {
    return `+${digits}`;
  }
  return `+92${digits}`;
}

export function validatePhoneNumber(phone: string): { valid: boolean; error?: string } {
  const formatted = formatPhoneNumber(phone);
  const digits = formatted.replace(/\D/g, "");
  if (digits.length < 11 || digits.length > 13) {
    return { valid: false, error: "Invalid Pakistani phone number. Must be 11 digits starting with 0." };
  }
  return { valid: true };
}

function validateEmail(email: string | null | undefined): string {
  if (!email || email.trim().length === 0) return "";
  const trimmed = email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmed)) {
    throw new ValidationError("Invalid email format");
  }
  return trimmed;
}

export async function findCustomerByPhone(phone: string): Promise<CustomerRecord | null> {
  const db = getTablesDB();
  const config = getConfig();
  const formattedPhone = formatPhoneNumber(phone);

  const response = await db.listRows({
    databaseId: config.databaseId,
    tableId: config.customersTableId,
    queries: [Query.equal("phone", formattedPhone)],
  });

  return (response.rows[0] as unknown as CustomerRecord) || null;
}

export async function findOrCreateCustomer(params: {
  name: string;
  phoneNumber: string;
  email?: string | null;
  userId?: string | null;
}): Promise<{ customer: CustomerResult; isNew: boolean }> {
  const db = getTablesDB();
  const config = getConfig();

  if (!params.name || params.name.trim().length === 0) {
    throw new ValidationError("Customer name is required");
  }

  if (!params.phoneNumber || params.phoneNumber.trim().length === 0) {
    throw new ValidationError("Phone number is required");
  }

  const phoneValidation = validatePhoneNumber(params.phoneNumber);
  if (!phoneValidation.valid) {
    throw new ValidationError(phoneValidation.error!);
  }

  const formattedPhone = formatPhoneNumber(params.phoneNumber);
  const validatedEmail = validateEmail(params.email);

  const existing = await findCustomerByPhone(formattedPhone);

  if (existing) {
    const updated = await db.updateRow({
      databaseId: config.databaseId,
      tableId: config.customersTableId,
      rowId: existing.$id,
      data: {
        full_name: params.name.trim(),
        user_id: params.userId || existing.user_id || "guest",
        email: validatedEmail || existing.email || "",
      },
    });

    const record = updated as unknown as CustomerRecord;
    return {
      customer: { id: record.$id, name: record.full_name, phoneNumber: record.phone, email: record.email || null },
      isNew: false,
    };
  }

  const created = await db.createRow({
    databaseId: config.databaseId,
    tableId: config.customersTableId,
    rowId: ID.unique(),
    data: {
      user_id: params.userId || "guest",
      full_name: params.name.trim(),
      phone: formattedPhone,
      email: validatedEmail,
    },
  });

  const record = created as unknown as CustomerRecord;
  return {
    customer: { id: record.$id, name: record.full_name, phoneNumber: record.phone, email: record.email || null },
    isNew: true,
  };
}
