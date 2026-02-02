import { useState } from "react";
import { Alert, Button, SafeAreaView, Text, TextInput, View } from "react-native";
import { supabase } from "../../lib/supabaseClient";

export default function SignInScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [mode, setMode] = useState("password"); // "password" | "magic"
  const [loading, setLoading] = useState(false);

  async function handleSignIn() {
    if (!email.trim()) return Alert.alert("Email required");
    setLoading(true);

    try {
      if (mode === "magic") {
        const { error } = await supabase.auth.signInWithOtp({ email });
        if (error) throw error;
        Alert.alert("Check your email", "Magic link sent.");
      } else {
        if (!password) return Alert.alert("Password required");
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (e) {
      Alert.alert("Sign in failed", e.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, padding: 16, justifyContent: "center" }}>
      <Text style={{ fontSize: 24, fontWeight: "600", marginBottom: 16 }}>
        CNIGA WIGC
      </Text>

      <View style={{ marginBottom: 12 }}>
        <Text>Email</Text>
        <TextInput
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          style={{ borderWidth: 1, padding: 10, borderRadius: 8, marginTop: 6 }}
        />
      </View>

      {mode === "password" && (
        <View style={{ marginBottom: 12 }}>
          <Text>Password</Text>
          <TextInput
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            style={{ borderWidth: 1, padding: 10, borderRadius: 8, marginTop: 6 }}
          />
        </View>
      )}

      <View style={{ flexDirection: "row", gap: 10, marginBottom: 12 }}>
        <Button
          title={mode === "password" ? "Use Magic Link" : "Use Password"}
          onPress={() => setMode(mode === "password" ? "magic" : "password")}
          disabled={loading}
        />
      </View>

      <Button
        title={loading ? "Please wait…" : mode === "magic" ? "Send Magic Link" : "Sign In"}
        onPress={handleSignIn}
        disabled={loading}
      />
    </SafeAreaView>
  );
}
