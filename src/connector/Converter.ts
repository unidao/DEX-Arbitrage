import {coinGecko} from './../../app-config.json';
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
        const isValid = await this.validateToken(tokenSymbol);
        if (!isValid) {
            throw `${tokenSymbol} token is not valid on coingecko`;
        }

        try {
            const url = `${this.rateUrl}?vs_currencies=usd&ids=${tokenSymbol}`
            const {data} = await axios.get(url);
            const tokenData = data[tokenSymbol.toLowerCase()];
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

    private async validateToken(tokenSymbol: string) {
        try {
            const fullList = await axios.get(this.listUrl)
            return fullList.data.some((item: any) => item.symbol === tokenSymbol.toLowerCase())
        } catch (e) {
            console.log(`cant validate ${tokenSymbol} token`)
            console.log(e.message);
        }

    }

}
