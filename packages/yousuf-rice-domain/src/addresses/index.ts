import { ID } from "node-appwrite";
import { getTablesDB, getConfig } from "../appwrite/client";
import { ValidationError } from "../errors";

export interface AddressRecord {
  $id: string;
  customer_id: string;
  order_id: string;
  address_line: string;
  city: string;
  latitude: number;
  longitude: number;
  maps_url: string;
  $createdAt: string;
}

export interface AddressInput {
  customerId: string;
  orderId: string;
  addressLine: string;
  city: string;
  latitude?: number | null;
  longitude?: number | null;
}

export function generateMapsUrl(latitude: number, longitude: number): string {
  if (latitude && longitude) {
    return `https://www.google.com/maps?q=${latitude},${longitude}`;
  }
  return "";
}

export async function createAddress(input: AddressInput): Promise<AddressRecord> {
  const db = getTablesDB();
  const config = getConfig();

  if (!input.addressLine || input.addressLine.trim().length < 10) {
    throw new ValidationError("Delivery address is too short. Please provide complete address.");
  }

  if (!input.city || input.city.trim().length === 0) {
    throw new ValidationError("City is required");
  }

  const hasCoordinates = input.latitude !== null && input.longitude !== null && input.latitude !== undefined && input.longitude !== undefined;
  const mapsUrl = hasCoordinates
    ? generateMapsUrl(input.latitude!, input.longitude!)
    : "";

  const created = await db.createRow({
    databaseId: config.databaseId,
    tableId: config.addressesTableId,
    rowId: ID.unique(),
    data: {
      customer_id: input.customerId,
      order_id: input.orderId,
      address_line: input.addressLine.trim(),
      city: input.city.trim(),
      latitude: hasCoordinates ? input.latitude : 0,
      longitude: hasCoordinates ? input.longitude : 0,
      maps_url: mapsUrl,
    },
  });

  return created as unknown as AddressRecord;
}
