import { supabase } from "@/lib/supabase/client";

const journalPhotoBucket = "journal-photos";
const journalPhotoPrefix = "storage:journal-photos:";

function sanitizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "-").slice(-80);
}

export function isJournalPhotoRef(photo: string) {
  return photo.startsWith(journalPhotoPrefix);
}

export function getJournalPhotoPath(photo: string) {
  return photo.replace(journalPhotoPrefix, "");
}

export async function uploadJournalPhotoFiles({
  journalId,
  files,
  fallbackPhotos,
}: {
  journalId: string;
  files: File[];
  fallbackPhotos: string[];
}) {
  if (!files.length || !supabase) return fallbackPhotos;

  const { data: userResult, error: userError } = await supabase.auth.getUser();
  const user = userResult?.user;
  if (userError || !user) return fallbackPhotos;

  const uploadedRefs: string[] = [];

  for (const file of files.slice(0, 3)) {
    const path = `${user.id}/${journalId}/${Date.now()}-${sanitizeFileName(file.name || "photo.jpg")}`;
    const { error } = await supabase.storage.from(journalPhotoBucket).upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type || "image/jpeg",
    });

    if (error) {
      return fallbackPhotos;
    }

    uploadedRefs.push(`${journalPhotoPrefix}${path}`);
  }

  return uploadedRefs.length ? uploadedRefs : fallbackPhotos;
}

export async function resolveJournalPhotoUrls(photos: string[]) {
  if (!supabase) return photos;
  const client = supabase;

  const resolved = await Promise.all(
    photos.map(async (photo) => {
      if (!isJournalPhotoRef(photo)) return photo;

      const path = getJournalPhotoPath(photo);
      const { data, error } = await client.storage.from(journalPhotoBucket).createSignedUrl(path, 60 * 60 * 24 * 7);

      if (error || !data?.signedUrl) return photo;
      return data.signedUrl;
    }),
  );

  return resolved;
}
