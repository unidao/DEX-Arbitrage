import Pair from "./Pair";
import BigNumber from "bignumber.js";

export default  interface RatesResult {
    // pair: Pair
    success: boolean
    message?: string
    rate?: BigNumber
}
