/** Stable palette for employee present avatars on admin calendar. */
export const AVATAR_COLORS = [
  "#1a73e8",
  "#e8710a",
  "#188038",
  "#9334e6",
  "#d93025",
  "#007b83",
  "#c5221f",
  "#f9ab00",
  "#3c4043",
  "#7986cb",
];

export function getDisplayInitials(name) {
  const trimmed = String(name ?? "").trim();
  if (!trimmed) return "??";
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  const first = parts[0];
  const two = first.slice(0, 2);
  if (two.length === 1) return two.toUpperCase();
  return two.charAt(0).toUpperCase() + two.slice(1).toLowerCase();
}

export function getEmployeeColor(userId) {
  const id = String(userId ?? "");
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

function isPresentRecord(record) {
  return String(record?.status ?? "").trim().toLowerCase() === "present";
}

function normalizeEmployee(emp) {
  const userId = emp.userId || emp.UserID;
  const name = emp.name || emp.Name || "";
  const role = emp.role || emp.Role || "";
  return { userId, name, role };
}

/**
 * Groups present attendance by date for non-admin employees.
 * @returns {Map<string, Array<{ userId, name, initials, color }>>}
 */
export function buildPresentByDate(attendance, employees) {
  const employeeById = new Map();
  (employees || []).forEach((raw) => {
    const emp = normalizeEmployee(raw);
    if (!emp.userId || emp.role === "Admin") return;
    if (!emp.name) return;
    employeeById.set(emp.userId, {
      userId: emp.userId,
      name: emp.name,
      initials: getDisplayInitials(emp.name),
      color: getEmployeeColor(emp.userId),
    });
  });

  const byDate = new Map();
  (attendance || []).forEach((record) => {
    if (!isPresentRecord(record)) return;
    const date = record.date || record.Date;
    const userId = record.userId || record.UserID;
    if (!date || !userId) return;
    const avatar = employeeById.get(userId);
    if (!avatar) return;

    if (!byDate.has(date)) byDate.set(date, []);
    const list = byDate.get(date);
    if (list.some((a) => a.userId === userId)) return;
    list.push({ ...avatar });
  });

  for (const list of byDate.values()) {
    list.sort((a, b) => a.name.localeCompare(b.name));
  }

  return byDate;
}
