
export type Lyrics = { lines: ({ startTimeMs: string; words: string })[] };

export async function fetchLyrics(trackId: string): 
    Promise<Lyrics | undefined> 
{
    return await fetch(
        `https://spotify-lyric-api-984e7b4face0.herokuapp.com/?trackid=${trackId}`
    ).then((res) => res.json()).catch(() => undefined)
}