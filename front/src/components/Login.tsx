import { Show, createResource } from "solid-js";
import { getAuthUrl } from "../hooks/auth";
import QRCode from 'qrcode';
import Fa from "solid-fa";
import { faSpinner } from "@fortawesome/free-solid-svg-icons";

 
const getAuthQrCode = async () => {
    const authUrl = await getAuthUrl();
    return {
        src: await QRCode.toDataURL(authUrl, { width: 600 }),
        url: authUrl
    }
}

export function Login() {
    const [curentlyPlating] = createResource(getAuthQrCode);


    return (<Show when={curentlyPlating.state === 'ready' && curentlyPlating()} fallback={<div class="w-full h-screen flex flex-col justify-center items-center bg-gray-500 text-white text-lg"><Fa icon={faSpinner} spin /></div>}>
            { data =>
                <div class="bg-gray-500 w-full h-screen flex flex-col justify-center items-center">
                    <div class="w-64 gap-3 flex flex-col items-center">
                        <div class="rounded-md shadow-lg">
                            <img class="rounded-md" src={data().src}/>
                        </div>
                        <a href={data().url} target="_blank">LINK</a>
                    </div>
                </div>
            }
        </Show>)

}