import { Accessor, For, ParentProps, Show, batch, createEffect, createMemo, createRenderEffect, createSignal, on, onCleanup } from "solid-js";
import { PlayerContextC, PlayerState, providePlayer, usePlayer } from "../hooks/player";
import './Player.css'
import clsx from "clsx";
import Fa from "solid-fa";
import { faBackward, faForward, faPause, faPlay, faSpinner } from "@fortawesome/free-solid-svg-icons";

export function PlayerContextProvider(props: ParentProps) {
    const player = providePlayer();
    return <PlayerContextC.Provider value={player}>
        {props.children}
    </PlayerContextC.Provider>
}

const toTime = (duration: number) => `${(Math.floor(duration / 1000 / 60) % 60).toString().padStart(2, '0')}:${(Math.floor(duration / 1000) % 60).toString().padStart(2, '0')}`
export function Controls({ state }: { state: Accessor<PlayerState> }) {

    const { nextSong, prevSong, toggleSong, seek } = usePlayer();

    return <>
        <div class="flex gap-4 items-center justify-center h-full flex-col px-10">
            <div class="flex gap-5 items-center">
                <div class="h-20 w-20 rounded-full bg-opacity-40 bg-white shadow-md active:bg-gray-300 flex flex-col justify-center items-center" onClick={prevSong}> <Fa scale={1.2} icon={faBackward} /> </div>
                <div class="h-24 w-24 rounded-full bg-opacity-40 bg-white shadow-md active:bg-gray-300 flex flex-col justify-center items-center" onClick={toggleSong}> <Fa scale={2}  icon={state().is_playing ? faPause : faPlay}  /> </div>
                <div class="h-20 w-20 rounded-full bg-opacity-40 bg-white shadow-md active:bg-gray-300 flex flex-col justify-center items-center" onClick={nextSong}> <Fa scale={1.2} icon={faForward} />  </div>
            </div>
            <div class="flex flex-col w-full">
                <input 
                    type="range" 
                    value={state().progress_ms} 
                    min={0} 
                    max={state().duration_ms}
                    onInput={(e) => {seek(+e.target.value)}}
                ></input>
                <div class="flex justify-between text-black dark:text-white text-sm pb-4">
                    <div class="">{toTime(state().progress_ms)}</div>
                    <div class="">{toTime(state().duration_ms)}</div>
                </div>
            </div>
        </div>
    </>
}

export function LyricsViewer({ state }: { state: Accessor<PlayerState> }) {
    const [currLine, setCurrentLine] = createSignal<number>(0)

    let scrollableDiv: HTMLDivElement | undefined = undefined;

    createEffect(() => {
        const currState = state();
        if (currState && currState.lyrics?.lines) {
            let currentLine: number = 0;
            for (const [index, line] of Object.entries(currState.lyrics.lines)) {
                if (Number(line.startTimeMs) <= currState.progress_ms) {
                    currentLine = +index;
                }  
            }
          
      
            if (currentLine) {
                if (currentLine !== currLine() && scrollableDiv) {
                    scrollableDiv.scrollTo({ top: (scrollableDiv.children[currentLine] as HTMLDivElement).offsetTop - scrollableDiv.offsetTop, behavior: 'smooth' })
                }
                setCurrentLine(currentLine);
            }
        } else {
            setCurrentLine(0)
        }
    })


    return <div class="flex flex-col h-[75px] overflow-y-hidden mt-2 snap-center text-md" ref={scrollableDiv}>
        <For each={state().lyrics?.lines} >
            {(line, index) => <div class={clsx((index() === currLine()) ? 'text-black dark:text-white' : 'text-gray-400 dark:text-gray-400', 'transition-all ')}>{line.words}</div>}
        </For>
    </div>

}


const FadeImage = (props: { src: string, class?: string, style?: any }) => {
    const [currentImage, setCurrentImage] = createSignal(props.src);
    const [lastImage, setLastImage] = createSignal(props.src);
    const [transitioning, setTransitioning] = createSignal(false);

    createEffect(() => {
        if (props.src !== currentImage()) {
            setTransitioning(true);
            setLastImage(currentImage());
            setCurrentImage(props.src);
            setTimeout(() => {
                setLastImage('');
                setTransitioning(false);
            }, 500);
        }
    });

    return (
        <div class={props.class} style={props.style}>
            <div class="relative w-full h-auto">
                <img src={lastImage()} class={`absolute inset-0 object-cover w-full ${transitioning() ? 'opacity-0' : 'opacity-100'} transition-opacity duration-1000 ease-in-out`} />
                <img src={currentImage()} class="inset-0 object-cover w-full" />
            </div>
        </div>
    );
};

export function Player() {
    const { optimisticState } = usePlayer();

    let titleRef: HTMLDivElement | undefined;

    // FUCKING KILL ME ALREADY
    const width = createMemo(() => {
        optimisticState();
        return titleRef?.getBoundingClientRect().width ?? 0
    })

    return <Show 
            when={optimisticState()}
            fallback={<div class="w-full h-screen flex flex-col justify-center items-center bg-gray-500 text-white text-lg"><Fa icon={faSpinner} spin /></div>}
        >
            { data => 
                <div class={clsx("flex flex-col h-screen w-full relative overflow-hidden ", { 'dark': data().display === 'dark' })}>
                    <FadeImage class="absolute h-screen w-full object-cover scale-150 -translate-y-1/2 -z-10 blur-2xl" src={data().track.album.images[0].url} />
                    <div class="flex flex-col flex-grow justify-center mx-10 items-center">
                        <div class="flex gap-4 w-full">
                            <div class="flex flex-col">
                                <div class="w-40 min-w-fit h-40 shadow-2xl overflow-hidden rounded-lg">
                                    <FadeImage src={data().track.album.images[0].url} />
                                </div>
                            </div>
                            <div class="flex flex-col w-full overflow-hidden">
                                <div  class={clsx("dark:text-white text-black text-lg font-bold slider")} >
                                    <div ref={titleRef} class={clsx({ 'text': width() > 400, 'w-fit': width() <= 400 })}>{data().track.name}</div>
                                </div>
                                {/* <div class="text-lg font-bold dark:text-white text-black scroll-text gap-4 flex"><span>{data().track.name}</span> <span>{data().track.name}</span></div> */}
                                <div class="text-sm dark:text-white text-black">{data().track.album.author}</div>
                                <LyricsViewer state={data}></LyricsViewer>
                            </div>
                        </div>
                    </div>
                    <div class="w-full">
                        <Controls state={data}></Controls>
                    </div>
                </div>
            }
        </Show>
}