import { useEffect, useMemo, useState } from "react";
import { Alert, SafeAreaView, Text, View, FlatList, Switch } from "react-native";
import { fetchScheduleData } from "../../api/wp";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../context/AuthContext";
import ScheduleFilters from "../../components/ScheduleFilters";
import EventCard from "../../components/EventCard";

function parseEventStartDate(ev) {
  if (ev?.sortKey) {
    const d = new Date(ev.sortKey);
    if (!isNaN(d.getTime())) return d;
  }

  const dateLabel = ev?.date;
  if (!dateLabel) return null;

  const cleaned = dateLabel.replace(/^[A-Za-z]+,\s*/, "");
  const dtStr = ev?.startTime ? `${cleaned} ${ev.startTime}` : cleaned;
  const d = new Date(dtStr);
  if (isNaN(d.getTime())) return null;
  return d;
}

function addMinutes(date, minutes) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

// Smarter end-time:
// - if endTime exists and parses -> use it
// - if missing OR parsing fails -> +60 minutes from start
function computeEventEndDate(ev) {
  const start = parseEventStartDate(ev);
  if (!start) return null;

  if (!ev?.endTime) return addMinutes(start, 60);

  const dateLabel = ev?.date;
  if (!dateLabel) return addMinutes(start, 60);

  const cleaned = dateLabel.replace(/^[A-Za-z]+,\s*/, "");
  const endStr = `${cleaned} ${ev.endTime}`;
  const end = new Date(endStr);
  if (isNaN(end.getTime())) return addMinutes(start, 60);

  if (end.getTime() < start.getTime()) return addMinutes(start, 60);

  return end;
}

export default function ScheduleScreen() {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState([]);
  const [socials, setSocials] = useState([]);
  const [allEvents, setAllEvents] = useState([]);
  const [error, setError] = useState("");

  // views: all | mine | sessions | socials
  const [view, setView] = useState("all");
  const [trackFilter, setTrackFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [showPast, setShowPast] = useState(false);

  const [starredIds, setStarredIds] = useState([]);
  const [favoritesLoading, setFavoritesLoading] = useState(true);
  const [favoritesError, setFavoritesError] = useState("");

  // tick every minute so events that just ended drop away automatically
  const [nowTick, setNowTick] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNowTick(Date.now()), 60 * 1000);
    return () => clearInterval(t);
  }, []);

  // 1) Load schedule from WP
  useEffect(() => {
    (async () => {
      try {
        const result = await fetchScheduleData();
        setSessions(Array.isArray(result?.sessions) ? result.sessions : []);
        setSocials(Array.isArray(result?.socials) ? result.socials : []);
        setAllEvents(Array.isArray(result?.allEvents) ? result.allEvents : []);
      } catch {
        setError("Unable to load schedule.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Track options from sessions (MUST be above early returns)
  const allTracks = useMemo(() => {
    const list = Array.isArray(sessions) ? sessions : [];
    return Array.from(
      new Set(
        list
          .map((e) => e?.track)
          .filter((t) => typeof t === "string" && t.trim())
          .map((t) => t.trim())
      )
    ).sort((a, b) => a.localeCompare(b));
  }, [sessions]);

  // 2) Load favorites from Supabase
  useEffect(() => {
    let mounted = true;

    async function loadFavorites() {
      if (!user) {
        setStarredIds([]);
        setFavoritesLoading(false);
        return;
      }

      setFavoritesLoading(true);
      setFavoritesError("");

      try {
        const { data, error } = await supabase
          .from("attendee_favorites")
          .select("event_id")
          .eq("attendee_id", user.id);

        if (error) throw error;
        if (!mounted) return;

        const dbIds = (data || []).map((r) => String(r.event_id));
        setStarredIds(dbIds);
      } catch (e) {
        if (mounted) setFavoritesError(e.message || "Could not load favorites.");
      } finally {
        if (mounted) setFavoritesLoading(false);
      }
    }

    loadFavorites();
    return () => {
      mounted = false;
    };
  }, [user]);

  async function toggleStar(eventId) {
    if (!user) return Alert.alert("Sign in required", "Please sign in to save favorites.");

    const id = String(eventId);
    const currentlyStarred = starredIds.includes(id);

    // optimistic UI
    setStarredIds((prev) =>
      currentlyStarred ? prev.filter((x) => x !== id) : [...prev, id]
    );
    setFavoritesError("");

    try {
      if (currentlyStarred) {
        const { error } = await supabase
          .from("attendee_favorites")
          .delete()
          .eq("attendee_id", user.id)
          .eq("event_id", id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from("attendee_favorites").insert({
          attendee_id: user.id,
          event_id: id,
        });

        if (error) throw error;
      }
    } catch (e) {
      setFavoritesError(e.message || "Could not update favorite.");

      // revert UI on failure
      setStarredIds((prev) =>
        currentlyStarred ? [...prev, id] : prev.filter((x) => x !== id)
      );
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, padding: 16 }}>
        <Text>Loading schedule…</Text>
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

  // Choose base list by view
  let baseEvents;
  if (view === "sessions") baseEvents = sessions;
  else if (view === "socials") baseEvents = socials;
  else if (view === "mine")
    baseEvents = allEvents.filter((e) => starredIds.includes(String(e.id)));
  else baseEvents = allEvents;

  const now = new Date(nowTick);

  // Apply: hide past + search + track filter
  const filtered = baseEvents.filter((e) => {
    // Past filter applies to ALL views
    if (!showPast) {
      const end = computeEventEndDate(e);
      if (end && end.getTime() < now.getTime()) return false;
    }

    // Track filter allowed for sessions OR mine
    if ((view === "sessions" || view === "mine") && trackFilter !== "all") {
      if (!e.track || e.track.trim() !== trackFilter) return false;
    }

    if (!search.trim()) return true;

    const q = search.toLowerCase();
    const haystack = [
      e.title,
      e.track,
      e.room,
      e.date,
      ...(e.speakers || []).map((sp) => sp?.name),
      e.moderator?.name,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return haystack.includes(q);
  });

  // Sort
  const sorted = [...filtered].sort((a, b) => {
    if (a.sortKey && b.sortKey) return a.sortKey.localeCompare(b.sortKey);
    if (a.sortKey) return -1;
    if (b.sortKey) return 1;
    return (a.title || "").localeCompare(b.title || "");
  });

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScheduleFilters
        view={view}
        setView={setView}
        search={search}
        setSearch={setSearch}
        trackFilter={trackFilter}
        setTrackFilter={setTrackFilter}
        tracks={allTracks}
        favoritesCount={starredIds.length}
      />

      <View
        style={{
          paddingHorizontal: 16,
          paddingBottom: 10,
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
        }}
      >
        <Switch value={showPast} onValueChange={setShowPast} />
        <Text>Show past events</Text>
      </View>

      {favoritesError ? (
        <Text style={{ paddingHorizontal: 16, color: "crimson" }}>{favoritesError}</Text>
      ) : null}

      <FlatList
        data={sorted}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        renderItem={({ item }) => (
          <EventCard
            event={item}
            starred={starredIds.includes(String(item.id))}
            onToggleStar={() => toggleStar(item.id)}
            disableStar={favoritesLoading}
          />
        )}
        ListEmptyComponent={
          <Text style={{ paddingHorizontal: 16 }}>
            {favoritesLoading ? "Loading your schedule…" : "No events found for this view."}
          </Text>
        }
      />
    </SafeAreaView>
  );
}
