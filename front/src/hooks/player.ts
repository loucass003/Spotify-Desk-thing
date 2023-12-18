import { Accessor, batch, createContext, createEffect, createSignal, on, onCleanup, onMount, useContext } from "solid-js";
import { Lyrics, fetchLyrics } from "./lyrics";
import { fetchCurrentlyPlaying, sendPause, sendSeekToPosition, sendSkipToNext, sendSkipToPrevious, sendStart } from "./spotify";

export interface PlayerState {
    device_id: string;
    progress_ms: number;
    duration_ms: number;
    is_playing: boolean;
    last_update: number;
    display: 'light' | 'dark';
    track: {
        id: string,
        name: string;
        preview_url: string;
        album: {
            id: string,
            images: ({ url: string, height: number, width: number })[],
            name: string,
            author: string,
        }
    },
    lyrics?: Lyrics;
}

interface PlayerContext {
    optimisticState: Accessor<PlayerState | undefined>,
    nextSong: () => void;
    prevSong: () => void;
    toggleSong: () => void;
    seek: (pos: number) => void;
}

export const PlayerContextC = createContext<PlayerContext>();

export function usePlayer() { 
    const context = useContext(PlayerContextC);

    if (!context)
        throw new Error('usePlayer must be within a PlayerContext Provider')

    return context; 
}

const sleep = (delay: number) => new Promise((resolve) => setTimeout(() => { resolve(true) }, delay))

export function providePlayer(): PlayerContext {
    const [state, setState] = createSignal<PlayerState>();
    const [optimisticState, setOptimisticState] = createSignal<PlayerState>();
    const [pausePoll, setPause] = createSignal<boolean>(false);

    const imageChanged = async (url: string) => {
        return new Promise((resolve: (value: 'dark' | 'light') => void ) => {
            const img = new Image();
            img.src = url;
            img.crossOrigin = "Anonymous";
            img.onload = () => {
                const context = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
                if (!context) return;
                context.imageSmoothingEnabled = true;
                context.drawImage(img, 0, 0, 20, 20);
                // Average the brightness of the pixels in the image
                const brightness = Array.from({ length: 20 * 20 }).reduce((curr: number, _, index) => {
                    const [r, g, b] = context.getImageData(index / 20, index % 20, 1, 1).data.slice(0,3)
                    return curr + ((r*299)+(g*587)+(b*114))/1000
                }, 0) / (20 * 20);
                const displayMode = (brightness > 128) ? 'light' : 'dark';
                resolve(displayMode)
            }
        })
        
    }

    const updatePlayerStatus = async () => {
        const infos = await fetchCurrentlyPlaying()
        if (infos.error)
            return;

        const currState = state();

        // TODO: MAKE THIS NON BLOKING
        const lyrics = (currState && infos.item.id != currState.track?.id) || !currState ? await fetchLyrics(infos.item.id) : currState.lyrics;

        const { 
            device: { id: device_id }, 
            is_playing, progress_ms, 
            item: { id, name, preview_url, duration_ms }
        } = infos;

        const album: PlayerState['track']['album'] = infos.currently_playing_type == 'track' ? {
            author: infos.item.artists.map(({ name }) => name).join(', '),
            id: infos.item.album.id,
            images: infos.item.album.images,
            name: infos.item.album.name
        } : {
            author: infos.item.show.publisher,
            id: infos.item.show.id,
            images: infos.item.show.images,
            name: infos.item.show.name
        };

        const newState: PlayerState = { 
            device_id, 
            is_playing, 
            last_update: Date.now(), 
            progress_ms: progress_ms, 
            duration_ms: duration_ms, 
            track: { album, id, name, preview_url }, 
            lyrics,
            display: currState?.display ?? 'light'
        };

        if (newState.track.album.images[0].url !== currState?.track.album.images[0].url) {
            newState.display = await imageChanged(newState.track.album.images[0].url);
            console.log('display',  newState.display)
        }


        batch(
            () => {
                setState(newState)
                setOptimisticState(newState)
            }
        )
       
    };

    const updateOptimisticState = (update: Partial<PlayerState>) => {
        const currOptimisticState = optimisticState();
        if (!currOptimisticState) return;
        setOptimisticState(({
            ...currOptimisticState,
            ...update,
            last_update: Date.now()
        }))
    }

    onMount(() => {
        updatePlayerStatus();
    })

    const pollStatusTimer = setInterval(() => {
        if (pausePoll()) return;

        updatePlayerStatus();
    }, 1000);

    const interpolateState = () => {
        const currOptimisticState = optimisticState();
        if (!currOptimisticState) return;
        updateOptimisticState(({ 
            progress_ms: currOptimisticState.is_playing 
                ? currOptimisticState.progress_ms + (Date.now() - currOptimisticState.last_update) 
                : currOptimisticState.progress_ms 
        }))
    }

    const interpolateTimer = setInterval(() => {
        interpolateState();
    }, 50);

    onCleanup(() => {
        clearInterval(pollStatusTimer);
        clearInterval(interpolateTimer);
    })

    return {
        optimisticState,
        prevSong: async () => {
            const currState = state();
            if (!currState)
                return;
            await sendSkipToPrevious(currState.device_id);
            await sleep(400) // hack to get the status faster
            await updatePlayerStatus();
        },
        nextSong: async () => {
            const currState = state();
            if (!currState)
                return;
            await sendSkipToNext(currState.device_id);
            await sleep(400) // hack to get the status faster
            await updatePlayerStatus();
        },
        toggleSong: async () => {
            const currState = state();
            if (!currState)
                return;
            if (currState.is_playing) {
                updateOptimisticState({ is_playing: false })
                await sendPause(currState.device_id);
            } else {
                updateOptimisticState({ is_playing: true })
                await sendStart(currState.device_id, currState.progress_ms);
            }

            await sleep(400) // hack to get the status faster
            await updatePlayerStatus();
        },
        seek: async (pos: number) => {
            const currState = optimisticState();
            if (!currState)
                return;
            batch(() => {
                updateOptimisticState({ progress_ms: pos })
                setPause(true);
            })
            await sendSeekToPosition(currState.device_id, pos.toString());
            await sleep(1500) // Hack to make sure spotify had time to move to the new position
            setPause(false);
        }
    }
}