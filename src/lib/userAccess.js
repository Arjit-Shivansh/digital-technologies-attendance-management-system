/** Team attendance nav + /team route (Senior/Admin with CanMarkAttendance). */
export function canAccessTeamAttendance(user) {
  if (!user?.canMarkAttendance) return false;
  const isAdmin = user.role === "Admin";
  return user.role?.includes("Senior") || isAdmin;
}
