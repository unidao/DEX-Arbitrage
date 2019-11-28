import AbstractParser from "./AbstractParser";
import OasisParser from "./parsers/OasisParser";
import Pair from "./Pair";


export default class Connector {

    private parsers: AbstractParser[];

    constructor(private pairs: Pair[]) {
        const cleanPairs = this.getPairs();
        const oasisParser = new OasisParser(cleanPairs);
        this.parsers = [oasisParser]
    }


    private getPairs(): Pair[] {

        // TODO: провалидироать конфигурацию пар, вывести ошибки, если данные не валидны
        return this.pairs;
    }

    public async getAllRates() {
        let result: any = {

        };
        const parsers = this.parsers;
        for(let parser of parsers){
            result[parser.dexName] = await parser.getRates();
        }

        return result;
    }
}
