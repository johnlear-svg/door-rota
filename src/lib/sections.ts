export const ROTA_SECTIONS = ["security", "medical"] as const;

export type RotaSection = (typeof ROTA_SECTIONS)[number];

export const SECTION_META: Record<
  RotaSection,
  {
    label: string;
    shortLabel: string;
    brand: string;
    eyebrow: string;
    blurb: string;
    planHint: string;
    modalHint: string;
    rolesHint: string;
    pdfTitle: string;
    filePrefix: string;
    defaultRoleId: string;
  }
> = {
  security: {
    label: "Security",
    shortLabel: "Security",
    brand: "Door",
    eyebrow: "Security · hours · cost",
    blurb:
      "Luna Springs door crew, week by week — add roles as the night needs, set times, and watch hours and cost update as you go.",
    planHint: "Pick a Monday to plan door security in advance.",
    modalHint:
      "Pick a date on the calendar — we’ll snap to that week’s Monday so you can plan door security ahead.",
    rolesHint:
      "Job titles and default pay rates for door slots. New staff slots use these rates; you can still override a slot’s rate in a week.",
    pdfTitle: "Security Rota",
    filePrefix: "security-rota",
    defaultRoleId: "role_door",
  },
  medical: {
    label: "Medical",
    shortLabel: "Medical",
    brand: "Medical",
    eyebrow: "Medical · hours · cost",
    blurb:
      "Luna Springs medical staff, week by week — roster medics and welfare, set times, and watch hours and cost update as you go.",
    planHint: "Pick a Monday to plan medical cover in advance.",
    modalHint:
      "Pick a date on the calendar — we’ll snap to that week’s Monday so you can plan medical cover ahead.",
    rolesHint:
      "Job titles and default pay rates for medical slots. New staff slots use these rates; you can still override a slot’s rate in a week.",
    pdfTitle: "Medical Staff Rota",
    filePrefix: "medical-rota",
    defaultRoleId: "role_medic",
  },
};

export function parseSection(raw: string | null | undefined): RotaSection {
  if (raw === "medical") return "medical";
  return "security";
}

export function sectionHref(
  path: "/" | "/roles",
  section: RotaSection,
): string {
  const q = `section=${section}`;
  return path === "/" ? `/?${q}` : `${path}?${q}`;
}
