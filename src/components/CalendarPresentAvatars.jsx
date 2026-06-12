const MOBILE_AVATAR_CAP = 4;

export default function CalendarPresentAvatars({ avatars }) {
  if (!avatars?.length) return null;

  const overflow = avatars.length > MOBILE_AVATAR_CAP ? avatars.length - MOBILE_AVATAR_CAP : 0;

  return (
    <div className="calendar-present-avatars">
      {avatars.map((avatar, index) => (
        <span
          key={avatar.userId}
          className={`present-avatar${index >= MOBILE_AVATAR_CAP ? " present-avatar-hidden-mobile" : ""}`}
          style={{ backgroundColor: avatar.color }}
          title={avatar.name}
        >
          {avatar.initials}
        </span>
      ))}
      {overflow > 0 && (
        <span className="present-avatar-overflow" title={`${overflow} more present`}>
          +{overflow}
        </span>
      )}
    </div>
  );
}
