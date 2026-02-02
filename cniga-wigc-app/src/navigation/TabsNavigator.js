import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import ScheduleScreen from "../screens/Tabs/ScheduleScreen";
import SponsorsScreen from "../screens/Tabs/SponsorsScreen";
import PresentersScreen from "../screens/Tabs/PresentersScreen";
import ProfileScreen from "../screens/Tabs/ProfileScreen";

const Tabs = createBottomTabNavigator();

export default function TabsNavigator() {
  return (
    <Tabs.Navigator>
      <Tabs.Screen name="Schedule" component={ScheduleScreen} />
      <Tabs.Screen name="Sponsors" component={SponsorsScreen} />
      <Tabs.Screen name="Presenters" component={PresentersScreen} />
      <Tabs.Screen name="Profile" component={ProfileScreen} />
    </Tabs.Navigator>
  );
}
