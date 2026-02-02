import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAuth } from "../context/AuthContext";
import SignInScreen from "../screens/Auth/SignInScreen";
import TabsNavigator from "./TabsNavigator";

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  const { booting, user } = useAuth();

  if (booting) return null;

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {user ? (
        <Stack.Screen name="Tabs" component={TabsNavigator} />
      ) : (
        <Stack.Screen name="SignIn" component={SignInScreen} />
      )}
    </Stack.Navigator>
  );
}
