import { getSupabaseClient } from "./supabase";

export const campApplicationStatusOptions = ["new", "contacted", "offer_sent", "confirmed", "cancelled"] as const;
export type CampApplicationStatus = (typeof campApplicationStatusOptions)[number];

export type CampApplication = {
  id: string;
  clubName: string;
  country?: string;
  city?: string;
  contactPersonName: string;
  email: string;
  phone: string;
  sport: string;
  ageGroup?: string;
  estimatedPlayers: number;
  estimatedStaff?: number;
  preferredArrivalDate: string;
  preferredDepartureDate: string;
  numberOfNights?: number;
  destinationPreference?: string;
  hotelLevelPreference?: string;
  trainingFacilityRequirement?: string;
  friendlyGamesNeeded?: boolean;
  airportTransferNeeded?: boolean;
  specialNotes?: string;
  status: CampApplicationStatus;
  adminNotes?: string;
  lastContactedAt?: string;
  createdAt?: string;
  updatedAt?: string;
};

type CampApplicationRow = {
  id: string;
  club_name: string;
  country: string | null;
  city: string | null;
  contact_person_name: string;
  email: string;
  phone: string;
  sport: string;
  age_group: string | null;
  estimated_players: number;
  estimated_staff: number | null;
  preferred_arrival_date: string;
  preferred_departure_date: string;
  number_of_nights: number | null;
  destination_preference: string | null;
  hotel_level_preference: string | null;
  training_facility_requirement: string | null;
  friendly_games_needed: boolean | null;
  airport_transfer_needed: boolean | null;
  special_notes: string | null;
  status: CampApplicationStatus;
  admin_notes: string | null;
  last_contacted_at: string | null;
  created_at: string | null;
  updated_at: string | null;
};

function mapCampApplication(row: CampApplicationRow): CampApplication {
  return {
    id: row.id,
    clubName: row.club_name,
    country: row.country ?? undefined,
    city: row.city ?? undefined,
    contactPersonName: row.contact_person_name,
    email: row.email,
    phone: row.phone,
    sport: row.sport,
    ageGroup: row.age_group ?? undefined,
    estimatedPlayers: row.estimated_players,
    estimatedStaff: row.estimated_staff ?? undefined,
    preferredArrivalDate: row.preferred_arrival_date,
    preferredDepartureDate: row.preferred_departure_date,
    numberOfNights: row.number_of_nights ?? undefined,
    destinationPreference: row.destination_preference ?? undefined,
    hotelLevelPreference: row.hotel_level_preference ?? undefined,
    trainingFacilityRequirement: row.training_facility_requirement ?? undefined,
    friendlyGamesNeeded: row.friendly_games_needed ?? undefined,
    airportTransferNeeded: row.airport_transfer_needed ?? undefined,
    specialNotes: row.special_notes ?? undefined,
    status: row.status,
    adminNotes: row.admin_notes ?? undefined,
    lastContactedAt: row.last_contacted_at ?? undefined,
    createdAt: row.created_at ?? undefined,
    updatedAt: row.updated_at ?? undefined
  };
}

export async function submitCampApplication(application: CampApplication) {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error("Supabase is not configured.");

  const { error } = await supabase.from("camp_applications").insert({
    id: application.id,
    club_name: application.clubName,
    country: application.country || null,
    city: application.city || null,
    contact_person_name: application.contactPersonName,
    email: application.email,
    phone: application.phone,
    sport: application.sport,
    age_group: application.ageGroup || null,
    estimated_players: application.estimatedPlayers,
    estimated_staff: application.estimatedStaff ?? null,
    preferred_arrival_date: application.preferredArrivalDate,
    preferred_departure_date: application.preferredDepartureDate,
    number_of_nights: application.numberOfNights ?? null,
    destination_preference: application.destinationPreference || null,
    hotel_level_preference: application.hotelLevelPreference || null,
    training_facility_requirement: application.trainingFacilityRequirement || null,
    friendly_games_needed: application.friendlyGamesNeeded ?? null,
    airport_transfer_needed: application.airportTransferNeeded ?? null,
    special_notes: application.specialNotes || null,
    status: application.status
  });

  if (error) throw error;
}

export async function fetchCampApplications() {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error("Supabase is not configured.");

  const { data, error } = await supabase
    .from("camp_applications")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return ((data ?? []) as CampApplicationRow[]).map(mapCampApplication);
}

export async function updateCampApplication(
  applicationId: string,
  updates: {
    status?: CampApplicationStatus;
    adminNotes?: string;
    lastContactedAt?: string;
  }
) {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error("Supabase is not configured.");

  const payload: Record<string, string | null> = {
    updated_at: new Date().toISOString()
  };
  if (updates.status) payload.status = updates.status;
  if ("adminNotes" in updates) payload.admin_notes = updates.adminNotes?.trim() || null;
  if ("lastContactedAt" in updates) payload.last_contacted_at = updates.lastContactedAt || null;

  const { error } = await supabase.from("camp_applications").update(payload).eq("id", applicationId);
  if (error) throw error;
}

export async function deleteCampApplication(applicationId: string) {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error("Supabase is not configured.");

  const { error } = await supabase.from("camp_applications").delete().eq("id", applicationId);
  if (error) throw error;
}
