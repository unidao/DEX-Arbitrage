import {Logger} from "winston";
const { createLogger, format, transports } = require('winston');
const { combine, timestamp, label, prettyPrint, printf } = format;


const winston = require('winston');

const myFormat = printf(({ message, timestamp} : {message:string, timestamp: string}) => {
    return `[${timestamp}] ${message}`;
});


const winstonLogger: Logger = winston.createLogger({
    level: 'info',
    format: combine(
        timestamp(),
        myFormat
    ),
    defaultMeta: {service: 'test-service'},
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({filename: __dirname+'/../../logs/results.log'}),
    ]
});

export default winstonLogger;

