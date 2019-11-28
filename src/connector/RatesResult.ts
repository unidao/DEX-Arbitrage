import Pair from "./Pair";

export default  interface RatesResult {
    // pair: Pair
    success: boolean
    message?: string
    rate?: number
}
