import { Show, createResource } from "solid-js";
import { getAuthUrl } from "../hooks/auth";
import QRCode from 'qrcode';

 
const getAuthQrCode = async () => {
    const authUrl = await getAuthUrl();
    return {
        src: await QRCode.toDataURL(authUrl, { width: 600 }),
        url: authUrl
    }
}

export function Login() {
    const [curentlyPlating] = createResource(getAuthQrCode);


    return <div class="bg-lime-500 w-full h-screen flex flex-col justify-center items-center">
        <Show when={curentlyPlating.state === 'ready' && curentlyPlating()} fallback={<>LOADING</>}>
            { data =>
                <div class="w-64 gap-3 flex flex-col items-center">
                    <div class="rounded-md shadow-lg">
                        <img class="rounded-md" src={data().src}/>
                    </div>
                    <a href={data().url} target="_blank">LINK</a>
                </div>
            }
        </Show>
    </div>
}