# Android Google OAuth: required manual dashboard configuration

The Android app cannot complete Google sign-in until you add one entry to
the Supabase dashboard. This is external configuration Claude cannot make
on your behalf — no dashboard credentials exist in this environment.

## 1. Why this is required

Google's OAuth policy blocks its consent screen from loading inside an
embedded WebView (the error is `disallowed_useragent`). So on Android, the
app opens the sign-in flow in a Chrome Custom Tab (`@capacitor/browser`)
instead of navigating its own WebView, then receives control back via an
Android deep link once Google/Supabase finish the handshake. That deep
link needs a redirect target Supabase is willing to send the browser to.

## 2. Where it must be registered

**Supabase Dashboard → Authentication → URL Configuration → Redirect URLs.**
Add this exact value:

```
com.fitnessos.app://login-callback
```

This is an addition, not a replacement — keep the existing web redirect
URL(s) in that list untouched. Without this entry, Supabase will refuse to
redirect to the app after Google authentication completes, even though
Google's own step succeeded.

## 3. Does this belong in Supabase Redirect URLs?

Yes — exclusively there. Supabase's `signInWithOAuth` call is only allowed
to redirect the browser to a URL present in this allowlist; that's the one
and only place this value needs to be added.

## 4. Does Google Cloud OAuth configuration need to change?

**No.** Google's OAuth consent screen never sees or redirects to the
`com.fitnessos.app://` scheme at all. The flow is:

```
App -> Chrome Custom Tab -> Google consent screen
     -> redirects to Supabase's own fixed callback
        (https://<project-ref>.supabase.co/auth/v1/callback)
     -> Supabase (server-side) redirects the browser again, this time to
        whatever `redirectTo` was requested AND is present in its
        Redirect URLs allowlist -> com.fitnessos.app://login-callback
     -> Android routes that scheme back into the app (AndroidManifest
        intent-filter) -> the app exchanges the `code` query param for a
        session (PKCE)
```

Google's "Authorized redirect URIs" already contains only the Supabase
callback URL, because that's what makes the existing web sign-in work
today — that entry is shared by both web and Android and needs no change.

## 5. Exact values to add manually

| Where | Value |
|---|---|
| Supabase Dashboard → Authentication → URL Configuration → Redirect URLs | `com.fitnessos.app://login-callback` |
| Google Cloud Console → OAuth client → Authorized redirect URIs | No change — leave as-is |

## Implementation notes (for reference, not action needed)

- `src/lib/supabase.ts` sets `flowType: 'pkce'` — the code exchanged on
  return is a `?code=` query parameter, which survives an Android deep
  link; the library's implicit-flow default (tokens in a URL fragment)
  does not reliably survive one.
- `src/lib/AuthProvider.tsx`'s `signInWithGoogle()` branches on
  `Capacitor.isNativePlatform()`: native opens the OAuth URL via
  `@capacitor/browser`'s `Browser.open()` with `skipBrowserRedirect: true`;
  web is unchanged.
- An `appUrlOpen` listener (`@capacitor/app`) in the same file catches the
  `com.fitnessos.app://login-callback?code=...` deep link, closes the
  Custom Tab, and calls `supabase.auth.exchangeCodeForSession(code)`.
- `android/app/src/main/AndroidManifest.xml` has a matching intent-filter
  (`android:scheme="com.fitnessos.app"`, `android:host="login-callback"`)
  so Android routes that URL back into the already-running app
  (`android:launchMode="singleTask"`, already the Capacitor default).
