import { useEffect, useState } from "react";
import { SafeAreaView, Text, FlatList, View } from "react-native";
import { fetchPresentersList } from "../../api/wp";

export default function PresentersScreen() {
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const p = await fetchPresentersList();
        setItems(p);
      } catch (e) {
        setError(e.message || "Failed to load presenters");
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
        data={items}
        keyExtractor={(p) => String(p.id)}
        contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }) => (
          <View style={{ paddingVertical: 10, borderBottomWidth: 1 }}>
            <Text style={{ fontWeight: "700" }}>{item.name}</Text>
            {(item.title || item.org) ? (
              <Text>{[item.title, item.org].filter(Boolean).join(" • ")}</Text>
            ) : null}
          </View>
        )}
      />
    </SafeAreaView>
  );
}
