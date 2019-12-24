import {coinGecko} from '../../config/app-config.json';
import axios from 'axios'

const BASE_CURRENCY = 'usd';

export default class Converter {
    private static instance: Converter;
    protected listUrl: string = coinGecko.listUrl;
    protected rateUrl: string = coinGecko.rateUrl;

    private constructor() {
    }

    public static getInstance(): Converter {
        if (!Converter.instance) {
            Converter.instance = new Converter();
        }

        return Converter.instance;
    }

    public async getRate(tokenSymbol: string): Promise<number | undefined> {
        const tokenId = await this.isTokenValid(tokenSymbol);
        if (!tokenId) {
            throw `${tokenSymbol} token is not valid on coingecko`;
        }

        try {
            const url = `${this.rateUrl}?vs_currencies=usd&ids=${tokenId}`
            const {data} = await axios.get(url);
            const tokenData = data[tokenId.toLowerCase()];
            if (!tokenData) {
                console.log(`Cant define volume for ${tokenSymbol} token`);
                return undefined;
            } else {
                return tokenData[BASE_CURRENCY]
            }


        } catch (e) {
            console.log(e.message)
            return undefined;
        }
    }

    private async isTokenValid(tokenId: string): Promise<string | undefined> {
        try {
            const fullList = await axios.get(this.listUrl)
            const item = fullList.data.find((item: any) => item.id === tokenId.toLowerCase());
            return (item && item.id) ? item.id : undefined;
        } catch (e) {
            console.log(`cant validate ${tokenId} token`)
            console.log(e.message);
        }
    }

}
