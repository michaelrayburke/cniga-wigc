import { View, Text, Pressable } from "react-native";

export default function EventCard({ event, starred, onToggleStar, disableStar }) {
  const speakers =
    event?.speakers?.length
      ? event.speakers
          .map((sp) => sp?.name || [sp?.firstName, sp?.lastName].filter(Boolean).join(" "))
          .filter(Boolean)
          .join(", ")
      : "";

  return (
    <View
      style={{
        borderWidth: 1,
        borderRadius: 14,
        padding: 12,
        marginBottom: 12,
        gap: 8,
      }}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
        <Text style={{ fontSize: 16, fontWeight: "700", flex: 1 }}>
          {event?.title || "Untitled"}
        </Text>

        <Pressable
          onPress={onToggleStar}
          disabled={disableStar}
          style={{
            width: 36,
            height: 36,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 18,
            borderWidth: 1,
            opacity: disableStar ? 0.5 : 1,
          }}
          accessibilityRole="button"
          accessibilityLabel={starred ? "Remove from my schedule" : "Add to my schedule"}
        >
          <Text style={{ fontSize: 18 }}>{starred ? "★" : "☆"}</Text>
        </Pressable>
      </View>

      {(event?.startTime || event?.endTime || event?.room) ? (
        <Text>
          {event?.startTime ? `${event.startTime}${event?.endTime ? `–${event.endTime}` : ""}` : ""}
          {event?.room ? ` • ${event.room}` : ""}
        </Text>
      ) : null}

      {(event?.track || speakers || event?.moderator?.name) ? (
        <Text>
          {event?.track ? `Track: ${event.track}` : ""}
          {event?.track && (speakers || event?.moderator?.name) ? " • " : ""}
          {speakers ? `Speakers: ${speakers}` : ""}
          {event?.moderator?.name ? ` • Moderator: ${event.moderator.name}` : ""}
        </Text>
      ) : null}
    </View>
  );
}
