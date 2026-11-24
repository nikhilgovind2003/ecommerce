// Turns a name into a URL-friendly slug: "Android Phones" -> "android-phones".
export function slugify(text) {
  return text.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}
