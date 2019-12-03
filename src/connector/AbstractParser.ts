import Pair from "./Pair";
import RatesResult from "./RatesResult";

export default abstract class AbstractParser {
    abstract dexName: string
    protected abstract contractAddr: string
    pairs: Pair[] = [];

    public constructor(pairs: Pair[]) {
        this.pairs = pairs;
    }
    abstract getRates() : Promise<Pair[]>;
    // abstract validatePair(): void

}
