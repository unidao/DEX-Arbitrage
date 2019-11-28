import Pair from "./Pair";
import RatesResult from "./RatesResult";

export default abstract class AbstractParser {
    abstract dexName: string
    protected abstract contractAddr: string
    pares: Pair[] = [];

    public constructor(pares: Pair[]) {
        this.pares = pares;
    }
    abstract getRates() : Promise<Pair[]>;
    // abstract validatePair(): void

}
