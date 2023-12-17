

export type ApiErrors = 
    | { error?: 'no-access-token' } 
    | { error?: { status: number, message: string } }

export async function fetchSpotify<
    R, 
    P extends Record<string, string> = never, 
    B = unknown
>(
    path: string, 
    body?: B, 
    params?: P, 
    method: 'GET' | 'POST' | 'PUT' = 'GET'
): Promise<R & ApiErrors> {
    const access_token = localStorage.getItem("access_token");

    if (!access_token) {
        return { error: 'no-access-token' };
    }

    const url = new URL(`https://api.spotify.com/v1/${path}`);
    if (params) {
        for (const [key, param] of Object.entries(params)) {
            url.searchParams.append(key, param)
        }
    }

    const res = await fetch(url, {
        method,
        headers: {
            'Content-type': 'application/json',
            Authorization: 'Bearer ' + access_token
        },
        body: JSON.stringify(body)
    })

    if (res.status === 204)
        return {} as any;

    return await res.json();
}


export const fetchCurrentlyPlaying = () => fetchSpotify<{
    device: {
        id: string,
    },
    timestamp: number,
    progress_ms: number,
    is_playing: boolean,
} & ({
    currently_playing_type: 'track'
    item: {
        album: {
            
            id: string,
            images: ({ url: string, height: number, width: number })[],
            name: string,
        },
        artists: ({ name: string })[],
        duration_ms: number,
        name: string,
        id: string,
        preview_url: string,
        show: {
            id: string,
            images: ({ url: string, height: number, width: number })[],
            name: string,
        }
    }
} | {
    currently_playing_type: 'episode'
    item: {
        duration_ms: number,
        name: string,
        id: string,
        preview_url: string,
        show: {
            id: string,
            publisher: string,
            images: ({ url: string, height: number, width: number })[],
            name: string,
        }
    }
}), { additional_types: 'track' | 'episode' }>(`me/player`, undefined, { additional_types: 'episode' });


export const sendStart = (device_id: string, position_ms: number) => fetchSpotify<
    never, 
    { device_id: string }, 
    { context_uri?: string, urls?: string[], offset?: { position: string }, position_ms: number }
>(
    `me/player/play`, 
    { position_ms }, 
    { device_id },
    'PUT'
);

export const sendPause = (device_id: string) => fetchSpotify<
    never, 
    { device_id: string }
>(
    `me/player/pause`, 
    undefined, 
    { device_id },
    'PUT'
);


export const sendSkipToNext = (device_id: string) => fetchSpotify<
    never, 
    { device_id: string }
>(
    `me/player/next`, 
    {}, 
    { device_id },
    'POST'
);

export const sendSkipToPrevious = (device_id: string) => fetchSpotify<
    never, 
    { device_id: string }
>(
    `me/player/previous`, 
    {}, 
    { device_id },
    'POST'
);

export const sendSeekToPosition = (device_id: string, position_ms: string) => fetchSpotify<
    never, 
    { device_id: string, position_ms: string }
>(
    `me/player/seek`, 
    {}, 
    { device_id, position_ms },
    'PUT'
);

export const sendShuffle = (device_id: string, shuffle: boolean) => fetchSpotify<
    never, 
    { device_id: string, shuffle: string }
>(
    `me/player/shuffle`, 
    {}, 
    { device_id, shuffle: shuffle ? 'true' : 'false' },
    'PUT'
);