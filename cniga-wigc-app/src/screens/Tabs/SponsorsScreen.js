import { useEffect, useState } from "react";
import { SafeAreaView, Text, FlatList, View } from "react-native";
import { fetchSponsorGroups } from "../../api/wp";

export default function SponsorsScreen() {
  const [groups, setGroups] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const g = await fetchSponsorGroups();
        setGroups(g);
      } catch (e) {
        setError(e.message || "Failed to load sponsors");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, padding: 16 }}>
        <Text>Loading…</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={{ flex: 1, padding: 16 }}>
        <Text>{error}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <FlatList
        data={groups}
        keyExtractor={(item) => item.label}
        contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }) => (
          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 18, fontWeight: "700", marginBottom: 8 }}>
              {item.label}
            </Text>
            {item.sponsors.map((s) => (
              <Text key={`${s.type}-${s.id}`} style={{ paddingVertical: 2 }}>
                {s.name}
              </Text>
            ))}
          </View>
        )}
      />
    </SafeAreaView>
  );
}
