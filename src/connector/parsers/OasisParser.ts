import AbstractParser from "../AbstractParser";
import Pair from "../Pair";
import Web3 from "web3";
import {ABI} from "./../../ABI/oasisAbi.json";
// import config from "app-config.json"
import config from "./../../../app-config.json";
import RatesResult from "../RatesResult";

const provider: string = config.ethereumProvider;

const web3 = new Web3(provider);


const OasisAddr = config.contractsAddrs.oasis;
export default class OasisParser extends AbstractParser {
    dexName = 'Oasis';
    contractAddr = OasisAddr;

    async getRates(): Promise<RatesResult[]> {

        let res: RatesResult[] = [];
        for (let pair of this.pares) {
            res.push(await this.getRate(pair))
        }


        return res;
    }

    private async getRate(pair: Pair): Promise<RatesResult> {


        // @ts-ignore
        const oasisContract = new web3.eth.Contract(ABI, this.contractAddr);

        // params
        const firstToken = pair.tokens[0];
        const secondToken = pair.tokens[1];
        const requiredVolume = pair.volume;

        let currentVolume = 0;
        let secondVolume = 0;

        let orders: any[] = [];
        let lastOrderId: number = 0;
        try {
            while (requiredVolume >= currentVolume) {
                const lastOrderMemory: number = lastOrderId
                if (currentVolume === 0) {
                    lastOrderId = await oasisContract.methods.getBestOffer(firstToken, secondToken).call();
                } else {
                    console.log('get worse order')
                    lastOrderId = await oasisContract.methods.getWorseOffer(lastOrderMemory).call();
                    if (lastOrderId == 0) {
                        console.log(`недостаточно офферов для объема, DEX: ${this.dexName}. PAIR: ${pair.name}`)

                        return {
                            success: false,
                            pair: pair
                        }
                    }
                }


                const order: any = await oasisContract.methods.getOffer(lastOrderId).call();
                orders.push(order);
                const amount = Web3.utils.fromWei(order['0']);
                currentVolume += parseFloat(amount);
                secondVolume +=  parseFloat(Web3.utils.fromWei(order['2']));
            }


            /*
            console.log("Orders: ", orders.map(order=>{

                return {
                    REP: order[1],
                    REP_VOLUME: Web3.utils.fromWei(order['0']),
                    DAI: order[3],
                    DAI_VOLUME:Web3.utils.fromWei(order['2'])
                }
            }));
            */

        } catch (e) {
            console.log(`Error while downloading offers for DEX: ${this.dexName}. PAIR: ${pair.name}`)
            console.log(e.getMessage());
            return {
                success: false,
                pair: pair
            }
        }

        let pairWithResult = pair;

        pairWithResult.rate = secondVolume / currentVolume;

        return {
            success: true,
            pair: pairWithResult
        }
    }
}


