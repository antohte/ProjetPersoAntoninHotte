export const CATEGORIES = [
  { id: "bar", label: "Bar", icon: "beer" },
  { id: "sport", label: "Sport", icon: "football" },
  { id: "revision", label: "Révision", icon: "book" },
  { id: "culture", label: "Culture", icon: "color-palette" },
  { id: "soiree", label: "Soirée", icon: "musical-notes" },
  { id: "autre", label: "Autre", icon: "ellipsis-horizontal" },
] as const;

export const CATEGORIES_WITH_ALL = [
  { id: "all", label: "Tout", icon: "apps" },
  ...CATEGORIES,
] as const;

export type CategoryId = typeof CATEGORIES[number]["id"];
