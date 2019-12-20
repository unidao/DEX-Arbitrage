import winston from './winston'
import {AnalyzerResult} from '../analyzer/Analyzer';

export default class Class {
    log(abilities: AnalyzerResult[]): void {
        abilities.forEach(item => {
            const logString = `Ability for pair ${item.name} to buy on ${item.buyOn} and sell on ${item.sellOn}. `+
            `Buy price: ${item.buyRate.toFixed(8)}, sell price: ${item.sellRate.toFixed(8)}`;
            winston.info(logString);
        })
    }
}



