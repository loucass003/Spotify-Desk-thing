import QRCode from 'qrcode';


export async function genQRCode(url: string) {
    return QRCode.toDataURL(url)
}