export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type Table<Row> = {
  Row: Row;
  Insert: Partial<Row>;
  Update: Partial<Row>;
  Relationships: [];
};

export interface Database {
  public: {
    Tables: {
      trips: Table<{
        id: string;
        name: string;
        start_date: string;
        end_date: string;
        budget: number;
        currency: string;
        cover_image: string | null;
        created_at: string;
      }>;
      countries: Table<{
        id: string;
        name: string;
        code: string | null;
        flag: string | null;
        history: Json;
        culture: Json;
        taboo: Json;
        language: string | null;
        created_at: string;
      }>;
      cities: Table<{
        id: string;
        country_id: string | null;
        name: string;
        latitude: number | null;
        longitude: number | null;
        description: string | null;
        created_at: string;
      }>;
      itinerary: Table<{
        id: string;
        trip_id: string | null;
        date: string;
        city: string;
        time: string | null;
        title: string;
        location: string | null;
        ai_note: string | null;
        category: "History" | "Culture" | "Food" | "Nature" | "Experience" | "Transport" | "Planning" | null;
        created_at: string;
      }>;
      user_itinerary: Table<{
        id: string;
        user_id: string;
        trip_id: string;
        source_itinerary_id: string | null;
        date: string;
        time: string | null;
        city: string;
        title: string;
        location: string | null;
        category: "History" | "Culture" | "Food" | "Nature" | "Experience" | "Transport" | "Planning" | null;
        note: string | null;
        source: "spontaneous" | "override";
        status: "planned" | "cancelled";
        created_at: string;
        updated_at: string;
      }>;
      accommodations: Table<{
        id: string;
        trip_id: string | null;
        city: string;
        hotel_name: string;
        address: string | null;
        price: number | null;
        currency: string | null;
        check_in: string | null;
        check_out: string | null;
        created_at: string;
      }>;
      transportation: Table<{
        id: string;
        trip_id: string | null;
        from: string;
        to: string;
        type: string;
        date: string | null;
        time: string | null;
        price: number | null;
        currency: string | null;
        created_at: string;
      }>;
      expenses: Table<{
        id: string;
        trip_id: string | null;
        user_id: string | null;
        date: string;
        category: string;
        amount: number;
        currency: string;
        location: string | null;
        note: string | null;
        created_at: string;
      }>;
      culture: Table<{
        id: string;
        country: string;
        category: string;
        title: string;
        content: string;
        created_at: string;
      }>;
      journal: Table<{
        id: string;
        trip_id: string | null;
        user_id: string | null;
        date: string;
        city: string;
        photo: string | null;
        photos: Json;
        sentence: string | null;
        story: string | null;
        created_at: string;
      }>;
      activity_state: Table<{
        id: string;
        user_id: string;
        trip_id: string | null;
        activity_id: string;
        completed: boolean;
        completed_at: string | null;
        journal_created: boolean;
        created_at: string;
        updated_at: string;
      }>;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
