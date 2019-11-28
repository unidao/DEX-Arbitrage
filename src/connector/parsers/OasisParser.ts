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

    async getRates(): Promise<Pair[]> {

        let res: Pair[] = [];
        for (let pair of this.pares) {
            res.push(await this.getRateForPair(pair))
        }


        return res;
    }

    private async getRateForPair(pair: Pair): Promise<Pair> {


        // @ts-ignore
        const oasisContract = new web3.eth.Contract(ABI, this.contractAddr);


        let res1: RatesResult = await this.getRate(oasisContract, pair);
        let res2: RatesResult = await this.getRate(oasisContract, pair, true);

        if(res1){
            pair.buyRate = res1.rate;
        }

        if(res2){
            pair.sellRate= res2.rate;
        }



        return pair;
    }


    private async getRate(oasisContract: any, pair: Pair, reverse: boolean = false): Promise<RatesResult>{

        // params
        let firstToken = pair.tokens[0];
        let secondToken = pair.tokens[1];
        if(reverse){
            firstToken = pair.tokens[1];
            secondToken = pair.tokens[0];
        }
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
                        let msg = `недостаточно офферов для объема, DEX: ${this.dexName}. PAIR: ${pair.name}`;
                        console.log(msg)

                        return {
                            success: false,
                            message: msg
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
            let msg = `Error while downloading offers for DEX: ${this.dexName}. PAIR: ${pair.name}`;
            console.log(msg)
            console.log(e.getMessage());
            return {
                success: false,
                message: msg
            }
        }


        return {
            success: true,
            rate: reverse ? currentVolume / secondVolume : secondVolume / currentVolume
        }
    }

}


