import Pair from "./Pair";
import RatesResult from "./RatesResult";
import Converter from "./Converter";

export default abstract class AbstractParser {
    abstract dexName: string
    protected abstract contractAddr: string
    pairs: Pair[] = [];

    public constructor(pairs: Pair[]) {
        this.pairs = pairs;
    }



    /**
     * Volume in dollars
     * */
    public async getVolumeForToken(tokenSymbol: string, volume: number) {
        const tokenRate = await Converter.getInstance().getRate(tokenSymbol);
        if (tokenRate) {
            return volume / tokenRate;
        } else {
            throw "cant calculate volume";
        }
    }

    abstract getRates(): Promise<Pair[]>;

    // abstract validatePair(): void

}
