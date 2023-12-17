
const clientId = process.env.VITE_SPOTIFY_CLIENT_TOKEN;
const redirectUri = process.env.VITE_SPOTIFY_REDIRECT_URI;

export async function isLoggedIn() {
    console.log('isLogged')

    const session_token = window.localStorage.getItem('session_token');
    if (!session_token) {
        return false;
    }

    const res = await fetch(`http://192.168.1.9:3000/auth/get-access-token?session_token=${session_token}`);
    if (!res.ok) {
        return false;
    }
    const response = await res.json();
    if (response.error)
        return false;
    window.localStorage.setItem('access_token', response.access_token);
    return true;
}

export async function getAuthUrl() {
    
    const { session_token }: { session_token: string } = await fetch(`http://192.168.1.9:3000/auth/session-token`).then(res => res.json());

    window.localStorage.setItem('session_token', session_token);
    
    const authUrl = new URL("https://accounts.spotify.com/authorize")
    const params =  {
        response_type: 'code',
        client_id: clientId,
        scope: 'user-read-playback-state user-read-currently-playing user-modify-playback-state',
        redirect_uri: redirectUri,
        state: session_token,
    }
    authUrl.search = new URLSearchParams(params).toString();

    return authUrl.toString()
}


// export async function checkAccessToken() {
//     const session_token = window.localStorage.getItem('session_token');
//     if (!session_token)
//         return false;
//     const res = await fetch(`http://localhost:3000/auth/get-access-token?token=${session_token}`)
//     if (!res.ok) 
//         return false;
//     const response = await res.json();
//     console.log(response)
//     if (response.error)
//         return false;
//     window.localStorage.setItem('access_token', response.access_token);
//     window.localStorage.setItem('refresh_token', response.refresh_token);
//     return true;
// }