import AbstractParser from "./AbstractParser";
import OasisParser from "./parsers/OasisParser";
import UniswapParser from "./parsers/UniswapParser";
import KyberParser from "./parsers/KyberParser";
import Pair from "./Pair";
import {PairsData} from '../analyzer/Analyzer'

export const ETHEREUM = 'ethereum';

export default class Connector {

    private parsers: AbstractParser[];

    constructor(private pairs: Pair[]) {
        const cleanPairs = this.getPairs();
        const oasisParser = new OasisParser(cleanPairs);
        const uniswapParser = new UniswapParser(cleanPairs);
        const kyberParser = new KyberParser(cleanPairs);
        // this.parsers = [uniswapParser]
        this.parsers = [oasisParser, uniswapParser, kyberParser]
        // this.parsers = [oasisParser]
        // this.parsers = [kyberParser, uniswapParser]
    }


    private getPairs(): Pair[] {

        // TODO: провалидироать конфигурацию пар, вывести ошибки, если данные не валидны
        return this.pairs;
    }

    public async getAllRates() {
        let result: PairsData = {};

        const parsers = this.parsers;
        for (let parser of parsers) {
            console.log(parser.dexName)
            result[parser.dexName] = await parser.getRates();
        }

        return result;
    }
}
