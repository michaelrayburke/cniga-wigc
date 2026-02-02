import { SafeAreaView, Text, Button } from "react-native";
import { useAuth } from "../../context/AuthContext";

export default function ProfileScreen() {
  const { user, signOut } = useAuth();

  return (
    <SafeAreaView style={{ flex: 1, padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 20, fontWeight: "700" }}>Profile</Text>
      <Text>{user?.email || "Unknown user"}</Text>
      <Button title="Log out" onPress={signOut} />
    </SafeAreaView>
  );
}
