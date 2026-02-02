import { View, TextInput, Text, Pressable } from "react-native";

function Tab({ label, active, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 999,
        backgroundColor: active ? "#111" : "#eee",
      }}
    >
      <Text style={{ color: active ? "#fff" : "#111", fontWeight: "600" }}>{label}</Text>
    </Pressable>
  );
}

export default function ScheduleFilters({
  view,
  setView,
  search,
  setSearch,
  trackFilter,
  setTrackFilter,
  tracks,
  favoritesCount,
}) {
  return (
    <View style={{ padding: 16, gap: 12 }}>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        <Tab label="Full schedule" active={view === "all"} onPress={() => setView("all")} />
        <Tab
          label={`My schedule${typeof favoritesCount === "number" ? ` (${favoritesCount})` : ""}`}
          active={view === "mine"}
          onPress={() => setView("mine")}
        />
        <Tab label="Seminars" active={view === "sessions"} onPress={() => setView("sessions")} />
        <Tab label="Social" active={view === "socials"} onPress={() => setView("socials")} />
      </View>

      <TextInput
        placeholder="Search events, tracks, rooms…"
        value={search}
        onChangeText={setSearch}
        style={{ borderWidth: 1, padding: 10, borderRadius: 10 }}
      />

      {(view === "sessions" || view === "mine") && tracks.length > 0 ? (
        <View style={{ gap: 6 }}>
          <Text style={{ fontWeight: "600" }}>Track</Text>
          <View style={{ borderWidth: 1, borderRadius: 10 }}>
            <TextInput
              value={trackFilter}
              onChangeText={setTrackFilter}
              placeholder='Type track name, or "all"'
              style={{ padding: 10 }}
            />
          </View>
          <Text style={{ fontSize: 12, opacity: 0.6 }}>
            Available tracks: {tracks.join(", ")}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
