# CNIGA WIGC Native (Expo / React Native)

This is the **Option B: True Expo / React Native rebuild** scaffold, wired for:
- Supabase Auth (email/password + magic link)
- `attendee_favorites` table (RLS with `attendee_id = auth.uid()`)
- WP schedule/sponsors/presenters fetch (CNIGA WordPress REST)
- Schedule: hide past events by default + **"Show past events"** toggle
- Smarter end-time logic (**missing endTime => +60 minutes**)

## 1) Install
```bash
npm install
```

## 2) Environment variables
Create a `.env` file in the project root:

```bash
EXPO_PUBLIC_SUPABASE_URL=https://szeqfcnmlredutxjzvfq.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=PASTE_YOUR_ANON_KEY
EXPO_PUBLIC_WP_BASE_URL=https://cniga.com
```

> Do not commit `.env`.

## 3) Run
```bash
npx expo start
```

## Optional (later)
If you want to render `contentHtml` natively, add:
- `react-native-render-html`
